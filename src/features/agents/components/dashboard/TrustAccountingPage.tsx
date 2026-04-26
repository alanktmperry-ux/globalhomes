import { useState, useMemo, useCallback, useEffect } from 'react';
import { useSubscription } from '@/features/agents/hooks/useSubscription';
import UpgradeGate from '@/features/agents/components/shared/UpgradeGate';
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
  ExternalLink,
} from 'lucide-react';
import { Checkbox } from '@/components/ui/checkbox';
import { supabase } from '@/integrations/supabase/client';
import DashboardHeader from './DashboardHeader';
import TrustImportWizard from './TrustImportWizard';
import TrustReceiptModal from './TrustReceiptModal';
import { useTrustAccounting, TrustTransaction } from '@/features/agents/hooks/useTrustAccounting';
import { useAuth } from '@/features/auth/AuthProvider';
import { useSearchParams } from 'react-router-dom';
import { toast } from 'sonner';
import { getErrorMessage } from '@/shared/lib/errorUtils';

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
  received: { variant: 'outline', label: 'Received' },
  deposited: { variant: 'default', label: 'Deposited' },
  cleared: { variant: 'default', label: 'Cleared' },
  completed: { variant: 'default', label: 'Cleared' },
  reconciled: { variant: 'secondary', label: 'Reconciled' },
  voided: { variant: 'destructive', label: 'Voided' },
};

const TrustAccountingPage = () => {
  const { user } = useAuth();
  const { canAccessTrust, loading: subLoading } = useSubscription();
  const {
    accounts, transactions, contacts, properties, loading,
    hasMoreTx, loadMoreTransactions,
    fetchAccounts, fetchTransactions,
    createAccount, createTransaction, voidTransaction,
  } = useTrustAccounting();

  const [searchParams, setSearchParams] = useSearchParams();
  const urlPropertyId = searchParams.get('property_id');

  // Filters
  const [filterStatus, setFilterStatus] = useState('all');
  const [filterClient, setFilterClient] = useState('all');
  const [filterProperty, setFilterProperty] = useState(urlPropertyId || 'all');
  const [filterDateFrom, setFilterDateFrom] = useState('');
  const [filterDateTo, setFilterDateTo] = useState('');

  // Sync URL ?property_id → filter state
  useEffect(() => {
    if (urlPropertyId && filterProperty !== urlPropertyId) setFilterProperty(urlPropertyId);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [urlPropertyId]);

  const filteredPropertyAddress = useMemo(
    () => urlPropertyId ? properties.find(p => p.id === urlPropertyId)?.address : null,
    [urlPropertyId, properties]
  );

  // Modals
  const [showNewTx, setShowNewTx] = useState(false);
  const [showEditTx, setShowEditTx] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [showNewAccount, setShowNewAccount] = useState(false);
  const [showNewReceipt, setShowNewReceipt] = useState(false);
  const [showImportWizard, setShowImportWizard] = useState(false);
  const [editingTx, setEditingTx] = useState<TrustTransaction | null>(null);
  const [deletingTx, setDeletingTx] = useState<TrustTransaction | null>(null);

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

  const [overdrawnLedgers, setOverdrawnLedgers] = useState<{ name: string; balance: number }[]>([]);

  // Fetch agent record
  const [agent, setAgent] = useState<{ id: string } | null>(null);
  useEffect(() => {
    if (!user) return;
    supabase.from('agents').select('id').eq('user_id', user.id).maybeSingle().then(({ data }) => {
      if (data) setAgent(data);
    });
  }, [user]);

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

  const checkOverdrawn = useCallback(async () => {
    if (!agent?.id) return;
    // Use the unified transactions from receipts/payments
    const ledgers = new Map<string, number>();
    transactions.filter(t => t.status !== 'voided').forEach(tx => {
      const key = tx.client_name || tx.payee_name || 'Unknown';
      const current = ledgers.get(key) || 0;
      const impact = tx.transaction_type === 'deposit' ? tx.amount : -tx.amount;
      ledgers.set(key, current + impact);
    });
    const overdrawn = Array.from(ledgers.entries())
      .filter(([_, bal]) => bal < 0)
      .map(([name, balance]) => ({ name, balance }));
    setOverdrawnLedgers(overdrawn);
    if (overdrawn.length > 0) {
      toast.error(
        `⚠️ ${overdrawn.length} client ledger${overdrawn.length > 1 ? 's are' : ' is'} overdrawn`,
        {
          description: 'A trust account ledger must never have a debit balance. Notify your regulator immediately and remedy the shortfall.',
          duration: 12000,
        }
      );
    }
  }, [agent?.id, transactions]);

  useEffect(() => { fetchPendingPayments(); fetchDashboardStats(); checkOverdrawn(); }, [fetchPendingPayments, fetchDashboardStats, checkOverdrawn]);

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
  const [newAccOpeningBalance, setNewAccOpeningBalance] = useState('0');

  // Computed
  const trustAccounts = accounts.filter(a => a.account_type === 'trust');
  const totalInTrust = trustAccounts.reduce((s, a) => s + a.current_balance, 0);

  const now = new Date();
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1).toISOString().split('T')[0];

  const pendingTotal = useMemo(() =>
    transactions.filter(t => t.status === 'pending' || t.status === 'received').reduce((s, t) => s + t.amount, 0),
    [transactions]);

  const clearedThisMonth = useMemo(() =>
    transactions
      .filter(t => (t.status === 'deposited' || t.status === 'cleared' || t.status === 'completed') && t.transaction_date >= monthStart)
      .reduce((s, t) => s + t.amount, 0),
    [transactions, monthStart]);

  const lastEntry = useMemo(() => {
    const sorted = [...transactions].filter(t => t.status !== 'voided').sort((a, b) =>
      new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
    );
    return sorted[0] || null;
  }, [transactions]);

  const lastEntryText = lastEntry
    ? `${lastEntry.category === 'deposit' ? 'Deposit' : lastEntry.category === 'rent' ? 'Rent' : lastEntry.category} from ${lastEntry.client_name || lastEntry.payee_name || 'Unknown'} — ${DATE_FMT.format(new Date(lastEntry.transaction_date))}`
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
    // Transactions are not linked to a specific account; use the sole account's
    // opening balance when there is exactly one, otherwise sum opening balances.
    const startingBalance = accounts.length === 1
      ? (accounts[0].opening_balance ?? 0)
      : accounts.reduce((sum, a) => sum + (a.opening_balance ?? 0), 0);
    let balance = startingBalance;
    const reversed = [...filteredTx].reverse();
    const result = reversed.map(tx => {
      const impact = tx.transaction_type === 'deposit' ? tx.amount : -tx.amount;
      balance += impact;
      return { ...tx, runningBalance: balance };
    });
    return result.reverse();
  }, [filteredTx, accounts]);

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
    if (!txAmount || !agent) return;
    const amount = parseFloat(txAmount);
    if (isNaN(amount) || amount <= 0) { toast.error('Enter a valid amount'); return; }
    const isDeposit = txCategory === 'deposit' || txCategory === 'rent';

    try {
      await createTransaction({
        type: isDeposit ? 'receipt' : 'payment',
        agent_id: agent.id,
        client_name: txPayee || 'Unknown',
        property_address: properties.find(p => p.id === txPropertyId)?.address || '',
        amount,
        purpose: txCategory,
        description: txDesc || undefined,
        property_id: txPropertyId || null,
      });
      toast.success('Transaction recorded');
      setShowNewTx(false);
      resetTxForm();
    } catch (e: unknown) {
      toast.error(getErrorMessage(e));
    }
  };

  const handleVoidTx = async () => {
    if (!deletingTx) return;
    try {
      await voidTransaction(deletingTx.id, deletingTx.source_table);
      toast.success('Transaction voided (correction entry created)');
      setShowDeleteConfirm(false);
      setDeletingTx(null);
    } catch (e: unknown) {
      toast.error(getErrorMessage(e));
    }
  };

  const handleCreateAccount = async () => {
    if (!newAccName || !newAccBank || !newAccBsb || !newAccNumber || !user) return;
    if (!/^\d{6}$/.test(newAccBsb)) { toast.error('BSB must be exactly 6 digits'); return; }
    if (!/^\d{6,10}$/.test(newAccNumber.replace(/\s/g, ''))) {
      toast.error('Account number must be 6–10 digits'); return;
    }
    const openingBalance = parseFloat(newAccOpeningBalance);
    if (newAccOpeningBalance && isNaN(openingBalance)) {
      toast.error('Opening balance must be a valid number'); return;
    }
    const safeOpeningBalance = isNaN(openingBalance) ? 0 : openingBalance;
    try {
      const { data: agentData } = await supabase
        .from('agents').select('id').eq('user_id', user.id).maybeSingle();
      if (!agentData) { toast.error('Agent profile not found'); return; }
      await createAccount({
        agent_id: agentData.id,
        account_name: newAccName,
        account_type: newAccType,
        bsb: newAccBsb,
        account_number: newAccNumber,
        bank_name: newAccBank,
        opening_balance: safeOpeningBalance,
        current_balance: safeOpeningBalance,
      } as any);
      // Also update opening_balance and current_balance via direct update
      toast.success('Trust account created successfully.');
      setShowNewAccount(false);
      setNewAccName(''); setNewAccBsb(''); setNewAccNumber(''); setNewAccBank(''); setNewAccOpeningBalance('0');
      await fetchAccounts();
    } catch (e: unknown) {
      toast.error(getErrorMessage(e));
    }
  };

  // CSV export
  const exportCsv = () => {
    const headers = ['Date', 'Client Name', 'Property Address', 'Type', 'Amount', 'Status', 'Balance Impact', 'Description', 'Reference'];
    const rows = txWithBalance.map(tx => [
      tx.transaction_date,
      tx.client_name || tx.payee_name || '',
      tx.property_address || '',
      tx.category,
      tx.amount.toFixed(2),
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

  // Xero bank import export
  const exportXero = () => {
    const headers = ['Date', 'Amount', 'Payee', 'Description', 'Reference'];
    const rows = txWithBalance
      .filter(tx => tx.status !== 'voided')
      .map(tx => {
        const d = new Date(tx.transaction_date);
        const dateStr = `${String(d.getDate()).padStart(2, '0')}/${String(d.getMonth() + 1).padStart(2, '0')}/${d.getFullYear()}`;
        const isInflow = tx.transaction_type === 'deposit' || tx.category === 'rent';
        const signedAmount = isInflow ? tx.amount.toFixed(2) : (-tx.amount).toFixed(2);
        const payee = tx.client_name || tx.payee_name || '';
        const description = [tx.property_address, tx.description].filter(Boolean).join(' — ') || tx.category;
        const reference = tx.reference || '';
        return [dateStr, signedAmount, payee, description, reference];
      });
    const csv = [headers.join(','), ...rows.map(r => r.map(c => `"${String(c).replace(/"/g, '""')}"`).join(','))].join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `xero_import_${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
    URL.revokeObjectURL(url);
    toast.success('Xero import file downloaded — import via Xero > Bank Accounts > Import Statement');
  };

  if (loading) {
    return (
      <div>
        <DashboardHeader title="Trust Dashboard" subtitle="Australian trust account management" />
        <div className="p-6 text-center text-muted-foreground">Loading…</div>
      </div>
    );
  }

  if (showImportWizard) {
    return (
      <div>
        <DashboardHeader title="Trust Dashboard" subtitle="Import existing trust account" />
        <div className="p-4 sm:p-6">
          <TrustImportWizard
            onComplete={() => { setShowImportWizard(false); fetchAccounts(); fetchTransactions(); }}
            onCancel={() => setShowImportWizard(false)}
          />
        </div>
      </div>
    );
  }

  if (accounts.length === 0) {
    return (
      <div>
        <DashboardHeader title="Trust Dashboard" subtitle="Australian trust account management" />
        <div className="p-4 sm:p-6 max-w-3xl mx-auto space-y-4">
          <Card>
            <CardContent className="p-10 text-center space-y-4">
              <Landmark size={40} className="mx-auto text-muted-foreground/40" />
              <h2 className="text-lg font-bold">Set Up Your Trust Account</h2>
              <p className="text-sm text-muted-foreground">Create a new trust account or import from your existing system.</p>
              <div className="flex flex-col sm:flex-row gap-3 justify-center">
                <Button onClick={() => setShowNewAccount(true)} className="gap-2">
                  <Plus size={14} /> Create New Account
                </Button>
                <Button variant="outline" onClick={() => setShowImportWizard(true)} className="gap-2">
                  <Upload size={14} /> Import Existing Account
                </Button>
              </div>
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
    const isFormValid = newAccName && newAccBank && newAccBsb && newAccNumber && /^\d{6}$/.test(newAccBsb);
    return (
      <Dialog open={showNewAccount} onOpenChange={setShowNewAccount}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Create Trust Account</DialogTitle>
            <DialogDescription>Set up a new trust or operating account.</DialogDescription>
          </DialogHeader>
          <div className="space-y-3">
            <div>
              <Label className="text-xs">Account Name <span className="text-destructive">*</span></Label>
              <Input value={newAccName} onChange={e => setNewAccName(e.target.value)} placeholder="e.g. Rental Trust Account" required />
            </div>
            <div>
              <Label className="text-xs">Bank Name <span className="text-destructive">*</span></Label>
              <Input value={newAccBank} onChange={e => setNewAccBank(e.target.value)} placeholder="e.g. NAB, CBA" required />
            </div>
            <div className="grid grid-cols-2 gap-2">
              <div>
                <Label className="text-xs">BSB (6 digits) <span className="text-destructive">*</span></Label>
                <Input value={newAccBsb} onChange={e => setNewAccBsb(e.target.value.replace(/\D/g, '').slice(0, 6))} placeholder="e.g. 062000" maxLength={6} required />
              </div>
              <div>
                <Label className="text-xs">Account Number <span className="text-destructive">*</span></Label>
                <Input value={newAccNumber} onChange={e => setNewAccNumber(e.target.value)} placeholder="e.g. 12345678" required />
              </div>
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
            <div>
              <Label className="text-xs">Opening Balance ($)</Label>
              <Input type="number" min="0" step="0.01" value={newAccOpeningBalance} onChange={e => setNewAccOpeningBalance(e.target.value)} placeholder="0.00" />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowNewAccount(false)}>Cancel</Button>
            <Button onClick={handleCreateAccount} disabled={!isFormValid}>Create Account</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    );
  }

  if (!subLoading && !canAccessTrust) {
    return <UpgradeGate requiredPlan="Pro or above" message="Trust accounting is available on the Pro plan and above. Record deposits, manage client ledgers, generate compliance-ready statements, and import your opening balance from PropertyMe." />;
  }

  return (
    <div>
      <div className="px-4 sm:px-6 pt-4">
        <nav className="text-sm text-muted-foreground mb-2">
          <span>Dashboard</span>
          {filteredPropertyAddress && (
            <>
              <span className="mx-2">→</span>
              <span>Rent Roll</span>
              <span className="mx-2">→</span>
              <span>{filteredPropertyAddress}</span>
            </>
          )}
          <span className="mx-2">→</span>
          <span className="font-medium text-foreground">Trust Accounting</span>
        </nav>
      </div>
      <DashboardHeader
        title={filteredPropertyAddress ? `Trust transactions for ${filteredPropertyAddress}` : 'Trust Dashboard'}
        subtitle="Australian trust account management"
        actions={
          <Button size="sm" variant="outline" onClick={() => setShowNewAccount(true)} className="gap-1.5 text-xs">
            <Plus size={13} /> New Account
          </Button>
        }
      />

      {urlPropertyId && filteredPropertyAddress && (
        <div className="mx-4 mt-3 sm:mx-6 flex items-center gap-2 text-xs bg-primary/10 text-primary rounded-md px-3 py-2">
          <span>Filtered by property: <strong>{filteredPropertyAddress}</strong></span>
          <button
            onClick={() => {
              const next = new URLSearchParams(searchParams);
              next.delete('property_id');
              setSearchParams(next, { replace: true });
              setFilterProperty('all');
            }}
            className="ml-auto underline"
          >
            Clear filter
          </button>
        </div>
      )}

      {overdrawnLedgers.length > 0 && (
        <div className="mx-4 mt-4 sm:mx-6 bg-destructive/10 border border-destructive/30 rounded-xl p-4 flex items-start gap-3">
          <AlertTriangle size={18} className="text-destructive flex-shrink-0 mt-0.5" />
          <div className="flex-1">
            <p className="text-sm font-bold text-destructive">
              ⚠️ Trust ledger overdrawn — immediate action required
            </p>
            <p className="text-xs text-destructive/80 mt-1">
              The following client ledger{overdrawnLedgers.length > 1 ? 's have' : ' has'} a debit balance.
              Under Australian trust accounting law, a trust ledger must never go into debit.
              You must remedy the shortfall immediately and notify your state regulator in writing.
            </p>
            <div className="mt-2 space-y-1">
              {overdrawnLedgers.map(l => (
                <div key={l.name} className="flex items-center justify-between text-xs bg-destructive/10 rounded px-2 py-1">
                  <span className="font-medium text-foreground">{l.name}</span>
                  <span className="font-mono text-destructive font-bold">−${Math.abs(l.balance).toFixed(2)}</span>
                </div>
              ))}
            </div>
            <p className="text-xs text-muted-foreground mt-2">
              Remedy: Transfer funds from your trading account to cover the shortfall, then notify your state regulator
              in writing with the date, amount, reason, and corrective action taken.
              Use Journal Adjustment in the Trust Ledger to record the correction.
            </p>
          </div>
        </div>
      )}

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
          <Card className="mb-6" id="bulk-payments-section">
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
                      } catch (e: unknown) {
                        toast.error(getErrorMessage(e));
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
              <div className="ml-auto flex gap-2">
                <Button size="sm" variant="outline" onClick={exportCsv} className="gap-1.5 text-xs h-8">
                  <FileDown size={13} /> Audit-Ready Report
                </Button>
                <Button size="sm" variant="outline" onClick={exportXero} className="gap-1.5 text-xs h-8">
                  <FileDown size={12} /> Export for Xero
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
                      const clientName = tx.client_name || tx.payee_name || '—';
                      return (
                        <TableRow key={tx.id}>
                          <TableCell className="text-xs whitespace-nowrap">{DATE_FMT.format(new Date(tx.transaction_date))}</TableCell>
                          <TableCell className="text-xs">{clientName}</TableCell>
                          <TableCell className="text-xs max-w-[180px] truncate">{tx.property_address || '—'}</TableCell>
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
                              <Button size="sm" variant="ghost" className="h-7 px-1.5 text-destructive"
                                onClick={() => { setDeletingTx(tx); setShowDeleteConfirm(true); }} title="Void">
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
              {hasMoreTx && (
                <div className="flex justify-center py-3 border-t border-border">
                  <Button variant="outline" size="sm" onClick={loadMoreTransactions} disabled={loading}>
                    {loading ? 'Loading…' : 'Load more transactions'}
                  </Button>
                </div>
              )}
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
            <p className="text-[10px] text-muted-foreground italic mt-2">
              Trust entries are immutable per audit regulations. Use Void to create a correction entry.
            </p>

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
                  <p className="text-sm font-bold">{AUD.format(acc.current_balance)}</p>
                  {acc.bank_name && (
                    <p className="text-[10px] text-muted-foreground">{acc.bank_name}</p>
                  )}
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* ── Xero Integration Card ── */}
        <Card className="mt-6">
          <CardContent className="p-4 flex items-center gap-4">
            <div className="w-10 h-10 rounded-lg bg-[hsl(var(--primary)/0.1)] flex items-center justify-center shrink-0">
              <ExternalLink size={18} className="text-primary" />
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2">
                <h4 className="text-sm font-bold">Xero Integration</h4>
                <Badge variant="secondary" className="text-[10px]">Coming Soon</Badge>
              </div>
              <p className="text-xs text-muted-foreground mt-0.5">
                Auto-sync trust transactions to Xero. Use the manual export above while native sync is in beta.
              </p>
            </div>
            <Button
              size="sm"
              variant="outline"
              className="gap-1.5 text-xs shrink-0"
              onClick={() => toast.info('Xero native sync is coming soon. Use Export for Xero to import manually.')}
            >
              <ExternalLink size={12} /> Connect Xero Account
            </Button>
          </CardContent>
        </Card>

        {/* ── AFA Compliance Footer ── */}
        <div className="mt-6 py-3 px-4 rounded-lg bg-muted/50 border border-border flex items-center justify-center gap-3">
          <ShieldCheck size={14} className="text-primary shrink-0" />
          <p className="text-[11px] text-muted-foreground text-center">
            AFA 2014 compliant &bull; Audit-ready exports &bull; 5-year retention &bull; Voided entries preserved
          </p>
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

      {/* ── Void Confirmation ── */}
      <Dialog open={showDeleteConfirm} onOpenChange={setShowDeleteConfirm}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>Void Transaction</DialogTitle>
            <DialogDescription>
              This will create a correction entry that reverses the original amount. The original entry is preserved per Australian trust accounting regulations.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowDeleteConfirm(false)}>Cancel</Button>
            <Button variant="destructive" onClick={handleVoidTx}>Void Transaction</Button>
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
