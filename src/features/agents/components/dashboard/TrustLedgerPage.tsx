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
  FileText, ChevronLeft, ChevronRight, Download, ShieldCheck,
} from 'lucide-react';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
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
  const [showNewReceipt, setShowNewReceipt] = useState(false);
  const [showStatement, setShowStatement] = useState(false);

  // Month navigation
  const [viewMonth, setViewMonth] = useState(new Date().getMonth());
  const [viewYear, setViewYear] = useState(new Date().getFullYear());
  const monthNames = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
  const prevMonth = () => { if (viewMonth === 0) { setViewMonth(11); setViewYear(y => y - 1); } else setViewMonth(m => m - 1); };
  const nextMonth = () => { if (viewMonth === 11) { setViewMonth(0); setViewYear(y => y + 1); } else setViewMonth(m => m + 1); };

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

  // Filter by month + tab + status + search
  const filtered = useMemo(() => {
    const monthStart = `${viewYear}-${String(viewMonth + 1).padStart(2, '0')}-01`;
    const nextM = viewMonth === 11 ? 0 : viewMonth + 1;
    const nextY = viewMonth === 11 ? viewYear + 1 : viewYear;
    const monthEnd = `${nextY}-${String(nextM + 1).padStart(2, '0')}-01`;

    let items = ledgerEntries.filter(e => e.date >= monthStart && e.date < monthEnd);
    if (activeTab === 'receipts') items = items.filter(e => e.type === 'receipt');
    if (activeTab === 'payments') items = items.filter(e => e.type === 'payment');
    if (filterStatus !== 'all') items = items.filter(e => e.status === filterStatus);
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      items = items.filter(e =>
        e.client.toLowerCase().includes(q) ||
        e.property.toLowerCase().includes(q) ||
        e.number.toLowerCase().includes(q) ||
        (e.reference && e.reference.toLowerCase().includes(q))
      );
    }
    // Sort chronologically ascending for running balance
    return items.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
  }, [ledgerEntries, activeTab, filterStatus, searchQuery, viewMonth, viewYear]);

  // Running balance
  const entriesWithBalance = useMemo(() => {
    let balance = 0;
    return filtered.map(e => {
      balance += e.type === 'receipt' ? e.amount : -e.amount;
      return { ...e, balance };
    });
  }, [filtered]);

  // Stats
  const totalReceipts = receipts.reduce((s, r) => s + r.amount, 0);
  const totalPayments = payments.reduce((s, p) => s + p.amount, 0);
  const netPosition = totalReceipts - totalPayments;
  const pendingCount = ledgerEntries.filter(e => e.status === 'pending' || e.status === 'received').length;

  // 5yr compliant CSV export
  const exportCsv = () => {
    const headers = ['Date', 'Receipt#', 'Payment#', 'Client', 'Property', 'Purpose', 'Method', 'In', 'Out', 'Balance', 'Status'];
    const rows = entriesWithBalance.map(e => [
      e.date,
      e.type === 'receipt' ? e.number : '',
      e.type === 'payment' ? e.number : '',
      e.client, e.property, e.purpose, e.method,
      e.type === 'receipt' ? e.amount.toFixed(2) : '',
      e.type === 'payment' ? e.amount.toFixed(2) : '',
      e.balance.toFixed(2),
      e.status,
    ]);
    const csv = [
      `Trust Ledger - ${monthNames[viewMonth]} ${viewYear}`,
      `Generated: ${new Date().toISOString()}`,
      `Retention: 5 years per Agents Financial Administration Act 2014`,
      '',
      headers.join(','),
      ...rows.map(r => r.map(c => `"${c}"`).join(',')),
      '',
      `Total In:,"${AUD.format(filtered.filter(e => e.type === 'receipt').reduce((s, e) => s + e.amount, 0))}"`,
      `Total Out:,"${AUD.format(filtered.filter(e => e.type === 'payment').reduce((s, e) => s + e.amount, 0))}"`,
      `Closing Balance:,"${AUD.format(entriesWithBalance.length > 0 ? entriesWithBalance[entriesWithBalance.length - 1].balance : 0)}"`,
    ].join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url; a.download = `trust_ledger_${viewYear}_${String(viewMonth + 1).padStart(2, '0')}_5yr_compliant.csv`;
    a.click();
    URL.revokeObjectURL(url);
    toast.success('5yr compliant ledger exported');
  };

  // Generate individual receipt PDF on demand
  const generateReceiptPdf = async (entry: LedgerEntry & { balance: number }) => {
    if (entry.type !== 'receipt') return;
    // Fetch full receipt data
    const { data: receipt } = await supabase
      .from('trust_receipts')
      .select('*')
      .eq('receipt_number', entry.number)
      .single();
    if (!receipt) { toast.error('Receipt not found'); return; }

    // Fetch agent info
    const { data: agent } = await supabase
      .from('agents')
      .select('name, agency, license_number')
      .eq('id', receipt.agent_id)
      .single();

    const dateRecFmt = receipt.date_received ? DATE_FMT.format(new Date(receipt.date_received + 'T00:00:00')) : '—';
    const dateDepFmt = receipt.date_deposited ? DATE_FMT.format(new Date(receipt.date_deposited + 'T00:00:00')) : 'Pending';

    const html = `<!DOCTYPE html><html><head><meta charset="utf-8">
<title>Trust Receipt ${receipt.receipt_number}</title>
<style>
  @media print { @page { margin: 20mm; } }
  * { margin: 0; padding: 0; box-sizing: border-box; }
  body { font-family: 'Helvetica Neue', Arial, sans-serif; font-size: 11px; color: #1a1a1a; padding: 40px; }
  .receipt { max-width: 600px; margin: 0 auto; border: 2px solid #1a1a1a; padding: 30px; }
  .header { text-align: center; margin-bottom: 20px; border-bottom: 1px solid #ddd; padding-bottom: 15px; }
  .header .act { font-size: 8px; text-transform: uppercase; letter-spacing: 3px; color: #666; margin-bottom: 6px; }
  .header h1 { font-size: 18px; margin-bottom: 4px; }
  .header .num { font-size: 14px; font-family: 'Courier New', monospace; font-weight: bold; color: #333; }
  .grid { display: grid; grid-template-columns: 1fr 1fr; gap: 8px 24px; margin: 15px 0; }
  .grid .label { font-size: 9px; color: #888; text-transform: uppercase; letter-spacing: 1px; }
  .grid .value { font-size: 11px; font-weight: 600; margin-bottom: 6px; }
  .amount-box { text-align: center; background: #f8f8f8; border: 1px solid #ddd; border-radius: 6px; padding: 15px; margin: 15px 0; }
  .amount-box .amt { font-size: 24px; font-weight: bold; }
  .amount-box .gst { font-size: 9px; color: #666; margin-top: 4px; }
  .sig { margin-top: 25px; display: flex; justify-content: space-between; }
  .sig div { width: 45%; }
  .sig .line { border-top: 1px solid #999; margin-top: 30px; padding-top: 4px; font-size: 9px; color: #666; }
  .footer { border-top: 1px dashed #ccc; padding-top: 12px; margin-top: 15px; text-align: center; }
  .footer p { font-size: 8px; color: #888; margin-bottom: 3px; }
  .duplicate { text-align: center; margin-top: 50px; border-top: 2px dashed #ccc; padding-top: 10px; }
  .duplicate p { font-size: 9px; color: #888; text-transform: uppercase; letter-spacing: 2px; }
</style></head><body>
<div class="receipt">
  <div class="header">
    <p class="act">Agents Financial Administration Act 2014</p>
    <h1>Trust Account Receipt</h1>
    <p class="num">${receipt.receipt_number}</p>
  </div>
  <div class="grid">
    <div><p class="label">Date Received</p><p class="value">${dateRecFmt}</p></div>
    <div><p class="label">Date Deposited</p><p class="value">${dateDepFmt} ${receipt.date_deposited ? '✓' : ''}</p></div>
    <div><p class="label">Client</p><p class="value">${receipt.client_name}</p></div>
    <div><p class="label">Property</p><p class="value">${receipt.property_address}</p></div>
    <div><p class="label">Payment Method</p><p class="value">${receipt.payment_method}</p></div>
    <div><p class="label">Purpose</p><p class="value">${receipt.purpose}</p></div>
  </div>
  <div class="amount-box">
    <p style="font-size:9px;color:#666;text-transform:uppercase;letter-spacing:1px;">Amount Received</p>
    <p class="amt">${AUD.format(receipt.amount)}</p>
    <p class="gst">GST Component (1/11th): ${AUD.format(receipt.amount / 11)}</p>
  </div>
  <div class="sig">
    <div><p class="line">Signature of Recipient</p></div>
    <div><p class="line">Agent: ${agent?.name || '—'}${agent?.license_number ? ` (Lic. ${agent.license_number})` : ''}</p></div>
  </div>
  <div class="footer">
    ${agent?.agency ? `<p><strong>${agent.agency}</strong></p>` : ''}
    <p>This receipt forms part of the trust account audit trail</p>
    <p>Retain for minimum 5 years per legislative requirements</p>
  </div>
</div>
<div class="duplicate"><p>— Duplicate Copy for Records —</p></div>
<script>window.onload = () => window.print();</script>
</body></html>`;

    const w = window.open('', '_blank', 'width=700,height=900');
    if (w) { w.document.write(html); w.document.close(); }
    else {
      const blob = new Blob([html], { type: 'text/html' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url; a.download = `Trust_Receipt_${receipt.receipt_number}.html`; a.click();
      URL.revokeObjectURL(url);
    }
    toast.success(`Receipt ${receipt.receipt_number} PDF generated`);
  };

  // Audit PDF export
  const exportAuditPdf = () => {
    const closingBalance = entriesWithBalance.length > 0 ? entriesWithBalance[entriesWithBalance.length - 1].balance : 0;
    const totalIn = filtered.filter(e => e.type === 'receipt').reduce((s, e) => s + e.amount, 0);
    const totalOut = filtered.filter(e => e.type === 'payment').reduce((s, e) => s + e.amount, 0);

    const rows = entriesWithBalance.map(e => `
      <tr>
        <td>${new Date(e.date + 'T00:00:00').toLocaleDateString('en-AU', { day: '2-digit', month: '2-digit' })}</td>
        <td class="mono">${e.type === 'receipt' ? e.number : ''}</td>
        <td class="mono">${e.type === 'payment' ? e.number : ''}</td>
        <td>${e.client}</td>
        <td class="truncate">${e.property}</td>
        <td class="right ${e.type === 'receipt' ? 'green' : ''}">${e.type === 'receipt' ? '+' + AUD.format(e.amount) : ''}</td>
        <td class="right ${e.type === 'payment' ? 'red' : ''}">${e.type === 'payment' ? '-' + AUD.format(e.amount) : ''}</td>
        <td class="right bold">${AUD.format(e.balance)}</td>
      </tr>`).join('');

    const html = `<!DOCTYPE html><html><head><title>Trust Ledger - ${monthNames[viewMonth]} ${viewYear}</title>
    <style>
      @page { size: A4 landscape; margin: 15mm; }
      body { font-family: 'Helvetica Neue', Arial, sans-serif; font-size: 10px; color: #1a1a1a; }
      .header { text-align: center; margin-bottom: 20px; border-bottom: 2px solid #1a1a1a; padding-bottom: 10px; }
      .header h1 { font-size: 18px; margin: 0; }
      .header .act { font-size: 9px; color: #666; margin-top: 4px; }
      .header .period { font-size: 13px; font-weight: bold; margin-top: 6px; }
      table { width: 100%; border-collapse: collapse; margin-top: 10px; }
      th { background: #f5f5f5; border: 1px solid #ddd; padding: 6px 8px; text-align: left; font-size: 9px; text-transform: uppercase; letter-spacing: 0.5px; }
      td { border: 1px solid #eee; padding: 5px 8px; font-size: 10px; }
      tr:nth-child(even) { background: #fafafa; }
      .right { text-align: right; }
      .bold { font-weight: bold; }
      .mono { font-family: 'Courier New', monospace; font-size: 10px; }
      .green { color: #16a34a; }
      .red { color: #dc2626; }
      .truncate { max-width: 160px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
      .summary { margin-top: 16px; display: flex; gap: 30px; justify-content: flex-end; }
      .summary div { text-align: right; }
      .summary .label { font-size: 9px; color: #666; text-transform: uppercase; }
      .summary .value { font-size: 14px; font-weight: bold; }
      .footer { margin-top: 24px; padding-top: 10px; border-top: 1px solid #ddd; font-size: 8px; color: #999; text-align: center; }
    </style></head><body>
    <div class="header">
      <p class="act">Agents Financial Administration Act 2014</p>
      <h1>Trust Account Ledger</h1>
      <p class="period">${monthNames[viewMonth]} ${viewYear}</p>
    </div>
    <table>
      <thead><tr>
        <th>Date</th><th>Receipt #</th><th>Payment #</th><th>Client</th><th>Property</th><th class="right">In</th><th class="right">Out</th><th class="right">Balance</th>
      </tr></thead>
      <tbody>${rows}</tbody>
    </table>
    <div class="summary">
      <div><span class="label">Total In</span><br/><span class="value green">${AUD.format(totalIn)}</span></div>
      <div><span class="label">Total Out</span><br/><span class="value red">${AUD.format(totalOut)}</span></div>
      <div><span class="label">Closing Balance</span><br/><span class="value">${AUD.format(closingBalance)}</span></div>
    </div>
    <div class="footer">
      Generated ${new Date().toLocaleDateString('en-AU')} — Retain for minimum 5 years per AFAA 2014 s.84
    </div>
    </body></html>`;

    const w = window.open('', '_blank', 'width=1100,height=700');
    if (w) { w.document.write(html); w.document.close(); w.print(); }
  };

  if (loading) {
    return (
      <div>
        <DashboardHeader title="Trust Ledger" subtitle="Receipts & payments register" />
        <div className="p-6 text-center text-muted-foreground">Loading…</div>
      </div>
    );
  }

  const closingBalance = entriesWithBalance.length > 0 ? entriesWithBalance[entriesWithBalance.length - 1].balance : 0;
  const monthTotalIn = filtered.filter(e => e.type === 'receipt').reduce((s, e) => s + e.amount, 0);
  const monthTotalOut = filtered.filter(e => e.type === 'payment').reduce((s, e) => s + e.amount, 0);

  return (
    <div>
      <DashboardHeader
        title="Trust Ledger"
        subtitle="Receipts & payments register — Agents Financial Administration Act 2014"
        actions={
          <div className="flex gap-2">
            <Button size="sm" variant="outline" onClick={exportAuditPdf} className="gap-1.5 text-xs">
              <FileText size={13} /> Download Audit PDF
            </Button>
            <Button size="sm" variant="outline" onClick={exportCsv} className="gap-1.5 text-xs">
              <FileDown size={13} /> Export CSV 5yr
            </Button>
            <Button size="sm" onClick={() => setShowNewReceipt(true)} className="gap-1.5 text-xs">
              <Receipt size={13} /> New Receipt
            </Button>
          </div>
        }
      />

      <div className="p-4 sm:p-6 max-w-[1600px] space-y-5">
        {/* Month Navigator + Summary */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <Button size="icon" variant="outline" className="h-8 w-8" onClick={prevMonth}>
              <ChevronLeft size={14} />
            </Button>
            <h2 className="text-lg font-bold min-w-[180px] text-center">
              {monthNames[viewMonth]} {viewYear}
            </h2>
            <Button size="icon" variant="outline" className="h-8 w-8" onClick={nextMonth}>
              <ChevronRight size={14} />
            </Button>
          </div>
          <div className="flex items-center gap-4 text-xs">
            <span>In: <strong className="text-green-600">{AUD.format(monthTotalIn)}</strong></span>
            <span>Out: <strong className="text-destructive">{AUD.format(monthTotalOut)}</strong></span>
            <span className="border-l border-border pl-4">Balance: <strong className="text-base">{AUD.format(closingBalance)}</strong></span>
          </div>
        </div>

        {/* Tabs + Filters */}
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <div className="flex flex-wrap items-center gap-3 mb-3">
            <TabsList>
              <TabsTrigger value="all" className="text-xs gap-1.5">
                All <Badge variant="secondary" className="text-[9px] px-1 h-4 ml-1">{filtered.length}</Badge>
              </TabsTrigger>
              <TabsTrigger value="receipts" className="text-xs gap-1.5">
                <ArrowDownCircle size={12} /> Receipts
              </TabsTrigger>
              <TabsTrigger value="payments" className="text-xs gap-1.5">
                <ArrowUpCircle size={12} /> Payments
              </TabsTrigger>
            </TabsList>
            <div className="flex-1" />
            <div className="flex items-center gap-2">
              <div className="relative">
                <Search size={13} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-muted-foreground" />
                <Input value={searchQuery} onChange={e => setSearchQuery(e.target.value)}
                  placeholder="Search client, property, ref…" className="h-8 pl-8 w-[200px] text-xs" />
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

          {/* Ledger Table */}
          <TabsContent value={activeTab} className="mt-0">
            <Card>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="text-xs">Date</TableHead>
                    <TableHead className="text-xs">Receipt #</TableHead>
                    <TableHead className="text-xs">Payment #</TableHead>
                    <TableHead className="text-xs">Client</TableHead>
                    <TableHead className="text-xs">Property</TableHead>
                    <TableHead className="text-xs text-right">In</TableHead>
                    <TableHead className="text-xs text-right">Out</TableHead>
                    <TableHead className="text-xs text-right">Balance</TableHead>
                    <TableHead className="text-xs w-[40px]"></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {entriesWithBalance.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={8} className="text-center text-muted-foreground py-12 text-sm">
                        {searchQuery || filterStatus !== 'all'
                          ? 'No entries match your filters.'
                          : `No trust entries for ${monthNames[viewMonth]} ${viewYear}.`}
                      </TableCell>
                    </TableRow>
                  ) : (
                    entriesWithBalance.map(entry => {
                      const isReceipt = entry.type === 'receipt';
                      return (
                        <TableRow key={entry.id}>
                          <TableCell className="text-xs whitespace-nowrap tabular-nums">
                            {new Date(entry.date + 'T00:00:00').toLocaleDateString('en-AU', { day: '2-digit', month: '2-digit' })}
                          </TableCell>
                          <TableCell className="text-xs font-mono">
                            {isReceipt ? entry.number : ''}
                          </TableCell>
                          <TableCell className="text-xs font-mono">
                            {!isReceipt ? entry.number : ''}
                          </TableCell>
                          <TableCell className="text-xs font-medium">{entry.client}</TableCell>
                          <TableCell className="text-xs max-w-[160px] truncate text-muted-foreground">{entry.property}</TableCell>
                          <TableCell className="text-xs text-right tabular-nums font-semibold text-green-600">
                            {isReceipt ? `+${AUD.format(entry.amount)}` : ''}
                          </TableCell>
                          <TableCell className="text-xs text-right tabular-nums font-semibold text-destructive">
                            {!isReceipt ? `-${AUD.format(entry.amount)}` : ''}
                          </TableCell>
                          <TableCell className="text-xs text-right tabular-nums font-bold">
                            {AUD.format(entry.balance)}
                          </TableCell>
                          <TableCell className="text-xs">
                            {entry.type === 'receipt' && (
                              <TooltipProvider>
                                <Tooltip>
                                  <TooltipTrigger asChild>
                                    <Button size="icon" variant="ghost" className="h-7 w-7"
                                      onClick={() => generateReceiptPdf(entry)}>
                                      <Download size={12} />
                                    </Button>
                                  </TooltipTrigger>
                                  <TooltipContent><p className="text-xs">Download Receipt PDF</p></TooltipContent>
                                </Tooltip>
                              </TooltipProvider>
                            )}
                          </TableCell>
                        </TableRow>
                      );
                    })
                  )}
                </TableBody>
              </Table>
            </Card>

            {/* Footer */}
            {entriesWithBalance.length > 0 && (
              <div className="flex items-center justify-between mt-3 px-2">
                <span className="text-xs text-muted-foreground">
                  {entriesWithBalance.length} entr{entriesWithBalance.length === 1 ? 'y' : 'ies'}
                </span>
                <div className="flex items-center gap-2">
                  <Button size="sm" variant="outline" className="h-7 text-[10px] gap-1" onClick={() => setShowStatement(true)}>
                    <FileDown size={11} /> Monthly Statement
                  </Button>
                </div>
              </div>
            )}
          </TabsContent>
        </Tabs>
      </div>

      <TrustReceiptModal open={showNewReceipt} onOpenChange={setShowNewReceipt} onCreated={fetchData} />
      <TrustStatementModal open={showStatement} onOpenChange={setShowStatement} />
    </div>
  );
};

export default TrustLedgerPage;
