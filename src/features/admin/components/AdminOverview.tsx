import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { TrendingUp, TrendingDown, AlertTriangle, Zap, Globe, BarChart3, Users, Home, DollarSign, ChevronRight, Wallet } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import type { InsightsData } from '../pages/AdminDashboard';

interface Props {
  stats: {
    totalUsers: number;
    totalAgents: number;
    totalListings: number;
    totalLeads: number;
    totalVoiceSearches: number;
  };
  users: {
    id: string;
    display_name?: string;
    email: string;
    roles: string[];
    created_at: string;
    last_sign_in_at?: string | null;
  }[];
  insights: InsightsData | null;
  onNavigate?: (tab: string) => void;
}

const PLAN_MRR: Record<string, number> = {
  solo: 299,
  agency: 899,
  agency_pro: 1999,
  enterprise: 4999,
  demo: 0,
};

const fmtCurrency = (n: number) =>
  n.toLocaleString('en-AU', { style: 'currency', currency: 'AUD', maximumFractionDigits: 0 });

const StatCard = ({
  label, value, sub, color = 'text-primary', trend, trendLabel, icon: Icon,
}: {
  label: string;
  value: string | number;
  sub?: string;
  color?: string;
  trend?: 'up' | 'down' | 'flat';
  trendLabel?: string;
  icon?: any;
}) => (
  <div className="bg-card border border-border rounded-xl p-4 space-y-1">
    <div className="flex items-center justify-between">
      <p className="text-xs text-muted-foreground uppercase tracking-wide font-medium">{label}</p>
      {Icon && <Icon size={12} className="text-muted-foreground" />}
    </div>
    <p className={`text-2xl font-bold ${color}`}>{value}</p>
    {sub && <p className="text-[11px] text-muted-foreground">{sub}</p>}
    {trendLabel && (
      <p className={`text-[11px] font-medium flex items-center gap-1 ${
        trend === 'up' ? 'text-emerald-500' :
        trend === 'down' ? 'text-destructive' :
        'text-muted-foreground'
      }`}>
        {trend === 'up' && <TrendingUp size={11} />}
        {trend === 'down' && <TrendingDown size={11} />}
        {trendLabel}
      </p>
    )}
  </div>
);

const SectionTitle = ({ icon: Icon, title }: { icon: any; title: string }) => (
  <div className="flex items-center gap-2 mb-3">
    <div className="w-7 h-7 rounded-lg bg-primary/10 flex items-center justify-center">
      <Icon size={14} className="text-primary" />
    </div>
    <h3 className="font-semibold text-foreground text-sm">{title}</h3>
  </div>
);

const AdminOverview = ({ stats, users, insights, onNavigate }: Props) => {
  const now = Date.now();
  const DAY = 86400000;

  const [estMrr, setEstMrr] = useState<number | null>(null);

  // New strategic KPIs
  const [atRiskCount, setAtRiskCount] = useState<number | null>(null);
  const [trialEndingCount, setTrialEndingCount] = useState<number | null>(null);
  const [avgDaysToFirstListing, setAvgDaysToFirstListing] = useState<number | null>(null);
  const [avgDaysPrevMonth, setAvgDaysPrevMonth] = useState<number | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const [agentsRes, subsRes] = await Promise.all([
          supabase.from('agents').select('id, is_subscribed'),
          supabase.from('agent_subscriptions').select('agent_id, plan_type'),
        ]);
        const planMap = new Map<string, string>();
        (subsRes.data || []).forEach((s: any) => planMap.set(s.agent_id, s.plan_type));
        let mrr = 0;
        (agentsRes.data || []).forEach((a: any) => {
          if (!a.is_subscribed) return;
          const plan = (planMap.get(a.id) || 'demo').toLowerCase();
          mrr += PLAN_MRR[plan] || 0;
        });
        if (!cancelled) setEstMrr(mrr);
      } catch {
        if (!cancelled) setEstMrr(0);
      }
    })();
    return () => { cancelled = true; };
  }, []);

  // At-risk agents: not signed in 14+ days OR 0 active listings
  // Trial-ending: trial_ends_at within next 7 days
  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const sevenDays = new Date(now + 7 * DAY).toISOString();
        const fourteenDaysAgo = new Date(now - 14 * DAY).toISOString();

        // Trials ending within 7 days
        const { count: trialCount } = await supabase
          .from('agent_subscriptions')
          .select('id', { count: 'exact', head: true })
          .lte('trial_ends_at', sevenDays)
          .gte('trial_ends_at', new Date(now).toISOString());

        // At-risk agents — fetch agent ids with their listing counts
        const { data: allAgents } = await supabase.from('agents').select('id, user_id');
        const agentIds = (allAgents || []).map((a: any) => a.id);
        const userIdToLastSeen = new Map<string, number | null>(
          users.map(u => [u.id, u.last_sign_in_at ? new Date(u.last_sign_in_at).getTime() : null])
        );
        let activeListingCounts = new Map<string, number>();
        if (agentIds.length > 0) {
          const { data: props } = await supabase
            .from('properties')
            .select('agent_id')
            .eq('is_active', true)
            .in('agent_id', agentIds);
          (props || []).forEach((p: any) => {
            activeListingCounts.set(p.agent_id, (activeListingCounts.get(p.agent_id) || 0) + 1);
          });
        }
        const atRisk = (allAgents || []).filter((a: any) => {
          const lastSeen = userIdToLastSeen.get(a.user_id);
          const staleLogin = !lastSeen || lastSeen < new Date(fourteenDaysAgo).getTime();
          const noListings = (activeListingCounts.get(a.id) || 0) === 0;
          return staleLogin || noListings;
        }).length;

        if (!cancelled) {
          setTrialEndingCount(trialCount || 0);
          setAtRiskCount(atRisk);
        }
      } catch {
        if (!cancelled) {
          setTrialEndingCount(0);
          setAtRiskCount(0);
        }
      }
    })();
    return () => { cancelled = true; };
  }, [users, now]);

  // Time to first listing — current 30 days vs prior 30 days
  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const thirtyAgo = new Date(now - 30 * DAY).toISOString();
        const sixtyAgo = new Date(now - 60 * DAY).toISOString();

        const computeAvg = async (since: string, until?: string) => {
          let q = supabase.from('agents').select('id, created_at').gte('created_at', since);
          if (until) q = q.lt('created_at', until);
          const { data: agentsBatch } = await q;
          const ids = (agentsBatch || []).map((a: any) => a.id);
          if (ids.length === 0) return null;
          const { data: props } = await supabase
            .from('properties')
            .select('agent_id, created_at')
            .in('agent_id', ids);
          const firstByAgent = new Map<string, number>();
          (props || []).forEach((p: any) => {
            const t = new Date(p.created_at).getTime();
            const cur = firstByAgent.get(p.agent_id);
            if (cur === undefined || t < cur) firstByAgent.set(p.agent_id, t);
          });
          const diffs: number[] = [];
          (agentsBatch || []).forEach((a: any) => {
            const first = firstByAgent.get(a.id);
            if (first) diffs.push((first - new Date(a.created_at).getTime()) / DAY);
          });
          if (diffs.length === 0) return null;
          return Math.round(diffs.reduce((s, d) => s + d, 0) / diffs.length);
        };

        const [cur, prev] = await Promise.all([
          computeAvg(thirtyAgo),
          computeAvg(sixtyAgo, thirtyAgo),
        ]);
        if (!cancelled) {
          setAvgDaysToFirstListing(cur);
          setAvgDaysPrevMonth(prev);
        }
      } catch {
        if (!cancelled) {
          setAvgDaysToFirstListing(null);
          setAvgDaysPrevMonth(null);
        }
      }
    })();
    return () => { cancelled = true; };
  }, [now]);

  const activeToday = users.filter(u => u.last_sign_in_at && now - new Date(u.last_sign_in_at).getTime() < DAY);
  const activeWeek = users.filter(u => u.last_sign_in_at && now - new Date(u.last_sign_in_at).getTime() < 7 * DAY);
  const activeMonth = users.filter(u => u.last_sign_in_at && now - new Date(u.last_sign_in_at).getTime() < 30 * DAY);

  const agentsToday = activeToday.filter(u => u.roles.includes('agent')).length;
  const seekersToday = activeToday.filter(u => !u.roles.includes('agent') && !u.roles.includes('admin')).length;
  const agentsWeek = activeWeek.filter(u => u.roles.includes('agent')).length;
  const seekersWeek = activeWeek.filter(u => !u.roles.includes('agent') && !u.roles.includes('admin')).length;
  const agentsMonth = activeMonth.filter(u => u.roles.includes('agent')).length;
  const seekersMonth = activeMonth.filter(u => !u.roles.includes('agent') && !u.roles.includes('admin')).length;

  // Agents created in the last 7 days (for "Total Agents +N this week")
  const agentsCreatedThisWeek = users.filter(
    u => u.roles.includes('agent') && now - new Date(u.created_at).getTime() < 7 * DAY
  ).length;

  const voiceTrend = insights && insights.voiceSearchesPrev30d > 0
    ? Math.round(((insights.voiceSearches30d - insights.voiceSearchesPrev30d) / insights.voiceSearchesPrev30d) * 100)
    : null;

  // Trial → Paid conversion rate
  const activeSubs = insights?.activeSubscriptions ?? 0;
  const trialAgents = insights?.trialAgents ?? 0;
  const conversionDenominator = activeSubs + trialAgents;
  const trialConversionPct = conversionDenominator > 0
    ? Math.round((activeSubs / conversionDenominator) * 100)
    : null;

  const estArr = estMrr !== null ? estMrr * 12 : null;

  type AttentionItem = { label: string; severity: string; tab?: string };
  const needsAttention: AttentionItem[] = insights ? ([
    insights.trialsExpiringThisWeek > 0 && {
      label: `${insights.trialsExpiringThisWeek} trial${insights.trialsExpiringThisWeek > 1 ? 's' : ''} expiring this week`,
      severity: 'red',
      tab: 'agent-lifecycle',
    },
    insights.boostRequestsPending > 0 && {
      label: `${insights.boostRequestsPending} boost request${insights.boostRequestsPending > 1 ? 's' : ''} pending activation`,
      severity: 'amber',
      tab: 'listings',
    },
    insights.agentsNoListings > 0 && {
      label: `${insights.agentsNoListings} agent${insights.agentsNoListings > 1 ? 's' : ''} with no listings yet`,
      severity: 'amber',
      tab: 'agent-lifecycle',
    },
    insights.inactiveListings > 0 && {
      label: `${insights.inactiveListings} listing${insights.inactiveListings > 1 ? 's' : ''} with zero views`,
      severity: 'amber',
      tab: 'listings',
    },
    insights.listingsNoPhotos > 0 && {
      label: `${insights.listingsNoPhotos} listing${insights.listingsNoPhotos > 1 ? 's' : ''} with no photos`,
      severity: 'red',
      tab: 'listings',
    },
  ].filter(Boolean) as AttentionItem[]) : [];

  const totalVoiceLang = insights?.topLanguages.reduce((s, l) => s + l.count, 0) || 0;

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-6">

      {/* ── Platform totals ── */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
        <StatCard label="Total Users" value={stats.totalUsers} color="text-primary" />
        <StatCard
          label="Agents"
          value={stats.totalAgents}
          color="text-emerald-500"
          trend={agentsCreatedThisWeek > 0 ? 'up' : 'flat'}
          trendLabel={agentsCreatedThisWeek > 0 ? `+${agentsCreatedThisWeek} this week` : undefined}
        />
        <StatCard label="Listings" value={stats.totalListings} color="text-purple-500" />
        <StatCard label="Leads" value={stats.totalLeads} color="text-amber-500" />
        <StatCard label="Voice Searches" value={stats.totalVoiceSearches} color="text-cyan-500" />
      </div>

      {/* ── Revenue & Subscriptions ── */}
      <div className="bg-card border border-border rounded-xl p-5">
        <SectionTitle icon={DollarSign} title="Revenue & Subscriptions" />
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <StatCard
            label="Est. MRR"
            value={estMrr !== null ? fmtCurrency(estMrr) : '—'}
            sub="(pre-Stripe)"
            color="text-muted-foreground"
          />
          <StatCard
            label="Est. ARR"
            value={estArr !== null ? fmtCurrency(estArr) : '—'}
            sub="(pre-Stripe)"
            color="text-muted-foreground"
          />
          <StatCard
            label="Active Subscriptions"
            value={insights?.activeSubscriptions ?? '—'}
            sub="Paying agents"
            color="text-emerald-500"
          />
          <StatCard
            label="Trial → Paid"
            value={trialConversionPct !== null ? `${trialConversionPct}%` : '—'}
            sub={`${activeSubs} converted of ${conversionDenominator}`}
            color={trialConversionPct !== null && trialConversionPct >= 30 ? 'text-emerald-500' : 'text-amber-500'}
          />
        </div>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mt-3">
          <StatCard
            label="Trial Agents"
            value={insights?.trialAgents ?? '—'}
            sub="In free trial"
            color="text-amber-500"
          />
          <StatCard
            label="Trials Expiring"
            value={insights?.trialsExpiringThisWeek ?? '—'}
            sub="Within 7 days"
            color={insights?.trialsExpiringThisWeek ? 'text-destructive' : 'text-muted-foreground'}
            trend={insights?.trialsExpiringThisWeek ? 'down' : undefined}
            trendLabel={insights?.trialsExpiringThisWeek ? 'Needs follow-up' : undefined}
          />
          <StatCard
            label="Runway"
            value="—"
            sub="Set cash balance in Settings"
            color="text-muted-foreground"
            icon={Wallet}
          />
          <div />
        </div>
      </div>

      {/* ── Platform Activity ── */}
      <div className="bg-card border border-border rounded-xl p-5">
        <SectionTitle icon={BarChart3} title="Platform Activity" />
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <StatCard
            label="Active Listings"
            value={insights?.listingsPublished ?? '—'}
            sub={`+${insights?.listingsThisWeek ?? 0} this week`}
            color="text-primary"
            trend={insights?.listingsThisWeek ? 'up' : 'flat'}
            trendLabel={insights?.listingsThisWeek ? `↑ ${insights.listingsThisWeek} new this week` : 'No new listings'}
          />
          <StatCard
            label="Voice Searches"
            value={insights?.voiceSearches30d ?? '—'}
            sub="Last 30 days"
            color="text-cyan-500"
            trend={voiceTrend != null ? (voiceTrend >= 0 ? 'up' : 'down') : undefined}
            trendLabel={voiceTrend != null ? `${voiceTrend >= 0 ? '+' : ''}${voiceTrend}% vs prev month` : undefined}
          />
          <StatCard
            label="Leads Today"
            value={insights?.leadsToday ?? '—'}
            sub="Buyer enquiries"
            color="text-amber-500"
            trend={(insights?.leads30d ?? 0) > 0 ? 'up' : 'flat'}
            trendLabel={insights ? `↑ ${insights.leads30d} this month` : undefined}
          />
          <StatCard
            label="Leads (30 days)"
            value={insights?.leads30d ?? '—'}
            sub="Total enquiries"
            color="text-amber-500"
          />
        </div>
      </div>

      {/* ── Listing Health ── */}
      <div className="bg-card border border-border rounded-xl p-5">
        <SectionTitle icon={Home} title="Listing Health" />
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <StatCard
            label="Avg Views / Listing"
            value={insights?.avgViewsPerListing ?? '—'}
            sub="Active listings"
            color="text-primary"
          />
          <StatCard
            label="Boost Requests"
            value={insights?.boostRequestsPending ?? '—'}
            sub="Pending activation"
            color={insights?.boostRequestsPending ? 'text-amber-500' : 'text-muted-foreground'}
            trend={insights?.boostRequestsPending ? 'down' : undefined}
            trendLabel={insights?.boostRequestsPending ? 'Action needed' : undefined}
          />
          <StatCard
            label="Zero Views"
            value={insights?.inactiveListings ?? '—'}
            sub="Active listings"
            color={insights?.inactiveListings ? 'text-destructive' : 'text-emerald-500'}
          />
          <StatCard
            label="No Photos"
            value={insights?.listingsNoPhotos ?? '—'}
            sub="Missing images"
            color={insights?.listingsNoPhotos ? 'text-destructive' : 'text-emerald-500'}
          />
        </div>
      </div>

      {/* ── User Activity ── */}
      <div className="bg-card border border-border rounded-xl p-5">
        <SectionTitle icon={Users} title="User Activity" />
        <div className="grid grid-cols-3 gap-4">
          {[
            { label: 'Today', total: activeToday.length, agents: agentsToday, seekers: seekersToday },
            { label: 'Last 7 days', total: activeWeek.length, agents: agentsWeek, seekers: seekersWeek },
            { label: 'Last 30 days', total: activeMonth.length, agents: agentsMonth, seekers: seekersMonth },
          ].map(({ label, total, agents, seekers }) => (
            <div key={label} className="space-y-2">
              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">{label}</p>
              <div className="bg-primary/5 rounded-xl p-3 text-center">
                <p className="text-2xl font-bold text-primary">{total}</p>
                <p className="text-[11px] text-muted-foreground">total active</p>
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div className="bg-emerald-500/10 rounded-lg p-2 text-center">
                  <p className="text-lg font-bold text-emerald-600">{agents}</p>
                  <p className="text-[10px] text-muted-foreground">agents</p>
                </div>
                <div className="bg-blue-500/10 rounded-lg p-2 text-center">
                  <p className="text-lg font-bold text-blue-600">{seekers}</p>
                  <p className="text-[10px] text-muted-foreground">seekers</p>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* ── Needs Attention + Voice Languages ── */}
      <div className="grid md:grid-cols-2 gap-4">

        {/* Needs Attention */}
        <div className="bg-card border border-border rounded-xl p-5">
          <SectionTitle icon={AlertTriangle} title="Needs Attention" />
          {needsAttention.length === 0 ? (
            <div className="text-center py-6">
              <div className="w-10 h-10 rounded-full bg-emerald-500/10 flex items-center justify-center mx-auto mb-2">
                <Zap size={18} className="text-emerald-500" />
              </div>
              <p className="text-sm text-muted-foreground">All clear — nothing needs attention right now.</p>
            </div>
          ) : (
            <div className="space-y-2">
              {needsAttention.map((item, i) => {
                const clickable = !!(item.tab && onNavigate);
                const baseClasses = `w-full flex items-center gap-3 p-3 rounded-lg border text-left transition-colors ${
                  item.severity === 'red'
                    ? 'bg-destructive/5 border-destructive/20'
                    : 'bg-amber-500/5 border-amber-500/20'
                } ${item.tab ? 'hover:bg-accent/30 cursor-pointer' : ''}`;
                const content = (
                  <>
                    <div className={`w-2 h-2 rounded-full flex-shrink-0 ${
                      item.severity === 'red' ? 'bg-destructive' : 'bg-amber-500'
                    }`} />
                    <p className="text-sm text-foreground flex-1">{item.label}</p>
                    {item.tab && <ChevronRight size={14} className="text-muted-foreground flex-shrink-0" />}
                  </>
                );
                return clickable ? (
                  <button
                    key={i}
                    type="button"
                    onClick={() => onNavigate?.(item.tab!)}
                    className={baseClasses}
                  >
                    {content}
                  </button>
                ) : (
                  <div key={i} className={baseClasses}>{content}</div>
                );
              })}
            </div>
          )}
        </div>

        {/* Voice Search Languages */}
        <div className="bg-card border border-border rounded-xl p-5">
          <SectionTitle icon={Globe} title="Voice Search Languages (30 days)" />
          {!insights?.topLanguages.length ? (
            <p className="text-sm text-muted-foreground text-center py-6">No voice searches yet.</p>
          ) : (
            <div className="space-y-2.5">
              {insights.topLanguages.map(({ language, count }) => {
                const pct = totalVoiceLang > 0 ? Math.round((count / totalVoiceLang) * 100) : 0;
                return (
                  <div key={language}>
                    <div className="flex justify-between text-xs mb-1">
                      <span className="font-medium text-foreground">{language}</span>
                      <span className="text-muted-foreground">{pct}% · {count}</span>
                    </div>
                    <div className="h-1.5 bg-muted rounded-full overflow-hidden">
                      <div
                        className="h-full bg-primary rounded-full transition-all duration-500"
                        style={{ width: `${pct}%` }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

      </div>

      {/* ── Recent Users ── */}
      <div className="bg-card border border-border rounded-xl p-5">
        <SectionTitle icon={Users} title="Recent Users" />
        <div className="space-y-1">
          {users.slice(0, 10).map((u) => (
            <div key={u.id} className="flex items-center justify-between py-2 border-b border-border last:border-0">
              <div>
                <p className="text-sm font-medium text-foreground">{u.display_name || u.email}</p>
                <p className="text-xs text-muted-foreground">
                  Joined {new Date(u.created_at).toLocaleDateString('en-AU')}
                  {u.last_sign_in_at && ` · Last seen ${new Date(u.last_sign_in_at).toLocaleDateString('en-AU')}`}
                </p>
              </div>
              <div className="flex gap-1">
                {u.roles.map((r) => (
                  <span key={r} className={`text-xs px-2 py-0.5 rounded-full font-medium ${
                    r === 'admin' ? 'bg-red-500/20 text-red-500' :
                    r === 'agent' ? 'bg-emerald-500/20 text-emerald-500' :
                    'bg-muted text-muted-foreground'
                  }`}>{r}</span>
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>

    </motion.div>
  );
};

export default AdminOverview;
