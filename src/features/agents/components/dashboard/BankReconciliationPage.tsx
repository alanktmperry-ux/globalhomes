import { useState, useMemo, useEffect, useCallback } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Separator } from '@/components/ui/separator';
import {
  Scale, Plus, CheckCircle2, XCircle, Link2, Unlink, ArrowDownCircle, ArrowUpCircle,
  CalendarIcon, Search, FileDown, DollarSign, Clock, AlertTriangle, Upload,
  RefreshCw, FileText, Check,
} from 'lucide-react';
import DashboardHeader from './DashboardHeader';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/lib/AuthProvider';
import { toast } from 'sonner';

const AUD = new Intl.NumberFormat('en-AU', { style: 'currency', currency: 'AUD', minimumFractionDigits: 2 });
const DATE_FMT = new Intl.DateTimeFormat('en-AU', { day: '2-digit', month: 'short', year: 'numeric' });

interface Reconciliation {
  id: string;
  agent_id: string;
  bank_date: string;
  description: string | null;
  amount: number;
  bank_balance: number;
  matched_receipt_id: string | null;
  matched_payment_id: string | null;
  status: string;
  created_at: string;
}

interface MatchCandidate {
  id: string;
  type: 'receipt' | 'payment';
  number: string;
  client: string;
  amount: number;
  date: string;
  method: string;
}

const STATUS_CONFIG: Record<string, { variant: 'default' | 'secondary' | 'outline' | 'destructive'; label: string }> = {
  unmatched: { variant: 'destructive', label: 'Unmatched' },
  matched: { variant: 'default', label: 'Matched' },
  manual: { variant: 'secondary', label: 'Manual' },
};

const BankReconciliationPage = () => {
  const { user } = useAuth();
  const [items, setItems] = useState<Reconciliation[]>([]);
  const [receipts, setReceipts] = useState<MatchCandidate[]>([]);
  const [payments, setPayments] = useState<MatchCandidate[]>([]);
  const [loading, setLoading] = useState(true);
  const [filterStatus, setFilterStatus] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');

  // Add statement entry modal
  const [showAdd, setShowAdd] = useState(false);
  const [addDate, setAddDate] = useState(new Date().toISOString().split('T')[0]);
  const [addDesc, setAddDesc] = useState('');
  const [addAmount, setAddAmount] = useState('');
  const [addBalance, setAddBalance] = useState('');
  const [addSaving, setAddSaving] = useState(false);

  // Match modal
  const [showMatch, setShowMatch] = useState(false);
  const [matchingItem, setMatchingItem] = useState<Reconciliation | null>(null);
  const [matchSearch, setMatchSearch] = useState('');
  const [matchSaving, setMatchSaving] = useState(false);

  // CSV import modal
  const [showImport, setShowImport] = useState(false);
  const [csvText, setCsvText] = useState('');
  const [importSaving, setImportSaving] = useState(false);
  const [dragging, setDragging] = useState(false);
  const [autoMatchRunning, setAutoMatchRunning] = useState(false);
  const [reconcileAllRunning, setReconcileAllRunning] = useState(false);
  const [currentBalance, setCurrentBalance] = useState<number | null>(null);
  const fileInputRef = useCallback((node: HTMLInputElement | null) => { /* stored for click */ }, []);
  const [fileInputEl, setFileInputEl] = useState<HTMLInputElement | null>(null);

  const fetchData = useCallback(async () => {
    if (!user) return;
    setLoading(true);

    const [{ data: recon }, { data: recs }, { data: pays }, { data: balData }] = await Promise.all([
      supabase.from('trust_reconciliations').select('*').order('bank_date', { ascending: false }),
      supabase.from('trust_receipts').select('id, receipt_number, client_name, amount, date_received, payment_method'),
      supabase.from('trust_payments').select('id, payment_number, client_name, amount, date_paid, payment_method'),
      supabase.from('trust_account_balances').select('current_balance').limit(1).single(),
    ]);

    if (recon) setItems(recon as unknown as Reconciliation[]);
    if (recs) setReceipts((recs as any[]).map(r => ({
      id: r.id, type: 'receipt' as const, number: r.receipt_number,
      client: r.client_name, amount: r.amount, date: r.date_received, method: r.payment_method,
    })));
    if (pays) setPayments((pays as any[]).map(p => ({
      id: p.id, type: 'payment' as const, number: p.payment_number,
      client: p.client_name, amount: p.amount, date: p.date_paid, method: p.payment_method,
    })));
    if (balData) setCurrentBalance((balData as any).current_balance ?? null);

    setLoading(false);
  }, [user]);

  useEffect(() => { fetchData(); }, [fetchData]);

  // ── Auto-match logic ──
  const runAutoMatch = async (reconItems: Reconciliation[]) => {
    if (!user) return;
    setAutoMatchRunning(true);
    let matchCount = 0;

    const unmatchedItems = reconItems.filter(i => i.status === 'unmatched');
    const usedReceiptIds = new Set(reconItems.filter(i => i.matched_receipt_id).map(i => i.matched_receipt_id!));
    const usedPaymentIds = new Set(reconItems.filter(i => i.matched_payment_id).map(i => i.matched_payment_id!));

    for (const item of unmatchedItems) {
      const isCredit = item.amount > 0;
      const targetAmt = Math.abs(item.amount);
      const desc = (item.description || '').toLowerCase();

      if (isCredit) {
        // Try match to receipt by amount, then by client name similarity
        const candidate = receipts.find(r =>
          !usedReceiptIds.has(r.id) &&
          Math.abs(r.amount - targetAmt) < 0.01 &&
          (desc.includes(r.client.toLowerCase().slice(0, 5)) || true) // amount match is primary
        );
        if (candidate) {
          const { error } = await supabase
            .from('trust_reconciliations')
            .update({ status: 'matched', matched_receipt_id: candidate.id } as any)
            .eq('id', item.id);
          if (!error) { usedReceiptIds.add(candidate.id); matchCount++; }
        }
      } else {
        const candidate = payments.find(p =>
          !usedPaymentIds.has(p.id) &&
          Math.abs(p.amount - targetAmt) < 0.01
        );
        if (candidate) {
          const { error } = await supabase
            .from('trust_reconciliations')
            .update({ status: 'matched', matched_payment_id: candidate.id } as any)
            .eq('id', item.id);
          if (!error) { usedPaymentIds.add(candidate.id); matchCount++; }
        }
      }
    }

    setAutoMatchRunning(false);
    await fetchData();
    const pct = unmatchedItems.length > 0 ? Math.round((matchCount / unmatchedItems.length) * 100) : 0;
    toast.success(`Auto-matched ${matchCount} of ${unmatchedItems.length} entries (${pct}%)`);
  };

  // ── Reconcile All ──
  const handleReconcileAll = async () => {
    if (!user) return;
    setReconcileAllRunning(true);
    try {
      const { data: agent } = await supabase.from('agents').select('id').eq('user_id', user.id).single();
      if (!agent) { toast.error('Agent profile not found'); return; }

      // Get latest bank balance from most recent entry
      const latestItem = items.length > 0
        ? items.reduce((a, b) => new Date(a.bank_date) > new Date(b.bank_date) ? a : b)
        : null;
      const bankBalance = latestItem?.bank_balance ?? 0;

      // Upsert trust_account_balances
      const { data: existing } = await supabase
        .from('trust_account_balances')
        .select('id')
        .eq('agent_id', agent.id)
        .single();

      if (existing) {
        await supabase.from('trust_account_balances')
          .update({ current_balance: bankBalance, last_reconciled_date: new Date().toISOString().split('T')[0] } as any)
          .eq('id', existing.id);
      } else {
        await supabase.from('trust_account_balances')
          .insert({ agent_id: agent.id, current_balance: bankBalance, opening_balance: bankBalance, last_reconciled_date: new Date().toISOString().split('T')[0] } as any);
      }

      // Mark all matched as reconciled (keep manual as-is)
      const matchedIds = items.filter(i => i.status === 'matched').map(i => i.id);
      if (matchedIds.length > 0) {
        await supabase.from('trust_reconciliations')
          .update({ status: 'manual' } as any) // finalized
          .in('id', matchedIds);
      }

      setCurrentBalance(bankBalance);
      toast.success(`Reconciliation complete. Balance: ${AUD.format(bankBalance)}`);
      await fetchData();
    } catch (e: any) {
      toast.error(e.message);
    } finally {
      setReconcileAllRunning(false);
    }
  };

  // ── CSV file handler (drag-drop & file input) ──
  const parseCsvFile = async (file: File) => {
    if (!user) return;
    const text = await file.text();
    const lines = text.trim().split('\n').slice(1);
    const { data: agent } = await supabase.from('agents').select('id').eq('user_id', user.id).single();
    if (!agent) { toast.error('Agent profile not found'); return; }

    const entries = lines.map(line => {
      const cols = line.split(',').map(c => c.replace(/^"|"$/g, '').trim());
      return {
        agent_id: agent.id,
        bank_date: cols[0] || new Date().toISOString().split('T')[0],
        description: cols[1] || null,
        amount: parseFloat(cols[2]) || 0,
        bank_balance: parseFloat(cols[3]) || 0,
        status: 'unmatched',
      };
    }).filter(e => e.amount !== 0);

    if (entries.length === 0) { toast.error('No valid entries found'); return; }

    const { error, data: inserted } = await supabase.from('trust_reconciliations').insert(entries as any).select();
    if (error) { toast.error(error.message); return; }

    toast.success(`${entries.length} entries imported. Running auto-match…`);
    // Refresh then auto-match
    const { data: allRecon } = await supabase.from('trust_reconciliations').select('*').order('bank_date', { ascending: false });
    if (allRecon) {
      setItems(allRecon as unknown as Reconciliation[]);
      await runAutoMatch(allRecon as unknown as Reconciliation[]);
    }
  };

  const handleFileDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setDragging(false);
    const file = e.dataTransfer.files[0];
    if (file && (file.name.endsWith('.csv') || file.type === 'text/csv')) {
      parseCsvFile(file);
    } else {
      toast.error('Please drop a CSV file');
    }
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) parseCsvFile(file);
    e.target.value = '';
  };

  // Already-matched IDs
  const matchedReceiptIds = useMemo(() => new Set(items.filter(i => i.matched_receipt_id).map(i => i.matched_receipt_id!)), [items]);
  const matchedPaymentIds = useMemo(() => new Set(items.filter(i => i.matched_payment_id).map(i => i.matched_payment_id!)), [items]);

  // Stats
  const unmatchedCount = items.filter(i => i.status === 'unmatched').length;
  const matchedCount = items.filter(i => i.status === 'matched').length;
  const manualCount = items.filter(i => i.status === 'manual').length;
  const totalUnmatched = items.filter(i => i.status === 'unmatched').reduce((s, i) => s + Math.abs(i.amount), 0);

  // Filtered list
  const filtered = useMemo(() => {
    let list = items;
    if (filterStatus !== 'all') list = list.filter(i => i.status === filterStatus);
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      list = list.filter(i =>
        (i.description || '').toLowerCase().includes(q) ||
        String(i.amount).includes(q)
      );
    }
    return list;
  }, [items, filterStatus, searchQuery]);

  // Available candidates for matching (not already matched)
  const availableCandidates = useMemo(() => {
    if (!matchingItem) return [];
    const isCredit = matchingItem.amount > 0;
    const targetAmount = Math.abs(matchingItem.amount);

    let candidates: MatchCandidate[] = [];
    if (isCredit) {
      // Credit = money in → match receipts
      candidates = receipts.filter(r => !matchedReceiptIds.has(r.id));
    } else {
      // Debit = money out → match payments
      candidates = payments.filter(p => !matchedPaymentIds.has(p.id));
    }

    // Filter by search
    if (matchSearch.trim()) {
      const q = matchSearch.toLowerCase();
      candidates = candidates.filter(c =>
        c.client.toLowerCase().includes(q) ||
        c.number.toLowerCase().includes(q)
      );
    }

    // Sort by amount proximity to bank entry
    candidates.sort((a, b) => {
      const diffA = Math.abs(a.amount - targetAmount);
      const diffB = Math.abs(b.amount - targetAmount);
      return diffA - diffB;
    });

    return candidates;
  }, [matchingItem, receipts, payments, matchedReceiptIds, matchedPaymentIds, matchSearch]);

  // ── Handlers ──
  const handleAddEntry = async () => {
    if (!user || !addAmount || !addDate) return;
    setAddSaving(true);
    try {
      const { data: agent } = await supabase.from('agents').select('id').eq('user_id', user.id).single();
      if (!agent) { toast.error('Agent profile not found'); return; }

      const { error } = await supabase.from('trust_reconciliations').insert({
        agent_id: agent.id,
        bank_date: addDate,
        description: addDesc || null,
        amount: parseFloat(addAmount),
        bank_balance: parseFloat(addBalance) || 0,
        status: 'unmatched',
      } as any);
      if (error) throw error;

      toast.success('Bank statement entry added');
      setShowAdd(false);
      setAddDesc(''); setAddAmount(''); setAddBalance('');
      await fetchData();
    } catch (e: any) {
      toast.error(e.message);
    } finally {
      setAddSaving(false);
    }
  };

  const handleMatch = async (candidate: MatchCandidate) => {
    if (!matchingItem) return;
    setMatchSaving(true);
    try {
      const updates: any = { status: 'matched' };
      if (candidate.type === 'receipt') updates.matched_receipt_id = candidate.id;
      else updates.matched_payment_id = candidate.id;

      const { error } = await supabase
        .from('trust_reconciliations')
        .update(updates)
        .eq('id', matchingItem.id);
      if (error) throw error;

      toast.success(`Matched with ${candidate.number}`);
      setShowMatch(false);
      setMatchingItem(null);
      await fetchData();
    } catch (e: any) {
      toast.error(e.message);
    } finally {
      setMatchSaving(false);
    }
  };

  const handleUnmatch = async (item: Reconciliation) => {
    try {
      const { error } = await supabase
        .from('trust_reconciliations')
        .update({ status: 'unmatched', matched_receipt_id: null, matched_payment_id: null } as any)
        .eq('id', item.id);
      if (error) throw error;
      toast.success('Unmatched successfully');
      await fetchData();
    } catch (e: any) {
      toast.error(e.message);
    }
  };

  const handleManualReconcile = async (item: Reconciliation) => {
    try {
      const { error } = await supabase
        .from('trust_reconciliations')
        .update({ status: 'manual' } as any)
        .eq('id', item.id);
      if (error) throw error;
      toast.success('Marked as manually reconciled');
      await fetchData();
    } catch (e: any) {
      toast.error(e.message);
    }
  };

  const openMatchModal = (item: Reconciliation) => {
    setMatchingItem(item);
    setMatchSearch('');
    setShowMatch(true);
  };

  // CSV import
  const handleCsvImport = async () => {
    if (!user || !csvText.trim()) return;
    setImportSaving(true);
    try {
      const { data: agent } = await supabase.from('agents').select('id').eq('user_id', user.id).single();
      if (!agent) { toast.error('Agent profile not found'); return; }

      const lines = csvText.trim().split('\n').slice(1); // skip header
      const entries = lines.map(line => {
        const cols = line.split(',').map(c => c.replace(/^"|"$/g, '').trim());
        return {
          agent_id: agent.id,
          bank_date: cols[0] || new Date().toISOString().split('T')[0],
          description: cols[1] || null,
          amount: parseFloat(cols[2]) || 0,
          bank_balance: parseFloat(cols[3]) || 0,
          status: 'unmatched',
        };
      }).filter(e => e.amount !== 0);

      if (entries.length === 0) { toast.error('No valid entries found'); return; }

      const { error } = await supabase.from('trust_reconciliations').insert(entries as any);
      if (error) throw error;

      toast.success(`${entries.length} bank statement entries imported`);
      setShowImport(false);
      setCsvText('');
      await fetchData();
    } catch (e: any) {
      toast.error(e.message);
    } finally {
      setImportSaving(false);
    }
  };

  // CSV export
  const exportCsv = () => {
    const headers = ['Date', 'Description', 'Amount', 'Bank Balance', 'Status', 'Matched To'];
    const rows = filtered.map(i => {
      let matchedTo = '';
      if (i.matched_receipt_id) {
        const r = receipts.find(c => c.id === i.matched_receipt_id);
        matchedTo = r ? r.number : i.matched_receipt_id;
      } else if (i.matched_payment_id) {
        const p = payments.find(c => c.id === i.matched_payment_id);
        matchedTo = p ? p.number : i.matched_payment_id;
      }
      return [i.bank_date, i.description || '', i.amount.toFixed(2), i.bank_balance.toFixed(2), i.status, matchedTo];
    });
    const csv = [headers.join(','), ...rows.map(r => r.map(c => `"${c}"`).join(','))].join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url; a.download = `bank_reconciliation_${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
    URL.revokeObjectURL(url);
    toast.success('Reconciliation report exported');
  };

  // Find matched label for display
  const getMatchedLabel = (item: Reconciliation) => {
    if (item.matched_receipt_id) {
      const r = receipts.find(c => c.id === item.matched_receipt_id);
      return r ? `${r.number} — ${r.client}` : 'Receipt';
    }
    if (item.matched_payment_id) {
      const p = payments.find(c => c.id === item.matched_payment_id);
      return p ? `${p.number} — ${p.client}` : 'Payment';
    }
    return null;
  };

  if (loading) {
    return (
      <div>
        <DashboardHeader title="Bank Reconciliation" subtitle="Match bank statements to trust entries" />
        <div className="p-6 text-center text-muted-foreground">Loading…</div>
      </div>
    );
  }

  return (
    <div>
      <DashboardHeader
        title="Bank Reconciliation"
        subtitle="Match bank statement entries to trust receipts & payments"
        actions={
          <div className="flex gap-2">
            <Button size="sm" variant="outline" onClick={exportCsv} className="gap-1.5 text-xs">
              <FileDown size={13} /> Export
            </Button>
            <Button size="sm" variant="outline" onClick={() => setShowImport(true)} className="gap-1.5 text-xs">
              <Upload size={13} /> Import CSV
            </Button>
            <Button size="sm" onClick={() => setShowAdd(true)} className="gap-1.5 text-xs">
              <Plus size={13} /> Add Entry
            </Button>
          </div>
        }
      />

      <div className="p-4 sm:p-6 max-w-[1600px] space-y-5">
        {/* Summary Cards */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          <Card>
            <CardContent className="p-4 flex items-center gap-3">
              <div className="h-10 w-10 rounded-lg bg-destructive/10 flex items-center justify-center shrink-0">
                <AlertTriangle size={18} className="text-destructive" />
              </div>
              <div className="min-w-0">
                <p className="text-[10px] text-muted-foreground font-medium uppercase tracking-wide">Unmatched</p>
                <p className="text-lg font-bold text-destructive">{unmatchedCount}</p>
                <p className="text-[10px] text-muted-foreground">{AUD.format(totalUnmatched)} outstanding</p>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4 flex items-center gap-3">
              <div className="h-10 w-10 rounded-lg bg-green-500/10 flex items-center justify-center shrink-0">
                <CheckCircle2 size={18} className="text-green-600" />
              </div>
              <div className="min-w-0">
                <p className="text-[10px] text-muted-foreground font-medium uppercase tracking-wide">Matched</p>
                <p className="text-lg font-bold text-green-600">{matchedCount}</p>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4 flex items-center gap-3">
              <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
                <Scale size={18} className="text-primary" />
              </div>
              <div className="min-w-0">
                <p className="text-[10px] text-muted-foreground font-medium uppercase tracking-wide">Manual</p>
                <p className="text-lg font-bold">{manualCount}</p>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4 flex items-center gap-3">
              <div className="h-10 w-10 rounded-lg bg-secondary flex items-center justify-center shrink-0">
                <DollarSign size={18} className="text-foreground" />
              </div>
              <div className="min-w-0">
                <p className="text-[10px] text-muted-foreground font-medium uppercase tracking-wide">Total Entries</p>
                <p className="text-lg font-bold">{items.length}</p>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* ── Drag-Drop CSV Upload ── */}
        <div
          onDragOver={(e) => { e.preventDefault(); setDragging(true); }}
          onDragLeave={() => setDragging(false)}
          onDrop={handleFileDrop}
          className={`relative border-2 border-dashed rounded-lg p-6 text-center transition-colors ${
            dragging ? 'border-primary bg-primary/5' : 'border-border bg-muted/30'
          }`}
        >
          <input
            type="file"
            accept=".csv"
            ref={setFileInputEl}
            onChange={handleFileSelect}
            className="hidden"
          />
          <Upload size={24} className={`mx-auto mb-2 ${dragging ? 'text-primary' : 'text-muted-foreground/50'}`} />
          <p className="text-sm font-medium">Upload Bank Statement CSV</p>
          <p className="text-xs text-muted-foreground mt-1">
            Drag CSV here or{' '}
            <button onClick={() => fileInputEl?.click()} className="text-primary underline underline-offset-2 hover:text-primary/80">
              Choose File
            </button>
            {' '}→ Auto-match transactions
          </p>
          {autoMatchRunning && (
            <div className="mt-3 flex items-center justify-center gap-2 text-xs text-primary">
              <RefreshCw size={12} className="animate-spin" />
              Auto-matching transactions…
            </div>
          )}
        </div>

        {/* ── Unmatched Transactions Header ── */}
        <div className="flex flex-wrap items-center gap-2">
          <div className="relative">
            <Search size={13} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-muted-foreground" />
            <Input value={searchQuery} onChange={e => setSearchQuery(e.target.value)}
              placeholder="Search description…" className="h-8 pl-8 w-[200px] text-xs" />
          </div>
          <Select value={filterStatus} onValueChange={setFilterStatus}>
            <SelectTrigger className="w-[130px] h-8 text-xs">
              <SelectValue placeholder="All Status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Status</SelectItem>
              <SelectItem value="unmatched">Unmatched</SelectItem>
              <SelectItem value="matched">Matched</SelectItem>
              <SelectItem value="manual">Manual</SelectItem>
            </SelectContent>
          </Select>
          {unmatchedCount > 0 && (
            <Badge variant="destructive" className="text-xs gap-1">
              <AlertTriangle size={11} /> {unmatchedCount} unmatched
            </Badge>
          )}
        </div>

        {/* Table */}
        <Card>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="text-xs">Date</TableHead>
                <TableHead className="text-xs">Description</TableHead>
                <TableHead className="text-xs text-right">Amount</TableHead>
                <TableHead className="text-xs text-right">Bank Balance</TableHead>
                <TableHead className="text-xs">Status</TableHead>
                <TableHead className="text-xs">Match To</TableHead>
                <TableHead className="text-xs">Action</TableHead>
                <TableHead className="text-xs w-[120px]"></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtered.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={8} className="text-center text-muted-foreground py-12 text-sm">
                    {items.length === 0
                      ? 'No bank statement entries yet. Add entries manually or import a CSV.'
                      : 'No entries match your filters.'}
                  </TableCell>
                </TableRow>
              ) : (
                filtered.map(item => {
                  const isCredit = item.amount > 0;
                  const statusCfg = STATUS_CONFIG[item.status] || STATUS_CONFIG.unmatched;
                  const matchLabel = getMatchedLabel(item);

                  return (
                    <TableRow key={item.id} className={item.status === 'unmatched' ? 'bg-destructive/5' : ''}>
                      <TableCell className="text-xs whitespace-nowrap">
                        {DATE_FMT.format(new Date(item.bank_date + 'T00:00:00'))}
                      </TableCell>
                      <TableCell className="text-xs max-w-[220px] truncate">
                        {item.description || '—'}
                      </TableCell>
                      <TableCell className={`text-xs text-right font-semibold tabular-nums ${isCredit ? 'text-green-600' : 'text-destructive'}`}>
                        {isCredit ? '+' : ''}{AUD.format(item.amount)}
                      </TableCell>
                      <TableCell className="text-xs text-right tabular-nums text-muted-foreground">
                        {AUD.format(item.bank_balance)}
                      </TableCell>
                      <TableCell>
                        <Badge variant={statusCfg.variant} className="text-[10px]">
                          {statusCfg.label}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-xs">
                        {matchLabel ? (
                          <div className="flex items-center gap-1.5">
                            <Link2 size={11} className="text-green-600 shrink-0" />
                            <span className="truncate max-w-[150px]">{matchLabel}</span>
                          </div>
                        ) : (
                          <span className="text-muted-foreground">—</span>
                        )}
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline" className="text-[10px]">
                          {item.status === 'matched' ? 'Auto' : item.status === 'manual' ? 'Manual' : 'Pending'}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-1 justify-end">
                          {item.status === 'unmatched' && (
                            <>
                              <Button size="sm" variant="default" className="h-7 px-2 text-[10px] gap-1"
                                onClick={() => openMatchModal(item)}>
                                <Link2 size={11} /> Match
                              </Button>
                              <Button size="sm" variant="outline" className="h-7 px-2 text-[10px] gap-1"
                                onClick={() => handleManualReconcile(item)}>
                                <CheckCircle2 size={11} /> Manual
                              </Button>
                            </>
                          )}
                          {(item.status === 'matched' || item.status === 'manual') && (
                            <Button size="sm" variant="ghost" className="h-7 px-2 text-[10px] gap-1 text-destructive"
                              onClick={() => handleUnmatch(item)}>
                              <Unlink size={11} /> Unmatch
                            </Button>
                          )}
                        </div>
                      </TableCell>
                    </TableRow>
                  );
                })
              )}
            </TableBody>
          </Table>
        </Card>

        {/* ── Reconcile All + Balance ── */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 p-4 rounded-lg border border-border bg-card">
          <div className="flex items-center gap-4">
            <div>
              <p className="text-[10px] text-muted-foreground font-medium uppercase tracking-wide">Current Balance</p>
              <p className="text-xl font-bold tabular-nums">
                {currentBalance !== null ? AUD.format(currentBalance) : '—'}
              </p>
            </div>
            {items.length > 0 && (
              <div className="flex items-center gap-2">
                {unmatchedCount === 0 ? (
                  <Badge className="gap-1 bg-green-600 text-white text-xs">
                    <Check size={11} /> Matches bank
                  </Badge>
                ) : (
                  <Badge variant="destructive" className="gap-1 text-xs">
                    <AlertTriangle size={11} /> {unmatchedCount} unmatched
                  </Badge>
                )}
                <span className="text-xs text-muted-foreground">
                  Rate: {items.length > 0 ? Math.round(((matchedCount + manualCount) / items.length) * 100) : 0}%
                </span>
              </div>
            )}
          </div>
          <div className="flex items-center gap-2">
            {unmatchedCount > 0 && (
              <Button size="sm" variant="outline" className="gap-1.5 text-xs"
                disabled={autoMatchRunning}
                onClick={() => runAutoMatch(items)}>
                <RefreshCw size={12} className={autoMatchRunning ? 'animate-spin' : ''} />
                Auto-Match
              </Button>
            )}
            <Button size="sm" className="gap-1.5 text-xs"
              disabled={reconcileAllRunning || (matchedCount + manualCount === 0)}
              onClick={handleReconcileAll}>
              <CheckCircle2 size={12} />
              {reconcileAllRunning ? 'Reconciling…' : 'Reconcile All'}
            </Button>
          </div>
        </div>

        {filtered.length > 0 && (
          <div className="flex items-center justify-between px-2 text-xs text-muted-foreground">
            <span>{filtered.length} entr{filtered.length === 1 ? 'y' : 'ies'} shown</span>
          </div>
        )}
      </div>

      {/* ── Add Entry Modal ── */}
      <Dialog open={showAdd} onOpenChange={setShowAdd}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="text-base">Add Bank Statement Entry</DialogTitle>
            <DialogDescription>Enter a line from your bank statement to reconcile.</DialogDescription>
          </DialogHeader>
          <div className="space-y-3">
            <div>
              <Label className="text-xs">Date</Label>
              <Input type="date" value={addDate} onChange={e => setAddDate(e.target.value)} className="h-9" />
            </div>
            <div>
              <Label className="text-xs">Description</Label>
              <Input value={addDesc} onChange={e => setAddDesc(e.target.value)}
                placeholder="e.g. Direct Deposit — John Smith" className="h-9" />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label className="text-xs">Amount (+ credit / - debit)</Label>
                <Input type="number" step="0.01" value={addAmount} onChange={e => setAddAmount(e.target.value)}
                  placeholder="25000.00" className="h-9" />
              </div>
              <div>
                <Label className="text-xs">Bank Balance</Label>
                <Input type="number" step="0.01" value={addBalance} onChange={e => setAddBalance(e.target.value)}
                  placeholder="0.00" className="h-9" />
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowAdd(false)}>Cancel</Button>
            <Button onClick={handleAddEntry} disabled={!addAmount || addSaving}>
              {addSaving ? 'Adding…' : 'Add Entry'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ── Match Modal ── */}
      <Dialog open={showMatch} onOpenChange={setShowMatch}>
        <DialogContent className="max-w-xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-base">Match Bank Entry</DialogTitle>
            <DialogDescription>
              Select a trust {matchingItem && matchingItem.amount > 0 ? 'receipt' : 'payment'} that corresponds to this bank entry.
            </DialogDescription>
          </DialogHeader>

          {matchingItem && (
            <div className="bg-muted/60 border border-border rounded-lg p-3 space-y-1">
              <div className="flex items-center justify-between">
                <span className="text-xs text-muted-foreground">Bank Entry</span>
                <Badge variant={matchingItem.amount > 0 ? 'default' : 'destructive'} className="text-[10px]">
                  {matchingItem.amount > 0 ? 'Credit' : 'Debit'}
                </Badge>
              </div>
              <p className="text-sm font-medium">{matchingItem.description || 'No description'}</p>
              <div className="flex items-center gap-3 text-xs text-muted-foreground">
                <span>{DATE_FMT.format(new Date(matchingItem.bank_date + 'T00:00:00'))}</span>
                <span className={`font-bold ${matchingItem.amount > 0 ? 'text-green-600' : 'text-destructive'}`}>
                  {AUD.format(matchingItem.amount)}
                </span>
              </div>
            </div>
          )}

          <div className="relative">
            <Search size={13} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-muted-foreground" />
            <Input value={matchSearch} onChange={e => setMatchSearch(e.target.value)}
              placeholder="Search by client or number…" className="h-8 pl-8 text-xs" />
          </div>

          <div className="space-y-1.5 max-h-[300px] overflow-y-auto">
            {availableCandidates.length === 0 ? (
              <div className="text-center py-6 text-sm text-muted-foreground">
                No unmatched {matchingItem && matchingItem.amount > 0 ? 'receipts' : 'payments'} available.
              </div>
            ) : (
              availableCandidates.map(c => {
                const amountMatch = matchingItem && Math.abs(c.amount) === Math.abs(matchingItem.amount);
                return (
                  <button
                    key={c.id}
                    onClick={() => handleMatch(c)}
                    disabled={matchSaving}
                    className={`w-full text-left p-3 rounded-lg border transition-all hover:border-primary/50 hover:bg-primary/5 ${
                      amountMatch ? 'border-green-500/50 bg-green-500/5' : 'border-border'
                    }`}
                  >
                    <div className="flex items-center justify-between mb-1">
                      <div className="flex items-center gap-2">
                        {c.type === 'receipt'
                          ? <ArrowDownCircle size={14} className="text-green-600" />
                          : <ArrowUpCircle size={14} className="text-destructive" />}
                        <span className="text-xs font-mono font-bold">{c.number}</span>
                        {amountMatch && (
                          <Badge variant="outline" className="text-[9px] border-green-500 text-green-600">
                            Exact match
                          </Badge>
                        )}
                      </div>
                      <span className={`text-sm font-semibold tabular-nums ${c.type === 'receipt' ? 'text-green-600' : 'text-destructive'}`}>
                        {AUD.format(c.amount)}
                      </span>
                    </div>
                    <div className="flex items-center gap-3 text-xs text-muted-foreground">
                      <span>{c.client}</span>
                      <span>•</span>
                      <span>{DATE_FMT.format(new Date(c.date + 'T00:00:00'))}</span>
                      <span>•</span>
                      <span className="capitalize">{c.method}</span>
                    </div>
                  </button>
                );
              })
            )}
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setShowMatch(false)}>Cancel</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ── CSV Import Modal ── */}
      <Dialog open={showImport} onOpenChange={setShowImport}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle className="text-base">Import Bank Statement (CSV)</DialogTitle>
            <DialogDescription>
              Paste your bank statement CSV. Expected columns: Date, Description, Amount, Balance
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3">
            <div className="bg-muted/60 rounded-lg p-3 text-[10px] font-mono text-muted-foreground">
              Date,Description,Amount,Balance<br />
              2026-03-10,"Direct Deposit — John Smith",25000.00,25000.00<br />
              2026-03-12,"EFT Payment — Sarah Jones",-2500.00,22500.00
            </div>
            <Textarea
              value={csvText}
              onChange={e => setCsvText(e.target.value)}
              placeholder="Paste CSV here…"
              rows={8}
              className="font-mono text-xs"
            />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowImport(false)}>Cancel</Button>
            <Button onClick={handleCsvImport} disabled={!csvText.trim() || importSaving} className="gap-1.5">
              <Upload size={13} />
              {importSaving ? 'Importing…' : 'Import'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default BankReconciliationPage;
