import { useState, useEffect, useRef, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/features/auth/AuthProvider';
import { toast } from 'sonner';
import {
  TrendingUp,
  TrendingDown,
  Minus,
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
  ArrowRight,
  CheckCircle2,
  Mail,
  Eye,
  ClipboardCheck,
  Gamepad2,
  MessageSquare,
  Megaphone,
  Ban,
  Trash2,
  UserPlus,
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

type Trend = 'up' | 'down' | 'flat' | null;

interface CCData {
  mrr: number;
  arr: number;
  mrrGrowthPct: number | null;
  totalAgents: number;
  activeTrials: number;
  paidAgents: number;
  paidAgentsPrevWeek: number;
  conversionRate: number;
  conversionRatePrevWeek: number;
  trialsExpiringThisWeek: number;
  newAgentsToday: number;
  newAgentsThisWeek: number;
  newAgentsPrevWeek: number;
  newAgentsThisMonth: number;
  churnedThisMonth: number;
  projectedMRR: number;
  projectedARR: number;
  projectedARR12m: number;
  monthlyGrowthRate: number;
  liveListings: number;
  listingsToday: number;
  listingsThisWeek: number;
  avgViewsPerListing: number;
  listingsNoPhotos: number;
  leadsToday: number;
  leadsThisWeek: number;
  leads30d: number;
  voiceSearches30d: number;
  searchesToday: number;
  savesToday: number;
  totalBuyers: number;
  newBuyersThisWeek: number;
  topSuburb: string | null;
  pendingAgentApprovals: number;
  pendingListingReviews: number;
  pendingDemoRequests: number;
  openSupportTickets: number;
  atRiskAgents: {
    id: string;
    name: string;
    email: string;
    agency: string | null;
    lastSeen: string | null;
    daysSince: number;
  }[];
  agentsNoListings: number;
  stateBreakdown: { state: string; count: number }[];
  growthChart: { label: string; agents: number; listings: number; leads: number }[];
  planMix: { plan: string; count: number; mrr: number }[];
  totalSeekers: number;
  newSeekersThisWeek: number;
  totalMortgageBrokers: number;
  totalTrustAccountants: number;
  totalDemoUsers: number;
  pendingPartners: number;
  recentUsers: {
    id: string;
    email: string;
    displayName: string;
    userType: 'agent' | 'seeker' | 'partner' | 'demo' | 'demo_request';
    partnerType?: string | null;
    isBanned: boolean;
    isAgent: boolean;
    created_at: string;
    lastSignIn: string | null;
  }[];
  fetchedAt: string;
}

const PLAN_MRR: Record<string, number> = {
  solo: 299,
  agency: 899,
  agency_pro: 1999,
  enterprise: 4999,
};

const PLAN_LABEL: Record<string, string> = {
  solo: 'Solo',
  agency: 'Agency',
  agency_pro: 'Agency Pro',
  enterprise: 'Enterprise',
  demo: 'Trial',
};

function trendFromDelta(curr: number, prev: number): Trend {
  if (prev === 0 && curr === 0) return 'flat';
  if (curr > prev) return 'up';
  if (curr < prev) return 'down';
  return 'flat';
}

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
  icon?: any;
  color?: string;
  trend?: Trend;
}) {
  return (
    <div className="rounded-2xl border border-border bg-card p-4 space-y-1">
      <div className="flex items-center justify-between">
        <p className="text-xs text-muted-foreground font-medium">{label}</p>
        {Icon && (
          <div className={color}>
            <Icon size={16} />
          </div>
        )}
      </div>
      <p className="text-2xl font-bold text-foreground">{String(value)}</p>
      {sub && (
        <p className="text-[11px] text-muted-foreground flex items-center gap-1">
          {trend === 'up' && <TrendingUp size={12} className="text-emerald-500" />}
          {trend === 'down' && <TrendingDown size={12} className="text-destructive" />}
          {trend === 'flat' && <Minus size={12} className="text-muted-foreground" />}
          {sub}
        </p>
      )}
    </div>
  );
}

function SectionHead({ title, sub }: { title: string; sub?: string }) {
  return (
    <div className="flex items-center gap-3 mb-4 mt-8 first:mt-0">
      <div>
        <h3 className="text-sm font-semibold text-foreground">{title}</h3>
        {sub && <p className="text-[11px] text-muted-foreground">{sub}</p>}
      </div>
    </div>
  );
}

function AttentionCard({
  icon: Icon,
  label,
  count,
  description,
  to,
  navigate,
  tone = 'amber',
}: {
  icon: any;
  label: string;
  count: number;
  description: string;
  to: string;
  navigate: (to: string) => void;
  tone?: 'amber' | 'red' | 'blue';
}) {
  const toneClasses = {
    amber: 'bg-amber-500/10 text-amber-600 dark:text-amber-400',
    red: 'bg-destructive/10 text-destructive',
    blue: 'bg-primary/10 text-primary',
  }[tone];

  return (
    <div className="rounded-2xl border border-border bg-card p-4 flex flex-col gap-3">
      <div className="flex items-start gap-3">
        <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${toneClasses}`}>
          <Icon size={20} />
        </div>
        <div className="min-w-0 flex-1">
          <p className="text-sm font-semibold text-foreground">
            {label}: <span className="font-bold">{count} pending</span>
          </p>
          <p className="text-[11px] text-muted-foreground mt-0.5">{description}</p>
        </div>
      </div>
      <button
        onClick={() => navigate(to)}
        className="self-start inline-flex items-center gap-1 text-xs font-medium text-primary hover:text-primary/80 transition-colors"
      >
        Review <ArrowRight size={12} />
      </button>
    </div>
  );
}

export default function CommandCentre() {
  const navigate = useNavigate();
  const auth = useAuth();
  const startImpersonation = (auth as any)?.startImpersonation as
    | ((userId: string, userEmail: string) => Promise<void>)
    | undefined;

  const [data, setData] = useState<CCData | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const fetchAllRef = useRef<() => Promise<void>>(() => Promise.resolve());

  const fetchAll = useCallback(async () => {
    setRefreshing(true);
    try {
      const now = new Date();
      const d7 = new Date(now.getTime() - 7 * 86400000).toISOString();
      const d14 = new Date(now.getTime() - 14 * 86400000).toISOString();
      const d14Date = new Date(now.getTime() - 14 * 86400000);
      const d30 = new Date(now.getTime() - 30 * 86400000).toISOString();
      const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate()).toISOString();
      const monthStart = new Date(now.getFullYear(), now.getMonth(), 1).toISOString();

      const [
        agentsRes,
        propsRes,
        leadsRes,
        voiceSearchesTodayRes,
        voice30dRes,
        liveListingsRes,
        listingsTodayRes,
        listingsWeekRes,
        leadsTodayRes,
        leadsWeekRes,
        leads30dRes,
        pendingAgentsRes,
        pendingListingsRes,
        pendingDemosRes,
        openTicketsRes,
        churnRes,
        buyerSearchesTodayRes,
        savesTodayRes,
        totalBuyersRes,
        newBuyersWeekRes,
      ] = await Promise.all([
        supabase.from('agents').select('id, name, email, agency, is_subscribed, created_at, updated_at, onboarding_complete, agent_subscriptions(plan_type)'),
        supabase.from('properties').select('id, agent_id, state, is_active, views, images, created_at'),
        supabase.from('leads').select('id, created_at'),
        supabase.from('voice_searches').select('id', { count: 'exact', head: true }).gte('created_at', todayStart),
        supabase.from('voice_searches').select('id', { count: 'exact', head: true }).gte('created_at', d30),
        supabase.from('properties').select('id', { count: 'exact', head: true }).eq('is_active', true),
        supabase.from('properties').select('id', { count: 'exact', head: true }).gte('created_at', todayStart),
        supabase.from('properties').select('id', { count: 'exact', head: true }).gte('created_at', d7),
        supabase.from('leads').select('id', { count: 'exact', head: true }).gte('created_at', todayStart),
        supabase.from('leads').select('id', { count: 'exact', head: true }).gte('created_at', d7),
        supabase.from('leads').select('id', { count: 'exact', head: true }).gte('created_at', d30),
        supabase.from('agents').select('id', { count: 'exact', head: true }).eq('approval_status', 'pending'),
        supabase.from('properties').select('id', { count: 'exact', head: true }).eq('is_active', false),
        (supabase.from('demo_requests' as any).select('id', { count: 'exact', head: true }).eq('status', 'pending')) as any,
        (supabase.from('support_tickets' as any).select('id', { count: 'exact', head: true }).eq('status', 'open')) as any,
        supabase.from('agents').select('id', { count: 'exact', head: true }).eq('is_subscribed', false).gte('updated_at', monthStart),
        (supabase.from('buyer_activity_events' as any).select('id', { count: 'exact', head: true }).eq('event_type', 'search').gte('created_at', todayStart)) as any,
        (supabase.from('saved_properties' as any).select('id', { count: 'exact', head: true }).gte('saved_at', todayStart)) as any,
        (supabase.from('buyer_profiles' as any).select('id', { count: 'exact', head: true })) as any,
        (supabase.from('buyer_profiles' as any).select('id', { count: 'exact', head: true }).gte('created_at', d7)) as any,
      ]);

      // Top suburb from voice searches in the last 7 days
      let topSuburb: string | null = null;
      try {
        const { data: vsData } = await supabase
          .from('voice_searches')
          .select('parsed_query')
          .gte('created_at', d7)
          .limit(200);
        if (vsData) {
          const suburbCount = new Map<string, number>();
          vsData.forEach((vs: any) => {
            const suburb = vs.parsed_query?.suburb || vs.parsed_query?.location;
            if (typeof suburb === 'string' && suburb.trim()) {
              const key = suburb.trim();
              suburbCount.set(key, (suburbCount.get(key) || 0) + 1);
            }
          });
          if (suburbCount.size > 0) {
            topSuburb = Array.from(suburbCount.entries())
              .sort((a, b) => b[1] - a[1])[0][0];
          }
        }
      } catch {}

      const searchesToday = (buyerSearchesTodayRes.count || 0) + (voiceSearchesTodayRes.count || 0);

      const agents = agentsRes.data || [];
      const allProps = propsRes.data || [];
      const allLeads = leadsRes.data || [];

      const signInMap = new Map<string, string | null>();
      let allUsers: any[] = [];
      try {
        const { callAdminFunction } = await import('@/features/admin/lib/adminApi');
        const j = await callAdminFunction('list_users');
        allUsers = j?.users || [];
        allUsers.forEach((u: any) => signInMap.set(u.id, u.last_sign_in_at || null));
      } catch {}

      const seekersList = allUsers.filter(u => u.user_type === 'seeker');
      const partnersList = allUsers.filter(u => u.user_type === 'partner');
      const demoUsersList = allUsers.filter(u => u.user_type === 'demo' || u.user_type === 'demo_request');
      const mortgageBrokersList = partnersList.filter(u => u.partner_type === 'mortgage_broker');
      const trustAccountantsList = partnersList.filter(u => u.partner_type === 'trust_accountant');
      const pendingPartnersCount = partnersList.filter(u => !u.is_partner_verified).length;
      const sevenDaysAgo = new Date(Date.now() - 7 * 86400000);
      const newSeekersThisWeekCount = seekersList.filter(u => new Date(u.created_at) >= sevenDaysAgo).length;
      const recentUsersList = [...allUsers]
        .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
        .slice(0, 12)
        .map(u => ({
          id: u.id,
          email: u.email,
          displayName: u.display_name || u.email,
          userType: u.user_type,
          partnerType: u.partner_type ?? null,
          isBanned: !!u.banned_until,
          isAgent: u.user_type === 'agent',
          created_at: u.created_at,
          lastSignIn: u.last_sign_in_at ?? null,
        }));

      const paidAgents = agents.filter(a => a.is_subscribed);
      const mrr = paidAgents.reduce(
        (s, a: any) => s + (PLAN_MRR[(a.agent_subscriptions?.plan_type || '').toLowerCase()] || 0),
        0,
      );
      const prevMonthPaid = agents.filter(a => a.is_subscribed && a.created_at < monthStart).length;
      const mrrGrowthPct =
        prevMonthPaid > 0 ? Math.round(((paidAgents.length - prevMonthPaid) / prevMonthPaid) * 100) : null;

      // Revenue projections
      const daysInMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate();
      const dayOfMonth = now.getDate();
      const daysRemaining = daysInMonth - dayOfMonth;
      const dailyConversionRate = dayOfMonth > 0 ? (paidAgents.length / dayOfMonth) : 0;
      const projectedNewPaid = Math.round(dailyConversionRate * daysRemaining);
      const avgMrrPerAgent = paidAgents.length > 0 ? mrr / paidAgents.length : 0;
      const projectedMRR = mrr + projectedNewPaid * avgMrrPerAgent;
      const projectedARR = projectedMRR * 12;
      const monthlyGrowthRate = prevMonthPaid > 0 ? (paidAgents.length - prevMonthPaid) / prevMonthPaid : 0;
      const projectedARR12m = mrr * 12 * Math.pow(1 + Math.max(monthlyGrowthRate, 0), 12);

      // Week-over-week paid agents (subscribed before each cutoff)
      const paidAgentsPrevWeek = agents.filter(a => a.is_subscribed && a.created_at < d7).length;

      const conversionRate =
        agents.length > 0 ? Math.round((paidAgents.length / agents.length) * 1000) / 10 : 0;
      const totalAgentsPrevWeek = agents.filter(a => a.created_at < d7).length;
      const conversionRatePrevWeek =
        totalAgentsPrevWeek > 0 ? Math.round((paidAgentsPrevWeek / totalAgentsPrevWeek) * 1000) / 10 : 0;

      const trials = agents.filter(a => !a.is_subscribed);
      const newToday = agents.filter(a => a.created_at >= todayStart).length;
      const newWeek = agents.filter(a => a.created_at >= d7).length;
      const newMonth = agents.filter(a => a.created_at >= monthStart).length;
      const newPrevWeek = agents.filter(
        a => a.created_at >= new Date(now.getTime() - 14 * 86400000).toISOString() && a.created_at < d7,
      ).length;

      const trialsExpiringThisWeek = agents.filter(a => {
        if (a.is_subscribed) return false;
        const trialEnd = new Date(new Date(a.created_at).getTime() + 60 * 86400000);
        return trialEnd > now && trialEnd <= new Date(now.getTime() + 7 * 86400000);
      }).length;

      const atRiskAgents = agents
        .filter(a => {
          const lastSeen = signInMap.get(a.id);
          if (!lastSeen) return true;
          return new Date(lastSeen) < d14Date;
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
      const avgViewsPerListing =
        activeProps.length > 0 ? Math.round(totalViews / activeProps.length) : 0;
      const listingsNoPhotos = allProps.filter(
        p => !p.images || (p.images as any[]).length === 0,
      ).length;

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
        paidAgentsPrevWeek,
        conversionRate,
        conversionRatePrevWeek,
        trialsExpiringThisWeek,
        newAgentsToday: newToday,
        newAgentsThisWeek: newWeek,
        newAgentsPrevWeek: newPrevWeek,
        newAgentsThisMonth: newMonth,
        churnedThisMonth: churnRes.count || 0,
        projectedMRR,
        projectedARR,
        projectedARR12m,
        monthlyGrowthRate,
        liveListings: liveListingsRes.count || 0,
        listingsToday: listingsTodayRes.count || 0,
        listingsThisWeek: listingsWeekRes.count || 0,
        avgViewsPerListing,
        listingsNoPhotos,
        leadsToday: leadsTodayRes.count || 0,
        leadsThisWeek: leadsWeekRes.count || 0,
        leads30d: leads30dRes.count || 0,
        voiceSearches30d: voice30dRes.count || 0,
        searchesToday,
        savesToday: savesTodayRes.count || 0,
        totalBuyers: totalBuyersRes.count || 0,
        newBuyersThisWeek: newBuyersWeekRes.count || 0,
        topSuburb,
        pendingAgentApprovals: pendingAgentsRes.count || 0,
        pendingListingReviews: pendingListingsRes.count || 0,
        pendingDemoRequests: pendingDemosRes.count || 0,
        openSupportTickets: openTicketsRes.count || 0,
        atRiskAgents,
        agentsNoListings,
        stateBreakdown,
        growthChart,
        planMix,
        totalSeekers: seekersList.length,
        newSeekersThisWeek: newSeekersThisWeekCount,
        totalMortgageBrokers: mortgageBrokersList.length,
        totalTrustAccountants: trustAccountantsList.length,
        totalDemoUsers: demoUsersList.length,
        pendingPartners: pendingPartnersCount,
        recentUsers: recentUsersList,
        fetchedAt: new Date().toISOString(),
      });
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  // Keep latest fetch in a ref so the visibility/interval effect stays stable
  useEffect(() => {
    fetchAllRef.current = fetchAll;
  }, [fetchAll]);

  // Initial load
  useEffect(() => {
    fetchAll();
  }, [fetchAll]);

  // Listen for global refresh from command palette
  useEffect(() => {
    const handler = () => fetchAllRef.current();
    window.addEventListener('admin:refresh-cc', handler);
    return () => window.removeEventListener('admin:refresh-cc', handler);
  }, []);

  // Auto-refresh every 5 min, paused when tab is hidden
  useEffect(() => {
    let intervalId: number | null = null;

    const start = () => {
      if (intervalId != null) return;
      intervalId = window.setInterval(() => {
        if (document.visibilityState === 'visible') {
          fetchAllRef.current();
        }
      }, 5 * 60 * 1000);
    };

    const stop = () => {
      if (intervalId != null) {
        window.clearInterval(intervalId);
        intervalId = null;
      }
    };

    const handleVisibility = () => {
      if (document.visibilityState === 'visible') {
        // Resume immediately on tab return
        fetchAllRef.current();
        start();
      } else {
        stop();
      }
    };

    if (document.visibilityState === 'visible') start();
    document.addEventListener('visibilitychange', handleVisibility);

    return () => {
      stop();
      document.removeEventListener('visibilitychange', handleVisibility);
    };
  }, []);

  const handleImpersonate = async (id: string, email: string, name: string) => {
    if (!startImpersonation) return;
    try {
      await startImpersonation(id, email || name);
      navigate('/dashboard');
    } catch (err: any) {
      toast.error(err?.message ?? 'Could not start impersonation');
    }
  };

  const [ccDeleteTarget, setCCDeleteTarget] = useState<CCData['recentUsers'][0] | null>(null);
  const [ccDeleting, setCCDeleting] = useState(false);
  const [ccActionLoading, setCCActionLoading] = useState<string | null>(null);

  const handleCCDelete = async (u: CCData['recentUsers'][0]) => {
    setCCDeleting(true);
    setCCActionLoading(u.id);
    try {
      if (u.isAgent) {
        const { data: sessionData } = await supabase.auth.getSession();
        const token = sessionData.session?.access_token;
        if (!token) throw new Error('No active session');
        const { data: delData, error: delError } = await supabase.functions.invoke('admin-delete-agent', {
          body: { userId: u.id },
          headers: { Authorization: `Bearer ${token}` },
        });
        if (delError || (delData as any)?.error) throw new Error(delError?.message || (delData as any)?.error || 'Delete failed');
        toast.success('Agent and all data permanently deleted');
      } else {
        const { callAdminFunction } = await import('@/features/admin/lib/adminApi');
        await callAdminFunction('delete_user', { user_id: u.id });
        toast.success('User permanently deleted');
      }
      setCCDeleteTarget(null);
      fetchAll();
    } catch (err: any) {
      toast.error(err?.message ?? 'Delete failed');
    }
    setCCDeleting(false);
    setCCActionLoading(null);
  };

  const handleCCSuspend = async (u: CCData['recentUsers'][0]) => {
    setCCActionLoading(u.id);
    try {
      const { callAdminFunction } = await import('@/features/admin/lib/adminApi');
      const action = u.isBanned ? 'unban_user' : 'ban_user';
      await callAdminFunction(action, { user_id: u.id });
      toast.success(u.isBanned ? 'User unsuspended' : 'User suspended');
      fetchAll();
    } catch (err: any) {
      toast.error(err?.message ?? 'Action failed');
    }
    setCCActionLoading(null);
  };

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

  const attentionCards = [
    data.trialsExpiringThisWeek > 0 && (
      <AttentionCard
        key="trials_expiring"
        icon={Clock}
        label="Trials Expiring"
        count={data.trialsExpiringThisWeek}
        description="Trials ending within 7 days — schedule a sales call"
        to="/admin/agents?filter=trials_expiring"
        navigate={navigate}
        tone="amber"
      />
    ),
    data.pendingListingReviews > 0 && (
      <AttentionCard
        key="listings"
        icon={ClipboardCheck}
        label="Listing Reviews"
        count={data.pendingListingReviews}
        description="Listings awaiting moderation"
        to="/admin/approvals"
        navigate={navigate}
        tone="amber"
      />
    ),
    data.pendingDemoRequests > 0 && (
      <AttentionCard
        key="demos"
        icon={Gamepad2}
        label="Demo Requests"
        count={data.pendingDemoRequests}
        description="Pending demo access requests"
        to="/admin/approvals"
        navigate={navigate}
        tone="amber"
      />
    ),
    data.openSupportTickets > 0 && (
      <AttentionCard
        key="support"
        icon={MessageSquare}
        label="Support Tickets"
        count={data.openSupportTickets}
        description="Open conversations needing a reply"
        to="/admin/approvals"
        navigate={navigate}
        tone="red"
      />
    ),
  ].filter(Boolean);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-bold text-foreground">Command Centre</h2>
          <p className="text-[11px] text-muted-foreground flex items-center gap-1">
            <Clock size={12} />
            Last updated{' '}
            {new Date(data.fetchedAt).toLocaleTimeString('en-AU', { hour: '2-digit', minute: '2-digit' })}
            <span className="ml-1 opacity-70">· auto-refreshes every 5 min</span>
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

      {/* SECTION 1 — Needs Attention */}
      <SectionHead title="Needs Attention" sub="Pending items across the platform" />
      {attentionCards.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">{attentionCards}</div>
      ) : (
        <div className="rounded-2xl border border-emerald-500/30 bg-emerald-500/10 p-4 flex items-center gap-3">
          <CheckCircle2 size={20} className="text-emerald-600 dark:text-emerald-400 shrink-0" />
          <p className="text-sm font-medium text-emerald-700 dark:text-emerald-300">
            All clear — nothing needs your attention right now.
          </p>
        </div>
      )}

      {/* PLATFORM USERS */}
      <SectionHead title="Platform Users" sub="Live counts across every account type" />
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-3">
        <button
          onClick={() => navigate('/admin/users?filter=agents')}
          className="rounded-2xl border border-border bg-card p-4 text-left hover:bg-accent transition-colors"
        >
          <p className="text-xs text-muted-foreground font-medium">Agents</p>
          <p className="text-2xl font-bold text-foreground mt-1">{data.totalAgents}</p>
          <p className="text-[11px] text-muted-foreground mt-1">
            {data.paidAgents} paid · {data.activeTrials} trial
          </p>
        </button>
        <button
          onClick={() => navigate('/admin/users?filter=seekers')}
          className="rounded-2xl border border-border bg-card p-4 text-left hover:bg-accent transition-colors"
        >
          <p className="text-xs text-muted-foreground font-medium">Seekers</p>
          <p className="text-2xl font-bold text-foreground mt-1">{data.totalSeekers}</p>
          <p className="text-[11px] text-muted-foreground mt-1">+{data.newSeekersThisWeek} this week</p>
        </button>
        <button
          onClick={() => navigate('/admin/users?filter=partners')}
          className="rounded-2xl border border-border bg-card p-4 text-left hover:bg-accent transition-colors"
        >
          <p className="text-xs text-muted-foreground font-medium">Mortgage Brokers</p>
          <p className="text-2xl font-bold text-foreground mt-1">{data.totalMortgageBrokers}</p>
          <p className="text-[11px] text-muted-foreground mt-1">partners</p>
        </button>
        <button
          onClick={() => navigate('/admin/users?filter=partners')}
          className="rounded-2xl border border-border bg-card p-4 text-left hover:bg-accent transition-colors"
        >
          <p className="text-xs text-muted-foreground font-medium">Trust Accountants</p>
          <p className="text-2xl font-bold text-foreground mt-1">{data.totalTrustAccountants}</p>
          {data.pendingPartners > 0 && (
            <p className="text-[11px] text-amber-500 mt-1">{data.pendingPartners} pending verification</p>
          )}
        </button>
        <button
          onClick={() => navigate('/admin/users?filter=demo')}
          className="rounded-2xl border border-border bg-card p-4 text-left hover:bg-accent transition-colors"
        >
          <p className="text-xs text-muted-foreground font-medium">Demo / Pending</p>
          <p className="text-2xl font-bold text-foreground mt-1">{data.totalDemoUsers}</p>
          <p className="text-[11px] text-muted-foreground mt-1">access requests</p>
        </button>
      </div>

      {data.recentUsers.length > 0 && (
        <div className="rounded-2xl border border-border bg-card p-4">
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-sm font-semibold text-foreground">Recently Joined</h3>
            <button
              onClick={() => navigate('/admin/users')}
              className="text-xs text-muted-foreground hover:text-foreground flex items-center gap-1 transition-colors"
            >
              View all <ArrowRight size={12} />
            </button>
          </div>
          <div className="space-y-2">
            {data.recentUsers.map(u => {
              const typeColors: Record<string, string> = {
                agent: 'bg-blue-500/15 text-blue-600',
                seeker: 'bg-emerald-500/15 text-emerald-600',
                partner: 'bg-violet-500/15 text-violet-600',
                demo: 'bg-amber-500/15 text-amber-600',
                demo_request: 'bg-amber-500/15 text-amber-600',
              };
              const typeLabel: Record<string, string> = {
                agent: 'Agent',
                seeker: 'Seeker',
                partner:
                  u.partnerType === 'mortgage_broker'
                    ? 'Broker'
                    : u.partnerType === 'trust_accountant'
                    ? 'Accountant'
                    : 'Partner',
                demo: 'Demo',
                demo_request: 'Demo Req',
              };
              const isLoading = ccActionLoading === u.id;
              return (
                <div
                  key={u.id}
                  className="flex items-center gap-3 py-2 border-b border-border last:border-0"
                >
                  <div className="w-8 h-8 rounded-full bg-secondary text-foreground flex items-center justify-center text-xs font-bold shrink-0">
                    {u.displayName?.[0]?.toUpperCase() ?? '?'}
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-medium text-foreground truncate">{u.email}</p>
                    <p className="text-[11px] text-muted-foreground truncate">
                      Joined {new Date(u.created_at).toLocaleDateString('en-AU')}
                      {u.lastSignIn
                        ? ` · last seen ${new Date(u.lastSignIn).toLocaleDateString('en-AU')}`
                        : ' · never logged in'}
                    </p>
                  </div>
                  <span
                    className={`text-[10px] font-medium px-2 py-0.5 rounded-full shrink-0 ${
                      typeColors[u.userType] || 'bg-secondary text-muted-foreground'
                    }`}
                  >
                    {typeLabel[u.userType] || u.userType}
                  </span>
                  <div className="flex items-center gap-1 shrink-0">
                    {startImpersonation && (
                      <button
                        disabled={isLoading}
                        onClick={() => handleImpersonate(u.id, u.email, u.displayName)}
                        title="Impersonate"
                        className="p-1.5 rounded-lg hover:bg-accent transition-colors text-muted-foreground hover:text-foreground"
                      >
                        <UserPlus size={14} />
                      </button>
                    )}
                    <button
                      disabled={isLoading}
                      onClick={() => handleCCSuspend(u)}
                      title={u.isBanned ? 'Unsuspend' : 'Suspend'}
                      className={`p-1.5 rounded-lg hover:bg-accent transition-colors ${
                        u.isBanned ? 'text-amber-500' : 'text-muted-foreground hover:text-foreground'
                      }`}
                    >
                      <Ban size={14} />
                    </button>
                    <button
                      disabled={isLoading}
                      onClick={() => setCCDeleteTarget(u)}
                      title="Delete user"
                      className="p-1.5 rounded-lg hover:bg-destructive/10 transition-colors text-muted-foreground hover:text-destructive"
                    >
                      <Trash2 size={14} />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {ccDeleteTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="bg-card border border-border rounded-2xl p-6 max-w-md w-full space-y-4">
            <h3 className="text-base font-semibold text-foreground">Delete user permanently?</h3>
            <p className="text-sm text-muted-foreground">
              This will permanently remove <strong className="text-foreground">{ccDeleteTarget.email}</strong>{' '}
              and all their data, listings, messages, and history. This cannot be undone.
            </p>
            <div className="flex justify-end gap-2 pt-2">
              <button
                onClick={() => setCCDeleteTarget(null)}
                disabled={ccDeleting}
                className="px-4 py-2 rounded-xl border border-border text-sm font-medium hover:bg-accent transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={() => handleCCDelete(ccDeleteTarget)}
                disabled={ccDeleting}
                className="px-4 py-2 rounded-xl bg-destructive text-destructive-foreground text-sm font-medium hover:bg-destructive/90 transition-colors disabled:opacity-50 flex items-center gap-2"
              >
                {ccDeleting ? (
                  <>
                    <RefreshCw size={14} className="animate-spin" /> Deleting…
                  </>
                ) : (
                  'Delete forever'
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* SECTION 2 — Revenue pulse */}
      <SectionHead title="Revenue pulse" sub="Monthly recurring revenue and conversion" />
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <KPI
          label="MRR"
          value={`$${data.mrr.toLocaleString()}`}
          icon={DollarSign}
          color={data.mrr > 0 ? 'text-emerald-500' : 'text-muted-foreground'}
          sub={
            data.mrrGrowthPct != null
              ? `${data.mrrGrowthPct >= 0 ? '+' : ''}${data.mrrGrowthPct}% vs last month`
              : 'No prev data'
          }
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
          sub={`${data.paidAgents - data.paidAgentsPrevWeek >= 0 ? '+' : ''}${data.paidAgents - data.paidAgentsPrevWeek} vs last week`}
          trend={trendFromDelta(data.paidAgents, data.paidAgentsPrevWeek)}
        />
        <KPI
          label="Conversion Rate"
          value={`${data.conversionRate}%`}
          icon={Target}
          color="text-primary"
          sub={`${(data.conversionRate - data.conversionRatePrevWeek).toFixed(1)}pp vs last week`}
          trend={trendFromDelta(data.conversionRate, data.conversionRatePrevWeek)}
        />
      </div>

      {/* Churn surfaced separately so we can keep 4-up grid above */}
      {data.churnedThisMonth > 0 && (
        <div className="rounded-2xl border border-destructive/30 bg-destructive/5 p-3 text-xs text-destructive flex items-center gap-2">
          <AlertTriangle size={14} />
          <span>
            <strong>{data.churnedThisMonth}</strong> agent{data.churnedThisMonth > 1 ? 's' : ''} churned this month
            (subscription cancelled or lapsed).
          </span>
        </div>
      )}

      {/* Revenue Forecast */}
      <SectionHead title="Revenue Forecast" sub="Projected based on current pace" />
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        <KPI
          label="Month-end MRR"
          value={`$${Math.round(data.projectedMRR).toLocaleString()}`}
          sub="projected if growth holds"
          icon={DollarSign}
        />
        <KPI
          label="Month-end ARR"
          value={`$${Math.round(data.projectedARR).toLocaleString()}`}
          sub="annualised at month-end"
          icon={TrendingUp}
        />
        <KPI
          label="12-month ARR"
          value={`$${Math.round(data.projectedARR12m).toLocaleString()}`}
          sub="at current growth rate"
          icon={Target}
        />
        <KPI
          label="MoM growth"
          value={`${(data.monthlyGrowthRate * 100).toFixed(1)}%`}
          sub={data.monthlyGrowthRate > 0 ? 'paid agents vs last month' : data.monthlyGrowthRate < 0 ? 'paid agents vs last month' : 'no change vs last month'}
          color={data.monthlyGrowthRate > 0 ? 'text-emerald-500' : data.monthlyGrowthRate < 0 ? 'text-destructive' : 'text-muted-foreground'}
          trend={data.monthlyGrowthRate > 0 ? 'up' : data.monthlyGrowthRate < 0 ? 'down' : 'flat'}
        />
      </div>

      <SectionHead title="Buyers pulse" sub="Real-time demand from property seekers" />
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-4 mb-8">
        <KPI
          label="Searches today"
          value={data.searchesToday}
          sub="text + voice combined"
        />
        <KPI
          label="Enquiries today"
          value={data.leadsToday}
          sub="messages sent to agents"
          trend={trendFromDelta(data.leadsToday, Math.round(data.leadsThisWeek / 7))}
        />
        <KPI
          label="Saves today"
          value={data.savesToday}
          sub="properties bookmarked"
        />
        <KPI
          label="Total buyers"
          value={data.totalBuyers}
          sub={`+${data.newBuyersThisWeek} this week`}
          trend={data.newBuyersThisWeek > 0 ? 'up' : 'flat'}
        />
        <KPI
          label="Top suburb"
          value={data.topSuburb ?? '—'}
          sub="most searched (7 days)"
        />
      </div>

      {/* SECTION 3 — 12-week growth chart */}
      <SectionHead title="12-Week Growth" sub="Agents, listings & leads per week" />
      <div className="rounded-2xl border border-border bg-card p-4">
        <ResponsiveContainer width="100%" height={240}>
          <AreaChart data={data.growthChart}>
            <defs>
              <linearGradient id="ccAgents" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="hsl(var(--primary))" stopOpacity={0.3} />
                <stop offset="100%" stopColor="hsl(var(--primary))" stopOpacity={0} />
              </linearGradient>
              <linearGradient id="ccListings" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#10b981" stopOpacity={0.3} />
                <stop offset="100%" stopColor="#10b981" stopOpacity={0} />
              </linearGradient>
              <linearGradient id="ccLeads" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#a855f7" stopOpacity={0.3} />
                <stop offset="100%" stopColor="#a855f7" stopOpacity={0} />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
            <XAxis dataKey="label" tick={{ fontSize: 10 }} stroke="hsl(var(--muted-foreground))" />
            <YAxis tick={{ fontSize: 10 }} stroke="hsl(var(--muted-foreground))" />
            <Tooltip
              contentStyle={{
                fontSize: 12,
                borderRadius: 12,
                border: '1px solid hsl(var(--border))',
                background: 'hsl(var(--card))',
              }}
            />
            <Area
              type="monotone"
              dataKey="agents"
              stroke="hsl(var(--primary))"
              fill="url(#ccAgents)"
              strokeWidth={2}
              name="Agents"
            />
            <Area
              type="monotone"
              dataKey="listings"
              stroke="#10b981"
              fill="url(#ccListings)"
              strokeWidth={2}
              name="Listings"
            />
            <Area
              type="monotone"
              dataKey="leads"
              stroke="#a855f7"
              fill="url(#ccLeads)"
              strokeWidth={2}
              name="Leads"
            />
          </AreaChart>
        </ResponsiveContainer>
        <div className="flex items-center gap-4 mt-3 text-[11px] text-muted-foreground flex-wrap">
          <span className="flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-primary" /> Agents
          </span>
          <span className="flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full" style={{ background: '#10b981' }} /> Listings
          </span>
          <span className="flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full" style={{ background: '#a855f7' }} /> Leads
          </span>
        </div>
      </div>

      {/* SECTION 4 — At-Risk Agents */}
      {data.atRiskAgents.length > 0 && (
        <div className="rounded-2xl border border-border bg-card p-4">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="text-sm font-semibold text-foreground">At-Risk Agents</h3>
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
              <div key={a.id} className="flex items-center justify-between gap-3">
                <div className="flex items-center gap-3 min-w-0 flex-1">
                  <div className="w-8 h-8 rounded-full bg-destructive/10 text-destructive flex items-center justify-center text-xs font-bold shrink-0">
                    {a.name?.[0]?.toUpperCase() ?? '?'}
                  </div>
                  <div className="min-w-0">
                    <p className="text-sm font-medium text-foreground truncate">{a.name}</p>
                    <p className="text-[11px] text-muted-foreground truncate">
                      {a.email}
                      {a.agency ? ` · ${a.agency}` : ''}
                    </p>
                  </div>
                </div>
                <div className="text-right shrink-0">
                  <p
                    className={`text-xs font-medium ${
                      a.daysSince > 30 ? 'text-destructive' : 'text-amber-500'
                    }`}
                  >
                    {a.daysSince === 999 ? 'Never logged in' : `${a.daysSince}d ago`}
                  </p>
                  {a.lastSeen && (
                    <p className="text-[10px] text-muted-foreground">
                      {new Date(a.lastSeen).toLocaleDateString('en-AU')}
                    </p>
                  )}
                </div>
                <div className="flex items-center gap-1.5 shrink-0">
                  {a.email && (
                    <a
                      href={`mailto:${a.email}?subject=${encodeURIComponent('We miss you on ListHQ')}`}
                      className="inline-flex items-center gap-1 text-[11px] font-medium px-2 py-1 rounded-lg border border-border hover:bg-accent transition-colors"
                    >
                      <Mail size={12} /> Email
                    </a>
                  )}
                  {startImpersonation && (
                    <button
                      onClick={() => handleImpersonate(a.id, a.email, a.name)}
                      className="inline-flex items-center gap-1 text-[11px] font-medium px-2 py-1 rounded-lg border border-border hover:bg-accent transition-colors"
                    >
                      <Eye size={12} /> Impersonate
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* SECTION 5 — Platform health */}
      <SectionHead title="Platform health" sub="Listings, engagement & activation" />
      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
        <KPI
          label="Live Listings"
          value={data.liveListings}
          icon={Building2}
          sub={`+${data.listingsThisWeek} this week`}
          color={data.listingsThisWeek > 0 ? 'text-primary' : 'text-muted-foreground'}
          trend={data.listingsThisWeek > 0 ? 'up' : 'flat'}
        />
        <KPI
          label="Avg views / listing"
          value={data.avgViewsPerListing}
          icon={Activity}
        />
        <KPI
          label="Voice searches (30d)"
          value={data.voiceSearches30d}
          icon={Zap}
          color={data.voiceSearches30d > 0 ? 'text-amber-500' : 'text-muted-foreground'}
        />
      </div>

      {data.agentsNoListings > 0 && (
        <div className="rounded-2xl border border-border bg-card p-4 flex items-center gap-3 flex-wrap">
          <div className="w-10 h-10 rounded-xl bg-amber-500/10 flex items-center justify-center shrink-0">
            <UserX size={20} className="text-amber-500" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-semibold text-foreground">
              {data.agentsNoListings} agents with no listings
            </p>
            <p className="text-[11px] text-muted-foreground">
              They signed up but haven't listed yet — reach out to activate them
            </p>
          </div>
          <button
            onClick={() =>
              navigate(
                '/admin/outreach?audience=no_listings&template=' +
                  encodeURIComponent('Get your first listing live on ListHQ'),
              )
            }
            className="inline-flex items-center gap-2 text-xs font-medium px-3 py-1.5 rounded-xl bg-primary text-primary-foreground hover:bg-primary/90 transition-colors shrink-0"
          >
            <Megaphone size={14} /> Nudge all
          </button>
        </div>
      )}

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
                    <div
                      className="h-full rounded-full bg-primary transition-all"
                      style={{ width: `${pct}%` }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* SECTION 6 — Plan mix */}
      {data.planMix.length > 0 && (
        <div className="rounded-2xl border border-border bg-card p-4">
          <p className="text-xs font-semibold text-foreground mb-3">Plan Mix</p>
          <div className="flex flex-wrap gap-3">
            {data.planMix.map(p => (
              <div
                key={p.plan}
                className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-secondary text-xs"
              >
                <span className="font-bold text-foreground">{p.count}</span>
                <span className="text-muted-foreground">{PLAN_LABEL[p.plan] || p.plan}</span>
                {p.mrr > 0 && <span className="text-emerald-500 font-medium">${p.mrr}/mo</span>}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Trial growth context (kept from prior version) */}
      <SectionHead title="Agent Growth" sub="Sign-ups and retention" />
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <KPI
          label="Total Agents"
          value={data.totalAgents}
          icon={Users}
          sub={`+${data.newAgentsToday} today`}
          color={data.newAgentsToday > 0 ? 'text-primary' : 'text-muted-foreground'}
          trend={data.newAgentsToday > 0 ? 'up' : 'flat'}
        />
        <KPI
          label="New (7d)"
          value={data.newAgentsThisWeek}
          icon={ArrowUpRight}
          sub={`${data.newAgentsThisWeek - data.newAgentsPrevWeek >= 0 ? '+' : ''}${data.newAgentsThisWeek - data.newAgentsPrevWeek} vs prev week`}
          trend={trendFromDelta(data.newAgentsThisWeek, data.newAgentsPrevWeek)}
        />
        <KPI label="New (month)" value={data.newAgentsThisMonth} icon={ArrowUpRight} />
        <KPI
          label="Trials Expiring"
          value={data.trialsExpiringThisWeek}
          icon={Clock}
          color={data.trialsExpiringThisWeek > 0 ? 'text-amber-500' : 'text-muted-foreground'}
        />
      </div>
    </div>
  );
}
