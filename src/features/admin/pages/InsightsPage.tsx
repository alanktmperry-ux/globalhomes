import { useEffect, useState, useMemo } from 'react';
import {
  DollarSign,
  TrendingUp,
  TrendingDown,
  Users,
  Activity,
  Clock,
  Target,
  RefreshCw,
} from 'lucide-react';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  CartesianGrid,
} from 'recharts';
import { supabase } from '@/integrations/supabase/client';
import { callAdminFunction } from '@/features/admin/lib/adminApi';
import { toast } from 'sonner';

const PLAN_MRR: Record<string, number> = {
  solo: 299,
  agency: 899,
  agency_pro: 1999,
  enterprise: 4999,
};

const AU_STATES = ['NSW', 'VIC', 'QLD', 'SA', 'WA', 'TAS', 'ACT', 'NT'];

type CohortCell = { period: string; rate: number | null; cohortSize: number };
type CohortRow = { month: string; size: number; cells: CohortCell[] };

interface FunnelStage {
  label: string;
  count: number | null;
  conv: number | null;
}

interface AgencyRow {
  agency: string;
  agents: number;
  listings: number;
  leads30d: number;
  mrr: number;
}

interface InsightsData {
  arr: number;
  mrr: number;
  momGrowthPct: number | null;
  churnRatePct: number;
  ltv: number;
  cac: number;
  paybackMonths: number | null;
  cohorts: CohortRow[];
  funnel: FunnelStage[];
  topAgencies: AgencyRow[];
  agentsByState: { state: string; count: number }[];
  listingsByState: { state: string; count: number }[];
  fetchedAt: string;
}

const COHORT_PERIODS: { key: string; offsetDays: number }[] = [
  { key: 'M0', offsetDays: 0 },
  { key: 'M1', offsetDays: 30 },
  { key: 'M2', offsetDays: 60 },
  { key: 'M3', offsetDays: 90 },
  { key: 'M6', offsetDays: 180 },
  { key: 'M12', offsetDays: 365 },
];

function fmtMoney(n: number) {
  if (n >= 1_000_000) return `$${(n / 1_000_000).toFixed(2)}M`;
  if (n >= 1_000) return `$${(n / 1_000).toFixed(1)}k`;
  return `$${Math.round(n).toLocaleString()}`;
}

function KPI({
  label,
  value,
  sub,
  icon: Icon,
  large = false,
}: {
  label: string;
  value: string;
  sub?: string;
  icon?: any;
  large?: boolean;
}) {
  return (
    <div className={`rounded-2xl border border-border bg-card p-4 space-y-1 ${large ? 'md:col-span-2' : ''}`}>
      <div className="flex items-center justify-between">
        <p className="text-xs text-muted-foreground font-medium">{label}</p>
        {Icon && (
          <div className="text-primary">
            <Icon size={16} />
          </div>
        )}
      </div>
      <p className={`font-bold text-foreground ${large ? 'text-4xl' : 'text-2xl'}`}>{value}</p>
      {sub && <p className="text-[11px] text-muted-foreground">{sub}</p>}
    </div>
  );
}

function cellTone(rate: number | null) {
  if (rate == null) return 'bg-muted/30 text-muted-foreground';
  if (rate >= 80) return 'bg-emerald-500/15 text-emerald-700 dark:text-emerald-300';
  if (rate >= 50) return 'bg-amber-500/15 text-amber-700 dark:text-amber-300';
  return 'bg-destructive/15 text-destructive';
}

function monthKey(d: Date) {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
}

function monthLabel(key: string) {
  const [y, m] = key.split('-').map(Number);
  return new Date(y, m - 1, 1).toLocaleDateString('en-AU', { month: 'short', year: '2-digit' });
}

export default function InsightsPage() {
  const [data, setData] = useState<InsightsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [agencySort, setAgencySort] = useState<keyof AgencyRow>('mrr');

  const fetchAll = async () => {
    setRefreshing(true);
    try {
      const now = new Date();
      const d30 = new Date(now.getTime() - 30 * 86400000).toISOString();
      const monthStart = new Date(now.getFullYear(), now.getMonth(), 1).toISOString();
      const prevMonthStart = new Date(now.getFullYear(), now.getMonth() - 1, 1).toISOString();

      const [agentsRes, propsRes, leadsRes, demoRes, usersJson] = await Promise.all([
        supabase
          .from('agents')
          .select('id, name, agency, agency_id, is_subscribed, created_at, updated_at, onboarding_complete, agent_subscriptions(plan_type)'),
        supabase.from('properties').select('id, agent_id, state, is_active, created_at'),
        supabase.from('leads').select('id, agent_id, created_at').gte('created_at', d30),
        (supabase.from('demo_requests' as any).select('id, status, created_at')) as any,
        callAdminFunction('list_users').catch(() => ({ users: [] })),
      ]);

      const agents: any[] = agentsRes.data || [];
      const properties: any[] = propsRes.data || [];
      const leads30d: any[] = leadsRes.data || [];
      const demos: any[] = demoRes.data || [];
      const allUsers: any[] = usersJson?.users || [];

      const signInMap = new Map<string, string | null>();
      allUsers.forEach((u: any) => signInMap.set(u.id, u.last_sign_in_at || null));

      // === Revenue ===
      const paid = agents.filter((a) => a.is_subscribed);
      const mrr = paid.reduce(
        (s, a) => s + (PLAN_MRR[(a.agent_subscriptions?.plan_type || '').toLowerCase()] || 0),
        0,
      );
      const arr = mrr * 12;

      const paidThisMonthStart = agents.filter(
        (a) => a.is_subscribed && a.created_at < monthStart,
      ).length;
      const paidPrevMonthStart = agents.filter(
        (a) => a.is_subscribed && a.created_at < prevMonthStart,
      ).length;
      const momGrowthPct =
        paidPrevMonthStart > 0
          ? Math.round(((paidThisMonthStart - paidPrevMonthStart) / paidPrevMonthStart) * 1000) / 10
          : null;

      // Churn (last 30d): unsubscribed agents whose updated_at is in the last 30d & created earlier
      const churned30d = agents.filter(
        (a) => !a.is_subscribed && a.updated_at && a.updated_at >= d30 && a.created_at < d30,
      ).length;
      const churnRatePct =
        paid.length + churned30d > 0
          ? Math.round((churned30d / (paid.length + churned30d)) * 1000) / 10
          : 0;

      const avgRevenuePerAgent = paid.length > 0 ? mrr / paid.length : 0;
      const monthlyChurnRate = churnRatePct / 100;
      const ltv =
        monthlyChurnRate > 0 ? avgRevenuePerAgent / monthlyChurnRate : avgRevenuePerAgent * 24;
      const cac = 0; // placeholder
      const paybackMonths = avgRevenuePerAgent > 0 && cac > 0 ? cac / avgRevenuePerAgent : null;

      // === Cohorts: last 12 months ===
      const cohortMap = new Map<string, any[]>();
      for (let i = 11; i >= 0; i--) {
        const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
        cohortMap.set(monthKey(d), []);
      }
      agents.forEach((a) => {
        const key = monthKey(new Date(a.created_at));
        if (cohortMap.has(key)) cohortMap.get(key)!.push(a);
      });

      const cohorts: CohortRow[] = Array.from(cohortMap.entries()).map(([month, members]) => {
        const size = members.length;
        const cells: CohortCell[] = COHORT_PERIODS.map(({ key, offsetDays }) => {
          if (size === 0) return { period: key, rate: null, cohortSize: 0 };
          const cohortStart = new Date(month + '-01');
          const periodStart = new Date(cohortStart.getTime() + offsetDays * 86400000);
          // require period to have started
          if (periodStart > now) return { period: key, rate: null, cohortSize: size };
          const windowEnd = new Date(periodStart.getTime() + 30 * 86400000);
          const active = members.filter((m) => {
            const last = signInMap.get(m.id);
            if (!last) return false;
            const t = new Date(last).getTime();
            return t >= periodStart.getTime() && t <= Math.min(windowEnd.getTime(), now.getTime());
          }).length;
          return { period: key, rate: Math.round((active / size) * 100), cohortSize: size };
        });
        return { month, size, cells };
      });

      // === Funnel ===
      const demoRequests = demos.length;
      const trialsStarted = agents.length;
      const paidAgentsCount = paid.length;
      const expansion = (() => {
        const byAgent = new Map<string, number>();
        properties.forEach((p) => {
          if (!p.agent_id) return;
          byAgent.set(p.agent_id, (byAgent.get(p.agent_id) || 0) + 1);
        });
        return Array.from(byAgent.values()).filter((c) => c > 1).length;
      })();

      const funnel: FunnelStage[] = [
        { label: 'Visitors', count: null, conv: null },
        { label: 'Demo requests', count: demoRequests, conv: null },
        {
          label: 'Trials started',
          count: trialsStarted,
          conv: demoRequests > 0 ? Math.round((trialsStarted / demoRequests) * 1000) / 10 : null,
        },
        {
          label: 'Paid agents',
          count: paidAgentsCount,
          conv: trialsStarted > 0 ? Math.round((paidAgentsCount / trialsStarted) * 1000) / 10 : null,
        },
        {
          label: 'Expansion (multi-listing)',
          count: expansion,
          conv:
            paidAgentsCount > 0 ? Math.round((expansion / paidAgentsCount) * 1000) / 10 : null,
        },
      ];

      // === Top agencies ===
      const agencyMap = new Map<string, AgencyRow>();
      const agentToAgency = new Map<string, string>();
      agents.forEach((a) => {
        const name = (a.agency || '').trim() || 'Independent';
        agentToAgency.set(a.id, name);
        const row =
          agencyMap.get(name) || {
            agency: name,
            agents: 0,
            listings: 0,
            leads30d: 0,
            mrr: 0,
          };
        row.agents += 1;
        if (a.is_subscribed) {
          row.mrr += PLAN_MRR[(a.agent_subscriptions?.plan_type || '').toLowerCase()] || 0;
        }
        agencyMap.set(name, row);
      });
      properties.forEach((p) => {
        const ag = agentToAgency.get(p.agent_id);
        if (!ag) return;
        const row = agencyMap.get(ag);
        if (row && p.is_active) row.listings += 1;
      });
      leads30d.forEach((l) => {
        const ag = agentToAgency.get(l.agent_id);
        if (!ag) return;
        const row = agencyMap.get(ag);
        if (row) row.leads30d += 1;
      });
      const topAgencies = Array.from(agencyMap.values())
        .sort((a, b) => b.mrr - a.mrr || b.agents - a.agents)
        .slice(0, 10);

      // === Geography ===
      const listingState = new Map<string, number>();
      const agentListingStates = new Map<string, Map<string, number>>();
      properties.forEach((p) => {
        if (!p.is_active) return;
        const s = (p.state || '').toUpperCase();
        if (!AU_STATES.includes(s)) return;
        listingState.set(s, (listingState.get(s) || 0) + 1);
        if (!p.agent_id) return;
        const m = agentListingStates.get(p.agent_id) || new Map<string, number>();
        m.set(s, (m.get(s) || 0) + 1);
        agentListingStates.set(p.agent_id, m);
      });
      const agentState = new Map<string, number>();
      agents.forEach((a) => {
        const m = agentListingStates.get(a.id);
        if (!m) return;
        let topS = '';
        let topC = 0;
        m.forEach((c, s) => {
          if (c > topC) {
            topC = c;
            topS = s;
          }
        });
        if (topS) agentState.set(topS, (agentState.get(topS) || 0) + 1);
      });

      const agentsByState = AU_STATES.map((s) => ({ state: s, count: agentState.get(s) || 0 }));
      const listingsByState = AU_STATES.map((s) => ({ state: s, count: listingState.get(s) || 0 }));

      setData({
        arr,
        mrr,
        momGrowthPct,
        churnRatePct,
        ltv,
        cac,
        paybackMonths,
        cohorts,
        funnel,
        topAgencies,
        agentsByState,
        listingsByState,
        fetchedAt: new Date().toISOString(),
      });
    } catch (e: any) {
      toast.error(e?.message || 'Failed to load insights');
    } finally {
      setRefreshing(false);
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAll();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const sortedAgencies = useMemo(() => {
    if (!data) return [];
    return [...data.topAgencies].sort((a, b) => {
      const av = a[agencySort];
      const bv = b[agencySort];
      if (typeof av === 'number' && typeof bv === 'number') return bv - av;
      return String(av).localeCompare(String(bv));
    });
  }, [data, agencySort]);

  if (loading) {
    return (
      <div className="p-6">
        <div className="h-8 w-48 bg-muted rounded animate-pulse mb-6" />
        <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="h-24 rounded-2xl bg-muted animate-pulse" />
          ))}
        </div>
      </div>
    );
  }

  if (!data) return null;

  const maxFunnel = Math.max(...data.funnel.map((s) => s.count || 0), 1);

  return (
    <div className="p-4 md:p-6 space-y-8">
      {/* Header */}
      <div className="flex items-start justify-between gap-3 flex-wrap">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Insights</h1>
          <p className="text-sm text-muted-foreground">
            CEO view — revenue, retention, funnel, agencies, geography.
          </p>
        </div>
        <button
          onClick={fetchAll}
          disabled={refreshing}
          className="inline-flex items-center gap-1.5 text-xs font-medium px-3 py-1.5 rounded-lg border border-border hover:bg-accent transition"
        >
          <RefreshCw size={12} className={refreshing ? 'animate-spin' : ''} />
          Refresh
        </button>
      </div>

      {/* Section 1 — The Numbers */}
      <section>
        <h2 className="text-sm font-semibold text-foreground mb-3">The Numbers</h2>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <KPI label="ARR" value={fmtMoney(data.arr)} icon={DollarSign} large sub={`MRR ${fmtMoney(data.mrr)}`} />
          <KPI
            label="MoM growth"
            value={data.momGrowthPct == null ? '—' : `${data.momGrowthPct}%`}
            icon={data.momGrowthPct != null && data.momGrowthPct < 0 ? TrendingDown : TrendingUp}
            sub="paid agents vs last month"
          />
          <KPI
            label="Churn (30d)"
            value={`${data.churnRatePct}%`}
            icon={TrendingDown}
            sub="cancelled / (paid + cancelled)"
          />
          <KPI label="Customer LTV" value={fmtMoney(data.ltv)} icon={Users} sub="ARPU ÷ churn" />
          <KPI label="Avg CAC" value={fmtMoney(data.cac)} icon={Target} sub="placeholder — wire later" />
          <KPI
            label="Payback period"
            value={data.paybackMonths == null ? '—' : `${data.paybackMonths.toFixed(1)} mo`}
            icon={Clock}
            sub="CAC ÷ ARPU"
          />
        </div>
      </section>

      {/* Section 2 — Cohort retention */}
      <section>
        <h2 className="text-sm font-semibold text-foreground mb-3">Cohort retention</h2>
        <div className="rounded-2xl border border-border bg-card overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="text-left text-xs text-muted-foreground uppercase tracking-wide">
              <tr className="border-b border-border">
                <th className="px-4 py-2.5 font-medium">Signup month</th>
                <th className="px-4 py-2.5 font-medium">Size</th>
                {COHORT_PERIODS.map((p) => (
                  <th key={p.key} className="px-3 py-2.5 font-medium text-center">
                    {p.key}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {data.cohorts.map((c) => (
                <tr key={c.month} className="border-b border-border/50 last:border-0">
                  <td className="px-4 py-2 text-foreground font-medium">{monthLabel(c.month)}</td>
                  <td className="px-4 py-2 text-muted-foreground">{c.size}</td>
                  {c.cells.map((cell) => (
                    <td key={cell.period} className="px-2 py-2 text-center">
                      <span
                        className={`inline-block min-w-[44px] px-2 py-1 rounded-md text-xs font-semibold ${cellTone(
                          cell.rate,
                        )}`}
                      >
                        {cell.rate == null ? '—' : `${cell.rate}%`}
                      </span>
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <p className="text-[11px] text-muted-foreground mt-2">
          Active = signed in during the 30-day window starting at each milestone.
        </p>
      </section>

      {/* Section 3 — Funnel */}
      <section>
        <h2 className="text-sm font-semibold text-foreground mb-3">Acquisition funnel</h2>
        <div className="rounded-2xl border border-border bg-card p-4 space-y-3">
          {data.funnel.map((stage, i) => {
            const pct = stage.count != null ? (stage.count / maxFunnel) * 100 : 0;
            return (
              <div key={stage.label} className="space-y-1">
                <div className="flex items-center justify-between text-xs">
                  <span className="font-medium text-foreground">{stage.label}</span>
                  <span className="text-muted-foreground">
                    {stage.count == null ? 'N/A' : stage.count.toLocaleString()}
                    {stage.conv != null && i > 0 && (
                      <span className="ml-2 text-primary font-semibold">{stage.conv}%</span>
                    )}
                  </span>
                </div>
                <div className="h-6 rounded bg-muted/40 overflow-hidden">
                  <div
                    className="h-full bg-primary/70 transition-all"
                    style={{ width: `${stage.count == null ? 0 : Math.max(pct, 2)}%` }}
                  />
                </div>
              </div>
            );
          })}
        </div>
      </section>

      {/* Section 4 — Top agencies */}
      <section>
        <div className="flex items-center justify-between mb-3 flex-wrap gap-2">
          <h2 className="text-sm font-semibold text-foreground">Top 10 agencies</h2>
          <div className="text-[11px] text-muted-foreground">
            Sort:
            {(['mrr', 'agents', 'listings', 'leads30d'] as (keyof AgencyRow)[]).map((k) => (
              <button
                key={String(k)}
                onClick={() => setAgencySort(k)}
                className={`ml-2 px-2 py-0.5 rounded ${
                  agencySort === k
                    ? 'bg-primary/10 text-primary font-semibold'
                    : 'hover:bg-accent'
                }`}
              >
                {k === 'leads30d' ? 'leads (30d)' : String(k)}
              </button>
            ))}
          </div>
        </div>
        <div className="rounded-2xl border border-border bg-card overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="text-left text-xs text-muted-foreground uppercase tracking-wide">
              <tr className="border-b border-border">
                <th className="px-4 py-2.5 font-medium">Agency</th>
                <th className="px-4 py-2.5 font-medium text-right">Agents</th>
                <th className="px-4 py-2.5 font-medium text-right">Listings</th>
                <th className="px-4 py-2.5 font-medium text-right">Leads (30d)</th>
                <th className="px-4 py-2.5 font-medium text-right">MRR</th>
              </tr>
            </thead>
            <tbody>
              {sortedAgencies.map((a) => (
                <tr key={a.agency} className="border-b border-border/50 last:border-0 hover:bg-accent/40">
                  <td className="px-4 py-2 text-foreground font-medium truncate max-w-[240px]">{a.agency}</td>
                  <td className="px-4 py-2 text-right text-muted-foreground">{a.agents}</td>
                  <td className="px-4 py-2 text-right text-muted-foreground">{a.listings}</td>
                  <td className="px-4 py-2 text-right text-muted-foreground">{a.leads30d}</td>
                  <td className="px-4 py-2 text-right font-semibold text-foreground">{fmtMoney(a.mrr)}</td>
                </tr>
              ))}
              {sortedAgencies.length === 0 && (
                <tr>
                  <td colSpan={5} className="px-4 py-6 text-center text-sm text-muted-foreground">
                    No agencies yet.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </section>

      {/* Section 5 — Geography */}
      <section>
        <h2 className="text-sm font-semibold text-foreground mb-3">Geography</h2>
        <div className="grid md:grid-cols-2 gap-3">
          <div className="rounded-2xl border border-border bg-card p-4">
            <div className="flex items-center gap-2 mb-3">
              <Users size={14} className="text-primary" />
              <h3 className="text-xs font-semibold text-foreground uppercase tracking-wide">
                Agents by state
              </h3>
            </div>
            <div className="h-56">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={data.agentsByState}>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                  <XAxis dataKey="state" stroke="hsl(var(--muted-foreground))" fontSize={11} />
                  <YAxis stroke="hsl(var(--muted-foreground))" fontSize={11} allowDecimals={false} />
                  <Tooltip
                    contentStyle={{
                      background: 'hsl(var(--card))',
                      border: '1px solid hsl(var(--border))',
                      borderRadius: 8,
                      fontSize: 12,
                    }}
                  />
                  <Bar dataKey="count" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
          <div className="rounded-2xl border border-border bg-card p-4">
            <div className="flex items-center gap-2 mb-3">
              <Activity size={14} className="text-primary" />
              <h3 className="text-xs font-semibold text-foreground uppercase tracking-wide">
                Active listings by state
              </h3>
            </div>
            <div className="h-56">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={data.listingsByState}>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                  <XAxis dataKey="state" stroke="hsl(var(--muted-foreground))" fontSize={11} />
                  <YAxis stroke="hsl(var(--muted-foreground))" fontSize={11} allowDecimals={false} />
                  <Tooltip
                    contentStyle={{
                      background: 'hsl(var(--card))',
                      border: '1px solid hsl(var(--border))',
                      borderRadius: 8,
                      fontSize: 12,
                    }}
                  />
                  <Bar dataKey="count" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>
      </section>

      <p className="text-[11px] text-muted-foreground text-right">
        Updated {new Date(data.fetchedAt).toLocaleTimeString()}
      </p>
    </div>
  );
}
