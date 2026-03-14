import { useState, useMemo, useCallback, useEffect } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from '@/components/ui/dialog';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import {
  Landmark, Plus, ArrowDownCircle, CheckCircle2, DollarSign,
  TrendingUp, TrendingDown, FileDown, Trash2, Pencil, Clock,
  AlertTriangle, CalendarIcon, Home, Users, Receipt, Upload,
  CreditCard, CheckSquare, ShieldCheck, FileText, BarChart3,
} from 'lucide-react';
import { Checkbox } from '@/components/ui/checkbox';
import { supabase } from '@/integrations/supabase/client';
import DashboardHeader from './DashboardHeader';
import TrustReceiptModal from './TrustReceiptModal';
import { useTrustAccounting, TrustTransaction } from '@/hooks/useTrustAccounting';
import { useAuth } from '@/lib/AuthProvider';
import { toast } from 'sonner';

const AUD = new Intl.NumberFormat('en-AU', { style: 'currency', currency: 'AUD', minimumFractionDigits: 2 });
const DATE_FMT = new Intl.DateTimeFormat('en-AU', { day: '2-digit', month: 'short', year: 'numeric' });

const TYPE_OPTIONS = [
  { value: 'deposit', label: 'Deposit' },
  { value: 'rent', label: 'Rent' },
  { value: 'refund', label: 'Refund' },
  { value: 'fees', label: 'Fee' },
];

const STATUS_MAP: Record<string, { variant: 'default' | 'secondary' | 'outline' | 'destructive'; label: string }> = {
  pending: { variant: 'outline', label: 'Pending' },
  completed: { variant: 'default', label: 'Cleared' },
  reconciled: { variant: 'secondary', label: 'Reconciled' },
  voided: { variant: 'destructive', label: 'Voided' },
};

const TrustAccountingPage = () => {
  const { user } = useAuth();
  const {
    accounts, transactions, contacts, properties, loading,
    fetchAccounts, fetchTransactions,
    createAccount, createTransaction, updateTransaction,
    deleteTransaction, markAsCleared, bulkMarkCleared,
  } = useTrustAccounting();

  // Filters
  const [filterStatus, setFilterStatus] = useState('all');
  const [filterClient, setFilterClient] = useState('all');
  const [filterProperty, setFilterProperty] = useState('all');
  const [filterDateFrom, setFilterDateFrom] = useState('');
  const [filterDateTo, setFilterDateTo] = useState('');

  // Modals
  const [showNewTx, setShowNewTx] = useState(false);
  const [showEditTx, setShowEditTx] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [showNewAccount, setShowNewAccount] = useState(false);
  const [showNewReceipt, setShowNewReceipt] = useState(false);
  const [editingTx, setEditingTx] = useState<TrustTransaction | null>(null);
  const [deletingTxId, setDeletingTxId] = useState<string | null>(null);

  // Bulk payments
  interface PendingPayment {
    id: string;
    client_name: string;
    property_address: string;
    amount: number;
    bsb: string | null;
    account_number: string | null;
    reference: string | null;
    payment_number: string;
  }
  const [pendingPayments, setPendingPayments] = useState<PendingPayment[]>([]);
  const [selectedPaymentIds, setSelectedPaymentIds] = useState<Set<string>>(new Set());
  const [bulkLoading, setBulkLoading] = useState(false);

  // Fetch pending payments + receipts stats
  const [newReceiptsCount, setNewReceiptsCount] = useState(0);
  const [lastReceiptNumber, setLastReceiptNumber] = useState('—');
  const [lastReconciledDate, setLastReconciledDate] = useState<string | null>(null);
  const [unmatchedCount, setUnmatchedCount] = useState(0);

  const fetchPendingPayments = useCallback(async () => {
    if (!user) return;
    const { data } = await supabase
      .from('trust_payments')
      .select('id, client_name, property_address, amount, bsb, account_number, reference, payment_number')
      .eq('status', 'pending')
      .order('created_at', { ascending: false });
    if (data) setPendingPayments(data as PendingPayment[]);
  }, [user]);

  const fetchDashboardStats = useCallback(async () => {
    if (!user) return;
    // New receipts (received status)
    const { count: rCount } = await supabase
      .from('trust_receipts')
      .select('id', { count: 'exact', head: true })
      .eq('status', 'received');
    setNewReceiptsCount(rCount || 0);

    // Last receipt number
    const { data: lastR } = await supabase
      .from('trust_receipts')
      .select('receipt_number')
      .order('created_at', { ascending: false })
      .limit(1);
    if (lastR?.[0]) setLastReceiptNumber(`#${lastR[0].receipt_number}`);

    // Last reconciled date
    const { data: lastRecon } = await supabase
      .from('trust_reconciliations')
      .select('bank_date')
      .eq('status', 'matched')
      .order('bank_date', { ascending: false })
      .limit(1);
    if (lastRecon?.[0]) setLastReconciledDate(lastRecon[0].bank_date);

    // Unmatched reconciliation items
    const { count: uCount } = await supabase
      .from('trust_reconciliations')
      .select('id', { count: 'exact', head: true })
      .eq('status', 'unmatched');
    setUnmatchedCount(uCount || 0);
  }, [user]);

  useEffect(() => { fetchPendingPayments(); fetchDashboardStats(); }, [fetchPendingPayments, fetchDashboardStats]);

  // New tx form
  const [txCategory, setTxCategory] = useState('deposit');
  const [txAmount, setTxAmount] = useState('');
  const [txGst, setTxGst] = useState(true);
  const [txDesc, setTxDesc] = useState('');
  const [txPayee, setTxPayee] = useState('');
  const [txAccountId, setTxAccountId] = useState('');
  const [txContactId, setTxContactId] = useState('');
  const [txPropertyId, setTxPropertyId] = useState('');

  // New account form
  const [newAccName, setNewAccName] = useState('');
  const [newAccType, setNewAccType] = useState('trust');
  const [newAccBsb, setNewAccBsb] = useState('');
  const [newAccNumber, setNewAccNumber] = useState('');
  const [newAccBank, setNewAccBank] = useState('');

  // Computed
  const trustAccounts = accounts.filter(a => a.account_type === 'trust');
  const totalInTrust = trustAccounts.reduce((s, a) => s + a.balance, 0);

  const now = new Date();
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1).toISOString().split('T')[0];

  const pendingTotal = useMemo(() =>
    transactions.filter(t => t.status === 'pending').reduce((s, t) => s + t.amount, 0),
    [transactions]);

  const clearedThisMonth = useMemo(() =>
    transactions
      .filter(t => t.status === 'completed' && t.transaction_date >= monthStart)
      .reduce((s, t) => s + t.amount, 0),
    [transactions, monthStart]);

  const lastEntry = useMemo(() => {
    const sorted = [...transactions].filter(t => t.status !== 'voided').sort((a, b) =>
      new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
    );
    return sorted[0] || null;
  }, [transactions]);

  const lastEntryText = lastEntry
    ? `${lastEntry.category === 'deposit' ? 'Deposit' : lastEntry.category === 'rent' ? 'Rent' : lastEntry.category} from ${lastEntry.payee_name || lastEntry.contact?.first_name || 'Unknown'} — ${DATE_FMT.format(new Date(lastEntry.transaction_date))}`
    : 'No entries yet';

  // Filtered transactions
  const filteredTx = useMemo(() => {
    let tx = transactions.filter(t => t.status !== 'voided');
    if (filterStatus !== 'all') tx = tx.filter(t => t.status === filterStatus);
    if (filterClient !== 'all') tx = tx.filter(t => t.contact_id === filterClient);
    if (filterProperty !== 'all') tx = tx.filter(t => t.property_id === filterProperty);
    if (filterDateFrom) tx = tx.filter(t => t.transaction_date >= filterDateFrom);
    if (filterDateTo) tx = tx.filter(t => t.transaction_date <= filterDateTo);
    return tx;
  }, [transactions, filterStatus, filterClient, filterProperty, filterDateFrom, filterDateTo]);

  // Running balance calculation
  const txWithBalance = useMemo(() => {
    let balance = 0;
    const reversed = [...filteredTx].reverse();
    const result = reversed.map(tx => {
      const impact = tx.transaction_type === 'deposit' ? tx.amount : -tx.amount;
      balance += impact;
      return { ...tx, runningBalance: balance };
    });
    return result.reverse();
  }, [filteredTx]);

  // ── Handlers ──
  const resetTxForm = () => {
    setTxCategory('deposit'); setTxAmount(''); setTxGst(true);
    setTxDesc(''); setTxPayee(''); setTxAccountId(''); setTxContactId(''); setTxPropertyId('');
  };

  const openNewTx = (category: string) => {
    resetTxForm();
    setTxCategory(category);
    if (accounts.length === 1) setTxAccountId(accounts[0].id);
    setShowNewTx(true);
  };

  const handleCreateTx = async () => {
    if (!txAmount || !txAccountId) return;
    const amount = parseFloat(txAmount);
    if (isNaN(amount) || amount <= 0) { toast.error('Enter a valid amount'); return; }
    const gstAmount = txGst ? amount * 0.1 : 0;
    const isDeposit = txCategory === 'deposit' || txCategory === 'rent';

    try {
      await createTransaction({
        trust_account_id: txAccountId,
        transaction_type: isDeposit ? 'deposit' : 'withdrawal',
        category: txCategory,
        amount,
        gst_amount: gstAmount,
        description: txDesc || null,
        payee_name: txPayee || null,
        contact_id: txContactId || null,
        property_id: txPropertyId || null,
        status: 'pending',
        transaction_date: new Date().toISOString().split('T')[0],
      });
      toast.success('Transaction recorded');
      setShowNewTx(false);
      resetTxForm();
    } catch (e: any) {
      toast.error(e.message);
    }
  };

  const handleMarkCleared = async (id: string) => {
    try {
      await markAsCleared(id);
      toast.success('Marked as cleared');
    } catch (e: any) {
      toast.error(e.message);
    }
  };

  const handleDeleteTx = async () => {
    if (!deletingTxId) return;
    try {
      await deleteTransaction(deletingTxId);
      toast.success('Transaction voided (audit trail preserved)');
      setShowDeleteConfirm(false);
      setDeletingTxId(null);
    } catch (e: any) {
      toast.error(e.message);
    }
  };

  const handleBulkClear = async () => {
    try {
      await bulkMarkCleared();
      toast.success('All pending entries marked as cleared');
    } catch (e: any) {
      toast.error(e.message);
    }
  };

  const openEdit = (tx: TrustTransaction) => {
    setEditingTx(tx);
    setTxCategory(tx.category);
    setTxAmount(String(tx.amount));
    setTxDesc(tx.description || '');
    setTxPayee(tx.payee_name || '');
    setTxContactId(tx.contact_id || '');
    setTxPropertyId(tx.property_id || '');
    setShowEditTx(true);
  };

  const handleEditTx = async () => {
    if (!editingTx) return;
    const amount = parseFloat(txAmount);
    if (isNaN(amount) || amount <= 0) { toast.error('Enter a valid amount'); return; }
    const gstAmount = txGst ? amount * 0.1 : 0;
    const isDeposit = txCategory === 'deposit' || txCategory === 'rent';

    try {
      await updateTransaction(editingTx.id, {
        category: txCategory,
        transaction_type: isDeposit ? 'deposit' : 'withdrawal',
        amount,
        gst_amount: gstAmount,
        description: txDesc || null,
        payee_name: txPayee || null,
        contact_id: txContactId || null,
        property_id: txPropertyId || null,
      } as any);
      toast.success('Transaction updated');
      setShowEditTx(false);
      setEditingTx(null);
    } catch (e: any) {
      toast.error(e.message);
    }
  };

  const handleCreateAccount = async () => {
    if (!newAccName || !user) return;
    try {
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

  // CSV export
  const exportCsv = () => {
    const headers = ['Date', 'Client Name', 'Property Address', 'Type', 'Amount', 'GST', 'Status', 'Balance Impact', 'Description', 'Reference'];
    const rows = txWithBalance.map(tx => [
      tx.transaction_date,
      tx.contact ? `${tx.contact.first_name} ${tx.contact.last_name || ''}`.trim() : tx.payee_name || '',
      tx.property?.address || '',
      tx.category,
      tx.amount.toFixed(2),
      tx.gst_amount.toFixed(2),
      STATUS_MAP[tx.status]?.label || tx.status,
      (tx.transaction_type === 'deposit' ? '+' : '-') + tx.amount.toFixed(2),
      tx.description || '',
      tx.reference || '',
    ]);
    const csv = [headers.join(','), ...rows.map(r => r.map(c => `"${c}"`).join(','))].join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `trust_audit_report_${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
    URL.revokeObjectURL(url);
    toast.success('Audit-ready report exported');
  };

  if (loading) {
    return (
      <div>
        <DashboardHeader title="Trust Dashboard" subtitle="Australian trust account management" />
        <div className="p-6 text-center text-muted-foreground">Loading…</div>
      </div>
    );
  }

  if (accounts.length === 0) {
    return (
      <div>
        <DashboardHeader title="Trust Dashboard" subtitle="Australian trust account management" />
        <div className="p-4 sm:p-6 max-w-3xl mx-auto">
          <Card>
            <CardContent className="p-10 text-center space-y-4">
              <Landmark size={40} className="mx-auto text-muted-foreground/40" />
              <h2 className="text-lg font-bold">Set Up Your Trust Account</h2>
              <p className="text-sm text-muted-foreground">Create a trust or operating account to start tracking deposits, rent payments and fees.</p>
              <Button onClick={() => setShowNewAccount(true)} className="gap-2">
                <Plus size={14} /> Create Account
              </Button>
            </CardContent>
          </Card>
          {renderNewAccountDialog()}
        </div>
      </div>
    );
  }

  // ── Transaction Form Fields (shared between new & edit) ──
  function renderTxFormFields() {
    return (
      <div className="space-y-3">
        {!showEditTx && (
          <div>
            <Label className="text-xs">Account</Label>
            <Select value={txAccountId} onValueChange={setTxAccountId}>
              <SelectTrigger><SelectValue placeholder="Select account" /></SelectTrigger>
              <SelectContent>
                {accounts.map(a => (
                  <SelectItem key={a.id} value={a.id}>{a.account_name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        )}
        <div>
          <Label className="text-xs">Type</Label>
          <Select value={txCategory} onValueChange={setTxCategory}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              {TYPE_OPTIONS.map(o => (
                <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div>
          <Label className="text-xs">Client</Label>
          <Select value={txContactId || 'none'} onValueChange={v => setTxContactId(v === 'none' ? '' : v)}>
            <SelectTrigger><SelectValue placeholder="Select client" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="none">— None —</SelectItem>
              {contacts.map(c => (
                <SelectItem key={c.id} value={c.id}>{c.first_name} {c.last_name || ''}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div>
          <Label className="text-xs">Property</Label>
          <Select value={txPropertyId || 'none'} onValueChange={v => setTxPropertyId(v === 'none' ? '' : v)}>
            <SelectTrigger><SelectValue placeholder="Select property" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="none">— None —</SelectItem>
              {properties.map(p => (
                <SelectItem key={p.id} value={p.id}>{p.title} — {p.address}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="grid grid-cols-2 gap-2">
          <div>
            <Label className="text-xs">Amount ($AUD)</Label>
            <Input type="number" step="0.01" value={txAmount} onChange={e => setTxAmount(e.target.value)} placeholder="0.00" />
          </div>
          <div>
            <Label className="text-xs">GST (10%)</Label>
            <div className="flex items-center gap-2 h-10 px-3 border rounded-md bg-muted/50">
              <input type="checkbox" checked={txGst} onChange={e => setTxGst(e.target.checked)} className="rounded" />
              <span className="text-xs text-muted-foreground">
                {txAmount && txGst ? AUD.format(parseFloat(txAmount) * 0.1) : '$0.00'}
              </span>
            </div>
          </div>
        </div>
        <div>
          <Label className="text-xs">Payee / Client Name</Label>
          <Input value={txPayee} onChange={e => setTxPayee(e.target.value)} placeholder="Name" />
        </div>
        <div>
          <Label className="text-xs">Description</Label>
          <Textarea value={txDesc} onChange={e => setTxDesc(e.target.value)} rows={2} placeholder="Optional notes" />
        </div>
      </div>
    );
  }

  function renderNewAccountDialog() {
    return (
      <Dialog open={showNewAccount} onOpenChange={setShowNewAccount}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>New Account</DialogTitle>
            <DialogDescription>Create a trust or operating account.</DialogDescription>
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
    );
  }

  return (
    <div>
      <DashboardHeader
        title="Trust Dashboard"
        subtitle="Australian trust account management"
        actions={
          <Button size="sm" variant="outline" onClick={() => setShowNewAccount(true)} className="gap-1.5 text-xs">
            <Plus size={13} /> New Account
          </Button>
        }
      />
      <div className="p-4 sm:p-6 max-w-[1600px]">
        {/* ── 3-Panel Dashboard Cards ── */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
          {/* Receipts Card */}
          <Card className="border-l-4 border-l-primary">
            <CardContent className="p-4 space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Receipt size={16} className="text-primary" />
                  <h3 className="text-sm font-bold">Receipts</h3>
                  {newReceiptsCount > 0 && (
                    <Badge className="text-[10px]">{newReceiptsCount} New</Badge>
                  )}
                </div>
                <Button size="sm" className="h-7 text-xs gap-1.5" onClick={() => setShowNewReceipt(true)}>
                  <Plus size={12} /> New Receipt
                </Button>
              </div>
              <div className="space-y-1.5 pt-1 border-t border-border">
                <div className="flex items-center justify-between">
                  <span className="text-xs text-muted-foreground">Balance:</span>
                  <span className="text-sm font-bold">{AUD.format(totalInTrust)}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-xs text-muted-foreground">Last receipt:</span>
                  <span className="text-xs font-semibold font-mono">{lastReceiptNumber}</span>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Payments Card */}
          <Card className="border-l-4 border-l-orange-500">
            <CardContent className="p-4 space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <CreditCard size={16} className="text-orange-500" />
                  <h3 className="text-sm font-bold">Payments</h3>
                  {pendingPayments.length > 0 && (
                    <Badge variant="outline" className="text-[10px]">{pendingPayments.length} Ready</Badge>
                  )}
                </div>
                <Button size="sm" variant="outline" className="h-7 text-xs gap-1.5"
                  disabled={pendingPayments.length === 0}
                  onClick={() => {
                    setSelectedPaymentIds(new Set(pendingPayments.map(p => p.id)));
                    document.getElementById('bulk-payments-section')?.scrollIntoView({ behavior: 'smooth' });
                  }}>
                  <FileDown size={12} /> Download ABA
                </Button>
              </div>
              <div className="space-y-1.5 pt-1 border-t border-border">
                <div className="flex items-center justify-between">
                  <span className="text-xs text-muted-foreground">Unpaid:</span>
                  <span className="text-sm font-bold">{AUD.format(pendingPayments.reduce((s, p) => s + p.amount, 0))}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-xs text-muted-foreground">Next ABA:</span>
                  <span className="text-xs font-semibold">
                    {pendingPayments.length > 0
                      ? new Intl.DateTimeFormat('en-AU', { day: '2-digit', month: '2-digit' }).format(new Date(Date.now() + 86400000))
                      : '—'}
                  </span>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Reconciliation Card */}
          <Card className="border-l-4 border-l-green-500">
            <CardContent className="p-4 space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <BarChart3 size={16} className="text-green-500" />
                  <h3 className="text-sm font-bold">Reconciliation</h3>
                  {unmatchedCount > 0 && (
                    <Badge variant="destructive" className="text-[10px]">{unmatchedCount}</Badge>
                  )}
                </div>
                <Button size="sm" variant="outline" className="h-7 text-xs gap-1.5"
                  onClick={() => window.location.hash = '#/dashboard/reconciliation'}>
                  <Upload size={12} /> Upload CSV
                </Button>
              </div>
              <div className="space-y-1.5 pt-1 border-t border-border">
                <div className="flex items-center justify-between">
                  <span className="text-xs text-muted-foreground">Last reconciled:</span>
                  <span className="text-xs font-semibold flex items-center gap-1">
                    {lastReconciledDate
                      ? <>
                          {new Intl.DateTimeFormat('en-AU', { day: '2-digit', month: '2-digit' }).format(new Date(lastReconciledDate))}
                          <CheckCircle2 size={12} className="text-green-500" />
                        </>
                      : '—'}
                  </span>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* ── Bulk Payments Section ── */}
        {pendingPayments.length > 0 && (
          <Card className="mb-6">
            <CardContent className="p-4 space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <CreditCard size={16} className="text-primary" />
                  <h3 className="text-sm font-bold">Bulk Payments Ready</h3>
                  <Badge variant="outline" className="text-[10px]">{pendingPayments.length} Pending</Badge>
                </div>
                <div className="flex items-center gap-2">
                  <Button size="sm" variant="outline" className="h-8 text-xs gap-1.5"
                    onClick={() => {
                      if (selectedPaymentIds.size === pendingPayments.length) {
                        setSelectedPaymentIds(new Set());
                      } else {
                        setSelectedPaymentIds(new Set(pendingPayments.map(p => p.id)));
                      }
                    }}>
                    <CheckSquare size={12} />
                    {selectedPaymentIds.size === pendingPayments.length ? 'Deselect All' : 'Select All'}
                  </Button>
                  <Button size="sm" className="h-8 text-xs gap-1.5"
                    disabled={selectedPaymentIds.size === 0 || bulkLoading}
                    onClick={async () => {
                      const selected = pendingPayments.filter(p => selectedPaymentIds.has(p.id));
                      if (selected.length === 0) return;

                      // Generate ABA file
                      const today = new Date();
                      const dateStr = today.toISOString().slice(2, 10).replace(/-/g, '');
                      const firstAcc = accounts[0];
                      const bsb = (firstAcc?.bsb || '000-000').replace('-', '');
                      const accNum = (firstAcc?.account_number || '00000000').padEnd(9, ' ');
                      const bankName = (firstAcc?.bank_name || 'NAB').slice(0, 3).toUpperCase().padEnd(3, ' ');

                      // Header record (Type 0)
                      const header = `0                 01${bankName}       ${(firstAcc?.account_name || 'Trust Account').slice(0, 26).padEnd(26, ' ')}${bsb.padEnd(7, ' ')}                    ${dateStr}                                        `;

                      // Detail records (Type 1)
                      const details = selected.map(p => {
                        const pBsb = (p.bsb || '000-000').replace('-', '');
                        const pAcc = (p.account_number || '00000000').padEnd(9, ' ');
                        const amountCents = Math.round(p.amount * 100).toString().padStart(10, '0');
                        const name = (p.client_name || '').slice(0, 32).padEnd(32, ' ');
                        const ref = (p.reference || p.payment_number || '').slice(0, 18).padEnd(18, ' ');
                        const srcBsb = bsb;
                        const srcAcc = accNum;
                        return `1${pBsb}${pAcc} 530${amountCents}${name}${ref}${srcBsb}${srcAcc}        00000000`;
                      });

                      // Total record (Type 7)
                      const totalAmount = selected.reduce((s, p) => s + p.amount, 0);
                      const totalCents = Math.round(totalAmount * 100).toString().padStart(10, '0');
                      const countStr = selected.length.toString().padStart(6, '0');
                      const footer = `7999-999            ${totalCents}${totalCents}                        ${countStr}                                        `;

                      const abaContent = [header, ...details, footer].join('\r\n');
                      const blob = new Blob([abaContent], { type: 'text/plain' });
                      const url = URL.createObjectURL(blob);
                      const a = document.createElement('a');
                      a.href = url;
                      a.download = `trust_bulk_payment_${today.toISOString().split('T')[0]}.aba`;
                      a.click();
                      URL.revokeObjectURL(url);

                      // Mark selected as cleared
                      setBulkLoading(true);
                      try {
                        const { error } = await supabase
                          .from('trust_payments')
                          .update({ status: 'cleared' } as any)
                          .in('id', Array.from(selectedPaymentIds));
                        if (error) throw error;
                        toast.success(`ABA file downloaded with ${selected.length} payments. Marked as cleared.`);
                        setSelectedPaymentIds(new Set());
                        await fetchPendingPayments();
                      } catch (e: any) {
                        toast.error(e.message);
                      } finally {
                        setBulkLoading(false);
                      }
                    }}>
                    <FileDown size={12} /> Download ABA File
                  </Button>
                </div>
              </div>

              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-[40px]"></TableHead>
                    <TableHead className="text-xs">Client</TableHead>
                    <TableHead className="text-xs">Property</TableHead>
                    <TableHead className="text-xs text-right">Amount</TableHead>
                    <TableHead className="text-xs">BSB / Account</TableHead>
                    <TableHead className="text-xs">Ref</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {pendingPayments.map(p => (
                    <TableRow key={p.id}>
                      <TableCell>
                        <Checkbox
                          checked={selectedPaymentIds.has(p.id)}
                          onCheckedChange={(checked) => {
                            const next = new Set(selectedPaymentIds);
                            if (checked) next.add(p.id); else next.delete(p.id);
                            setSelectedPaymentIds(next);
                          }}
                        />
                      </TableCell>
                      <TableCell className="text-xs font-medium">{p.client_name}</TableCell>
                      <TableCell className="text-xs max-w-[180px] truncate">{p.property_address}</TableCell>
                      <TableCell className="text-xs text-right font-semibold">{AUD.format(p.amount)}</TableCell>
                      <TableCell className="text-xs font-mono text-muted-foreground">
                        {p.bsb || '—'} {p.account_number || ''}
                      </TableCell>
                      <TableCell className="text-xs font-mono">{p.reference || p.payment_number}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>

              <div className="flex items-center justify-between pt-1 border-t border-border">
                <p className="text-xs text-muted-foreground">
                  {selectedPaymentIds.size} of {pendingPayments.length} selected
                </p>
                <p className="text-sm font-bold">
                  Total: {AUD.format(pendingPayments.filter(p => selectedPaymentIds.has(p.id)).reduce((s, p) => s + p.amount, 0))}
                </p>
              </div>
            </CardContent>
          </Card>
        )}

        <div className="flex flex-col lg:flex-row gap-4">
          {/* ── Main Table (80%) ── */}
          <div className="flex-1 min-w-0 space-y-3">
            {/* Filters */}
            <div className="flex flex-wrap items-center gap-2">
              <div className="flex items-center gap-1">
                <CalendarIcon size={13} className="text-muted-foreground" />
                <Input type="date" value={filterDateFrom} onChange={e => setFilterDateFrom(e.target.value)}
                  className="h-8 w-[130px] text-xs" placeholder="From" />
                <span className="text-xs text-muted-foreground">to</span>
                <Input type="date" value={filterDateTo} onChange={e => setFilterDateTo(e.target.value)}
                  className="h-8 w-[130px] text-xs" placeholder="To" />
              </div>
              <Select value={filterClient} onValueChange={setFilterClient}>
                <SelectTrigger className="w-[150px] h-8 text-xs">
                  <Users size={12} className="mr-1" /><SelectValue placeholder="All Clients" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Clients</SelectItem>
                  {contacts.map(c => (
                    <SelectItem key={c.id} value={c.id}>{c.first_name} {c.last_name || ''}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Select value={filterProperty} onValueChange={setFilterProperty}>
                <SelectTrigger className="w-[160px] h-8 text-xs">
                  <Home size={12} className="mr-1" /><SelectValue placeholder="All Properties" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Properties</SelectItem>
                  {properties.map(p => (
                    <SelectItem key={p.id} value={p.id}>{p.title}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Select value={filterStatus} onValueChange={setFilterStatus}>
                <SelectTrigger className="w-[120px] h-8 text-xs">
                  <SelectValue placeholder="All Status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Status</SelectItem>
                  <SelectItem value="pending">Pending</SelectItem>
                  <SelectItem value="completed">Cleared</SelectItem>
                  <SelectItem value="reconciled">Reconciled</SelectItem>
                </SelectContent>
              </Select>
              <div className="ml-auto">
                <Button size="sm" variant="outline" onClick={exportCsv} className="gap-1.5 text-xs h-8">
                  <FileDown size={13} /> Audit-Ready Report
                </Button>
              </div>
            </div>

            {/* Table */}
            <Card>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="text-xs">Date</TableHead>
                    <TableHead className="text-xs">Client Name</TableHead>
                    <TableHead className="text-xs">Property Address</TableHead>
                    <TableHead className="text-xs">Type</TableHead>
                    <TableHead className="text-xs text-right">Amount</TableHead>
                    <TableHead className="text-xs">Status</TableHead>
                    <TableHead className="text-xs text-right">Balance Impact</TableHead>
                    <TableHead className="text-xs w-[120px]"></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {txWithBalance.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={8} className="text-center text-muted-foreground py-10 text-sm">
                        No trust entries found. Use Quick Actions to add your first entry.
                      </TableCell>
                    </TableRow>
                  ) : (
                    txWithBalance.map(tx => {
                      const isDeposit = tx.transaction_type === 'deposit';
                      const badge = STATUS_MAP[tx.status] || STATUS_MAP.pending;
                      const clientName = tx.contact
                        ? `${tx.contact.first_name} ${tx.contact.last_name || ''}`.trim()
                        : tx.payee_name || '—';
                      return (
                        <TableRow key={tx.id}>
                          <TableCell className="text-xs whitespace-nowrap">{DATE_FMT.format(new Date(tx.transaction_date))}</TableCell>
                          <TableCell className="text-xs">{clientName}</TableCell>
                          <TableCell className="text-xs max-w-[180px] truncate">{tx.property?.address || '—'}</TableCell>
                          <TableCell>
                            <Badge variant="outline" className="text-[10px] capitalize">{tx.category}</Badge>
                          </TableCell>
                          <TableCell className={`text-xs text-right font-semibold ${isDeposit ? 'text-green-600' : 'text-destructive'}`}>
                            {isDeposit ? '+' : '-'}{AUD.format(tx.amount)}
                          </TableCell>
                          <TableCell>
                            <Badge variant={badge.variant} className="text-[10px]">{badge.label}</Badge>
                          </TableCell>
                          <TableCell className="text-xs text-right font-mono">
                            <span className="flex items-center justify-end gap-1">
                              {isDeposit ? <TrendingUp size={11} className="text-green-500" /> : <TrendingDown size={11} className="text-destructive" />}
                              {AUD.format(tx.runningBalance)}
                            </span>
                          </TableCell>
                          <TableCell>
                            <div className="flex items-center gap-0.5 justify-end">
                              {tx.status === 'pending' && (
                                <Button size="sm" variant="ghost" className="h-7 px-1.5 text-[10px] gap-1"
                                  onClick={() => handleMarkCleared(tx.id)} title="Mark as Cleared">
                                  <CheckCircle2 size={12} className="text-green-500" />
                                </Button>
                              )}
                              <Button size="sm" variant="ghost" className="h-7 px-1.5"
                                onClick={() => openEdit(tx)} title="Edit">
                                <Pencil size={12} />
                              </Button>
                              <Button size="sm" variant="ghost" className="h-7 px-1.5 text-destructive"
                                onClick={() => { setDeletingTxId(tx.id); setShowDeleteConfirm(true); }} title="Delete">
                                <Trash2 size={12} />
                              </Button>
                            </div>
                          </TableCell>
                        </TableRow>
                      );
                    })
                  )}
                </TableBody>
              </Table>
            </Card>
          </div>

          {/* ── Quick Actions Sidebar (20%) ── */}
          <div className="w-full lg:w-[220px] shrink-0 space-y-3">
            <h3 className="text-xs font-bold uppercase tracking-wide text-muted-foreground">Quick Actions</h3>
            <Button className="w-full justify-start gap-2 text-sm" size="sm"
              onClick={() => setShowNewReceipt(true)}>
              <Receipt size={14} /> New Trust Receipt
            </Button>
            <Button className="w-full justify-start gap-2 text-sm" variant="secondary" size="sm"
              onClick={() => openNewTx('deposit')}>
              <ArrowDownCircle size={14} /> New Deposit
            </Button>
            <Button className="w-full justify-start gap-2 text-sm" variant="secondary" size="sm"
              onClick={() => openNewTx('rent')}>
              <DollarSign size={14} /> New Rent Payment
            </Button>
            <Button className="w-full justify-start gap-2 text-sm" variant="outline" size="sm"
              onClick={handleBulkClear}
              disabled={transactions.filter(t => t.status === 'pending').length === 0}>
              <CheckCircle2 size={14} /> Mark All Pending as Cleared
            </Button>

            {/* Account summaries */}
            <div className="pt-3 border-t border-border space-y-2">
              <h4 className="text-xs font-bold uppercase tracking-wide text-muted-foreground">Accounts</h4>
              {accounts.map(acc => (
                <div key={acc.id} className="rounded-md border border-border p-2.5">
                  <div className="flex items-center justify-between mb-0.5">
                    <Badge variant={acc.account_type === 'trust' ? 'default' : 'secondary'} className="text-[9px]">
                      {acc.account_type}
                    </Badge>
                  </div>
                  <p className="text-xs font-semibold truncate">{acc.account_name}</p>
                  <p className="text-sm font-bold">{AUD.format(acc.balance)}</p>
                  {acc.bank_name && (
                    <p className="text-[10px] text-muted-foreground">{acc.bank_name}</p>
                  )}
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* ── New Transaction Dialog ── */}
      <Dialog open={showNewTx} onOpenChange={setShowNewTx}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {txCategory === 'rent' ? 'New Rent Payment' : txCategory === 'deposit' ? 'New Deposit' : `New ${txCategory}`}
            </DialogTitle>
            <DialogDescription>Record a new trust entry.</DialogDescription>
          </DialogHeader>
          {renderTxFormFields()}
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowNewTx(false)}>Cancel</Button>
            <Button onClick={handleCreateTx} disabled={!txAccountId || !txAmount}>Record</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ── Edit Transaction Dialog ── */}
      <Dialog open={showEditTx} onOpenChange={setShowEditTx}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit Transaction</DialogTitle>
            <DialogDescription>Update this trust entry.</DialogDescription>
          </DialogHeader>
          {renderTxFormFields()}
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowEditTx(false)}>Cancel</Button>
            <Button onClick={handleEditTx}>Save Changes</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ── Delete Confirmation ── */}
      <Dialog open={showDeleteConfirm} onOpenChange={setShowDeleteConfirm}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>Void Transaction</DialogTitle>
            <DialogDescription>
              This will mark the transaction as voided. It won't be deleted — the audit trail is preserved per Australian trust accounting regulations.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowDeleteConfirm(false)}>Cancel</Button>
            <Button variant="destructive" onClick={handleDeleteTx}>Void Transaction</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {renderNewAccountDialog()}

      {/* ── New Trust Receipt Modal ── */}
      <TrustReceiptModal
        open={showNewReceipt}
        onOpenChange={setShowNewReceipt}
        onCreated={() => {
          fetchAccounts();
          fetchTransactions();
        }}
      />
    </div>
  );
};

export default TrustAccountingPage;
