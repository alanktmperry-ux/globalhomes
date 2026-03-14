import { useState, useMemo, useEffect, useCallback } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Receipt, ArrowUpCircle, ArrowDownCircle, CalendarIcon, Search,
  FileDown, DollarSign, Clock, CheckCircle2, XCircle, Filter,
} from 'lucide-react';
import DashboardHeader from './DashboardHeader';
import TrustReceiptModal from './TrustReceiptModal';
import TrustStatementModal from './TrustStatementModal';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/lib/AuthProvider';
import { toast } from 'sonner';

const AUD = new Intl.NumberFormat('en-AU', { style: 'currency', currency: 'AUD', minimumFractionDigits: 2 });
const DATE_FMT = new Intl.DateTimeFormat('en-AU', { day: '2-digit', month: 'short', year: 'numeric' });

interface TrustReceipt {
  id: string;
  receipt_number: string;
  agent_id: string;
  client_name: string;
  property_address: string;
  amount: number;
  payment_method: string;
  purpose: string;
  date_received: string;
  date_deposited: string | null;
  ledger_account: string;
  status: string;
  created_at: string;
}

interface TrustPayment {
  id: string;
  payment_number: string;
  agent_id: string;
  client_name: string;
  property_address: string;
  amount: number;
  payment_method: string;
  purpose: string;
  bsb: string | null;
  account_number: string | null;
  payee_name: string | null;
  reference: string | null;
  date_paid: string;
  status: string;
  created_at: string;
}

type LedgerEntry = {
  id: string;
  type: 'receipt' | 'payment';
  number: string;
  client: string;
  property: string;
  amount: number;
  method: string;
  purpose: string;
  date: string;
  status: string;
  reference?: string | null;
};

const STATUS_CONFIG: Record<string, { variant: 'default' | 'secondary' | 'outline' | 'destructive'; label: string; icon: typeof CheckCircle2 }> = {
  received: { variant: 'outline', label: 'Received', icon: Clock },
  deposited: { variant: 'default', label: 'Deposited', icon: CheckCircle2 },
  pending: { variant: 'outline', label: 'Pending', icon: Clock },
  paid: { variant: 'default', label: 'Paid', icon: CheckCircle2 },
  cleared: { variant: 'secondary', label: 'Cleared', icon: CheckCircle2 },
};

const TrustLedgerPage = () => {
  const { user } = useAuth();
  const [receipts, setReceipts] = useState<TrustReceipt[]>([]);
  const [payments, setPayments] = useState<TrustPayment[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [filterStatus, setFilterStatus] = useState('all');
  const [filterDateFrom, setFilterDateFrom] = useState('');
  const [filterDateTo, setFilterDateTo] = useState('');
  const [showNewReceipt, setShowNewReceipt] = useState(false);
  const [showStatement, setShowStatement] = useState(false);

  const fetchData = useCallback(async () => {
    if (!user) return;
    setLoading(true);
    const [{ data: r }, { data: p }] = await Promise.all([
      supabase.from('trust_receipts').select('*').order('created_at', { ascending: false }),
      supabase.from('trust_payments').select('*').order('created_at', { ascending: false }),
    ]);
    if (r) setReceipts(r as unknown as TrustReceipt[]);
    if (p) setPayments(p as unknown as TrustPayment[]);
    setLoading(false);
  }, [user]);

  useEffect(() => { fetchData(); }, [fetchData]);

  // Merge into unified ledger
  const ledgerEntries: LedgerEntry[] = useMemo(() => {
    const rEntries: LedgerEntry[] = receipts.map(r => ({
      id: r.id,
      type: 'receipt',
      number: r.receipt_number,
      client: r.client_name,
      property: r.property_address,
      amount: r.amount,
      method: r.payment_method,
      purpose: r.purpose,
      date: r.date_received,
      status: r.status,
    }));
    const pEntries: LedgerEntry[] = payments.map(p => ({
      id: p.id,
      type: 'payment',
      number: p.payment_number,
      client: p.client_name,
      property: p.property_address,
      amount: p.amount,
      method: p.payment_method,
      purpose: p.purpose,
      date: p.date_paid,
      status: p.status,
      reference: p.reference,
    }));
    return [...rEntries, ...pEntries].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  }, [receipts, payments]);

  // Filter
  const filtered = useMemo(() => {
    let items = ledgerEntries;
    if (activeTab === 'receipts') items = items.filter(e => e.type === 'receipt');
    if (activeTab === 'payments') items = items.filter(e => e.type === 'payment');
    if (filterStatus !== 'all') items = items.filter(e => e.status === filterStatus);
    if (filterDateFrom) items = items.filter(e => e.date >= filterDateFrom);
    if (filterDateTo) items = items.filter(e => e.date <= filterDateTo);
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      items = items.filter(e =>
        e.client.toLowerCase().includes(q) ||
        e.property.toLowerCase().includes(q) ||
        e.number.toLowerCase().includes(q) ||
        (e.reference && e.reference.toLowerCase().includes(q))
      );
    }
    return items;
  }, [ledgerEntries, activeTab, filterStatus, filterDateFrom, filterDateTo, searchQuery]);

  // Stats
  const totalReceipts = receipts.reduce((s, r) => s + r.amount, 0);
  const totalPayments = payments.reduce((s, p) => s + p.amount, 0);
  const netPosition = totalReceipts - totalPayments;
  const pendingCount = ledgerEntries.filter(e => e.status === 'pending' || e.status === 'received').length;

  // CSV export
  const exportCsv = () => {
    const headers = ['Date', 'Type', 'Number', 'Client', 'Property', 'Method', 'Purpose', 'Amount', 'Status'];
    const rows = filtered.map(e => [
      e.date, e.type === 'receipt' ? 'IN' : 'OUT', e.number, e.client,
      e.property, e.method, e.purpose,
      (e.type === 'receipt' ? '+' : '-') + e.amount.toFixed(2), e.status,
    ]);
    const csv = [headers.join(','), ...rows.map(r => r.map(c => `"${c}"`).join(','))].join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url; a.download = `trust_ledger_${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
    URL.revokeObjectURL(url);
    toast.success('Ledger exported');
  };

  if (loading) {
    return (
      <div>
        <DashboardHeader title="Trust Ledger" subtitle="Receipts & payments register" />
        <div className="p-6 text-center text-muted-foreground">Loading…</div>
      </div>
    );
  }

  return (
    <div>
      <DashboardHeader
        title="Trust Ledger"
        subtitle="Receipts & payments register — Agents Financial Administration Act 2014"
        actions={
          <div className="flex gap-2">
            <Button size="sm" variant="outline" onClick={() => setShowStatement(true)} className="gap-1.5 text-xs">
              <FileDown size={13} /> Monthly Statement
            </Button>
            <Button size="sm" variant="outline" onClick={exportCsv} className="gap-1.5 text-xs">
              <FileDown size={13} /> Export CSV
            </Button>
            <Button size="sm" onClick={() => setShowNewReceipt(true)} className="gap-1.5 text-xs">
              <Receipt size={13} /> New Receipt
            </Button>
          </div>
        }
      />

      <div className="p-4 sm:p-6 max-w-[1600px] space-y-5">
        {/* Summary Cards */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          <Card>
            <CardContent className="p-4 flex items-center gap-3">
              <div className="h-10 w-10 rounded-lg bg-green-500/10 flex items-center justify-center shrink-0">
                <ArrowDownCircle size={18} className="text-green-600" />
              </div>
              <div className="min-w-0">
                <p className="text-[10px] text-muted-foreground font-medium uppercase tracking-wide">Total Received</p>
                <p className="text-lg font-bold text-green-600 truncate">{AUD.format(totalReceipts)}</p>
                <p className="text-[10px] text-muted-foreground">{receipts.length} receipt{receipts.length !== 1 && 's'}</p>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4 flex items-center gap-3">
              <div className="h-10 w-10 rounded-lg bg-destructive/10 flex items-center justify-center shrink-0">
                <ArrowUpCircle size={18} className="text-destructive" />
              </div>
              <div className="min-w-0">
                <p className="text-[10px] text-muted-foreground font-medium uppercase tracking-wide">Total Paid Out</p>
                <p className="text-lg font-bold text-destructive truncate">{AUD.format(totalPayments)}</p>
                <p className="text-[10px] text-muted-foreground">{payments.length} payment{payments.length !== 1 && 's'}</p>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4 flex items-center gap-3">
              <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
                <DollarSign size={18} className="text-primary" />
              </div>
              <div className="min-w-0">
                <p className="text-[10px] text-muted-foreground font-medium uppercase tracking-wide">Net Position</p>
                <p className={`text-lg font-bold truncate ${netPosition >= 0 ? 'text-green-600' : 'text-destructive'}`}>
                  {AUD.format(netPosition)}
                </p>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4 flex items-center gap-3">
              <div className="h-10 w-10 rounded-lg bg-orange-500/10 flex items-center justify-center shrink-0">
                <Clock size={18} className="text-orange-500" />
              </div>
              <div className="min-w-0">
                <p className="text-[10px] text-muted-foreground font-medium uppercase tracking-wide">Pending Items</p>
                <p className="text-lg font-bold truncate">{pendingCount}</p>
                <p className="text-[10px] text-muted-foreground">awaiting processing</p>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Tabs + Filters */}
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <div className="flex flex-wrap items-center gap-3 mb-3">
            <TabsList>
              <TabsTrigger value="all" className="text-xs gap-1.5">
                All <Badge variant="secondary" className="text-[9px] px-1 h-4 ml-1">{ledgerEntries.length}</Badge>
              </TabsTrigger>
              <TabsTrigger value="receipts" className="text-xs gap-1.5">
                <ArrowDownCircle size={12} /> Receipts <Badge variant="secondary" className="text-[9px] px-1 h-4 ml-1">{receipts.length}</Badge>
              </TabsTrigger>
              <TabsTrigger value="payments" className="text-xs gap-1.5">
                <ArrowUpCircle size={12} /> Payments <Badge variant="secondary" className="text-[9px] px-1 h-4 ml-1">{payments.length}</Badge>
              </TabsTrigger>
            </TabsList>

            <div className="flex-1" />

            {/* Filters */}
            <div className="flex flex-wrap items-center gap-2">
              <div className="relative">
                <Search size={13} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-muted-foreground" />
                <Input
                  value={searchQuery}
                  onChange={e => setSearchQuery(e.target.value)}
                  placeholder="Search client, property, ref…"
                  className="h-8 pl-8 w-[200px] text-xs"
                />
              </div>
              <div className="flex items-center gap-1">
                <CalendarIcon size={13} className="text-muted-foreground" />
                <Input type="date" value={filterDateFrom} onChange={e => setFilterDateFrom(e.target.value)}
                  className="h-8 w-[125px] text-xs" />
                <span className="text-xs text-muted-foreground">to</span>
                <Input type="date" value={filterDateTo} onChange={e => setFilterDateTo(e.target.value)}
                  className="h-8 w-[125px] text-xs" />
              </div>
              <Select value={filterStatus} onValueChange={setFilterStatus}>
                <SelectTrigger className="w-[120px] h-8 text-xs">
                  <Filter size={12} className="mr-1" /><SelectValue placeholder="Status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Status</SelectItem>
                  <SelectItem value="received">Received</SelectItem>
                  <SelectItem value="deposited">Deposited</SelectItem>
                  <SelectItem value="pending">Pending</SelectItem>
                  <SelectItem value="paid">Paid</SelectItem>
                  <SelectItem value="cleared">Cleared</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Unified Ledger Table */}
          <TabsContent value={activeTab} className="mt-0">
            <Card>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="text-xs w-[50px]">Type</TableHead>
                    <TableHead className="text-xs">Number</TableHead>
                    <TableHead className="text-xs">Date</TableHead>
                    <TableHead className="text-xs">Client</TableHead>
                    <TableHead className="text-xs">Property</TableHead>
                    <TableHead className="text-xs">Method</TableHead>
                    <TableHead className="text-xs">Purpose</TableHead>
                    <TableHead className="text-xs text-right">Amount</TableHead>
                    <TableHead className="text-xs">Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filtered.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={9} className="text-center text-muted-foreground py-12 text-sm">
                        {searchQuery || filterStatus !== 'all' || filterDateFrom
                          ? 'No entries match your filters.'
                          : 'No trust receipts or payments recorded yet.'}
                      </TableCell>
                    </TableRow>
                  ) : (
                    filtered.map(entry => {
                      const isReceipt = entry.type === 'receipt';
                      const statusCfg = STATUS_CONFIG[entry.status] || STATUS_CONFIG.pending;
                      const StatusIcon = statusCfg.icon;
                      return (
                        <TableRow key={entry.id} className="group">
                          <TableCell>
                            <div className={`h-7 w-7 rounded-md flex items-center justify-center ${
                              isReceipt ? 'bg-green-500/10' : 'bg-destructive/10'
                            }`}>
                              {isReceipt
                                ? <ArrowDownCircle size={14} className="text-green-600" />
                                : <ArrowUpCircle size={14} className="text-destructive" />
                              }
                            </div>
                          </TableCell>
                          <TableCell className="text-xs font-mono font-semibold">{entry.number}</TableCell>
                          <TableCell className="text-xs whitespace-nowrap">
                            {DATE_FMT.format(new Date(entry.date + 'T00:00:00'))}
                          </TableCell>
                          <TableCell className="text-xs font-medium">{entry.client}</TableCell>
                          <TableCell className="text-xs max-w-[180px] truncate text-muted-foreground">{entry.property}</TableCell>
                          <TableCell>
                            <Badge variant="outline" className="text-[10px] capitalize">{entry.method}</Badge>
                          </TableCell>
                          <TableCell>
                            <Badge variant="outline" className="text-[10px] capitalize">{entry.purpose}</Badge>
                          </TableCell>
                          <TableCell className={`text-xs text-right font-semibold tabular-nums ${
                            isReceipt ? 'text-green-600' : 'text-destructive'
                          }`}>
                            {isReceipt ? '+' : '-'}{AUD.format(entry.amount)}
                          </TableCell>
                          <TableCell>
                            <Badge variant={statusCfg.variant} className="text-[10px] gap-1">
                              <StatusIcon size={10} />
                              {statusCfg.label}
                            </Badge>
                          </TableCell>
                        </TableRow>
                      );
                    })
                  )}
                </TableBody>
              </Table>
            </Card>

            {/* Running totals footer */}
            {filtered.length > 0 && (
              <div className="flex items-center justify-between mt-3 px-2 text-xs text-muted-foreground">
                <span>{filtered.length} entr{filtered.length === 1 ? 'y' : 'ies'} shown</span>
                <div className="flex gap-4">
                  <span>
                    In: <strong className="text-green-600">
                      {AUD.format(filtered.filter(e => e.type === 'receipt').reduce((s, e) => s + e.amount, 0))}
                    </strong>
                  </span>
                  <span>
                    Out: <strong className="text-destructive">
                      {AUD.format(filtered.filter(e => e.type === 'payment').reduce((s, e) => s + e.amount, 0))}
                    </strong>
                  </span>
                </div>
              </div>
            )}
          </TabsContent>
        </Tabs>
      </div>

      {/* New Receipt Modal */}
      <TrustReceiptModal
        open={showNewReceipt}
        onOpenChange={setShowNewReceipt}
        onCreated={fetchData}
      />

      {/* Monthly Statement Modal */}
      <TrustStatementModal
        open={showStatement}
        onOpenChange={setShowStatement}
      />
    </div>
  );
};

export default TrustLedgerPage;
