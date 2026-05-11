import { useEffect, useMemo, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/features/auth/AuthProvider';
import { useAgentListings } from '@/features/agents/hooks/useAgentListings';
import { usePageTitle } from '@/lib/usePageTitle';
import { WelcomeModal } from './WelcomeModal';
import { AgentOnboardingProgress } from '@/features/agents/components/onboarding/AgentOnboardingProgress';
import { differenceInDays, formatDistanceToNow } from 'date-fns';

// iconify-icon is a globally loaded web component (see index.html)
const Ico = ({ icon, size = 18, color, className }: { icon: string; size?: number; color?: string; className?: string }) => (
  // @ts-expect-error — iconify-icon is a web component
  <iconify-icon icon={icon} class={className} style={{ fontSize: `${size}px`, color, display: 'inline-flex', lineHeight: 1 }} />
);

interface RecentActivity {
  id: string;
  action?: string;
  entity_type?: string;
  entity_id?: string;
  description?: string;
  created_at: string;
  metadata?: any;
}

interface BoostedListing {
  id: string;
  display_address: string;
  display_suburb: string;
  display_state: string;
  display_price: string;
  display_image_url: string | null;
  boost_ends_at: string | null;
}

const AUD = new Intl.NumberFormat('en-AU', { style: 'currency', currency: 'AUD', minimumFractionDigits: 0 });

const formatAUDate = (d: Date) =>
  d.toLocaleDateString('en-AU', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });

const ACTIVITY_ICON: Record<string, string> = {
  enquiry: 'solar:chat-round-line-linear',
  lead: 'solar:chat-round-line-linear',
  save: 'solar:heart-linear',
  saved: 'solar:heart-linear',
  view: 'solar:eye-linear',
  viewed: 'solar:eye-linear',
  match: 'solar:users-group-rounded-linear',
  boost: 'solar:bolt-bold',
  sold: 'solar:tag-price-linear',
  listed: 'solar:buildings-linear',
  default: 'solar:bell-linear',
};

const activityIconFor = (a: RecentActivity) => {
  const k = (a.action || '').toLowerCase();
  if (ACTIVITY_ICON[k]) return ACTIVITY_ICON[k];
  if (k.includes('save')) return ACTIVITY_ICON.save;
  if (k.includes('view')) return ACTIVITY_ICON.view;
  if (k.includes('match')) return ACTIVITY_ICON.match;
  if (k.includes('enqu') || k.includes('lead') || k.includes('message')) return ACTIVITY_ICON.enquiry;
  return ACTIVITY_ICON.default;
};

const activityLabel = (a: RecentActivity) => {
  if (a.description) return a.description;
  const action = a.action || 'Activity';
  const ent = a.entity_type || '';
  return `${action.charAt(0).toUpperCase() + action.slice(1)}${ent ? ` · ${ent}` : ''}`;
};

interface StatCardProps {
  icon: string;
  iconColor?: string;
  label: string;
  value: string | number;
  trendDir?: 'up' | 'down' | 'flat';
  trendValue?: string;
}

const StatCard = ({ icon, iconColor = '#2563EB', label, value, trendDir, trendValue }: StatCardProps) => {
  const trendStyles =
    trendDir === 'up'
      ? { bg: 'bg-[#ECFDF5]', text: 'text-[#065F46]', arrow: 'solar:arrow-up-linear' }
      : trendDir === 'down'
      ? { bg: 'bg-[#FEF2F2]', text: 'text-[#991B1B]', arrow: 'solar:arrow-down-linear' }
      : { bg: 'bg-[#F3F4F6]', text: 'text-[#374151]', arrow: 'solar:minus-linear' };

  return (
    <div className="bg-white rounded-3xl border border-[#E5E5E5] p-6 transition-all hover:border-[#2563EB]/40 hover:shadow-[0_8px_24px_rgba(0,0,0,0.04)]">
      <div className="flex items-center gap-2">
        <Ico icon={icon} size={18} color={iconColor} />
        <span className="text-[11px] uppercase tracking-[0.12em] text-[#6a6a6a] font-bold">{label}</span>
      </div>
      <div className="text-[44px] font-extrabold text-[#0a0f1e] tabular-nums leading-none mt-3">{value}</div>
      {trendDir && (
        <div className="mt-4 flex items-center gap-2">
          <span className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-[11px] font-bold ${trendStyles.bg} ${trendStyles.text}`}>
            <Ico icon={trendStyles.arrow} size={12} />
            {trendValue || ''}
          </span>
          <span className="text-[11px] text-[#6a6a6a]">vs last month</span>
        </div>
      )}
    </div>
  );
};

interface QuickAction {
  title: string;
  subtitle: string;
  icon: string;
  iconBg: string;
  iconColor: string;
  to: string;
}

const QUICK_ACTIONS: QuickAction[] = [
  { title: 'Add a new listing', subtitle: 'Create a property in minutes', icon: 'solar:add-square-bold', iconBg: '#EFF6FF', iconColor: '#2563EB', to: '/dashboard/listings/new' },
  { title: 'Browse Halo Board', subtitle: 'Find buyer briefs for your suburbs', icon: 'solar:streets-bold', iconBg: '#ECFDF5', iconColor: '#065F46', to: '/dashboard/halo-board' },
  { title: 'View buyer pipeline', subtitle: 'See where each lead is up to', icon: 'solar:users-group-rounded-bold', iconBg: '#FFFBEB', iconColor: '#92400E', to: '/dashboard/crm' },
  { title: 'Boost a listing', subtitle: 'Get featured placement', icon: 'solar:bolt-bold', iconBg: '#FAF5FF', iconColor: '#6B21A8', to: '/dashboard/listings' },
];

const DashboardOverview = () => {
  usePageTitle('Dashboard');
  const { user } = useAuth();
  const navigate = useNavigate();
  const { listings } = useAgentListings();

  const [agentName, setAgentName] = useState<string | null>(null);
  const [agentId, setAgentId] = useState<string | null>(null);

  const [activeListings, setActiveListings] = useState(0);
  const [activeListingsPrev, setActiveListingsPrev] = useState(0);
  const [hotLeads, setHotLeads] = useState(0);
  const [hotLeadsPrev, setHotLeadsPrev] = useState(0);
  const [buyerMatches, setBuyerMatches] = useState(0);
  const [buyerMatchesPrev, setBuyerMatchesPrev] = useState(0);
  const [haloCredits, setHaloCredits] = useState(0);

  const [recentActivities, setRecentActivities] = useState<RecentActivity[]>([]);
  const [boostedListings, setBoostedListings] = useState<BoostedListing[]>([]);

  const WELCOME_KEY = 'listhq_agent_welcomed';
  const [showWelcome, setShowWelcome] = useState(() => {
    try { return !localStorage.getItem(WELCOME_KEY); } catch { return false; }
  });
  const dismissWelcome = () => {
    try { localStorage.setItem(WELCOME_KEY, '1'); } catch { /* noop */ }
    setShowWelcome(false);
  };

  useEffect(() => {
    if (!user) return;
    let cancelled = false;

    const load = async () => {
      const thirtyDaysAgo = new Date(Date.now() - 30 * 86400000).toISOString();
      const sixtyDaysAgo = new Date(Date.now() - 60 * 86400000).toISOString();

      const agentRes = await supabase
        .from('agents')
        .select('id, name')
        .eq('user_id', user.id)
        .maybeSingle();
      if (cancelled) return;
      const aId = agentRes.data?.id ?? null;
      setAgentId(aId);
      setAgentName(agentRes.data?.name ?? null);

      if (!aId) return;

      const [
        activeListingsRes,
        prevListingsRes,
        hotLeadsRes,
        prevHotLeadsRes,
        matchesRes,
        prevMatchesRes,
        creditsRes,
        activitiesRes,
        boostedRes,
      ] = await Promise.all([
        supabase.from('properties').select('id', { count: 'exact', head: true }).eq('agent_id', aId).eq('is_active', true),
        supabase.from('properties').select('id', { count: 'exact', head: true }).eq('agent_id', aId).eq('is_active', true).lt('created_at', thirtyDaysAgo),
        supabase.from('leads').select('id', { count: 'exact', head: true }).eq('agent_id', aId).gte('score', 70).gte('created_at', thirtyDaysAgo),
        supabase.from('leads').select('id', { count: 'exact', head: true }).eq('agent_id', aId).gte('score', 70).gte('created_at', sixtyDaysAgo).lt('created_at', thirtyDaysAgo),
        supabase.from('listing_buyer_matches').select('id', { count: 'exact', head: true }).eq('agent_id', aId),
        supabase.from('listing_buyer_matches').select('id', { count: 'exact', head: true }).eq('agent_id', aId).lt('created_at', thirtyDaysAgo),
        supabase.from('halo_credits').select('balance').eq('agent_id', user.id).maybeSingle(),
        supabase.from('activities').select('*').eq('user_id', user.id).order('created_at', { ascending: false }).limit(6),
        supabase
          .from('featured_listings')
          .select('id, display_address, display_suburb, display_state, display_price, display_image_url, boost_ends_at')
          .eq('agent_id', aId)
          .gt('boost_ends_at', new Date().toISOString())
          .order('boost_ends_at', { ascending: true })
          .limit(12),
      ]);
      if (cancelled) return;

      setActiveListings(activeListingsRes.count || 0);
      setActiveListingsPrev(prevListingsRes.count || 0);
      setHotLeads(hotLeadsRes.count || 0);
      setHotLeadsPrev(prevHotLeadsRes.count || 0);
      setBuyerMatches(matchesRes.count || 0);
      setBuyerMatchesPrev(prevMatchesRes.count || 0);
      setHaloCredits(Number((creditsRes.data as any)?.balance) || 0);
      setRecentActivities((activitiesRes.data as any) || []);
      setBoostedListings((boostedRes.data as any) || []);
    };

    load().catch(() => { /* silent */ });
    return () => { cancelled = true; };
  }, [user]);

  const firstName = useMemo(() => {
    const first = agentName?.trim().split(/\s+/)[0];
    if (!first) return 'Agent';
    return first.charAt(0).toUpperCase() + first.slice(1).toLowerCase();
  }, [agentName]);

  const today = useMemo(() => formatAUDate(new Date()), []);

  const trend = (curr: number, prev: number): { dir: 'up' | 'down' | 'flat'; value: string } | undefined => {
    if (!prev && !curr) return undefined;
    if (prev === curr) return { dir: 'flat', value: '0%' };
    if (!prev) return { dir: 'up', value: 'New' };
    const pct = Math.round(((curr - prev) / prev) * 100);
    if (pct === 0) return { dir: 'flat', value: '0%' };
    return { dir: pct > 0 ? 'up' : 'down', value: `${Math.abs(pct)}%` };
  };

  const listingsTrend = trend(activeListings, activeListingsPrev);
  const hotLeadsTrend = trend(hotLeads, hotLeadsPrev);
  const matchesTrend = trend(buyerMatches, buyerMatchesPrev);

  return (
    <div>
      {showWelcome && agentName && <WelcomeModal agentName={agentName} onClose={dismissWelcome} />}
      <div className="p-4 sm:p-6 md:px-10 md:pt-8 max-w-[1280px]">
        {/* Greeting */}
        <div>
          <h1 className="font-extrabold tracking-[-0.04em] text-[#0a0f1e]" style={{ fontSize: 'clamp(36px, 5vw, 56px)', lineHeight: 1.05 }}>
            Welcome back, {firstName}.
          </h1>
          <p className="text-[14px] text-[#6a6a6a] font-medium mt-2">{today}</p>
        </div>

        <AgentOnboardingProgress />

        {/* Stat cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5 mt-10">
          <StatCard
            icon="solar:buildings-linear"
            label="Active Listings"
            value={activeListings}
            trendDir={listingsTrend?.dir}
            trendValue={listingsTrend?.value}
          />
          <StatCard
            icon="solar:flame-bold"
            iconColor="#F59E0B"
            label="Hot Leads"
            value={hotLeads}
            trendDir={hotLeadsTrend?.dir}
            trendValue={hotLeadsTrend?.value}
          />
          <StatCard
            icon="solar:users-group-rounded-linear"
            label="Buyer Matches"
            value={buyerMatches}
            trendDir={matchesTrend?.dir}
            trendValue={matchesTrend?.value}
          />
          <StatCard
            icon="solar:bolt-bold"
            label="Halo Credits"
            value={haloCredits}
          />
        </div>

        {/* Two-column section */}
        <div className="grid grid-cols-1 lg:grid-cols-[1.6fr_1fr] gap-6 mt-8">
          {/* Recent activity */}
          <div className="bg-white rounded-3xl border border-[#E5E5E5] p-7">
            <div className="flex items-center justify-between mb-5">
              <h2 className="text-[20px] font-bold text-[#0a0f1e]">Recent activity</h2>
              <Link to="/dashboard/activity" className="text-[13px] text-[#2563EB] font-bold hover:underline">
                View all
              </Link>
            </div>
            {recentActivities.length === 0 ? (
              <div className="py-10 text-center">
                <div className="flex justify-center mb-3">
                  <Ico icon="solar:bell-linear" size={40} color='#E5E7EB' />
                </div>
                <div className="text-[15px] font-bold text-[#0a0f1e]">No recent activity</div>
                <div className="text-[13px] text-[#6a6a6a] mt-1 max-w-sm mx-auto">
                  Activity will appear here as agents and buyers interact with your listings.
                </div>
              </div>
            ) : (
              <div>
                {recentActivities.map((a) => (
                  <div key={a.id} className="flex items-center gap-3 py-4 border-b border-[#F3F4F6] last:border-0">
                    <div className="w-9 h-9 rounded-full bg-[#EFF6FF] flex items-center justify-center text-[#2563EB] shrink-0">
                      <Ico icon={activityIconFor(a)} size={18} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="text-[14px] text-[#0a0f1e] font-medium truncate">{activityLabel(a)}</div>
                      {a.entity_type && (
                        <div className="text-[12px] text-[#6a6a6a] truncate">{a.entity_type}</div>
                      )}
                    </div>
                    <div className="text-[12px] text-[#9CA3AF] shrink-0">
                      {formatDistanceToNow(new Date(a.created_at), { addSuffix: true })
                        .replace('about ', '')
                        .replace(' ago', ' ago')}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Quick actions */}
          <div className="flex flex-col gap-3">
            {QUICK_ACTIONS.map((a) => (
              <button
                key={a.title}
                onClick={() => navigate(a.to)}
                className="group bg-white rounded-3xl border border-[#E5E5E5] p-5 text-left transition-all hover:border-[#2563EB] hover:shadow-[0_8px_24px_rgba(37,99,235,0.06)] flex items-center gap-4"
              >
                <div
                  className="w-12 h-12 rounded-2xl flex items-center justify-center shrink-0"
                  style={{ background: a.iconBg, color: a.iconColor }}
                >
                  <Ico icon={a.icon} size={22} />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="text-[15px] font-bold text-[#0a0f1e]">{a.title}</div>
                  <div className="text-[12px] text-[#6a6a6a] mt-1">{a.subtitle}</div>
                </div>
                <span className="text-[#6a6a6a] transition-transform group-hover:translate-x-1 shrink-0">
                  <Ico icon="solar:arrow-right-linear" size={20} />
                </span>
              </button>
            ))}
          </div>
        </div>

        {/* Boosted listings strip */}
        <div className="mt-10">
          <h2 className="text-[20px] font-bold text-[#0a0f1e] mb-5">Your boosted listings</h2>
          {boostedListings.length === 0 ? (
            <button
              onClick={() => navigate('/dashboard/listings')}
              className="min-w-[280px] w-full sm:w-[320px] bg-white rounded-3xl border border-dashed border-[#D1D5DB] p-8 text-center hover:border-[#2563EB] transition-all block"
            >
              <div className="flex justify-center mb-3">
                <Ico icon="solar:bolt-bold" size={32} color='#9CA3AF' />
              </div>
              <div className="text-[14px] font-bold text-[#0a0f1e]">No active boosts yet</div>
              <div className="text-[13px] text-[#2563EB] font-bold mt-2">Boost a listing →</div>
            </button>
          ) : (
            <div className="flex gap-4 overflow-x-auto pb-3 -mx-4 sm:-mx-6 md:-mx-10 px-4 sm:px-6 md:px-10 snap-x">
              {boostedListings.map((b) => {
                const daysRemaining = b.boost_ends_at
                  ? Math.max(0, differenceInDays(new Date(b.boost_ends_at), new Date()))
                  : 0;
                return (
                  <div
                    key={b.id}
                    className="min-w-[280px] max-w-[280px] bg-white rounded-3xl border border-[#E5E5E5] overflow-hidden snap-start"
                  >
                    <div className="aspect-[16/10] bg-[#F3F4F6] overflow-hidden">
                      {b.display_image_url ? (
                        <img
                          src={b.display_image_url}
                          alt={b.display_address}
                          className="w-full h-full object-cover"
                          loading="lazy"
                        />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center">
                          <Ico icon="solar:buildings-linear" size={40} color='#D1D5DB' />
                        </div>
                      )}
                    </div>
                    <div className="p-4">
                      <div className="inline-block text-[10px] uppercase tracking-[0.12em] text-[#2563EB] font-bold px-2 py-0.5 rounded-full bg-[#EFF6FF]">
                        {b.display_suburb}
                      </div>
                      <div className="text-[14px] font-bold text-[#0a0f1e] mt-2 truncate">{b.display_address}</div>
                      <div className="text-[14px] text-[#0a0f1e] tabular-nums mt-1">{b.display_price}</div>
                      <div className="flex items-center gap-2 mt-3 text-[12px] text-[#6a6a6a]">
                        <Ico icon="solar:bolt-bold" size={14} color='#2563EB' />
                        <span>Boosted in {b.display_suburb}</span>
                        <span className="ml-auto font-bold text-[#0a0f1e]">{daysRemaining}d left</span>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default DashboardOverview;
