import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import {
  DollarSign, TrendingUp, TrendingDown, Users,
  RefreshCw, Download, CreditCard, Zap,
} from 'lucide-react';
import {
  AreaChart, Area, BarChart, Bar, XAxis, YAxis,
  CartesianGrid, Tooltip, ResponsiveContainer, Legend,
} from 'recharts';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';

const PLAN_LABELS: Record<string, string> = {
  solo: 'Solo',
  agency: 'Agency',
  agency_pro: 'Agency Pro',
  enterprise: 'Enterprise',
  demo: 'Trial',
};

const PLAN_MRR: Record<string, number> = {
  solo: 299,
  agency: 899,
  agency_pro: 1999,
  enterprise: 4999,
  demo: 0,
};

const PLAN_COLOR: Record<string, string> = {
  solo: '#6366f1',
  agency: '#0ea5e9',
  agency_pro: '#8b5cf6',
  enterprise: '#f59e0b',
  demo: '#94a3b8',
};

interface AgentBillingRow {
  id: string;
  name: string;
  email: string;
  agency: string | null;
  plan: string;
  mrr: number;
  isSubscribed: boolean;
  subscriptionStart: string | null;
  subscriptionEnd: string | null;
  renewalDate: string | null;
  daysUntilRenewal: number | null;
  lastLogin: string | null;
  stripeConnected: boolean;
}

interface MRRPoint {
  label: string;
  mrr: number;
  arr: number;
  newMrr: number;
  churnMrr: number;
  netNew: number;
}

interface PlanMixPoint {
  plan: string;
  count: number;
  mrr: number;
  color: string;
}

const fmt = (n: number) =>
  n.toLocaleString('en-AU', { style: 'currency', currency: 'AUD', maximumFractionDigits: 0 });

const fmtDate = (d: string) =>
  new Date(d).toLocaleDateString('en-AU', { day: '2-digit', month: 'short', year: 'numeric' });

function exportCSV(rows: AgentBillingRow[]) {
  const totalMrr = rows.filter(r => r.isSubscribed).reduce((s, r) => s + r.mrr, 0);
  const headers = ['Agent', 'Agency', 'Email', 'Plan', 'MRR ($)', 'Status', 'Subscription Start', 'Renewal Date', 'Days Until Renewal'];
  const data = rows.map(r => [
    r.name, r.agency || '', r.email, PLAN_LABEL[r.plan] || r.plan, r.mrr,
    r.isSubscribed ? 'Active' : 'Trial',
    r.subscriptionStart ? fmtDate(r.subscriptionStart) : '',
    r.renewalDate ? fmtDate(r.renewalDate) : '', r.daysUntilRenewal ?? '',
  ]);
  const lines = [
    `ListHQ Revenue & Billing Report — ${fmtDate(new Date().toISOString())}`,
    `Total MRR: ${fmt(totalMrr)} | ARR: ${fmt(totalMrr * 12)}`,
    '', headers.join(','),
    ...data.map(r => r.map(v => `"${v}"`).join(',')),
  ];
  const blob = new Blob([lines.join('\n')], { type: 'text/csv' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `listhq-billing-${new Date().toISOString().slice(0, 10)}.csv`;
  a.click();
  URL.revokeObjectURL(url);
}

function KPI({ label, value, sub, icon: Icon, color = 'text-primary', trend }: {
  label: string; value: string | number; sub?: string; icon: any; color?: string; trend?: 'up' | 'down' | null;
}) {
  return (
    <div className="bg-card border border-border rounded-2xl p-5">
      <div className="flex items-center justify-between mb-3">
        <span className="text-xs font-medium text-muted-foreground">{label}</span>
        <div className={`w-8 h-8 rounded-lg flex items-center justify-center bg-primary/10 ${color}`}>
          <Icon size={16} />
        </div>
      </div>
      <div className="text-2xl font-bold text-foreground">{value}</div>
      {sub && (
        <div className="flex items-center gap-1 mt-1 text-xs text-muted-foreground">
          {trend === 'up' && <TrendingUp size={12} className="text-emerald-500" />}
          {trend === 'down' && <TrendingDown size={12} className="text-destructive" />}
          {sub}
        </div>
      )}
    </div>
  );
}

function StripeBanner() {
  return (
    <div className="bg-amber-500/10 border border-amber-500/20 rounded-2xl p-4 flex items-start gap-4 mb-6">
      <div className="w-10 h-10 rounded-xl bg-amber-500/20 flex items-center justify-center flex-shrink-0">
        <CreditCard size={20} className="text-amber-600" />
      </div>
      <div className="flex-1">
        <p className="text-sm font-semibold text-foreground">Stripe not connected</p>
        <p className="text-xs text-muted-foreground mt-0.5">
          Revenue figures are estimated from subscription flags. Connect Stripe to unlock real payment data, failed payment alerts, retry status, and accurate MRR history.
        </p>
      </div>
      <Button variant="outline" size="sm" className="gap-1.5 text-xs flex-shrink-0">
        <Zap size={14} />
        Connect Stripe
      </Button>
    </div>
  );
}

function RenewalRow({ agent }: { agent: AgentBillingRow }) {
  const urgent = (agent.daysUntilRenewal ?? 999) <= 7;
  const warning = (agent.daysUntilRenewal ?? 999) <= 30;
  return (
    <div className={`flex items-center justify-between py-3 px-4 rounded-xl border ${urgent ? 'border-destructive/30 bg-destructive/5' : warning ? 'border-amber-500/20 bg-amber-500/5' : 'border-border'}`}>
      <div className="flex items-center gap-3">
        <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold ${urgent ? 'bg-destructive/10 text-destructive' : 'bg-primary/10 text-primary'}`}>
          {agent.name.charAt(0)}
        </div>
        <div>
          <p className="text-sm font-medium text-foreground">{agent.name}</p>
          <p className="text-xs text-muted-foreground">{agent.agency || agent.email}</p>
        </div>
      </div>
      <div className="flex items-center gap-4 text-right">
        <div>
          <p className="text-sm font-semibold text-foreground">{fmt(agent.mrr)}/mo</p>
          <p className="text-xs text-muted-foreground">
            {PLAN_LABEL[agent.plan] || agent.plan}
          </p>
        </div>
        <div>
          <p className={`text-sm font-bold ${urgent ? 'text-destructive' : warning ? 'text-amber-500' : 'text-foreground'}`}>
            {agent.daysUntilRenewal === 0 ? 'Today' : agent.daysUntilRenewal === 1 ? 'Tomorrow' : agent.daysUntilRenewal !== null ? `${agent.daysUntilRenewal}d` : '—'}
          </p>
          <p className="text-xs text-muted-foreground">
            {agent.renewalDate ? fmtDate(agent.renewalDate) : ''}
          </p>
        </div>
      </div>
    </div>
  );
}

export default function RevenueBilling() {
  const [agents, setAgents] = useState<AgentBillingRow[]>([]);
  const [mrrTrend, setMrrTrend] = useState<MRRPoint[]>([]);
  const [planMix, setPlanMix] = useState<PlanMixPoint[]>([]);
  const [loading, setLoading] = useState(true);
  const [planFilter, setPlanFilter] = useState('all');
  const [renewalWindow, setRenewalWindow] = useState<7 | 14 | 30>(30);

  const fetchAll = useCallback(async () => {
    setLoading(true);
    try {
      const now = new Date();

      const [agentsRes, subsRes, eventsRes] = await Promise.all([
        supabase.from('agents').select('id, name, email, agency, is_subscribed, created_at, stripe_customer_id'),
        supabase.from('agent_subscriptions').select('agent_id, plan_type, subscription_start, subscription_end, auto_renew'),
        supabase.from('subscription_events').select('agent_id, event_type, from_plan, to_plan, mrr_change, created_at').order('created_at', { ascending: true }),
      ]);

      const signInMap = new Map<string, string | null>();
      try {
        const { callAdminFunction } = await import('@/features/admin/lib/adminApi');
        const j = await callAdminFunction('list_users');
        (j?.users || []).forEach((u: any) => signInMap.set(u.id, u.last_sign_in_at || null));
      } catch {}

      const subMap = new Map<string, any>();
      (subsRes.data || []).forEach((s: any) => subMap.set(s.agent_id, s));

      const rows: AgentBillingRow[] = (agentsRes.data || []).map((a: any) => {
        const sub = subMap.get(a.id);
        const plan = (sub?.plan_type || 'demo').toLowerCase();
        const mrr = a.is_subscribed ? (PLAN_MRR[plan] || 0) : 0;
        const subscriptionStart = sub?.subscription_start || null;
        const subscriptionEnd = sub?.subscription_end || null;
        let renewalDate: string | null = subscriptionEnd || null;
        if (!renewalDate && subscriptionStart) {
          const rd = new Date(subscriptionStart);
          rd.setFullYear(rd.getFullYear() + 1);
          renewalDate = rd.toISOString();
        }
        const daysUntilRenewal = renewalDate
          ? Math.ceil((new Date(renewalDate).getTime() - now.getTime()) / 86400000)
          : null;
        return {
          id: a.id, name: a.name, email: a.email, agency: a.agency,
          plan, mrr, isSubscribed: a.is_subscribed,
          subscriptionStart, subscriptionEnd, renewalDate, daysUntilRenewal,
          lastLogin: signInMap.get(a.id) || null,
          stripeConnected: !!a.stripe_customer_id,
        };
      });

      setAgents(rows);

      // Plan mix
      const planCount = new Map<string, { count: number; mrr: number }>();
      rows.forEach(r => {
        const p = r.isSubscribed ? r.plan : 'demo';
        const cur = planCount.get(p) || { count: 0, mrr: 0 };
        cur.count++;
        cur.mrr += r.mrr;
        planCount.set(p, cur);
      });
      setPlanMix(
        Array.from(planCount.entries())
          .map(([plan, v]) => ({ plan, ...v, color: PLAN_COLOR[plan] || '#94a3b8' }))
          .sort((a, b) => b.mrr - a.mrr)
      );

      // MRR trend
      const events = eventsRes.data || [];
      const trend: MRRPoint[] = [];
      for (let i = 11; i >= 0; i--) {
        const monthStart = new Date(now.getFullYear(), now.getMonth() - i, 1);
        const monthEnd = new Date(now.getFullYear(), now.getMonth() - i + 1, 0, 23, 59, 59);
        const label = monthStart.toLocaleDateString('en-AU', { month: 'short', year: '2-digit' });
        const activePaidAtMonth = rows.filter(r => {
          if (!r.isSubscribed) return false;
          const start = r.subscriptionStart ? new Date(r.subscriptionStart) : new Date(0);
          return start <= monthEnd;
        });
        const mrr = activePaidAtMonth.reduce((s, r) => s + r.mrr, 0);
        const monthEvents = events.filter((e: any) => {
          const d = new Date(e.created_at);
          return d >= monthStart && d <= monthEnd;
        });
        const newMrr = monthEvents
          .filter((e: any) => e.event_type === 'converted' || e.event_type === 'upgraded')
          .reduce((s: number, e: any) => s + (e.mrr_change || 0), 0);
        const churnMrr = monthEvents
          .filter((e: any) => e.event_type === 'cancelled' || e.event_type === 'downgraded')
          .reduce((s: number, e: any) => s + Math.abs(e.mrr_change || 0), 0);
        trend.push({ label, mrr, arr: mrr * 12, newMrr, churnMrr, netNew: newMrr - churnMrr });
      }
      setMrrTrend(trend);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchAll(); }, [fetchAll]);

  const paidAgents = agents.filter(a => a.isSubscribed);
  const trialAgents = agents.filter(a => !a.isSubscribed);
  const totalMrr = paidAgents.reduce((s, a) => s + a.mrr, 0);
  const totalArr = totalMrr * 12;
  

  const prevMonth = mrrTrend[mrrTrend.length - 2];
  const mrrGrowthPct = prevMonth?.mrr > 0
    ? Math.round(((totalMrr - prevMonth.mrr) / prevMonth.mrr) * 100)
    : null;

  const upcomingRenewals = paidAgents
    .filter(a => a.daysUntilRenewal !== null && a.daysUntilRenewal >= 0 && a.daysUntilRenewal <= renewalWindow)
    .sort((a, b) => (a.daysUntilRenewal ?? 999) - (b.daysUntilRenewal ?? 999));

  const renewalMrr = upcomingRenewals.reduce((s, a) => s + a.mrr, 0);

  const filtered = agents
    .filter(a =>
      planFilter === 'all' ||
      (planFilter === 'paid' ? a.isSubscribed : !a.isSubscribed) ||
      a.plan === planFilter
    )
    .sort((a, b) => b.mrr - a.mrr);

  if (loading) {
    return (
      <div className="flex justify-center py-20">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold text-foreground">Revenue &amp; Billing</h2>
          <p className="text-sm text-muted-foreground">MRR trends, renewals, plan mix — board-ready intelligence</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={() => exportCSV(agents)} className="gap-1.5 text-xs">
            <Download size={14} />
            Export CSV
          </Button>
          <Button variant="outline" size="sm" onClick={fetchAll} className="gap-1.5 text-xs">
            <RefreshCw size={14} />
            Refresh
          </Button>
        </div>
      </div>

      <StripeBanner />

      {/* KPIs */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <KPI
          label="Monthly Recurring Revenue"
          value={fmt(totalMrr)}
          icon={DollarSign}
          color={totalMrr > 0 ? 'text-emerald-500' : 'text-muted-foreground'}
          sub={mrrGrowthPct !== null ? `${mrrGrowthPct >= 0 ? '+' : ''}${mrrGrowthPct}% vs last month` : 'No prev data'}
          trend={mrrGrowthPct !== null ? (mrrGrowthPct >= 0 ? 'up' : 'down') : null}
        />
        <KPI label="Annual Run Rate" value={fmt(totalArr)} icon={TrendingUp} color={totalArr > 0 ? 'text-emerald-500' : 'text-muted-foreground'} sub="Annualised run rate" />
        <KPI label="Paying Agents" value={paidAgents.length} icon={Users} color="text-primary" sub={`${trialAgents.length} on trial`} />
        <KPI label="Trial Agents" value={trialAgents.length} icon={Users} color="text-amber-500" sub="Currently on free trial" />
      </div>

      {/* MRR Trend Chart */}
      <div className="bg-card border border-border rounded-2xl p-5">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-sm font-semibold text-foreground">MRR Trend — 12 months</h3>
          <p className="text-xs text-muted-foreground">Current MRR: <span className="font-semibold text-foreground">{fmt(totalMrr)}</span></p>
        </div>
        <ResponsiveContainer width="100%" height={260}>
          <AreaChart data={mrrTrend}>
            <defs>
              <linearGradient id="mrrGrad" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#6366f1" stopOpacity={0.3} />
                <stop offset="95%" stopColor="#6366f1" stopOpacity={0} />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
            <XAxis dataKey="label" tick={{ fontSize: 11 }} stroke="hsl(var(--muted-foreground))" />
            <YAxis tick={{ fontSize: 11 }} stroke="hsl(var(--muted-foreground))" tickFormatter={(v: number) => `$${v >= 1000 ? `${(v / 1000).toFixed(0)}k` : v}`} />
            <Tooltip formatter={(v: number) => [fmt(v), '']} />
            <Area type="monotone" dataKey="mrr" stroke="#6366f1" fill="url(#mrrGrad)" strokeWidth={2} name="MRR" />
          </AreaChart>
        </ResponsiveContainer>
      </div>

      {/* New vs Churned MRR */}
      <div className="bg-card border border-border rounded-2xl p-5">
        <h3 className="text-sm font-semibold text-foreground mb-4">New MRR vs Churned MRR</h3>
        <ResponsiveContainer width="100%" height={220}>
          <BarChart data={mrrTrend}>
            <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
            <XAxis dataKey="label" tick={{ fontSize: 11 }} stroke="hsl(var(--muted-foreground))" />
            <YAxis tick={{ fontSize: 11 }} stroke="hsl(var(--muted-foreground))" tickFormatter={(v: number) => `$${v}`} />
            <Tooltip formatter={(v: number) => [fmt(v), '']} />
            <Legend />
            <Bar dataKey="newMrr" name="New MRR" fill="#22c55e" radius={[4, 4, 0, 0]} />
            <Bar dataKey="churnMrr" name="Churned MRR" fill="#ef4444" radius={[4, 4, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </div>

      {/* Plan Mix & Renewals */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Plan Mix */}
        <div className="bg-card border border-border rounded-2xl p-5">
          <h3 className="text-sm font-semibold text-foreground mb-4">Plan Mix</h3>
          <div className="space-y-3">
            {planMix.map(p => {
              const totalCount = agents.length;
              const pct = totalCount > 0 ? Math.round((p.count / totalCount) * 100) : 0;
              return (
                <div key={p.plan}>
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-sm font-medium text-foreground">
                      {PLAN_LABEL[p.plan] || p.plan}
                      <span className="text-muted-foreground ml-1">({p.count})</span>
                    </span>
                    <span className="text-xs font-semibold text-muted-foreground">
                      {p.mrr > 0 ? `${fmt(p.mrr)}/mo` : 'No revenue'}
                    </span>
                  </div>
                  <div className="w-full h-2 bg-secondary rounded-full overflow-hidden">
                    <div className="h-full rounded-full transition-all" style={{ width: `${pct}%`, backgroundColor: p.color }} />
                  </div>
                </div>
              );
            })}
          </div>
          <div className="mt-4 pt-3 border-t border-border flex items-center justify-between">
            <span className="text-xs font-medium text-muted-foreground">Total MRR</span>
            <span className="text-sm font-bold text-foreground">{fmt(totalMrr)}</span>
          </div>
        </div>

        {/* Upcoming Renewals */}
        <div className="bg-card border border-border rounded-2xl p-5">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-sm font-semibold text-foreground">Upcoming Renewals</h3>
            <div className="flex gap-1">
              {([7, 14, 30] as const).map(w => (
                <button key={w} onClick={() => setRenewalWindow(w)} className={`px-2.5 py-1 rounded-full text-xs font-medium transition-colors ${renewalWindow === w ? 'bg-primary text-primary-foreground' : 'text-muted-foreground hover:text-foreground'}`}>
                  {w}d
                </button>
              ))}
            </div>
          </div>
          {upcomingRenewals.length === 0 ? (
            <div className="text-center py-8">
              <p className="text-sm text-muted-foreground">No renewals in the next {renewalWindow} days</p>
            </div>
          ) : (
            <>
              <div className="space-y-2">
                {upcomingRenewals.slice(0, 6).map(a => (
                  <RenewalRow key={a.id} agent={a} />
                ))}
              </div>
              <div className="mt-3 pt-3 border-t border-border flex items-center justify-between">
                <span className="text-xs text-muted-foreground">{upcomingRenewals.length} renewals · {renewalWindow}d window</span>
                <span className="text-xs font-semibold text-foreground">{fmt(renewalMrr)}/mo at risk</span>
              </div>
            </>
          )}
        </div>
      </div>

      {/* Failed Payments placeholder */}
      <div className="bg-card border border-border rounded-2xl p-5">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-sm font-semibold text-foreground">Failed Payments &amp; Retry Status</h3>
          <Badge variant="secondary">Requires Stripe</Badge>
        </div>
        <div className="flex flex-col items-center justify-center py-10">
          <div className="w-12 h-12 rounded-full bg-secondary flex items-center justify-center mb-3">
            <CreditCard size={24} className="text-muted-foreground" />
          </div>
          <p className="text-sm font-medium text-foreground">Connect Stripe to see failed payments</p>
          <p className="text-xs text-muted-foreground mt-1 text-center max-w-sm">
            Once Stripe is connected, failed charges, retry attempts, and dunning status will appear here automatically.
          </p>
        </div>
      </div>

      {/* All Agents Table */}
      <div className="bg-card border border-border rounded-2xl p-5">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-sm font-semibold text-foreground">
            All Agents <span className="text-muted-foreground font-normal">({filtered.length})</span>
          </h3>
          <select
            value={planFilter}
            onChange={(e) => setPlanFilter(e.target.value)}
            className="text-xs bg-secondary border border-border rounded-lg px-3 py-1.5 text-foreground outline-none"
          >
            <option value="all">All plans</option>
            <option value="paid">Paid only</option>
            <option value="solo">Solo</option>
            <option value="agency">Agency</option>
            <option value="agency_pro">Agency Pro</option>
            <option value="enterprise">Enterprise</option>
            <option value="demo">Trial</option>
          </select>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border">
                {['Agent', 'Plan', 'MRR', 'Status', 'Sub Start', 'Renewal', 'Days'].map(h => (
                  <th key={h} className="text-left py-2 px-3 text-xs font-medium text-muted-foreground">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {filtered.map(a => (
                <tr key={a.id} className="border-b border-border/50 hover:bg-secondary/50 transition-colors">
                  <td className="py-2 px-3">
                    <p className="font-medium text-foreground">{a.name}</p>
                    <p className="text-xs text-muted-foreground">{a.agency || a.email}</p>
                  </td>
                  <td className="py-2 px-3 text-foreground">{PLAN_LABEL[a.plan] || a.plan}</td>
                  <td className="py-2 px-3 text-foreground">{a.mrr > 0 ? fmt(a.mrr) : '—'}</td>
                  <td className="py-2 px-3">
                    <Badge variant={a.isSubscribed ? 'default' : 'secondary'}>{a.isSubscribed ? 'Active' : 'Trial'}</Badge>
                  </td>
                  
                  <td className="py-2 px-3 text-foreground">{a.subscriptionStart ? fmtDate(a.subscriptionStart) : '—'}</td>
                  <td className="py-2 px-3 text-foreground">{a.renewalDate ? fmtDate(a.renewalDate) : '—'}</td>
                  <td className="py-2 px-3">
                    {a.daysUntilRenewal !== null ? (
                      <span className={`text-xs font-semibold ${(a.daysUntilRenewal ?? 999) <= 7 ? 'text-destructive' : (a.daysUntilRenewal ?? 999) <= 30 ? 'text-amber-500' : 'text-foreground'}`}>
                        {a.daysUntilRenewal}d
                      </span>
                    ) : '—'}
                  </td>
                </tr>
              ))}
            </tbody>
            {filtered.length > 0 && (
              <tfoot>
                <tr className="border-t border-border">
                  <td className="py-2 px-3 text-xs font-semibold text-foreground">Total ({filtered.filter(a => a.isSubscribed).length} paying)</td>
                  <td className="py-2 px-3" />
                  <td className="py-2 px-3 text-xs font-bold text-foreground">{fmt(filtered.filter(a => a.isSubscribed).reduce((s, a) => s + a.mrr, 0))}</td>
                  <td colSpan={5} className="py-2 px-3" />
                </tr>
              </tfoot>
            )}
          </table>
        </div>
      </div>
    </div>
  );
}
