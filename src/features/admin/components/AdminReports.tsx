// @ts-nocheck
import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, LineChart, Line, Legend,
} from 'recharts';
import { Download, Calendar, TrendingUp, Users, CreditCard, AlertTriangle, FileSpreadsheet } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';

// ─── Types ───────────────────────────────────────────────────────────────────

type Period = 'daily' | 'weekly' | 'monthly';
type ReportType = 'revenue' | 'agents' | 'listings' | 'leads';
type ExportScope = 'current' | 'full';

interface AgentRow {
  id: string;
  name: string;
  email: string;
  agency: string | null;
  plan_type: string | null;
  is_subscribed: boolean;
  subscription_expires_at: string | null;
  created_at: string;
  last_sign_in_at?: string | null;
  support_pin?: string | null;
  active_listings?: number;
  total_views?: number;
  total_leads?: number;
}

interface ChartPoint {
  label: string;
  new: number;
  total: number;
  trial: number;
  paid: number;
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

const PLAN_LABELS: Record<string, string> = {
  demo: 'Trial',
  starter: 'Starter',
  pro: 'Pro',
  agency: 'Agency',
};

const PLAN_MRR: Record<string, number> = {
  starter: 99,
  pro: 199,
  agency: 399,
};

const planLabel = (p: string | null) => PLAN_LABELS[p?.toLowerCase() || 'demo'] || 'Trial';
const planMrr = (p: string | null) => PLAN_MRR[p?.toLowerCase() || ''] || 0;

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString('en-AU', { day: '2-digit', month: 'short', year: 'numeric' });
}

function daysRemaining(expiresAt: string | null, createdAt: string): number | null {
  if (expiresAt) {
    const diff = new Date(expiresAt).getTime() - Date.now();
    return Math.max(0, Math.ceil(diff / 86400000));
  }
  // Trial: 60 days from created_at
  const trialEnd = new Date(createdAt).getTime() + 60 * 86400000;
  const diff = trialEnd - Date.now();
  return Math.max(0, Math.ceil(diff / 86400000));
}

function getPeriodBuckets(agents: AgentRow[], period: Period, from: Date, to: Date): ChartPoint[] {
  const buckets: ChartPoint[] = [];

  if (period === 'daily') {
    const days = Math.ceil((to.getTime() - from.getTime()) / 86400000);
    for (let i = 0; i < Math.min(days, 30); i++) {
      const d = new Date(from.getTime() + i * 86400000);
      const label = d.toLocaleDateString('en-AU', { day: '2-digit', month: 'short' });
      const dayAgents = agents.filter(a => {
        const c = new Date(a.created_at);
        return c.toDateString() === d.toDateString();
      });
      const cumTotal = agents.filter(a => new Date(a.created_at) <= d).length;
      buckets.push({
        label,
        new: dayAgents.length,
        total: cumTotal,
        trial: dayAgents.filter(a => !a.is_subscribed).length,
        paid: dayAgents.filter(a => a.is_subscribed).length,
      });
    }
  } else if (period === 'weekly') {
    const weeks = Math.ceil((to.getTime() - from.getTime()) / (7 * 86400000));
    for (let i = 0; i < Math.min(weeks, 12); i++) {
      const start = new Date(from.getTime() + i * 7 * 86400000);
      const end = new Date(start.getTime() + 7 * 86400000);
      const label = `W${i + 1} ${start.toLocaleDateString('en-AU', { day: '2-digit', month: 'short' })}`;
      const weekAgents = agents.filter(a => {
        const c = new Date(a.created_at);
        return c >= start && c < end;
      });
      const cumTotal = agents.filter(a => new Date(a.created_at) < end).length;
      buckets.push({
        label,
        new: weekAgents.length,
        total: cumTotal,
        trial: weekAgents.filter(a => !a.is_subscribed).length,
        paid: weekAgents.filter(a => a.is_subscribed).length,
      });
    }
  } else {
    // Monthly
    const months: Date[] = [];
    const cur = new Date(from.getFullYear(), from.getMonth(), 1);
    while (cur <= to && months.length < 12) {
      months.push(new Date(cur));
      cur.setMonth(cur.getMonth() + 1);
    }
    months.forEach(m => {
      const next = new Date(m.getFullYear(), m.getMonth() + 1, 1);
      const label = m.toLocaleDateString('en-AU', { month: 'short', year: '2-digit' });
      const monthAgents = agents.filter(a => {
        const c = new Date(a.created_at);
        return c >= m && c < next;
      });
      const cumTotal = agents.filter(a => new Date(a.created_at) < next).length;
      buckets.push({
        label,
        new: monthAgents.length,
        total: cumTotal,
        trial: monthAgents.filter(a => !a.is_subscribed).length,
        paid: monthAgents.filter(a => a.is_subscribed).length,
      });
    });
  }

  return buckets;
}

// ─── Export helpers ───────────────────────────────────────────────────────────

function exportCSV(rows: AgentRow[], scope: ExportScope, dateLabel: string) {
  const headers = ['Name', 'Email', 'Agency', 'Plan', 'Status', 'MRR ($)', 'Joined', 'Expires / Trial End', 'Days Remaining', 'Last Active'];
  const data = rows.map(a => [
    a.name,
    a.email,
    a.agency || '—',
    planLabel(a.plan_type),
    a.is_subscribed ? 'Active' : 'Trial',
    planMrr(a.plan_type),
    formatDate(a.created_at),
    a.subscription_expires_at ? formatDate(a.subscription_expires_at) : formatDate(new Date(new Date(a.created_at).getTime() + 60 * 86400000).toISOString()),
    daysRemaining(a.subscription_expires_at, a.created_at) ?? '—',
    a.last_sign_in_at ? formatDate(a.last_sign_in_at) : '—',
  ]);

  const totalMrr = rows.filter(a => a.is_subscribed).reduce((s, a) => s + planMrr(a.plan_type), 0);

  const lines = [
    `ListHQ — Revenue & Subscriptions Report`,
    `Period: ${dateLabel}`,
    `Generated: ${formatDate(new Date().toISOString())}`,
    `Scope: ${scope === 'current' ? 'Current view' : 'Full dataset'}`,
    '',
    `Total MRR: $${totalMrr}`,
    `Active Subscriptions: ${rows.filter(a => a.is_subscribed).length}`,
    `Trial Agents: ${rows.filter(a => !a.is_subscribed).length}`,
    '',
    headers.join(','),
    ...data.map(row => row.map(v => `"${v}"`).join(',')),
  ];

  const blob = new Blob([lines.join('\n')], { type: 'text/csv' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `listhq-revenue-${new Date().toISOString().slice(0, 10)}.csv`;
  a.click();
  URL.revokeObjectURL(url);
}

function exportXLSX(rows: AgentRow[], scope: ExportScope, dateLabel: string) {
  // Build XLSX-compatible CSV with BOM for Excel
  const headers = ['Name', 'Email', 'Agency', 'Plan', 'Status', 'MRR ($)', 'Joined', 'Expires / Trial End', 'Days Remaining', 'Last Active'];
  const data = rows.map(a => [
    a.name,
    a.email,
    a.agency || '',
    planLabel(a.plan_type),
    a.is_subscribed ? 'Active' : 'Trial',
    planMrr(a.plan_type),
    formatDate(a.created_at),
    a.subscription_expires_at ? formatDate(a.subscription_expires_at) : formatDate(new Date(new Date(a.created_at).getTime() + 60 * 86400000).toISOString()),
    daysRemaining(a.subscription_expires_at, a.created_at) ?? '',
    a.last_sign_in_at ? formatDate(a.last_sign_in_at) : '',
  ]);

  const totalMrr = rows.filter(a => a.is_subscribed).reduce((s, a) => s + planMrr(a.plan_type), 0);

  const lines = [
    ['ListHQ — Revenue & Subscriptions Report'],
    [`Period: ${dateLabel}`],
    [`Generated: ${formatDate(new Date().toISOString())}`],
    [`Scope: ${scope === 'current' ? 'Current view' : 'Full dataset'}`],
    [],
    [`Total MRR: $${totalMrr}`],
    [`Active Subscriptions: ${rows.filter(a => a.is_subscribed).length}`],
    [`Trial Agents: ${rows.filter(a => !a.is_subscribed).length}`],
    [],
    headers,
    ...data,
  ];

  // BOM + tab-separated for Excel compatibility
  const tsv = '\uFEFF' + lines.map(r => r.join('\t')).join('\n');
  const blob = new Blob([tsv], { type: 'application/vnd.ms-excel' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `listhq-revenue-${new Date().toISOString().slice(0, 10)}.xls`;
  a.click();
  URL.revokeObjectURL(url);
}

// ─── Summary card ─────────────────────────────────────────────────────────────

const SummaryCard = ({ label, value, sub, color = 'text-primary', icon: Icon }: {
  label: string; value: string | number; sub?: string; color?: string; icon: any;
}) => (
  <div className="bg-card border border-border rounded-xl p-4 flex items-start gap-3">
    <div className="w-9 h-9 rounded-lg bg-primary/10 flex items-center justify-center flex-shrink-0">
      <Icon size={16} className="text-primary" />
    </div>
    <div>
      <p className="text-xs text-muted-foreground uppercase tracking-wide font-medium">{label}</p>
      <p className={`text-2xl font-bold ${color}`}>{value}</p>
      {sub && <p className="text-[11px] text-muted-foreground mt-0.5">{sub}</p>}
    </div>
  </div>
);

// ─── Export dialog ─────────────────────────────────────────────────────────────

const ExportDialog = ({ onExport, onClose }: {
  onExport: (format: 'csv' | 'xlsx', scope: ExportScope) => void;
  onClose: () => void;
}) => {
  const [format, setFormat] = useState<'csv' | 'xlsx'>('csv');
  const [scope, setScope] = useState<ExportScope>('current');

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
      <div className="bg-card border border-border rounded-2xl p-6 w-full max-w-sm shadow-xl space-y-5">
        <div>
          <h3 className="font-bold text-foreground">Export Report</h3>
          <p className="text-xs text-muted-foreground mt-1">Choose your format and scope</p>
        </div>

        <div className="space-y-3">
          <p className="text-xs font-semibold text-foreground">Format</p>
          <div className="grid grid-cols-2 gap-2">
            {(['csv', 'xlsx'] as const).map(f => (
              <button
                key={f}
                onClick={() => setFormat(f)}
                className={`flex items-center gap-2 p-3 rounded-xl border text-sm font-medium transition-colors ${
                  format === f
                    ? 'border-primary bg-primary/5 text-primary'
                    : 'border-border text-muted-foreground hover:border-primary/40'
                }`}
              >
                <FileSpreadsheet size={14} />
                {f.toUpperCase()}
              </button>
            ))}
          </div>
        </div>

        <div className="space-y-3">
          <p className="text-xs font-semibold text-foreground">Data scope</p>
          <div className="space-y-2">
            {([
              { value: 'current', label: 'Current view', sub: 'Export only what is currently filtered/shown' },
              { value: 'full', label: 'Full dataset', sub: 'Export all agents regardless of filters' },
            ] as const).map(s => (
              <button
                key={s.value}
                onClick={() => setScope(s.value)}
                className={`w-full text-left p-3 rounded-xl border transition-colors ${
                  scope === s.value
                    ? 'border-primary bg-primary/5'
                    : 'border-border hover:border-primary/40'
                }`}
              >
                <p className="text-sm font-medium text-foreground">{s.label}</p>
                <p className="text-[11px] text-muted-foreground">{s.sub}</p>
              </button>
            ))}
          </div>
        </div>

        <div className="flex gap-2 pt-1">
          <Button variant="outline" className="flex-1" onClick={onClose}>Cancel</Button>
          <Button className="flex-1 gap-2" onClick={() => { onExport(format, scope); onClose(); }}>
            <Download size={14} /> Download
          </Button>
        </div>
      </div>
    </div>
  );
};

// ─── Main component ───────────────────────────────────────────────────────────

interface Props {
  isAdmin: boolean;
  currentAgentId?: string; // set for agent view
}

const AdminReports = ({ isAdmin, currentAgentId }: Props) => {
  const [period, setPeriod] = useState<Period>('monthly');
  const [report, setReport] = useState<ReportType>('revenue');
  const [fromDate, setFromDate] = useState(() => {
    const d = new Date();
    d.setMonth(d.getMonth() - 6);
    return d.toISOString().slice(0, 10);
  });
  const [toDate, setToDate] = useState(() => new Date().toISOString().slice(0, 10));
  const [agents, setAgents] = useState<AgentRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [showExport, setShowExport] = useState(false);
  const [planFilter, setPlanFilter] = useState<string>('all');

  const from = new Date(fromDate);
  const to = new Date(toDate);
  to.setHours(23, 59, 59);

  const dateLabel = `${formatDate(from.toISOString())} – ${formatDate(to.toISOString())}`;

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      let query = supabase
        .from('agents')
        .select('id, name, email, agency, is_subscribed, subscription_expires_at, created_at, support_pin, agent_subscriptions(plan_type)')
        .order('created_at', { ascending: false });

      if (!isAdmin && currentAgentId) {
        query = query.eq('id', currentAgentId);
      }

      const { data } = await query;

      // Get last_sign_in from auth (admin only)
      let signInMap = new Map<string, string | null>();
      if (isAdmin) {
        try {
          const { callAdminFunction } = await import('@/features/admin/lib/adminApi');
          const j = await callAdminFunction('list_users');
          (j?.users || []).forEach((u: any) => signInMap.set(u.id, u.last_sign_in_at || null));
        } catch {}
      }

      // Get listing counts & views per agent
      const { data: props } = await supabase
        .from('properties')
        .select('agent_id, is_active, views');

      const propMap = new Map<string, { listings: number; views: number }>();
      (props || []).forEach(p => {
        if (!p.agent_id) return;
        const cur = propMap.get(p.agent_id) || { listings: 0, views: 0 };
        if (p.is_active) cur.listings++;
        cur.views += p.views || 0;
        propMap.set(p.agent_id, cur);
      });

      // Get lead counts per agent
      const { data: leads } = await supabase
        .from('leads')
        .select('agent_id');

      const leadMap = new Map<string, number>();
      (leads || []).forEach(l => {
        if (!l.agent_id) return;
        leadMap.set(l.agent_id, (leadMap.get(l.agent_id) || 0) + 1);
      });

      setAgents((data || []).map((a: any) => ({
        ...a,
        plan_type: a.agent_subscriptions?.plan_type || null,
        last_sign_in_at: signInMap.get(a.id) ?? null,
        active_listings: propMap.get(a.id)?.listings || 0,
        total_views: propMap.get(a.id)?.views || 0,
        total_leads: leadMap.get(a.id) || 0,
      })));
    } finally {
      setLoading(false);
    }
  }, [isAdmin, currentAgentId]);

  useEffect(() => { fetchData(); }, [fetchData]);

  // Filter agents by date range and plan
  const filteredAgents = agents.filter(a => {
    const created = new Date(a.created_at);
    const inRange = created >= from && created <= to;
    const planMatch = planFilter === 'all' || (a.plan_type || 'demo').toLowerCase() === planFilter;
    return (isAdmin ? inRange : true) && planMatch;
  });

  const allAgentsInRange = agents.filter(a => {
    const created = new Date(a.created_at);
    return created >= from && created <= to;
  });

  // Summary stats
  const totalMrr = agents.filter(a => a.is_subscribed).reduce((s, a) => s + planMrr(a.plan_type), 0);
  const activeSubs = agents.filter(a => a.is_subscribed).length;
  const trialAgents = agents.filter(a => !a.is_subscribed).length;
  const expiringThisWeek = agents.filter(a => {
    const days = daysRemaining(a.subscription_expires_at, a.created_at);
    return days !== null && days <= 7 && days >= 0;
  }).length;

  // Chart data
  const chartData = getPeriodBuckets(agents, period, from, to);

  const handleExport = (format: 'csv' | 'xlsx', scope: ExportScope) => {
    const rows = scope === 'full' ? agents : filteredAgents;
    if (format === 'csv') exportCSV(rows, scope, dateLabel);
    else exportXLSX(rows, scope, dateLabel);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {showExport && <ExportDialog onExport={handleExport} onClose={() => setShowExport(false)} />}

      {/* ── Header controls ── */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
        <div>
          <h2 className="text-lg font-bold text-foreground">Revenue & Subscriptions</h2>
          <p className="text-xs text-muted-foreground">
            {isAdmin ? 'All agents across the platform' : 'Your subscription overview'}
          </p>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          {/* Period buttons */}
          <div className="flex rounded-xl border border-border overflow-hidden">
            {(['daily', 'weekly', 'monthly'] as Period[]).map(p => (
              <button
                key={p}
                onClick={() => setPeriod(p)}
                className={`px-3 py-1.5 text-xs font-medium capitalize transition-colors ${
                  period === p
                    ? 'bg-primary text-primary-foreground'
                    : 'bg-card text-muted-foreground hover:text-foreground'
                }`}
              >
                {p}
              </button>
            ))}
          </div>

          {/* Date range */}
          <div className="flex items-center gap-1.5 bg-card border border-border rounded-xl px-3 py-1.5">
            <Calendar size={12} className="text-muted-foreground" />
            <input
              type="date"
              value={fromDate}
              onChange={e => setFromDate(e.target.value)}
              className="text-xs bg-transparent text-foreground outline-none w-28"
            />
            <span className="text-muted-foreground text-xs">→</span>
            <input
              type="date"
              value={toDate}
              onChange={e => setToDate(e.target.value)}
              className="text-xs bg-transparent text-foreground outline-none w-28"
            />
          </div>

          {isAdmin && (
            <Button
              size="sm"
              variant="outline"
              className="gap-1.5 text-xs"
              onClick={() => setShowExport(true)}
            >
              <Download size={13} /> Export
            </Button>
          )}
        </div>
      </div>

      {/* ── Summary cards ── */}
      {isAdmin && (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          <SummaryCard
            icon={CreditCard}
            label="Total MRR"
            value={`$${totalMrr.toLocaleString()}`}
            sub="Monthly recurring revenue"
            color={totalMrr > 0 ? 'text-emerald-500' : 'text-muted-foreground'}
          />
          <SummaryCard
            icon={Users}
            label="Active Subscriptions"
            value={activeSubs}
            sub="Paying agents"
            color="text-primary"
          />
          <SummaryCard
            icon={TrendingUp}
            label="Trial Agents"
            value={trialAgents}
            sub="In free trial"
            color="text-amber-500"
          />
          <SummaryCard
            icon={AlertTriangle}
            label="Expiring This Week"
            value={expiringThisWeek}
            sub="Need follow-up"
            color={expiringThisWeek > 0 ? 'text-destructive' : 'text-muted-foreground'}
          />
        </div>
      )}

      {/* Agent own view card */}
      {!isAdmin && agents.length > 0 && (
        <div className="bg-card border border-border rounded-xl p-5 space-y-3">
          <p className="text-sm font-semibold text-foreground">Your Subscription</p>
          <div className="flex items-center gap-3">
            <Badge className={agents[0].is_subscribed
              ? 'bg-emerald-500/20 text-emerald-600 border-emerald-500/30'
              : 'bg-amber-500/20 text-amber-600 border-amber-500/30'
            }>
              {agents[0].is_subscribed ? planLabel(agents[0].plan_type) : 'Free Trial'}
            </Badge>
            <span className="text-sm text-muted-foreground">
              {daysRemaining(agents[0].subscription_expires_at, agents[0].created_at)} days remaining
            </span>
          </div>
          <p className="text-xs text-muted-foreground">
            {agents[0].is_subscribed
              ? `Your ${planLabel(agents[0].plan_type)} plan renews on ${agents[0].subscription_expires_at ? formatDate(agents[0].subscription_expires_at) : '—'}`
              : `Your 60-day free trial ends on ${formatDate(new Date(new Date(agents[0].created_at).getTime() + 60 * 86400000).toISOString())}`
            }
          </p>
        </div>
      )}

      {/* ── Chart ── */}
      {isAdmin && (
        <div className="bg-card border border-border rounded-xl p-5">
          <h3 className="text-sm font-semibold text-foreground mb-4">
            Agent Growth — {period === 'daily' ? 'Daily' : period === 'weekly' ? 'Weekly' : 'Monthly'}
          </h3>
          <ResponsiveContainer width="100%" height={240}>
            <BarChart data={chartData} margin={{ top: 0, right: 0, left: -20, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
              <XAxis dataKey="label" tick={{ fontSize: 10, fill: 'hsl(var(--muted-foreground))' }} />
              <YAxis tick={{ fontSize: 10, fill: 'hsl(var(--muted-foreground))' }} allowDecimals={false} />
              <Tooltip
                contentStyle={{
                  background: 'hsl(var(--card))',
                  border: '1px solid hsl(var(--border))',
                  borderRadius: '8px',
                  fontSize: '12px',
                }}
              />
              <Legend wrapperStyle={{ fontSize: '11px' }} />
              <Bar dataKey="paid" name="New Paid" fill="#22c55e" radius={[3, 3, 0, 0]} />
              <Bar dataKey="trial" name="New Trial" fill="#f59e0b" radius={[3, 3, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      )}

      {/* Cumulative line chart */}
      {isAdmin && (
        <div className="bg-card border border-border rounded-xl p-5">
          <h3 className="text-sm font-semibold text-foreground mb-4">Cumulative Agent Growth</h3>
          <ResponsiveContainer width="100%" height={200}>
            <LineChart data={chartData} margin={{ top: 0, right: 0, left: -20, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
              <XAxis dataKey="label" tick={{ fontSize: 10, fill: 'hsl(var(--muted-foreground))' }} />
              <YAxis tick={{ fontSize: 10, fill: 'hsl(var(--muted-foreground))' }} allowDecimals={false} />
              <Tooltip
                contentStyle={{
                  background: 'hsl(var(--card))',
                  border: '1px solid hsl(var(--border))',
                  borderRadius: '8px',
                  fontSize: '12px',
                }}
              />
              <Line type="monotone" dataKey="total" name="Total Agents" stroke="hsl(var(--primary))" strokeWidth={2} dot={false} />
            </LineChart>
          </ResponsiveContainer>
        </div>
      )}

      {/* ── Table ── */}
      {isAdmin && (
        <div className="bg-card border border-border rounded-xl overflow-hidden">
          {/* Table header with filter */}
          <div className="flex items-center justify-between p-4 border-b border-border">
            <h3 className="text-sm font-semibold text-foreground">
              Agent Subscriptions
              <span className="ml-2 text-xs font-normal text-muted-foreground">
                ({filteredAgents.length} agents)
              </span>
            </h3>
            <select
              value={planFilter}
              onChange={e => setPlanFilter(e.target.value)}
              className="text-xs bg-secondary border border-border rounded-lg px-3 py-1.5 text-foreground outline-none"
            >
              <option value="all">All plans</option>
              <option value="demo">Trial</option>
              <option value="starter">Starter</option>
              <option value="pro">Pro</option>
              <option value="agency">Agency</option>
            </select>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-muted/40 border-b border-border">
                  {['Agent', 'Agency', 'Plan', 'Status', 'MRR', 'Listings', 'Views', 'Leads', 'Joined', 'Days Left', 'Last Active'].map(h => (
                    <th key={h} className="text-left text-xs font-semibold text-muted-foreground px-4 py-2.5 whitespace-nowrap">
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {filteredAgents.length === 0 ? (
                  <tr>
                    <td colSpan={11} className="text-center text-muted-foreground text-xs py-8">
                      No agents found for this period and filter.
                    </td>
                  </tr>
                ) : filteredAgents.map(a => {
                  const days = daysRemaining(a.subscription_expires_at, a.created_at);
                  const isExpiring = days !== null && days <= 7;
                  return (
                    <tr key={a.id} className="border-b border-border last:border-0 hover:bg-muted/20 transition-colors">
                      <td className="px-4 py-3">
                        <p className="font-medium text-foreground text-xs">{a.name}</p>
                        <p className="text-muted-foreground text-[10px]">{a.email}</p>
                      </td>
                      <td className="px-4 py-3 text-xs text-muted-foreground">{a.agency || '—'}</td>
                      <td className="px-4 py-3">
                        <Badge variant="outline" className="text-[10px]">
                          {planLabel(a.plan_type)}
                        </Badge>
                      </td>
                      <td className="px-4 py-3">
                        <span className={`text-[10px] px-2 py-0.5 rounded-full font-medium ${
                          a.is_subscribed
                            ? 'bg-emerald-500/20 text-emerald-600'
                            : 'bg-amber-500/20 text-amber-600'
                        }`}>
                          {a.is_subscribed ? 'Active' : 'Trial'}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-xs font-mono text-foreground">
                        ${planMrr(a.plan_type)}
                      </td>
                      <td className="px-4 py-3 text-xs text-center text-foreground">{a.active_listings}</td>
                      <td className="px-4 py-3 text-xs text-center text-foreground">{a.total_views?.toLocaleString()}</td>
                      <td className="px-4 py-3 text-xs text-center text-foreground">{a.total_leads}</td>
                      <td className="px-4 py-3 text-xs text-muted-foreground whitespace-nowrap">{formatDate(a.created_at)}</td>
                      <td className="px-4 py-3 text-xs whitespace-nowrap">
                        <span className={isExpiring ? 'text-destructive font-semibold' : 'text-muted-foreground'}>
                          {days !== null ? `${days}d` : '—'}
                          {isExpiring && ' ⚠️'}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-xs text-muted-foreground whitespace-nowrap">
                        {a.last_sign_in_at ? formatDate(a.last_sign_in_at) : '—'}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {/* Table footer — totals */}
          {filteredAgents.length > 0 && (
            <div className="flex items-center gap-6 px-4 py-3 bg-muted/40 border-t border-border text-xs font-semibold text-foreground">
              <span>Total: {filteredAgents.length} agents</span>
              <span className="text-emerald-600">
                MRR: ${filteredAgents.filter(a => a.is_subscribed).reduce((s, a) => s + planMrr(a.plan_type), 0).toLocaleString()}
              </span>
              <span className="text-amber-600">
                Trials: {filteredAgents.filter(a => !a.is_subscribed).length}
              </span>
              <span>
                Views: {filteredAgents.reduce((s, a) => s + (a.total_views || 0), 0).toLocaleString()}
              </span>
              <span>
                Leads: {filteredAgents.reduce((s, a) => s + (a.total_leads || 0), 0)}
              </span>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default AdminReports;
