import { useState, useMemo } from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Separator } from '@/components/ui/separator';
import {
  Landmark, Plus, ArrowDownCircle, ArrowUpCircle, FileDown, CheckCircle2,
  DollarSign, TrendingUp, TrendingDown, Receipt, AlertTriangle, Building2,
} from 'lucide-react';
import DashboardHeader from './DashboardHeader';
import { useTrustAccounting, TrustAccount, TrustTransaction } from '@/hooks/useTrustAccounting';
import { useAuth } from '@/lib/AuthProvider';
import { toast } from 'sonner';

const AUD = new Intl.NumberFormat('en-AU', { style: 'currency', currency: 'AUD', minimumFractionDigits: 2 });
const DATE_FMT = new Intl.DateTimeFormat('en-AU', { day: '2-digit', month: '2-digit', year: 'numeric' });

const STATUS_BADGE: Record<string, { variant: 'default' | 'secondary' | 'outline' | 'destructive'; label: string }> = {
  pending: { variant: 'outline', label: 'Pending' },
  completed: { variant: 'default', label: 'Completed' },
  reconciled: { variant: 'secondary', label: 'Reconciled' },
  voided: { variant: 'destructive', label: 'Voided' },
};

const CATEGORY_OPTIONS = [
  { value: 'deposit', label: 'Deposit' },
  { value: 'rent', label: 'Rent Collection' },
  { value: 'commission', label: 'Commission' },
  { value: 'disbursement', label: 'Disbursement' },
  { value: 'refund', label: 'Refund' },
  { value: 'fees', label: 'Fees' },
  { value: 'general', label: 'General' },
];

// ──────────────────────────────────────────────
// ABA File Generation (DE/EFT format)
// ──────────────────────────────────────────────
function generateAbaFile(transactions: TrustTransaction[], account: TrustAccount): string {
  const pad = (s: string, len: number, char = ' ', right = false) =>
    right ? s.slice(0, len).padEnd(len, char) : s.slice(0, len).padStart(len, char);

  const today = new Date();
  const dateStr = `${pad(String(today.getDate()), 2, '0')}${pad(String(today.getMonth() + 1), 2, '0')}${String(today.getFullYear()).slice(-2)}`;

  // Type 0 - Header
  const header = [
    '0',                                    // Record type
    pad('', 17),                            // Blank
    '01',                                   // Reel sequence
    pad(account.bank_name || 'NAB', 3, ' ', true), // Bank name
    pad('', 7),
    pad('Trust Account', 26, ' ', true),    // User name
    pad('000000', 6, '0'),                  // User number
    pad('Trust Payments', 12, ' ', true),   // Description
    dateStr,                                // Date
    pad('', 40),                            // Blank
  ].join('');

  // Type 1 - Detail records
  const details = transactions.map(tx => {
    const cents = pad(String(Math.round(tx.amount * 100)), 10, '0');
    return [
      '1',                                  // Record type
      pad(account.bsb || '000-000', 7, ' ', true),
      pad(account.account_number || '000000000', 9, ' ', true),
      ' ',                                  // Tax indicator
      '50',                                 // Transaction code (credit)
      cents,
      pad(tx.payee_name || 'Payee', 32, ' ', true),
      pad(tx.reference || '', 18, ' ', true),
      pad(account.bsb || '000-000', 7, ' ', true),
      pad(account.account_number || '000000000', 9, ' ', true),
      pad(tx.payee_name || '', 16, ' ', true),
      pad('00', 8, '0'),
    ].join('');
  });

  // Type 7 - Footer
  const totalCents = pad(String(transactions.reduce((s, t) => s + Math.round(t.amount * 100), 0)), 10, '0');
  const footer = [
    '7',
    '999-999',
    pad('', 12),
    totalCents,
    totalCents,
    pad('', 24, '0'),
    pad('', 6),
    pad(String(transactions.length), 6, '0'),
    pad('', 40),
  ].join('');

  return [header, ...details, footer].join('\n');
}

const TrustAccountingPage = () => {
  const { user } = useAuth();
  const {
    accounts, transactions, loading,
    createAccount, createTransaction, reconcileTransaction,
  } = useTrustAccounting();

  const [activeTab, setActiveTab] = useState('dashboard');
  const [showNewAccount, setShowNewAccount] = useState(false);
  const [showNewTx, setShowNewTx] = useState(false);
  const [selectedAccountId, setSelectedAccountId] = useState<string | null>(null);
  const [txFilter, setTxFilter] = useState<string>('all');

  // New account form
  const [newAccName, setNewAccName] = useState('');
  const [newAccType, setNewAccType] = useState('trust');
  const [newAccBsb, setNewAccBsb] = useState('');
  const [newAccNumber, setNewAccNumber] = useState('');
  const [newAccBank, setNewAccBank] = useState('');

  // New transaction form
  const [txType, setTxType] = useState<'deposit' | 'withdrawal'>('deposit');
  const [txCategory, setTxCategory] = useState('general');
  const [txAmount, setTxAmount] = useState('');
  const [txGst, setTxGst] = useState(true);
  const [txDesc, setTxDesc] = useState('');
  const [txRef, setTxRef] = useState('');
  const [txPayee, setTxPayee] = useState('');
  const [txAccountId, setTxAccountId] = useState('');
  const [txStatus, setTxStatus] = useState('completed');

  // Computed
  const trustAccounts = accounts.filter(a => a.account_type === 'trust');
  const operatingAccounts = accounts.filter(a => a.account_type === 'operating');
  const totalTrust = trustAccounts.reduce((s, a) => s + a.balance, 0);
  const totalOperating = operatingAccounts.reduce((s, a) => s + a.balance, 0);

  const filteredTx = useMemo(() => {
    let tx = transactions;
    if (selectedAccountId) tx = tx.filter(t => t.trust_account_id === selectedAccountId);
    if (txFilter !== 'all') tx = tx.filter(t => t.status === txFilter);
    return tx;
  }, [transactions, selectedAccountId, txFilter]);

  const pendingCount = transactions.filter(t => t.status === 'pending').length;
  const unreconciledCount = transactions.filter(t => t.status === 'completed').length;

  const handleCreateAccount = async () => {
    if (!newAccName || !user) return;
    try {
      // Get agent id
      const { data: agent } = await (await import('@/integrations/supabase/client')).supabase
        .from('agents').select('id').eq('user_id', user.id).single();
      if (!agent) { toast.error('Agent profile not found'); return; }

      await createAccount({
        agent_id: agent.id,
        account_name: newAccName,
        account_type: newAccType,
        bsb: newAccBsb || null,
        account_number: newAccNumber || null,
        bank_name: newAccBank || null,
      });
      toast.success('Account created');
      setShowNewAccount(false);
      setNewAccName(''); setNewAccBsb(''); setNewAccNumber(''); setNewAccBank('');
    } catch (e: any) {
      toast.error(e.message);
    }
  };

  const handleCreateTx = async () => {
    if (!txAmount || !txAccountId) return;
    const amount = parseFloat(txAmount);
    if (isNaN(amount) || amount <= 0) { toast.error('Enter a valid amount'); return; }
    const gstAmount = txGst ? amount * 0.1 : 0;

    try {
      await createTransaction({
        trust_account_id: txAccountId,
        transaction_type: txType,
        category: txCategory,
        amount,
        gst_amount: gstAmount,
        description: txDesc || null,
        reference: txRef || null,
        payee_name: txPayee || null,
        status: txStatus,
        transaction_date: new Date().toISOString().split('T')[0],
      });
      toast.success('Transaction recorded');
      setShowNewTx(false);
      setTxAmount(''); setTxDesc(''); setTxRef(''); setTxPayee('');
    } catch (e: any) {
      toast.error(e.message);
    }
  };

  const handleExportAba = () => {
    const completedTx = filteredTx.filter(t => t.status === 'completed' && t.transaction_type === 'withdrawal' && !t.aba_exported);
    if (completedTx.length === 0) { toast.error('No un-exported withdrawals to include'); return; }
    const account = accounts.find(a => a.id === (selectedAccountId || completedTx[0]?.trust_account_id));
    if (!account) return;

    const aba = generateAbaFile(completedTx, account);
    const blob = new Blob([aba], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `trust_aba_${new Date().toISOString().split('T')[0]}.aba`;
    a.click();
    URL.revokeObjectURL(url);
    toast.success(`ABA file exported with ${completedTx.length} transaction(s)`);
  };

  const handleReconcile = async (txId: string) => {
    try {
      await reconcileTransaction(txId);
      toast.success('Transaction reconciled');
    } catch (e: any) {
      toast.error(e.message);
    }
  };

  if (loading) {
    return (
      <div>
        <DashboardHeader title="Trust Accounting" subtitle="Manage trust & operating accounts" />
        <div className="p-6 text-center text-muted-foreground">Loading…</div>
      </div>
    );
  }

  return (
    <div>
      <DashboardHeader title="Trust Accounting" subtitle="Trust & operating account management" />
      <div className="p-4 sm:p-6 max-w-7xl space-y-4">
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList>
            <TabsTrigger value="dashboard">Dashboard</TabsTrigger>
            <TabsTrigger value="ledger">Ledger</TabsTrigger>
            <TabsTrigger value="invoices">Invoices</TabsTrigger>
            <TabsTrigger value="reconciliation">Reconciliation</TabsTrigger>
          </TabsList>

          {/* ─── DASHBOARD ─── */}
          <TabsContent value="dashboard" className="space-y-4 mt-4">
            {/* Summary cards */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
              <Card>
                <CardContent className="p-4 flex items-center gap-3">
                  <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center">
                    <Landmark size={18} className="text-primary" />
                  </div>
                  <div>
                    <p className="text-[10px] text-muted-foreground font-medium uppercase tracking-wide">Trust Balance</p>
                    <p className="text-lg font-bold">{AUD.format(totalTrust)}</p>
                  </div>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="p-4 flex items-center gap-3">
                  <div className="h-10 w-10 rounded-lg bg-blue-500/10 flex items-center justify-center">
                    <Building2 size={18} className="text-blue-500" />
                  </div>
                  <div>
                    <p className="text-[10px] text-muted-foreground font-medium uppercase tracking-wide">Operating Balance</p>
                    <p className="text-lg font-bold">{AUD.format(totalOperating)}</p>
                  </div>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="p-4 flex items-center gap-3">
                  <div className="h-10 w-10 rounded-lg bg-orange-500/10 flex items-center justify-center">
                    <AlertTriangle size={18} className="text-orange-500" />
                  </div>
                  <div>
                    <p className="text-[10px] text-muted-foreground font-medium uppercase tracking-wide">Pending</p>
                    <p className="text-lg font-bold">{pendingCount}</p>
                  </div>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="p-4 flex items-center gap-3">
                  <div className="h-10 w-10 rounded-lg bg-green-500/10 flex items-center justify-center">
                    <CheckCircle2 size={18} className="text-green-500" />
                  </div>
                  <div>
                    <p className="text-[10px] text-muted-foreground font-medium uppercase tracking-wide">To Reconcile</p>
                    <p className="text-lg font-bold">{unreconciledCount}</p>
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Accounts list */}
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-bold">Accounts</h3>
              <Button size="sm" onClick={() => setShowNewAccount(true)} className="gap-1.5">
                <Plus size={14} /> New Account
              </Button>
            </div>

            {accounts.length === 0 ? (
              <Card>
                <CardContent className="p-8 text-center text-muted-foreground">
                  <Landmark size={32} className="mx-auto mb-2 opacity-40" />
                  <p className="text-sm">No accounts yet. Create a trust or operating account to get started.</p>
                </CardContent>
              </Card>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {accounts.map(acc => (
                  <Card key={acc.id} className="cursor-pointer hover:shadow-sm transition-shadow"
                    onClick={() => { setSelectedAccountId(acc.id); setActiveTab('ledger'); }}>
                    <CardContent className="p-4">
                      <div className="flex items-center justify-between mb-2">
                        <div className="flex items-center gap-2">
                          <Badge variant={acc.account_type === 'trust' ? 'default' : 'secondary'} className="text-[10px]">
                            {acc.account_type === 'trust' ? 'Trust' : 'Operating'}
                          </Badge>
                          <span className="text-sm font-semibold">{acc.account_name}</span>
                        </div>
                      </div>
                      <p className="text-xl font-bold">{AUD.format(acc.balance)}</p>
                      {acc.bank_name && (
                        <p className="text-[10px] text-muted-foreground mt-1">
                          {acc.bank_name} {acc.bsb ? `• BSB ${acc.bsb}` : ''}
                        </p>
                      )}
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}

            {/* Quick actions */}
            <div className="flex flex-wrap gap-2">
              <Button size="sm" variant="outline" onClick={() => setShowNewTx(true)} className="gap-1.5">
                <ArrowDownCircle size={14} /> Record Deposit
              </Button>
              <Button size="sm" variant="outline" onClick={() => { setTxType('withdrawal'); setShowNewTx(true); }} className="gap-1.5">
                <ArrowUpCircle size={14} /> Record Withdrawal
              </Button>
              <Button size="sm" variant="outline" onClick={handleExportAba} className="gap-1.5">
                <FileDown size={14} /> Export ABA
              </Button>
            </div>
          </TabsContent>

          {/* ─── LEDGER ─── */}
          <TabsContent value="ledger" className="space-y-4 mt-4">
            <div className="flex flex-wrap items-center gap-2">
              <Select value={selectedAccountId || 'all'} onValueChange={v => setSelectedAccountId(v === 'all' ? null : v)}>
                <SelectTrigger className="w-[200px] h-8 text-xs">
                  <SelectValue placeholder="All Accounts" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Accounts</SelectItem>
                  {accounts.map(a => (
                    <SelectItem key={a.id} value={a.id}>{a.account_name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Select value={txFilter} onValueChange={setTxFilter}>
                <SelectTrigger className="w-[140px] h-8 text-xs">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Status</SelectItem>
                  <SelectItem value="pending">Pending</SelectItem>
                  <SelectItem value="completed">Completed</SelectItem>
                  <SelectItem value="reconciled">Reconciled</SelectItem>
                  <SelectItem value="voided">Voided</SelectItem>
                </SelectContent>
              </Select>
              <div className="ml-auto flex gap-2">
                <Button size="sm" onClick={() => setShowNewTx(true)} className="gap-1.5">
                  <Plus size={14} /> New Transaction
                </Button>
                <Button size="sm" variant="outline" onClick={handleExportAba} className="gap-1.5">
                  <FileDown size={14} /> ABA
                </Button>
              </div>
            </div>

            <Card>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="text-xs">Date</TableHead>
                    <TableHead className="text-xs">Type</TableHead>
                    <TableHead className="text-xs">Category</TableHead>
                    <TableHead className="text-xs">Payee</TableHead>
                    <TableHead className="text-xs">Reference</TableHead>
                    <TableHead className="text-xs text-right">Amount</TableHead>
                    <TableHead className="text-xs text-right">GST</TableHead>
                    <TableHead className="text-xs">Status</TableHead>
                    <TableHead className="text-xs"></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredTx.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={9} className="text-center text-muted-foreground py-8">
                        No transactions found
                      </TableCell>
                    </TableRow>
                  ) : (
                    filteredTx.map(tx => {
                      const isDeposit = tx.transaction_type === 'deposit';
                      const badge = STATUS_BADGE[tx.status] || STATUS_BADGE.pending;
                      return (
                        <TableRow key={tx.id}>
                          <TableCell className="text-xs">{DATE_FMT.format(new Date(tx.transaction_date))}</TableCell>
                          <TableCell>
                            <div className="flex items-center gap-1">
                              {isDeposit ? (
                                <TrendingUp size={12} className="text-green-500" />
                              ) : (
                                <TrendingDown size={12} className="text-destructive" />
                              )}
                              <span className="text-xs capitalize">{tx.transaction_type}</span>
                            </div>
                          </TableCell>
                          <TableCell className="text-xs capitalize">{tx.category}</TableCell>
                          <TableCell className="text-xs">{tx.payee_name || '—'}</TableCell>
                          <TableCell className="text-xs font-mono">{tx.reference || '—'}</TableCell>
                          <TableCell className={`text-xs text-right font-semibold ${isDeposit ? 'text-green-600' : 'text-destructive'}`}>
                            {isDeposit ? '+' : '-'}{AUD.format(tx.amount)}
                          </TableCell>
                          <TableCell className="text-xs text-right text-muted-foreground">{AUD.format(tx.gst_amount)}</TableCell>
                          <TableCell>
                            <Badge variant={badge.variant} className="text-[10px]">{badge.label}</Badge>
                          </TableCell>
                          <TableCell>
                            {tx.status === 'completed' && (
                              <Button size="sm" variant="ghost" className="h-6 px-2 text-[10px]"
                                onClick={() => handleReconcile(tx.id)}>
                                <CheckCircle2 size={10} className="mr-1" /> Reconcile
                              </Button>
                            )}
                          </TableCell>
                        </TableRow>
                      );
                    })
                  )}
                </TableBody>
              </Table>
            </Card>
          </TabsContent>

          {/* ─── INVOICES ─── */}
          <TabsContent value="invoices" className="space-y-4 mt-4">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-bold">Invoices & Receipts</h3>
              <Button size="sm" onClick={() => { setTxType('withdrawal'); setTxCategory('commission'); setShowNewTx(true); }} className="gap-1.5">
                <Receipt size={14} /> Generate Invoice
              </Button>
            </div>

            {(() => {
              const invoiceTx = transactions.filter(t => t.invoice_number || t.category === 'commission');
              return invoiceTx.length === 0 ? (
                <Card>
                  <CardContent className="p-8 text-center text-muted-foreground">
                    <Receipt size={32} className="mx-auto mb-2 opacity-40" />
                    <p className="text-sm">No invoices yet. Generate one from a commission transaction.</p>
                  </CardContent>
                </Card>
              ) : (
                <Card>
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead className="text-xs">Invoice #</TableHead>
                        <TableHead className="text-xs">Date</TableHead>
                        <TableHead className="text-xs">Payee</TableHead>
                        <TableHead className="text-xs">Description</TableHead>
                        <TableHead className="text-xs text-right">Amount</TableHead>
                        <TableHead className="text-xs text-right">GST</TableHead>
                        <TableHead className="text-xs text-right">Total</TableHead>
                        <TableHead className="text-xs">Status</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {invoiceTx.map(tx => (
                        <TableRow key={tx.id}>
                          <TableCell className="text-xs font-mono">{tx.invoice_number || 'INV-' + tx.id.slice(0, 6).toUpperCase()}</TableCell>
                          <TableCell className="text-xs">{DATE_FMT.format(new Date(tx.transaction_date))}</TableCell>
                          <TableCell className="text-xs">{tx.payee_name || '—'}</TableCell>
                          <TableCell className="text-xs">{tx.description || '—'}</TableCell>
                          <TableCell className="text-xs text-right">{AUD.format(tx.amount)}</TableCell>
                          <TableCell className="text-xs text-right">{AUD.format(tx.gst_amount)}</TableCell>
                          <TableCell className="text-xs text-right font-semibold">{AUD.format(tx.amount + tx.gst_amount)}</TableCell>
                          <TableCell>
                            <Badge variant={STATUS_BADGE[tx.status]?.variant || 'outline'} className="text-[10px]">
                              {STATUS_BADGE[tx.status]?.label || tx.status}
                            </Badge>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </Card>
              );
            })()}
          </TabsContent>

          {/* ─── RECONCILIATION ─── */}
          <TabsContent value="reconciliation" className="space-y-4 mt-4">
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <Card>
                <CardContent className="p-4 text-center">
                  <p className="text-[10px] text-muted-foreground uppercase tracking-wide mb-1">Completed</p>
                  <p className="text-2xl font-bold">{transactions.filter(t => t.status === 'completed').length}</p>
                  <p className="text-[10px] text-muted-foreground">Awaiting reconciliation</p>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="p-4 text-center">
                  <p className="text-[10px] text-muted-foreground uppercase tracking-wide mb-1">Reconciled</p>
                  <p className="text-2xl font-bold text-green-600">{transactions.filter(t => t.status === 'reconciled').length}</p>
                  <p className="text-[10px] text-muted-foreground">This period</p>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="p-4 text-center">
                  <p className="text-[10px] text-muted-foreground uppercase tracking-wide mb-1">Pending</p>
                  <p className="text-2xl font-bold text-orange-500">{pendingCount}</p>
                  <p className="text-[10px] text-muted-foreground">Require action</p>
                </CardContent>
              </Card>
            </div>

            <h3 className="text-sm font-bold">Unreconciled Transactions</h3>
            <Card>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="text-xs">Date</TableHead>
                    <TableHead className="text-xs">Type</TableHead>
                    <TableHead className="text-xs">Payee</TableHead>
                    <TableHead className="text-xs text-right">Amount</TableHead>
                    <TableHead className="text-xs">Reference</TableHead>
                    <TableHead className="text-xs"></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {transactions.filter(t => t.status === 'completed').length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={6} className="text-center text-muted-foreground py-8 text-sm">
                        All transactions reconciled ✓
                      </TableCell>
                    </TableRow>
                  ) : (
                    transactions.filter(t => t.status === 'completed').map(tx => (
                      <TableRow key={tx.id}>
                        <TableCell className="text-xs">{DATE_FMT.format(new Date(tx.transaction_date))}</TableCell>
                        <TableCell className="text-xs capitalize">{tx.transaction_type}</TableCell>
                        <TableCell className="text-xs">{tx.payee_name || '—'}</TableCell>
                        <TableCell className="text-xs text-right font-semibold">{AUD.format(tx.amount)}</TableCell>
                        <TableCell className="text-xs font-mono">{tx.reference || '—'}</TableCell>
                        <TableCell>
                          <Button size="sm" className="h-6 px-2 text-[10px] gap-1" onClick={() => handleReconcile(tx.id)}>
                            <CheckCircle2 size={10} /> Reconcile
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </Card>
          </TabsContent>
        </Tabs>

        {/* ─── New Account Dialog ─── */}
        <Dialog open={showNewAccount} onOpenChange={setShowNewAccount}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>New Account</DialogTitle>
            </DialogHeader>
            <div className="space-y-3">
              <div>
                <Label className="text-xs">Account Name</Label>
                <Input value={newAccName} onChange={e => setNewAccName(e.target.value)} placeholder="e.g. Main Trust Account" />
              </div>
              <div>
                <Label className="text-xs">Type</Label>
                <Select value={newAccType} onValueChange={setNewAccType}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="trust">Trust Account</SelectItem>
                    <SelectItem value="operating">Operating Account</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <Label className="text-xs">BSB</Label>
                  <Input value={newAccBsb} onChange={e => setNewAccBsb(e.target.value)} placeholder="000-000" />
                </div>
                <div>
                  <Label className="text-xs">Account Number</Label>
                  <Input value={newAccNumber} onChange={e => setNewAccNumber(e.target.value)} placeholder="123456789" />
                </div>
              </div>
              <div>
                <Label className="text-xs">Bank Name</Label>
                <Input value={newAccBank} onChange={e => setNewAccBank(e.target.value)} placeholder="e.g. NAB, CBA" />
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setShowNewAccount(false)}>Cancel</Button>
              <Button onClick={handleCreateAccount} disabled={!newAccName}>Create Account</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* ─── New Transaction Dialog ─── */}
        <Dialog open={showNewTx} onOpenChange={setShowNewTx}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Record {txType === 'deposit' ? 'Deposit' : 'Withdrawal'}</DialogTitle>
            </DialogHeader>
            <div className="space-y-3">
              <div>
                <Label className="text-xs">Account</Label>
                <Select value={txAccountId} onValueChange={setTxAccountId}>
                  <SelectTrigger><SelectValue placeholder="Select account" /></SelectTrigger>
                  <SelectContent>
                    {accounts.map(a => (
                      <SelectItem key={a.id} value={a.id}>
                        {a.account_name} ({a.account_type})
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <Label className="text-xs">Type</Label>
                  <Select value={txType} onValueChange={v => setTxType(v as 'deposit' | 'withdrawal')}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="deposit">Deposit</SelectItem>
                      <SelectItem value="withdrawal">Withdrawal</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label className="text-xs">Category</Label>
                  <Select value={txCategory} onValueChange={setTxCategory}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {CATEGORY_OPTIONS.map(o => (
                        <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <Label className="text-xs">Amount ($AUD)</Label>
                  <Input type="number" step="0.01" value={txAmount} onChange={e => setTxAmount(e.target.value)} placeholder="0.00" />
                </div>
                <div>
                  <Label className="text-xs">GST (10%)</Label>
                  <div className="flex items-center gap-2 h-9 px-3 border rounded-md bg-muted/50">
                    <input type="checkbox" checked={txGst} onChange={e => setTxGst(e.target.checked)} className="rounded" />
                    <span className="text-xs text-muted-foreground">
                      {txAmount && txGst ? AUD.format(parseFloat(txAmount) * 0.1) : '$0.00'}
                    </span>
                  </div>
                </div>
              </div>
              <div>
                <Label className="text-xs">Payee Name</Label>
                <Input value={txPayee} onChange={e => setTxPayee(e.target.value)} placeholder="Payee or vendor name" />
              </div>
              <div>
                <Label className="text-xs">Reference</Label>
                <Input value={txRef} onChange={e => setTxRef(e.target.value)} placeholder="e.g. INV-001" />
              </div>
              <div>
                <Label className="text-xs">Description</Label>
                <Textarea value={txDesc} onChange={e => setTxDesc(e.target.value)} rows={2} placeholder="Optional notes" />
              </div>
              <div>
                <Label className="text-xs">Status</Label>
                <Select value={txStatus} onValueChange={setTxStatus}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="pending">Pending</SelectItem>
                    <SelectItem value="completed">Completed</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setShowNewTx(false)}>Cancel</Button>
              <Button onClick={handleCreateTx} disabled={!txAccountId || !txAmount}>Record</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </div>
  );
};

export default TrustAccountingPage;
