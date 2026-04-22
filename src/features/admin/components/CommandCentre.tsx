import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import {
  TrendingUp,
  TrendingDown,
  Users,
  Building2,
  DollarSign,
  AlertTriangle,
  Zap,
  RefreshCw,
  Clock,
  MapPin,
  UserCheck,
  UserX,
  Activity,
  Target,
  ArrowUpRight,
} from 'lucide-react';
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  CartesianGrid,
} from 'recharts';

interface CCData {
  mrr: number;
  arr: number;
  mrrGrowthPct: number | null;
  totalAgents: number;
  activeTrials: number;
  paidAgents: number;
  trialsExpiringThisWeek: number;
  newAgentsToday: number;
  newAgentsThisWeek: number;
  newAgentsThisMonth: number;
  churnedThisMonth: number;
  liveListings: number;
  listingsToday: number;
  listingsThisWeek: number;
  avgViewsPerListing: number;
  listingsNoPhotos: number;
  leadsToday: number;
  leadsThisWeek: number;
  leads30d: number;
  voiceSearches30d: number;
  atRiskAgents: {
    id: string;
    name: string;
    email: string;
    agency: string | null;
    lastSeen: string | null;
    daysSince: number;
  }[];
  agentsNoListings: number;
  stateBreakdown: {
    state: string;
    count: number;
  }[];
  growthChart: {
    label: string;
    agents: number;
    listings: number;
    leads: number;
  }[];
  planMix: {
    plan: string;
    count: number;
    mrr: number;
  }[];
  fetchedAt: string;
}

const PLAN_MRR: Record<string, number> = {
  starter: 99,
  pro: 199,
  agency: 399,
};

const PLAN_LABEL: Record<string, string> = {
  starter: 'Starter',
  pro: 'Pro',
  agency: 'Agency',
  demo: 'Trial',
};

function KPI({
  label,
  value,
  sub,
  icon: Icon,
  color = 'text-primary',
  trend,
}: {
  label: string;
  value: string | number;
  sub?: string;
  icon: any;
  color?: string;
  trend?: 'up' | 'down' | 'flat' | null;
}) {
  return (
    <div className="rounded-2xl border border-border bg-card p-4 space-y-1">
      <div className="flex items-center justify-between">
        <p className="text-xs text-muted-foreground font-medium">
          {label}
        </p>
        <div className={`${color}`}>
          <Icon size={16} />
        </div>
      </div>
      <p className="text-2xl font-bold text-foreground">
        {value}
      </p>
      {sub && (
        <p className="text-[11px] text-muted-foreground flex items-center gap-1">
          {trend === 'up' && (
            <TrendingUp size={12} className="text-emerald-500" />
          )}
          {trend === 'down' && (
            <TrendingDown size={12} className="text-destructive" />
          )}
          {sub}
        </p>
      )}
    </div>
  );
}

function SectionHead({
  title,
  sub,
}: {
  title: string;
  sub?: string;
}) {
  return (
    <div className="flex items-center gap-3 mb-4 mt-8 first:mt-0">
      <div>
        <h3 className="text-sm font-semibold text-foreground">
          {title}
        </h3>
        {sub && (
          <p className="text-[11px] text-muted-foreground">
            {sub}
          </p>
        )}
      </div>
    </div>
  );
}

function CCAlert({
  severity,
  children,
}: {
  severity: 'red' | 'amber';
  children: React.ReactNode;
}) {
  return (
    <div className={`flex items-start gap-2 text-xs rounded-xl px-3 py-2 ${severity === 'red' ? 'bg-destructive/10 text-destructive' : 'bg-amber-500/10 text-amber-600 dark:text-amber-400'}`}>
      <AlertTriangle size={14} className="mt-0.5 shrink-0" />
      {children}
    </div>
  );
}

export default function CommandCentre() {
  const [data, setData] = useState<CCData | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const fetchAll = async () => {
    setRefreshing(true);
    try {
      const now = new Date();
      const d7 = new Date(now.getTime() - 7 * 86400000).toISOString();
      const d14 = new Date(now.getTime() - 14 * 86400000).toISOString();
      const d30 = new Date(now.getTime() - 30 * 86400000).toISOString();
      const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate()).toISOString();
      const monthStart = new Date(now.getFullYear(), now.getMonth(), 1).toISOString();

      const [
        agentsRes,
        propsRes,
        leadsRes,
        voice30dRes,
        liveListingsRes,
        listingsTodayRes,
        listingsWeekRes,
        leadsTodayRes,
        leadsWeekRes,
        leads30dRes,
      ] = await Promise.all([
        supabase.from('agents').select('id, name, email, agency, is_subscribed, created_at, onboarding_complete, agent_subscriptions(plan_type)'),
        supabase.from('properties').select('id, agent_id, state, is_active, views, images, created_at'),
        supabase.from('leads').select('id, created_at'),
        supabase.from('voice_searches').select('id', { count: 'exact', head: true }).gte('created_at', d30),
        supabase.from('properties').select('id', { count: 'exact', head: true }).eq('is_active', true),
        supabase.from('properties').select('id', { count: 'exact', head: true }).gte('created_at', todayStart),
        supabase.from('properties').select('id', { count: 'exact', head: true }).gte('created_at', d7),
        supabase.from('leads').select('id', { count: 'exact', head: true }).gte('created_at', todayStart),
        supabase.from('leads').select('id', { count: 'exact', head: true }).gte('created_at', d7),
        supabase.from('leads').select('id', { count: 'exact', head: true }).gte('created_at', d30),
      ]);

      const agents = agentsRes.data || [];
      const allProps = propsRes.data || [];
      const allLeads = leadsRes.data || [];

      const signInMap = new Map<string, string | null>();
      try {
        const { callAdminFunction } = await import('@/features/admin/lib/adminApi');
        const j = await callAdminFunction('list_users');
        (j?.users || []).forEach((u: any) => signInMap.set(u.id, u.last_sign_in_at || null));
      } catch {}

      const paidAgents = agents.filter(a => a.is_subscribed);
      const mrr = paidAgents.reduce((s, a: any) => s + (PLAN_MRR[(a.agent_subscriptions?.plan_type || '').toLowerCase()] || 0), 0);
      const prevMonthPaid = agents.filter(a => a.is_subscribed && a.created_at < monthStart).length;
      const mrrGrowthPct = prevMonthPaid > 0 ? Math.round(((paidAgents.length - prevMonthPaid) / prevMonthPaid) * 100) : null;

      const trials = agents.filter(a => !a.is_subscribed);
      const newToday = agents.filter(a => a.created_at >= todayStart).length;
      const newWeek = agents.filter(a => a.created_at >= d7).length;
      const newMonth = agents.filter(a => a.created_at >= monthStart).length;

      const trialsExpiringThisWeek = agents.filter(a => {
        if (a.is_subscribed) return false;
        const trialEnd = new Date(new Date(a.created_at).getTime() + 60 * 86400000);
        return trialEnd > now && trialEnd <= new Date(now.getTime() + 7 * 86400000);
      }).length;

      const atRiskAgents = agents
        .filter(a => {
          const lastSeen = signInMap.get(a.id);
          if (!lastSeen) return true;
          return new Date(lastSeen) < new Date(d14);
        })
        .slice(0, 8)
        .map(a => {
          const lastSeen = signInMap.get(a.id) || null;
          const daysSince = lastSeen
            ? Math.floor((now.getTime() - new Date(lastSeen).getTime()) / 86400000)
            : 999;
          return {
            id: a.id,
            name: a.name,
            email: a.email || '',
            agency: a.agency,
            lastSeen,
            daysSince,
          };
        })
        .sort((a, b) => b.daysSince - a.daysSince);

      const agentsWithListings = new Set(allProps.map(p => p.agent_id).filter(Boolean));
      const agentsNoListings = agents.filter(a => !agentsWithListings.has(a.id)).length;

      const activeProps = allProps.filter(p => p.is_active);
      const totalViews = activeProps.reduce((s, p) => s + (p.views || 0), 0);
      const avgViewsPerListing = activeProps.length > 0 ? Math.round(totalViews / activeProps.length) : 0;
      const listingsNoPhotos = allProps.filter(p => !p.images || (p.images as any[]).length === 0).length;

      const stateCount = new Map<string, number>();
      activeProps.forEach(p => {
        const s = p.state || 'Unknown';
        stateCount.set(s, (stateCount.get(s) || 0) + 1);
      });
      const stateBreakdown = Array.from(stateCount.entries())
        .sort((a, b) => b[1] - a[1])
        .map(([state, count]) => ({ state, count }));

      const planCount = new Map<string, { count: number; mrr: number }>();
      agents.forEach((a: any) => {
        const plan = (a.agent_subscriptions?.plan_type || 'demo').toLowerCase();
        const cur = planCount.get(plan) || { count: 0, mrr: 0 };
        cur.count++;
        if (a.is_subscribed) cur.mrr += PLAN_MRR[plan] || 0;
        planCount.set(plan, cur);
      });
      const planMix = Array.from(planCount.entries())
        .map(([plan, v]) => ({ plan, ...v }))
        .sort((a, b) => b.mrr - a.mrr);

      const growthChart = [];
      for (let i = 11; i >= 0; i--) {
        const weekStart = new Date(now.getTime() - (i + 1) * 7 * 86400000);
        const weekEnd = new Date(now.getTime() - i * 7 * 86400000);
        const label = weekStart.toLocaleDateString('en-AU', { day: '2-digit', month: 'short' });
        growthChart.push({
          label,
          agents: agents.filter(a => {
            const d = new Date(a.created_at);
            return d >= weekStart && d < weekEnd;
          }).length,
          listings: allProps.filter(p => {
            const d = new Date(p.created_at);
            return d >= weekStart && d < weekEnd;
          }).length,
          leads: allLeads.filter(l => {
            const d = new Date(l.created_at);
            return d >= weekStart && d < weekEnd;
          }).length,
        });
      }

      setData({
        mrr,
        arr: mrr * 12,
        mrrGrowthPct,
        totalAgents: agents.length,
        activeTrials: trials.length,
        paidAgents: paidAgents.length,
        trialsExpiringThisWeek,
        newAgentsToday: newToday,
        newAgentsThisWeek: newWeek,
        newAgentsThisMonth: newMonth,
        churnedThisMonth: 0,
        liveListings: liveListingsRes.count || 0,
        listingsToday: listingsTodayRes.count || 0,
        listingsThisWeek: listingsWeekRes.count || 0,
        avgViewsPerListing,
        listingsNoPhotos,
        leadsToday: leadsTodayRes.count || 0,
        leadsThisWeek: leadsWeekRes.count || 0,
        leads30d: leads30dRes.count || 0,
        voiceSearches30d: voice30dRes.count || 0,
        atRiskAgents,
        agentsNoListings,
        stateBreakdown,
        growthChart,
        planMix,
        fetchedAt: new Date().toISOString(),
      });
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchAll();
  }, []);

  if (loading) {
    return (
      <div className="flex justify-center py-20">
        <div className="flex items-center gap-3 text-muted-foreground">
          <RefreshCw size={20} className="animate-spin" />
          <p className="text-sm">Loading command centre…</p>
        </div>
      </div>
    );
  }

  if (!data) return null;

  const alerts = [
    data.trialsExpiringThisWeek > 0 && (
      <CCAlert key="trials" severity="red">
        {data.trialsExpiringThisWeek} trial{data.trialsExpiringThisWeek > 1 ? 's' : ''} expiring this week — follow up before they churn
      </CCAlert>
    ),
    data.agentsNoListings > 0 && (
      <CCAlert key="no-listings" severity="amber">
        {data.agentsNoListings} agent{data.agentsNoListings > 1 ? 's' : ''} signed up but haven't listed yet
      </CCAlert>
    ),
    data.atRiskAgents.length > 0 && (
      <CCAlert key="at-risk" severity="amber">
        {data.atRiskAgents.length} agent{data.atRiskAgents.length > 1 ? 's' : ''} haven't logged in for 14+ days
      </CCAlert>
    ),
    data.listingsNoPhotos > 0 && (
      <CCAlert key="no-photos" severity="amber">
        {data.listingsNoPhotos} listing{data.listingsNoPhotos > 1 ? 's' : ''} have no photos
      </CCAlert>
    ),
  ].filter(Boolean);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-bold text-foreground">
            Command Centre
          </h2>
          <p className="text-[11px] text-muted-foreground flex items-center gap-1">
            <Clock size={12} />
            Last updated{' '}
            {new Date(data.fetchedAt).toLocaleTimeString('en-AU', { hour: '2-digit', minute: '2-digit' })}
          </p>
        </div>
        <button
          onClick={fetchAll}
          disabled={refreshing}
          className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-secondary text-xs font-medium text-muted-foreground hover:text-foreground transition-colors disabled:opacity-50"
        >
          <RefreshCw size={14} className={refreshing ? 'animate-spin' : ''} />
          Refresh
        </button>
      </div>

      {alerts.length > 0 && (
        <div className="space-y-2">
          {alerts}
        </div>
      )}

      <SectionHead title="Revenue" sub="Monthly recurring revenue from paid plans" />
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <KPI
          label="MRR"
          value={`$${data.mrr.toLocaleString()}`}
          icon={DollarSign}
          color={data.mrr > 0 ? 'text-emerald-500' : 'text-muted-foreground'}
          sub={data.mrrGrowthPct != null ? `${data.mrrGrowthPct >= 0 ? '+' : ''}${data.mrrGrowthPct}% vs last month` : 'No prev data'}
          trend={data.mrrGrowthPct != null ? (data.mrrGrowthPct >= 0 ? 'up' : 'down') : null}
        />
        <KPI
          label="ARR"
          value={`$${data.arr.toLocaleString()}`}
          icon={DollarSign}
          color={data.arr > 0 ? 'text-emerald-500' : 'text-muted-foreground'}
          sub="Annualised"
        />
        <KPI
          label="Paid Agents"
          value={data.paidAgents}
          icon={UserCheck}
          sub={`${data.activeTrials} on trial`}
          trend={data.paidAgents > 0 ? 'up' : null}
        />
        <KPI
          label="Churn (month)"
          value={data.churnedThisMonth}
          icon={UserX}
          color={data.churnedThisMonth > 0 ? 'text-destructive' : 'text-muted-foreground'}
          sub="Lost this month"
          trend={data.churnedThisMonth > 0 ? 'down' : null}
        />
      </div>

      {data.planMix.length > 0 && (
        <div className="rounded-2xl border border-border bg-card p-4">
          <p className="text-xs font-semibold text-foreground mb-3">
            Plan Mix
          </p>
          <div className="flex flex-wrap gap-3">
            {data.planMix.map(p => (
              <div key={p.plan} className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-secondary text-xs">
                <span className="font-bold text-foreground">
                  {p.count}
                </span>
                <span className="text-muted-foreground">
                  {PLAN_LABEL[p.plan] || p.plan}
                </span>
                {p.mrr > 0 && (
                  <span className="text-emerald-500 font-medium">
                    ${p.mrr}/mo
                  </span>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      <SectionHead title="Agent Growth" sub="Sign-ups and retention" />
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <KPI
          label="Total Agents"
          value={data.totalAgents}
          icon={Users}
          sub={`+${data.newAgentsToday} today`}
          color={data.newAgentsToday > 0 ? 'text-primary' : 'text-muted-foreground'}
          trend={data.newAgentsToday > 0 ? 'up' : null}
        />
        <KPI label="New (7d)" value={data.newAgentsThisWeek} icon={ArrowUpRight} />
        <KPI label="New (month)" value={data.newAgentsThisMonth} icon={ArrowUpRight} />
        <KPI label="Trials Expiring" value={data.trialsExpiringThisWeek} icon={Clock} color={data.trialsExpiringThisWeek > 0 ? 'text-amber-500' : 'text-muted-foreground'} />
      </div>

      <SectionHead title="12-Week Growth" />
      <div className="rounded-2xl border border-border bg-card p-4">
        <ResponsiveContainer width="100%" height={220}>
          <AreaChart data={data.growthChart}>
            <defs>
              <linearGradient id="ccAgents" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="hsl(var(--primary))" stopOpacity={0.3} />
                <stop offset="100%" stopColor="hsl(var(--primary))" stopOpacity={0} />
              </linearGradient>
              <linearGradient id="ccLeads" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#a855f7" stopOpacity={0.3} />
                <stop offset="100%" stopColor="#a855f7" stopOpacity={0} />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
            <XAxis dataKey="label" tick={{ fontSize: 10 }} stroke="hsl(var(--muted-foreground))" />
            <YAxis tick={{ fontSize: 10 }} stroke="hsl(var(--muted-foreground))" />
            <Tooltip contentStyle={{ fontSize: 12, borderRadius: 12, border: '1px solid hsl(var(--border))', background: 'hsl(var(--card))' }} />
            <Area type="monotone" dataKey="agents" stroke="hsl(var(--primary))" fill="url(#ccAgents)" strokeWidth={2} name="Agents" />
            <Area type="monotone" dataKey="leads" stroke="#a855f7" fill="url(#ccLeads)" strokeWidth={2} name="Leads" />
          </AreaChart>
        </ResponsiveContainer>
      </div>

      <SectionHead title="Platform Activity" sub="Listings, leads & engagement" />
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <KPI label="Live Listings" value={data.liveListings} icon={Building2} sub={`+${data.listingsThisWeek} this week`} color={data.listingsThisWeek > 0 ? 'text-primary' : 'text-muted-foreground'} trend={data.listingsThisWeek > 0 ? 'up' : null} />
        <KPI label="Avg Views" value={data.avgViewsPerListing} icon={Activity} />
        <KPI label="Leads Today" value={data.leadsToday} icon={Target} sub={`${data.leads30d} in 30d`} color={data.leadsToday > 0 ? 'text-purple-500' : 'text-muted-foreground'} trend={data.leadsToday > 0 ? 'up' : null} />
        <KPI label="Voice (30d)" value={data.voiceSearches30d} icon={Zap} color={data.voiceSearches30d > 0 ? 'text-amber-500' : 'text-muted-foreground'} />
      </div>

      {data.stateBreakdown.length > 0 && (
        <div className="rounded-2xl border border-border bg-card p-4">
          <SectionHead title="Listings by State" />
          <div className="space-y-2">
            {data.stateBreakdown.map(({ state, count }) => {
              const pct = data.liveListings > 0 ? Math.round((count / data.liveListings) * 100) : 0;
              return (
                <div key={state} className="space-y-1">
                  <div className="flex items-center justify-between text-xs">
                    <span className="flex items-center gap-1.5 text-foreground font-medium">
                      <MapPin size={12} />
                      {state}
                    </span>
                    <span className="text-muted-foreground">
                      {pct}% · {count} listing{count !== 1 ? 's' : ''}
                    </span>
                  </div>
                  <div className="h-1.5 rounded-full bg-secondary overflow-hidden">
                    <div className="h-full rounded-full bg-primary transition-all" style={{ width: `${pct}%` }} />
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {data.atRiskAgents.length > 0 && (
        <div className="rounded-2xl border border-border bg-card p-4">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="text-sm font-semibold text-foreground">
                At-Risk Agents
              </h3>
              <p className="text-[11px] text-muted-foreground">
                No login in 14+ days — prioritise for outreach
              </p>
            </div>
            <span className="text-xs text-muted-foreground bg-secondary px-2 py-0.5 rounded-full">
              {data.atRiskAgents.length} agents
            </span>
          </div>
          <div className="space-y-3">
            {data.atRiskAgents.map(a => (
              <div key={a.id} className="flex items-center justify-between">
                <div className="flex items-center gap-3 min-w-0">
                  <div className="w-8 h-8 rounded-full bg-destructive/10 text-destructive flex items-center justify-center text-xs font-bold shrink-0">
                    {a.name[0]?.toUpperCase()}
                  </div>
                  <div className="min-w-0">
                    <p className="text-sm font-medium text-foreground truncate">
                      {a.name}
                    </p>
                    <p className="text-[11px] text-muted-foreground truncate">
                      {a.email}{a.agency ? ` · ${a.agency}` : ''}
                    </p>
                  </div>
                </div>
                <div className="text-right shrink-0 ml-3">
                  <p className={`text-xs font-medium ${a.daysSince > 30 ? 'text-destructive' : 'text-amber-500'}`}>
                    {a.daysSince === 999 ? 'Never logged in' : `${a.daysSince}d ago`}
                  </p>
                  {a.lastSeen && (
                    <p className="text-[10px] text-muted-foreground">
                      {new Date(a.lastSeen).toLocaleDateString('en-AU')}
                    </p>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {data.agentsNoListings > 0 && (
        <div className="rounded-2xl border border-border bg-card p-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-amber-500/10 flex items-center justify-center">
              <UserX size={20} className="text-amber-500" />
            </div>
            <div>
              <p className="text-sm font-semibold text-foreground">
                {data.agentsNoListings} agents with no listings
              </p>
              <p className="text-[11px] text-muted-foreground">
                They signed up but haven't listed yet — reach out to activate them
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
