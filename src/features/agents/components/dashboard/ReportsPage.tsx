import { useState, useMemo, useEffect } from 'react';
import { useSubscription } from '@/features/agents/hooks/useSubscription';
import UpgradeGate from '@/features/agents/components/shared/UpgradeGate';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, LineChart, Line, Legend,
} from 'recharts';
import {
  Download, CalendarIcon, TrendingUp, DollarSign, Home, Clock,
  Target, Users, Phone, Eye, Mail, Building2, AlertTriangle, FileText,
} from 'lucide-react';
import { format, subMonths, subDays, startOfMonth, endOfMonth, isWithinInterval, eachMonthOfInterval, differenceInDays } from 'date-fns';
import { cn } from '@/lib/utils';
import DashboardHeader from './DashboardHeader';
import { useAgentListings } from '@/features/agents/hooks/useAgentListings';
import { useTrustAccounting } from '@/features/agents/hooks/useTrustAccounting';
import { useContacts } from '@/features/agents/hooks/useContacts';
import { supabase } from '@/integrations/supabase/client';
import { useAgent } from '@/features/agents/hooks/useAgent';
import { toast } from 'sonner';

const AUD = new Intl.NumberFormat('en-AU', { style: 'currency', currency: 'AUD', minimumFractionDigits: 0 });
const AUD2 = new Intl.NumberFormat('en-AU', { style: 'currency', currency: 'AUD', minimumFractionDigits: 2 });
const DATE_FMT = new Intl.DateTimeFormat('en-AU', { day: '2-digit', month: '2-digit', year: 'numeric' });
const CHART_COLORS = ['hsl(var(--primary))', 'hsl(var(--chart-2))', 'hsl(var(--chart-3))', 'hsl(var(--chart-4))', 'hsl(var(--chart-5))'];

type Period = '30d' | '90d' | '6m' | '12m' | 'custom';

const PERIOD_OPTIONS: { value: Period; label: string }[] = [
  { value: '30d', label: 'Last 30 Days' },
  { value: '90d', label: 'Last 90 Days' },
  { value: '6m', label: 'Last 6 Months' },
  { value: '12m', label: 'Last 12 Months' },
];

function getDateRange(period: Period, customFrom?: Date, customTo?: Date): { from: Date; to: Date } {
  const to = customTo || new Date();
  switch (period) {
    case '30d': return { from: subDays(to, 30), to };
    case '90d': return { from: subMonths(to, 3), to };
    case '6m': return { from: subMonths(to, 6), to };
    case '12m': return { from: subMonths(to, 12), to };
    case 'custom': return { from: customFrom || subMonths(to, 1), to };
  }
}

function exportCsv(headers: string[], rows: string[][], filename: string) {
  const csv = [
    headers.join(','),
    ...rows.map(r => r.map(v => `"${String(v).replace(/"/g, '""')}"`).join(',')),
  ].join('\n');
  const blob = new Blob([csv], { type: 'text/csv' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `${filename}_${format(new Date(), 'yyyy-MM-dd')}.csv`;
  a.click();
  URL.revokeObjectURL(url);
}

// ──────────────────────────────────────────────
// Stat Card
// ──────────────────────────────────────────────
const StatCard = ({ icon: Icon, label, value, sub, color = 'bg-primary/10 text-primary' }: {
  icon: any; label: string; value: string; sub?: string; color?: string;
}) => (
  <Card>
    <CardContent className="p-4 flex items-center gap-3">
      <div className={`h-10 w-10 rounded-lg flex items-center justify-center ${color}`}>
        <Icon size={18} />
      </div>
      <div>
        <p className="text-[10px] text-muted-foreground font-medium uppercase tracking-wide">{label}</p>
        <p className="text-lg font-bold">{value}</p>
        {sub && <p className="text-[10px] text-muted-foreground">{sub}</p>}
      </div>
    </CardContent>
  </Card>
);

// ──────────────────────────────────────────────
// Main Component
// ──────────────────────────────────────────────
const ReportsPage = () => {
  const { canAccessTrust, loading: subLoading } = useSubscription();
  const { listings } = useAgentListings();
  const { accounts, transactions } = useTrustAccounting();
  const { contacts } = useContacts();

  const [activeTab, setActiveTab] = useState('sales');
  const [period, setPeriod] = useState<Period>('90d');
  const [customFrom, setCustomFrom] = useState<Date>();
  const [customTo, setCustomTo] = useState<Date>();

  const range = useMemo(() => getDateRange(period, customFrom, customTo), [period, customFrom, customTo]);

  // ─── SALES DATA ───
  const salesData = useMemo(() => {
    const soldListings = listings.filter(l => {
      const status = '_mock_status' in l ? l._mock_status : (l as any).status;
      if (status !== 'sold') return false;
      const date = new Date((l as any).updated_at || (l as any).created_at);
      return isWithinInterval(date, { start: range.from, end: range.to });
    });

    const totalGci = soldListings.reduce((sum, l) => {
      const price = (l as any).price || 0;
      const rate = (l as any).commission_rate || 2;
      return sum + (price * rate / 100);
    }, 0);

    const totalVolume = soldListings.reduce((sum, l) => sum + ((l as any).price || 0), 0);

    const datedSold = soldListings.filter(l => (l as any).listed_date);
    const avgDom = datedSold.length > 0
      ? Math.round(datedSold.reduce((sum, l) => {
          const listed = new Date((l as any).listed_date);
          const sold = new Date((l as any).updated_at || (l as any).created_at);
          return sum + Math.max(1, Math.round((sold.getTime() - listed.getTime()) / 86400000));
        }, 0) / datedSold.length)
      : 0;

    // Monthly breakdown for chart — use selected range
    const months = eachMonthOfInterval({ start: range.from, end: range.to });
    const monthlyData = months.map(m => {
      const start = startOfMonth(m);
      const end = endOfMonth(m);
      const monthSold = soldListings.filter(l => {
        const d = new Date((l as any).updated_at || (l as any).created_at);
        return isWithinInterval(d, { start, end });
      });
      return {
        month: format(m, 'MMM yy'),
        sales: monthSold.length,
        gci: monthSold.reduce((s, l) => s + ((l as any).price || 0) * ((l as any).commission_rate || 2) / 100, 0),
      };
    });

    // Property type breakdown
    const typeMap: Record<string, number> = {};
    soldListings.forEach(l => {
      const t = (l as any).property_type || 'Unknown';
      typeMap[t] = (typeMap[t] || 0) + 1;
    });
    const typeData = Object.entries(typeMap).map(([name, value]) => ({ name, value }));

    return { soldListings, totalGci, totalVolume, avgDom, monthlyData, typeData, activeListings: listings.filter(l => ('_mock_status' in l ? l._mock_status !== 'sold' : (l as any).status !== 'sold')).length };
  }, [listings, range]);

  // ─── FINANCIAL DATA ───
  const financialData = useMemo(() => {
    const periodTx = transactions.filter(t =>
      isWithinInterval(new Date(t.transaction_date), { start: range.from, end: range.to })
    );

    const totalDeposits = periodTx.filter(t => t.transaction_type === 'deposit').reduce((s, t) => s + t.amount, 0);
    const totalWithdrawals = periodTx.filter(t => t.transaction_type === 'withdrawal').reduce((s, t) => s + t.amount, 0);
    const totalGst = periodTx.reduce((s, t) => s + t.gst_amount, 0);
    const reconciledCount = periodTx.filter(t => t.status === 'reconciled').length;
    const pendingCount = periodTx.filter(t => t.status === 'pending').length;

    // Category breakdown
    const catMap: Record<string, number> = {};
    periodTx.forEach(t => {
      catMap[t.category] = (catMap[t.category] || 0) + t.amount;
    });
    const categoryData = Object.entries(catMap).map(([name, value]) => ({ name, value }));

    // Monthly flow — use selected range
    const flowMonths = eachMonthOfInterval({ start: range.from, end: range.to });
    const monthlyFlow = flowMonths.map(m => {
      const start = startOfMonth(m);
      const end = endOfMonth(m);
      const mTx = periodTx.filter(t => isWithinInterval(new Date(t.transaction_date), { start, end }));
      return {
        month: format(m, 'MMM yy'),
        deposits: mTx.filter(t => t.transaction_type === 'deposit').reduce((s, t) => s + t.amount, 0),
        withdrawals: mTx.filter(t => t.transaction_type === 'withdrawal').reduce((s, t) => s + t.amount, 0),
      };
    });

    const trustBalance = accounts.filter(a => a.account_type === 'trust').reduce((s, a) => s + a.current_balance, 0);
    const operatingBalance = accounts.filter(a => a.account_type === 'operating').reduce((s, a) => s + a.current_balance, 0);

    return { periodTx, totalDeposits, totalWithdrawals, totalGst, reconciledCount, pendingCount, categoryData, monthlyFlow, trustBalance, operatingBalance };
  }, [transactions, accounts, range]);

  // ─── AGENT ACTIVITY DATA ───
  const activityData = useMemo(() => {
    const totalContacts = contacts.length;
    const hotLeads = contacts.filter(c => c.ranking === 'hot').length;
    const warmLeads = contacts.filter(c => c.ranking === 'warm').length;
    const totalViews = listings.reduce((s, l) => s + ((l as any).views || 0), 0);
    const totalClicks = listings.reduce((s, l) => s + ((l as any).contact_clicks || 0), 0);
    const conversionRate = totalViews > 0 ? Math.min(100, (totalClicks / totalViews) * 100).toFixed(1) : '0';

    // Source breakdown
    const sourceMap: Record<string, number> = {};
    contacts.forEach(c => {
      const s = c.source || 'Unknown';
      sourceMap[s] = (sourceMap[s] || 0) + 1;
    });
    const sourceData = Object.entries(sourceMap).map(([name, value]) => ({ name, value }));

    // Pipeline stage counts
    const buyerStages: Record<string, number> = {};
    contacts.filter(c => c.contact_type === 'buyer' || c.contact_type === 'both').forEach(c => {
      const stage = c.buyer_pipeline_stage || 'cold_lead';
      buyerStages[stage] = (buyerStages[stage] || 0) + 1;
    });
    const pipelineData = Object.entries(buyerStages).map(([name, value]) => ({
      name: name.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase()),
      value,
    }));

    return { totalContacts, hotLeads, warmLeads, totalViews, totalClicks, conversionRate, sourceData, pipelineData };
  }, [contacts, listings]);

  // ─── EXPORT HANDLERS ───
  const exportSalesReport = () => {
    const headers = ['Property', 'Address', 'Price', 'Commission Rate', 'GCI', 'Status', 'Listed Date'];
    const rows = salesData.soldListings.map(l => [
      (l as any).title, (l as any).address, String((l as any).price || 0),
      String((l as any).commission_rate || 2) + '%',
      AUD.format(((l as any).price || 0) * ((l as any).commission_rate || 2) / 100),
      '_mock_status' in l ? l._mock_status : (l as any).status,
      (l as any).listed_date || '',
    ]);
    exportCsv(headers, rows, 'sales_report');
  };

  const exportFinancialReport = () => {
    const headers = ['Date', 'Type', 'Category', 'Payee', 'Amount', 'GST', 'Status', 'Reference'];
    const rows = financialData.periodTx.map(t => [
      t.transaction_date, t.transaction_type, t.category, t.payee_name || '',
      String(t.amount), String(t.gst_amount), t.status, t.reference || '',
    ]);
    exportCsv(headers, rows, 'financial_report');
  };

  const exportActivityReport = () => {
    const headers = ['Name', 'Type', 'Ranking', 'Email', 'Phone', 'Source', 'Pipeline Stage', 'Suburb'];
    const periodContacts = contacts.filter(c => {
      const created = (c as any).created_at ? new Date((c as any).created_at) : null;
      return created ? created >= range.from && created <= range.to : true;
    });
    const rows = periodContacts.map(c => [
      `${c.first_name} ${c.last_name || ''}`, c.contact_type, c.ranking,
      c.email || '', c.phone || '', c.source || '',
      c.buyer_pipeline_stage || c.seller_pipeline_stage || '', c.suburb || '',
    ]);
    exportCsv(headers, rows, 'activity_report');
  };

  if (!subLoading && !canAccessTrust) {
    return <UpgradeGate requiredPlan="Pro or above" message="Advanced reports are available on the Pro plan and above. Export listings, leads, trust, and contacts data as CSV." />;
  }

  return (
    <div>
      <DashboardHeader title="Reports" subtitle="Performance analytics & financial summaries" />
      <div className="p-4 sm:p-6 max-w-7xl space-y-4">
        {/* Period selector */}
        <div className="flex flex-wrap items-center gap-2">
          <Select value={period} onValueChange={v => setPeriod(v as Period)}>
            <SelectTrigger className="w-[160px] h-8 text-xs">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {PERIOD_OPTIONS.map(o => (
                <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>
              ))}
              <SelectItem value="custom">Custom Range</SelectItem>
            </SelectContent>
          </Select>

          {period === 'custom' && (
            <>
              <Popover>
                <PopoverTrigger asChild>
                  <Button variant="outline" size="sm" className={cn('h-8 text-xs gap-1', !customFrom && 'text-muted-foreground')}>
                    <CalendarIcon size={12} />
                    {customFrom ? format(customFrom, 'dd/MM/yyyy') : 'From'}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  <Calendar mode="single" selected={customFrom} onSelect={setCustomFrom} className="p-3 pointer-events-auto" />
                </PopoverContent>
              </Popover>
              <Popover>
                <PopoverTrigger asChild>
                  <Button variant="outline" size="sm" className={cn('h-8 text-xs gap-1', !customTo && 'text-muted-foreground')}>
                    <CalendarIcon size={12} />
                    {customTo ? format(customTo, 'dd/MM/yyyy') : 'To'}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  <Calendar mode="single" selected={customTo} onSelect={setCustomTo} className="p-3 pointer-events-auto" />
                </PopoverContent>
              </Popover>
            </>
          )}

          <span className="text-[10px] text-muted-foreground ml-auto">
            {format(range.from, 'dd/MM/yyyy')} – {format(range.to, 'dd/MM/yyyy')}
          </span>
        </div>

        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList>
            <TabsTrigger value="sales">Sales Performance</TabsTrigger>
            <TabsTrigger value="financial">Financial</TabsTrigger>
            <TabsTrigger value="activity">Agent Activity</TabsTrigger>
          </TabsList>

          {/* ─── SALES PERFORMANCE ─── */}
          <TabsContent value="sales" className="space-y-4 mt-4">
            <div className="flex justify-end">
              <Button size="sm" variant="outline" onClick={exportSalesReport} className="gap-1.5">
                <Download size={14} /> Export CSV
              </Button>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
              <StatCard icon={DollarSign} label="Total GCI" value={AUD.format(salesData.totalGci)} />
              <StatCard icon={TrendingUp} label="Sales Volume" value={AUD.format(salesData.totalVolume)} color="bg-green-500/10 text-green-600" />
              <StatCard icon={Home} label="Active Listings" value={String(salesData.activeListings)} color="bg-blue-500/10 text-blue-500" />
              <StatCard icon={Clock} label="Avg Days on Market" value={`${salesData.avgDom}d`} color="bg-orange-500/10 text-orange-500" />
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
              <Card className="lg:col-span-2">
                <CardContent className="p-4">
                  <h4 className="text-xs font-bold mb-3">Monthly Sales & GCI</h4>
                  <ResponsiveContainer width="100%" height={240}>
                    <BarChart data={salesData.monthlyData}>
                      <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
                      <XAxis dataKey="month" className="text-[10px]" tick={{ fontSize: 10 }} />
                      <YAxis className="text-[10px]" tick={{ fontSize: 10 }} />
                      <Tooltip
                        contentStyle={{ fontSize: 11, borderRadius: 8, border: '1px solid hsl(var(--border))' }}
                        formatter={(val: number, name: string) => [name === 'gci' ? AUD.format(val) : val, name === 'gci' ? 'GCI' : 'Sales']}
                      />
                      <Legend wrapperStyle={{ fontSize: 10 }} />
                      <Bar dataKey="sales" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} name="Sales" />
                      <Bar dataKey="gci" fill="hsl(var(--chart-2))" radius={[4, 4, 0, 0]} name="GCI ($)" />
                    </BarChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>

              <Card>
                <CardContent className="p-4">
                  <h4 className="text-xs font-bold mb-3">By Property Type</h4>
                  {salesData.typeData.length === 0 ? (
                    <p className="text-xs text-muted-foreground text-center py-12">No sold listings yet</p>
                  ) : (
                    <ResponsiveContainer width="100%" height={240}>
                      <PieChart>
                        <Pie data={salesData.typeData} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={80} label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`} labelLine={false}>
                          {salesData.typeData.map((_, i) => (
                            <Cell key={i} fill={CHART_COLORS[i % CHART_COLORS.length]} />
                          ))}
                        </Pie>
                        <Tooltip />
                      </PieChart>
                    </ResponsiveContainer>
                  )}
                </CardContent>
              </Card>
            </div>

            {/* Listings table */}
            <Card>
              <CardContent className="p-0">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="text-xs">Property</TableHead>
                      <TableHead className="text-xs">Price</TableHead>
                      <TableHead className="text-xs">Commission</TableHead>
                      <TableHead className="text-xs">GCI</TableHead>
                      <TableHead className="text-xs">Views</TableHead>
                      <TableHead className="text-xs">Enquiries</TableHead>
                      <TableHead className="text-xs">Status</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {listings.length === 0 ? (
                      <TableRow><TableCell colSpan={7} className="text-center text-muted-foreground py-8">No listings</TableCell></TableRow>
                    ) : listings.slice(0, 20).map(l => {
                      const price = (l as any).price || 0;
                      const rate = (l as any).commission_rate || 2;
                      const status = '_mock_status' in l ? l._mock_status : (l as any).status;
                      return (
                        <TableRow key={(l as any).id}>
                          <TableCell className="text-xs font-medium">{(l as any).title}</TableCell>
                          <TableCell className="text-xs">{AUD.format(price)}</TableCell>
                          <TableCell className="text-xs">{rate}%</TableCell>
                          <TableCell className="text-xs font-semibold">{AUD.format(price * rate / 100)}</TableCell>
                          <TableCell className="text-xs">{(l as any).views || 0}</TableCell>
                          <TableCell className="text-xs">{(l as any).contact_clicks || 0}</TableCell>
                          <TableCell>
                            <Badge variant={status === 'sold' ? 'secondary' : 'default'} className="text-[10px] capitalize">{status}</Badge>
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
                {listings.length > 20 && (
                  <p className="text-[11px] text-muted-foreground text-center py-2 border-t">
                    Showing 20 of {listings.length} listings. Export CSV to see all.
                  </p>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* ─── FINANCIAL ─── */}
          <TabsContent value="financial" className="space-y-4 mt-4">
            <div className="flex justify-end">
              <Button size="sm" variant="outline" onClick={exportFinancialReport} className="gap-1.5">
                <Download size={14} /> Export CSV
              </Button>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
              <StatCard icon={TrendingUp} label="Total Deposits" value={AUD.format(financialData.totalDeposits)} color="bg-green-500/10 text-green-600" />
              <StatCard icon={TrendingUp} label="Total Withdrawals" value={AUD.format(financialData.totalWithdrawals)} color="bg-destructive/10 text-destructive" />
              <StatCard icon={DollarSign} label="GST Collected" value={AUD.format(financialData.totalGst)} />
              <StatCard icon={Target} label="Reconciled" value={`${financialData.reconciledCount}/${financialData.periodTx.length}`} sub={`${financialData.pendingCount} pending`} color="bg-blue-500/10 text-blue-500" />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <Card>
                <CardContent className="p-4 text-center">
                  <p className="text-[10px] text-muted-foreground uppercase tracking-wide mb-1">Trust Balance</p>
                  <p className="text-2xl font-bold">{AUD.format(financialData.trustBalance)}</p>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="p-4 text-center">
                  <p className="text-[10px] text-muted-foreground uppercase tracking-wide mb-1">Operating Balance</p>
                  <p className="text-2xl font-bold">{AUD.format(financialData.operatingBalance)}</p>
                </CardContent>
              </Card>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
              <Card className="lg:col-span-2">
                <CardContent className="p-4">
                  <h4 className="text-xs font-bold mb-3">Monthly Cash Flow</h4>
                  <ResponsiveContainer width="100%" height={240}>
                    <BarChart data={financialData.monthlyFlow}>
                      <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
                      <XAxis dataKey="month" tick={{ fontSize: 10 }} />
                      <YAxis tick={{ fontSize: 10 }} />
                      <Tooltip contentStyle={{ fontSize: 11, borderRadius: 8, border: '1px solid hsl(var(--border))' }} formatter={(val: number) => AUD.format(val)} />
                      <Legend wrapperStyle={{ fontSize: 10 }} />
                      <Bar dataKey="deposits" fill="hsl(var(--chart-2))" radius={[4, 4, 0, 0]} name="Deposits" />
                      <Bar dataKey="withdrawals" fill="hsl(var(--destructive))" radius={[4, 4, 0, 0]} name="Withdrawals" />
                    </BarChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>

              <Card>
                <CardContent className="p-4">
                  <h4 className="text-xs font-bold mb-3">By Category</h4>
                  {financialData.categoryData.length === 0 ? (
                    <p className="text-xs text-muted-foreground text-center py-12">No transactions yet</p>
                  ) : (
                    <ResponsiveContainer width="100%" height={240}>
                      <PieChart>
                        <Pie data={financialData.categoryData} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={80} label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`} labelLine={false}>
                          {financialData.categoryData.map((_, i) => (
                            <Cell key={i} fill={CHART_COLORS[i % CHART_COLORS.length]} />
                          ))}
                        </Pie>
                        <Tooltip formatter={(val: number) => AUD.format(val)} />
                      </PieChart>
                    </ResponsiveContainer>
                  )}
                </CardContent>
              </Card>
            </div>

            {/* Transaction summary table */}
            <Card>
              <CardContent className="p-0">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="text-xs">Date</TableHead>
                      <TableHead className="text-xs">Type</TableHead>
                      <TableHead className="text-xs">Category</TableHead>
                      <TableHead className="text-xs">Payee</TableHead>
                      <TableHead className="text-xs text-right">Amount</TableHead>
                      <TableHead className="text-xs text-right">GST</TableHead>
                      <TableHead className="text-xs">Status</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {financialData.periodTx.length === 0 ? (
                      <TableRow><TableCell colSpan={7} className="text-center text-muted-foreground py-8">No transactions in period</TableCell></TableRow>
                    ) : financialData.periodTx.slice(0, 30).map(tx => (
                      <TableRow key={tx.id}>
                        <TableCell className="text-xs">{DATE_FMT.format(new Date(tx.transaction_date))}</TableCell>
                        <TableCell className="text-xs capitalize">{tx.transaction_type}</TableCell>
                        <TableCell className="text-xs capitalize">{tx.category}</TableCell>
                        <TableCell className="text-xs">{tx.payee_name || '—'}</TableCell>
                        <TableCell className={`text-xs text-right font-semibold ${tx.transaction_type === 'deposit' ? 'text-green-600' : 'text-destructive'}`}>
                          {tx.transaction_type === 'deposit' ? '+' : '-'}{AUD.format(tx.amount)}
                        </TableCell>
                        <TableCell className="text-xs text-right text-muted-foreground">{AUD.format(tx.gst_amount)}</TableCell>
                        <TableCell>
                          <Badge variant={tx.status === 'reconciled' ? 'secondary' : tx.status === 'voided' ? 'destructive' : 'outline'} className="text-[10px] capitalize">{tx.status}</Badge>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
                {financialData.periodTx.length > 30 && (
                  <p className="text-[11px] text-muted-foreground text-center py-2 border-t">
                    Showing 30 of {financialData.periodTx.length} transactions. Export CSV to see all.
                  </p>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* ─── AGENT ACTIVITY ─── */}
          <TabsContent value="activity" className="space-y-4 mt-4">
            <div className="flex justify-end">
              <Button size="sm" variant="outline" onClick={exportActivityReport} className="gap-1.5">
                <Download size={14} /> Export CSV
              </Button>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
              <StatCard icon={Users} label="Total Contacts" value={String(activityData.totalContacts)} />
              <StatCard icon={Target} label="Hot Leads" value={String(activityData.hotLeads)} sub={`${activityData.warmLeads} warm`} color="bg-destructive/10 text-destructive" />
              <StatCard icon={Eye} label="Listing Views" value={String(activityData.totalViews)} color="bg-blue-500/10 text-blue-500" />
              <StatCard icon={Phone} label="Conversion Rate" value={`${activityData.conversionRate}%`} sub={`${activityData.totalClicks} enquiries`} color="bg-green-500/10 text-green-600" />
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              <Card>
                <CardContent className="p-4">
                  <h4 className="text-xs font-bold mb-3">Lead Sources</h4>
                  {activityData.sourceData.length === 0 ? (
                    <p className="text-xs text-muted-foreground text-center py-12">No contact sources recorded</p>
                  ) : (
                    <ResponsiveContainer width="100%" height={240}>
                      <PieChart>
                        <Pie data={activityData.sourceData} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={80} label={({ name, value }) => `${name} (${value})`} labelLine={false}>
                          {activityData.sourceData.map((_, i) => (
                            <Cell key={i} fill={CHART_COLORS[i % CHART_COLORS.length]} />
                          ))}
                        </Pie>
                        <Tooltip />
                      </PieChart>
                    </ResponsiveContainer>
                  )}
                </CardContent>
              </Card>

              <Card>
                <CardContent className="p-4">
                  <h4 className="text-xs font-bold mb-3">Buyer Pipeline</h4>
                  {activityData.pipelineData.length === 0 ? (
                    <p className="text-xs text-muted-foreground text-center py-12">No buyer contacts</p>
                  ) : (
                    <ResponsiveContainer width="100%" height={240}>
                      <BarChart data={activityData.pipelineData} layout="vertical">
                        <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
                        <XAxis type="number" tick={{ fontSize: 10 }} />
                        <YAxis dataKey="name" type="category" width={100} tick={{ fontSize: 10 }} />
                        <Tooltip contentStyle={{ fontSize: 11, borderRadius: 8, border: '1px solid hsl(var(--border))' }} />
                        <Bar dataKey="value" fill="hsl(var(--primary))" radius={[0, 4, 4, 0]} name="Contacts" />
                      </BarChart>
                    </ResponsiveContainer>
                  )}
                </CardContent>
              </Card>
            </div>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
};

export default ReportsPage;
