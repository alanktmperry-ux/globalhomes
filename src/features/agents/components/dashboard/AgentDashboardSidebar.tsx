import { useEffect, useMemo, useState } from 'react';
import {
  LayoutDashboard, List, Mic, BarChart3, Users, Settings, Plus, LogOut, Building2, UserPlus, Home,
  User, FileText, CreditCard, Star, MapPinned, Shield, Contact, Kanban, Scale, Landmark,
  ClipboardCheck, CalendarDays, Search, TrendingUp, Receipt, PartyPopper, Calculator, HelpCircle, ClipboardList, Settings2, Flame,
  Handshake, Sparkles, Target, ShoppingBag, ChevronDown, ChevronRight, Mail, Wrench, Activity, AlertCircle, RefreshCw,
  HandCoins, Briefcase, LineChart,
} from 'lucide-react';
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { useSubscription } from '@/features/agents/hooks/useSubscription';
import { useLocation, useNavigate } from 'react-router-dom';
import { useIsMobile } from '@/shared/hooks/use-mobile';
import { useAuth } from '@/features/auth/AuthProvider';
import {
  Sidebar, SidebarContent, SidebarGroup, SidebarGroupContent, SidebarGroupLabel,
  SidebarMenu, SidebarMenuButton, SidebarMenuItem, SidebarHeader, SidebarFooter,
  SidebarTrigger, useSidebar,
} from '@/components/ui/sidebar';
import { Badge } from '@/components/ui/badge';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { Button } from '@/components/ui/button';
import { supabase } from '@/integrations/supabase/client';
import { useQueryClient } from '@tanstack/react-query';
import { useCurrentAgent } from '@/features/agents/hooks/useCurrentAgent';
import { useHaloCreditsBalance } from '@/features/halo/hooks/useHaloCreditsBalance';

interface NavSection {
  title: string;
  url: string;
  icon: any;
  badgeKey?: string;
  alertWhenBadge?: boolean;
  children?: NavItem[];
}

// Six top-level sections. Each top-level item is clickable AND expands to show its sub-items.
const NAV_SECTIONS: NavSection[] = [
  {
    title: 'Dashboard',
    url: '/dashboard',
    icon: LayoutDashboard,
  },
  {
    title: 'Halo Board',
    url: '/dashboard/halo-board',
    icon: Sparkles,
    badgeKey: 'haloCredits',
  },
  {
    title: 'Listings',
    url: '/dashboard/listings',
    icon: Briefcase,
    children: [
      { title: 'Listings', url: '/dashboard/listings', icon: List, badgeKey: 'listings' },
      { title: 'Inbox', url: '/dashboard/inbox', icon: Mail, badgeKey: 'inbox', alertWhenBadge: true },
      { title: 'Contacts', url: '/dashboard/contacts', icon: Contact },
      { title: 'Leads', url: '/dashboard/crm', icon: Flame },
      { title: 'Voice Leads', url: '/dashboard/leads', icon: Mic, badgeKey: 'leads' },
      { title: 'Open Homes', url: '/dashboard/open-homes', icon: CalendarDays },
      { title: 'Settlement', url: '/dashboard/settlements', icon: PartyPopper },
    ],
  },
  {
    title: 'Property Mgmt',
    url: '/dashboard/rent-roll',
    icon: Home,
    children: [
      { title: 'Rent Roll', url: '/dashboard/rent-roll', icon: Home },
      { title: 'Rental Applications', url: '/dashboard/rental-applications', icon: ClipboardList },
      { title: 'Vacancies', url: '/dashboard/vacancies', icon: Building2 },
      { title: 'Vacancy KPIs', url: '/dashboard/vacancy-kpi', icon: Activity },
      { title: 'Maintenance', url: '/dashboard/maintenance', icon: Wrench },
      { title: 'Routine Inspections', url: '/dashboard/pm-inspections', icon: CalendarDays, badgeKey: 'disputes', alertWhenBadge: true },
      { title: 'Suppliers', url: '/dashboard/suppliers', icon: Wrench },
      { title: 'Key Register', url: '/dashboard/keys', icon: Scale },
      { title: 'Smoke Alarms', url: '/dashboard/smoke-alarms', icon: AlertCircle, badgeKey: 'smokeAlarms', alertWhenBadge: true },
    ],
  },
  {
    title: 'Trust Accounting',
    url: '/dashboard/trust',
    icon: Landmark,
    children: [
      { title: 'Trust Accounting', url: '/dashboard/trust', icon: Landmark },
      { title: 'Arrears', url: '/dashboard/arrears', icon: AlertCircle, badgeKey: 'arrears', alertWhenBadge: true },
      { title: 'Renewals Due', url: '/dashboard/rent-roll?filter=renewals', icon: RefreshCw, badgeKey: 'renewals', alertWhenBadge: true },
      { title: 'Buy Credits', url: '/dashboard/buy-credits', icon: HandCoins },
    ],
  },
  {
    title: 'Market Tools',
    url: '/dashboard/concierge',
    icon: LineChart,
    children: [
      { title: 'AI Concierge', url: '/dashboard/concierge', icon: Sparkles, badgeKey: 'buyerMatches', alertWhenBadge: true },
      { title: 'Lead Marketplace', url: '/dashboard/lead-marketplace', icon: ShoppingBag },
      { title: 'Pre-Market', url: '/dashboard/pre-market', icon: Target },
      { title: 'Off-Market Network', url: '/dashboard/network', icon: Users },
      { title: 'Opportunities', url: '/dashboard/opportunities', icon: Target },
      { title: 'Exclusive Program', url: '/exclusive/listings', icon: Star },
    ],
  },
];

interface NavItem {
  title: string;
  url: string;
  icon: any;
  badgeKey?: string;
  comingSoon?: boolean;
  alertWhenBadge?: boolean;
}

// Account & admin remain as a single Account group (not part of the 6 main sections).
const PRINCIPAL_NAV: NavItem[] = [
  { title: 'Compliance', url: '/dashboard/team?tab=compliance', icon: Shield },
  { title: 'Audit Log', url: '/dashboard/team?tab=audit', icon: ClipboardCheck },
];




const AgentDashboardSidebar = () => {
  const { state, setOpenMobile } = useSidebar();
  const collapsed = state === 'collapsed';
  const isMobile = useIsMobile();
  const location = useLocation();
  const navigate = useNavigate();
  const { signOut, isAdmin, isPrincipal, user } = useAuth();
  const { agent } = useCurrentAgent();
  const { plan } = useSubscription();
  const queryClient = useQueryClient();
  const { balance: haloCredits } = useHaloCreditsBalance();
  const [activeCount, setActiveCount] = useState(0);
  const [arrearsCount, setArrearsCount] = useState(0);
  const [renewalsCount, setRenewalsCount] = useState(0);
  const [disputeCount, setDisputeCount] = useState(0);
  const [smokeAlarmOverdue, setSmokeAlarmOverdue] = useState(0);
  const [buyerMatchesCount, setBuyerMatchesCount] = useState(0);
  const [onboardingComplete, setOnboardingComplete] = useState(true);
  const [agentLogo, setAgentLogo] = useState<string | null>(null);
  const [agentName, setAgentName] = useState<string | null>(null);
  const [agencyName, setAgencyName] = useState<string | null>(null);

  useEffect(() => {
    if (!agent?.id) return;
    const fetchActiveCount = async () => {
      const { count } = await supabase
        .from('properties')
        .select('id', { count: 'exact', head: true })
        .eq('agent_id', agent.id)
        .eq('is_active', true);

      setActiveCount(count ?? 0);
    };

    fetchActiveCount();
  }, [agent?.id]);

  useEffect(() => {
    if (!agent?.id) return;
    const fetchArrears = async () => {
      const { data: tenancies } = await supabase
        .from('tenancies').select('id, rent_amount, lease_start, lease_end, renewal_status').eq('agent_id', agent.id).eq('status', 'active');
      if (!tenancies || tenancies.length === 0) {
        setArrearsCount(0);
        setRenewalsCount(0);
        setDisputeCount(0);
        return;
      }
      const today = new Date();
      // Renewals due: lease_end within 90 days AND renewal_status none/declined/null
      const renewals = tenancies.filter((t: any) => {
        if (!t.lease_end) return false;
        const days = Math.floor((new Date(t.lease_end).getTime() - today.getTime()) / 86400000);
        if (days < 0 || days > 90) return false;
        const rs = t.renewal_status;
        return !rs || rs === 'none' || rs === 'declined';
      }).length;
      setRenewalsCount(renewals);

      const { data: payments } = await supabase
        .from('rent_payments').select('tenancy_id, period_to, status')
        .in('tenancy_id', tenancies.map(t => t.id))
        .order('payment_date', { ascending: false });
      let count = 0;
      for (const t of tenancies) {
        const latest = (payments || []).find(p => p.tenancy_id === t.id);
        if (!latest) {
          const daysSince = Math.floor((today.getTime() - new Date(t.lease_start).getTime()) / 86400000);
          if (daysSince > 3) count++;
          continue;
        }
        const daysOver = Math.floor((today.getTime() - new Date(latest.period_to).getTime()) / 86400000);
        if (daysOver > 3 && latest.status !== 'paid') count++;
      }
      setArrearsCount(count);

      // Unresolved tenant disputes on inspections
      const { count: dCount } = await supabase
        .from('property_inspections')
        .select('id', { count: 'exact', head: true })
        .not('tenant_disputed_at', 'is', null)
        .is('dispute_resolved_at', null)
        .in('tenancy_id', tenancies.map(t => t.id));
      setDisputeCount(dCount || 0);

      // Smoke alarm records overdue
      const todayStr = new Date().toISOString().split('T')[0];
      const { count: smokeCount } = await supabase
        .from('smoke_alarm_records')
        .select('id', { count: 'exact', head: true })
        .eq('agent_id', agent.id)
        .lt('next_service_due', todayStr);
      setSmokeAlarmOverdue(smokeCount || 0);
    };
    fetchArrears();
  }, [agent?.id]);

  useEffect(() => {
    setAgentLogo(agent?.company_logo_url || null);
    setAgentName(agent?.name || null);
    setAgencyName(agent?.agency_name || agent?.agency || null);
  }, [agent]);

  // Buyer-match badge count + realtime
  useEffect(() => {
    if (!agent?.id) return;
    let channel: ReturnType<typeof supabase.channel> | null = null;
    (async () => {
      const refresh = async () => {
        const { count } = await supabase
          .from('listing_buyer_matches')
          .select('id', { count: 'exact', head: true })
          .eq('agent_id', agent.id)
          .eq('status', 'new');
        setBuyerMatchesCount(count || 0);
      };
      await refresh();
      channel = supabase
        .channel('sidebar-matches-' + agent.id)
        .on('postgres_changes',
          { event: '*', schema: 'public', table: 'listing_buyer_matches', filter: `agent_id=eq.${agent.id}` },
          () => { refresh(); })
        .subscribe();
    })();
    return () => { if (channel) supabase.removeChannel(channel); };
  }, [agent?.id]);

  // Halo credits badge is provided by the shared `useHaloCreditsBalance` hook
  // (cached + realtime). The previous duplicate fetch + channel was removed
  // so the sidebar and Halo Board page share a single network call.

  // Check onboarding status
  useEffect(() => {
    setOnboardingComplete(!!agent?.onboarding_complete);
  }, [agent?.onboarding_complete]);

  const badgeValues: Record<string, string> = {
    listings: activeCount > 0 ? String(activeCount) : '',
    leads: '',
    arrears: arrearsCount > 0 ? String(arrearsCount) : '',
    renewals: renewalsCount > 0 ? String(renewalsCount) : '',
    buyerMatches: buyerMatchesCount > 0 ? String(buyerMatchesCount) : '',
    disputes: disputeCount > 0 ? String(disputeCount) : '',
    smokeAlarms: smokeAlarmOverdue > 0 ? String(smokeAlarmOverdue) : '',
    haloCredits: location.pathname.startsWith('/dashboard/halo-board') ? '' : (haloCredits > 0 ? `${haloCredits}` : ''),
  };

  const ACCOUNT_NAV: NavItem[] = [
    { title: 'Profile', url: '/dashboard/profile', icon: User },
    { title: 'My Agencies', url: '/dashboard/agencies', icon: Building2 },
    { title: 'Territory', url: '/dashboard/territory', icon: MapPinned },
    { title: 'Team', url: '/dashboard/team', icon: UserPlus },
    { title: 'Billing', url: '/dashboard/billing', icon: CreditCard },
    { title: 'Reviews', url: '/dashboard/reviews', icon: Star },
    { title: 'Settings', url: '/dashboard/settings', icon: Settings },
    { title: 'Agency Automations', url: '/dashboard/agency-automations', icon: Settings2 },
    ...(!onboardingComplete ? [{ title: 'Setup', url: '/dashboard/onboarding', icon: Settings2 }] : []),
  ];

  const ADMIN_NAV: NavItem[] = isAdmin ? [{ title: 'Admin Panel', url: '/admin', icon: Shield }] : [];

  const handleSignOut = async () => {
    await signOut();
    navigate('/');
  };

  const isActive = (path: string) => {
    if (path === '/dashboard') return location.pathname === '/dashboard';
    // For URLs with query params, match both pathname and the filter query
    if (path.includes('?')) {
      const [p, qs] = path.split('?');
      const params = new URLSearchParams(qs);
      const filter = params.get('filter');
      const currentFilter = new URLSearchParams(location.search).get('filter');
      return location.pathname === p && currentFilter === filter;
    }
    // Plain rent-roll link should NOT match when a filter is active
    if (path === '/dashboard/rent-roll') {
      return location.pathname === '/dashboard/rent-roll' && !new URLSearchParams(location.search).get('filter');
    }
    return location.pathname.startsWith(path);
  };

  // Prefetch route data when the user hovers a nav item, so by the time they
  // click, the most expensive query for that page is already in cache.
  // Currently wired for the Halo Board (4 parallel queries) — extend as needed.
  const prefetchRoute = (url: string) => {
    if (!user?.id) return;
    if (url === '/dashboard/halo-board') {
      queryClient.prefetchQuery({
        queryKey: ['halo-board-halos'],
        staleTime: 60 * 1000,
        queryFn: async () => {
          const { data } = await supabase
            .from('halos')
            .select('*')
            .eq('status', 'active')
            .order('created_at', { ascending: false });
          return data ?? [];
        },
      });
      // Warm the shared credits cache too (already cached for 5min, but safe).
      queryClient.prefetchQuery({
        queryKey: ['halo-credits-balance', user.id],
        staleTime: 5 * 60 * 1000,
        queryFn: async () => {
          const { data } = await supabase
            .from('halo_credits').select('balance').eq('agent_id', user.id).maybeSingle();
          return data?.balance ?? 0;
        },
      });
    }
  };

  // Track which top-level sections are expanded. The section containing the active
  // route is auto-expanded; users can toggle others via the chevron.
  const activeSectionTitle = useMemo(() => {
    for (const s of NAV_SECTIONS) {
      if (s.children?.some((c) => isActive(c.url))) return s.title;
      if (isActive(s.url) && s.url !== '/dashboard') return s.title;
    }
    return null;
  }, [location.pathname, location.search]);

  const [openSections, setOpenSections] = useState<Record<string, boolean>>({});
  useEffect(() => {
    if (activeSectionTitle) {
      setOpenSections((prev) => (prev[activeSectionTitle] ? prev : { ...prev, [activeSectionTitle]: true }));
    }
  }, [activeSectionTitle]);

  const toggleSection = (title: string) =>
    setOpenSections((prev) => ({ ...prev, [title]: !prev[title] }));

  const renderSection = (section: NavSection) => {
    const hasChildren = !!section.children?.length;
    const isOpen = !!openSections[section.title] || activeSectionTitle === section.title;
    const sectionActive = isActive(section.url) || (hasChildren && section.children!.some((c) => isActive(c.url)));
    const Icon = section.icon;
    const badgeVal = section.badgeKey ? badgeValues[section.badgeKey] : '';

    const handleClick = () => {
      navigate(section.url);
      if (hasChildren) toggleSection(section.title);
      if (isMobile && !hasChildren) setOpenMobile(false);
    };

    return (
      <Collapsible
        key={section.title}
        open={isOpen}
        onOpenChange={(o) => setOpenSections((p) => ({ ...p, [section.title]: o }))}
      >
        <SidebarGroup className="py-0">
          <SidebarGroupContent>
            <SidebarMenu>
              <SidebarMenuItem>
                <div
                  className={`flex items-center w-full rounded-lg transition-colors ${
                    sectionActive
                      ? 'bg-primary/10 text-primary'
                      : 'text-foreground hover:bg-accent'
                  }`}
                >
                  <button
                    onClick={handleClick}
                    onMouseEnter={() => prefetchRoute(section.url)}
                    onFocus={() => prefetchRoute(section.url)}
                    className="flex items-center gap-2 flex-1 px-3 py-2.5 text-sm font-medium text-left min-w-0"
                  >
                    <Icon size={16} className="shrink-0" />
                    {!collapsed && (
                      <>
                        <span className="flex-1 truncate">{section.title}</span>
                        {badgeVal && (
                          <Badge
                            variant={section.alertWhenBadge ? 'destructive' : 'secondary'}
                            className="text-[10px] px-1.5 py-0 h-5"
                          >
                            {badgeVal}
                          </Badge>
                        )}
                      </>
                    )}
                  </button>
                  {hasChildren && !collapsed && (
                    <CollapsibleTrigger asChild>
                      <button
                        type="button"
                        aria-label={`Toggle ${section.title}`}
                        className="px-2 py-2.5 text-muted-foreground hover:text-foreground"
                      >
                        <ChevronRight
                          size={14}
                          className={`transition-transform ${isOpen ? 'rotate-90' : ''}`}
                        />
                      </button>
                    </CollapsibleTrigger>
                  )}
                </div>
              </SidebarMenuItem>
            </SidebarMenu>
          </SidebarGroupContent>

          {hasChildren && !collapsed && (
            <CollapsibleContent>
              <SidebarGroupContent className="pl-3">
                <SidebarMenu>
                  {section.children!.map((item) => (
                    <SidebarMenuItem key={item.title + item.url}>
                      <SidebarMenuButton asChild isActive={isActive(item.url)}>
                        <button
                          onClick={() => {
                            navigate(item.url);
                            if (isMobile) setOpenMobile(false);
                          }}
                          onMouseEnter={() => prefetchRoute(item.url)}
                          className={`flex items-center gap-2 w-full px-3 py-2 rounded-lg text-[13px] transition-colors ${
                            isActive(item.url)
                              ? 'bg-primary/10 text-primary font-medium'
                              : 'text-muted-foreground hover:text-foreground hover:bg-accent'
                          }`}
                        >
                          <item.icon
                            size={14}
                            className={`shrink-0 ${
                              item.alertWhenBadge && item.badgeKey && badgeValues[item.badgeKey]
                                ? 'text-amber-600'
                                : ''
                            }`}
                          />
                          <span className={`flex-1 text-left ${
                            item.alertWhenBadge && item.badgeKey && badgeValues[item.badgeKey]
                              ? 'text-amber-700 font-medium'
                              : ''
                          }`}>{item.title}</span>
                          {item.badgeKey && badgeValues[item.badgeKey] && (
                            <Badge
                              variant={item.alertWhenBadge ? 'destructive' : 'secondary'}
                              className="text-[10px] px-1.5 py-0 h-5"
                            >
                              {badgeValues[item.badgeKey]}
                            </Badge>
                          )}
                        </button>
                      </SidebarMenuButton>
                    </SidebarMenuItem>
                  ))}
                </SidebarMenu>
              </SidebarGroupContent>
            </CollapsibleContent>
          )}
        </SidebarGroup>
      </Collapsible>
    );
  };

  const renderGroup = (label: string, items: NavItem[]) => (
    <SidebarGroup key={label}>
      <SidebarGroupLabel>{!collapsed && label}</SidebarGroupLabel>
      <SidebarGroupContent>
        <SidebarMenu>
          {items.map((item) => (
            <SidebarMenuItem key={item.title}>
              <SidebarMenuButton
                asChild
                isActive={!item.comingSoon && isActive(item.url)}
              >
                <button
                  onClick={() => {
                    if (item.comingSoon) return;
                    navigate(item.url);
                    if (isMobile) setOpenMobile(false);
                  }}
                  onMouseEnter={() => !item.comingSoon && prefetchRoute(item.url)}
                  onFocus={() => !item.comingSoon && prefetchRoute(item.url)}
                  className={`flex items-center gap-2 w-full px-3 py-2.5 rounded-lg text-sm transition-colors ${
                    item.comingSoon
                      ? 'text-muted-foreground/50 cursor-default'
                      : isActive(item.url)
                        ? 'bg-primary/10 text-primary font-medium'
                        : 'text-muted-foreground hover:text-foreground hover:bg-accent'
                  }`}
                >
                  <item.icon
                    size={16}
                    className={`shrink-0 ${
                      item.alertWhenBadge && item.badgeKey && badgeValues[item.badgeKey]
                        ? 'text-amber-600'
                        : ''
                    }`}
                  />
                  {!collapsed && (
                    <>
                      <span className={`flex-1 text-left ${
                        item.alertWhenBadge && item.badgeKey && badgeValues[item.badgeKey]
                          ? 'text-amber-700 dark:text-amber-400 font-medium'
                          : ''
                      }`}>{item.title}</span>
                      {item.comingSoon && (
                        <Badge variant="outline" className="text-[8px] px-1 py-0 h-4 border-muted-foreground/30 text-muted-foreground/50">
                          Soon
                        </Badge>
                      )}
                      {item.badgeKey && badgeValues[item.badgeKey] && (
                        <Badge
                          variant={item.alertWhenBadge ? 'destructive' : 'secondary'}
                          className="text-[10px] px-1.5 py-0 h-5"
                        >
                          {badgeValues[item.badgeKey]}
                        </Badge>
                      )}
                    </>
                  )}
                </button>
              </SidebarMenuButton>
            </SidebarMenuItem>
          ))}
        </SidebarMenu>
      </SidebarGroupContent>
    </SidebarGroup>
  );

  return (
    <Sidebar collapsible="offcanvas" className="border-r border-border">
      <SidebarHeader className="p-4">
        {!collapsed ? (
          <div className="flex flex-col gap-3">
            {/* ListHQ brand wordmark — anchors brand inside the dashboard */}
            <div className="flex items-center gap-2">
              <div className="w-6 h-6 rounded-md bg-primary flex items-center justify-center shrink-0">
                <span className="text-primary-foreground font-bold text-[10px] tracking-tight">LHQ</span>
              </div>
              <span className="font-display text-sm font-bold tracking-tight">ListHQ</span>
            </div>
            <div className="flex items-center gap-2.5">
             {agentLogo ? (
              <div className="w-16 h-16 rounded-lg border border-border bg-background flex items-center justify-center overflow-hidden shrink-0">
                <img src={agentLogo} alt="Agency logo" className="w-full h-full object-contain p-0.5" />
              </div>
            ) : (
              <div className="w-16 h-16 rounded-lg bg-primary flex items-center justify-center shrink-0">
                <span className="text-primary-foreground font-bold text-lg">L</span>
              </div>
            )}
            <div className="min-w-0">
              <p className="font-display text-sm font-bold leading-none truncate">
                {agencyName || 'ListHQ'}
              </p>
              <p className="text-[10px] text-muted-foreground truncate mt-0.5">
                {agentName || 'Agent Platform'}
              </p>
              {plan && (
                <div className="flex items-center gap-1 mt-1">
                  <Badge variant="outline" className={`text-[10px] px-1 py-0 h-4 ${
                    plan === 'solo' ? 'bg-primary/10 text-primary border-primary/20' :
                    plan === 'agency' ? 'bg-emerald-500/10 text-emerald-600 border-emerald-500/20' :
                    plan === 'agency_pro' ? 'bg-violet-500/10 text-violet-600 border-violet-500/20' :
                    plan === 'enterprise' ? 'bg-fuchsia-500/10 text-fuchsia-600 border-fuchsia-500/20' :
                    'bg-muted text-muted-foreground'
                  }`}>
                    {plan === 'demo' ? 'Demo' : plan === 'agency_pro' ? 'Agency Pro' : plan.charAt(0).toUpperCase() + plan.slice(1)}
                  </Badge>
                </div>
              )}
            </div>
          </div>
        ) : (
          agentLogo ? (
             <div className="w-[52px] h-[52px] rounded-lg border border-border bg-background flex items-center justify-center overflow-hidden mx-auto">
              <img src={agentLogo} alt="Agency logo" className="w-full h-full object-contain p-0.5" />
            </div>
          ) : (
            <div className="w-[52px] h-[52px] rounded-lg bg-primary flex items-center justify-center mx-auto">
              <span className="text-primary-foreground font-bold text-base">L</span>
            </div>
          )
        )}
      </SidebarHeader>

      <SidebarContent>
        {/* Quick actions */}
        <div className="px-3 mb-2 flex gap-1.5">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                size="sm"
                className={`flex-1 gap-1.5 text-xs font-bold relative ${collapsed ? 'px-0 justify-center' : ''}`}
              >
                <span className="absolute -top-0.5 -right-0.5 w-2 h-2 bg-success rounded-full animate-pulse" />
                <Plus size={14} />
                {!collapsed && (
                  <>
                    New Listing
                    <ChevronDown size={12} className="ml-auto" />
                  </>
                )}
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="start" className="w-48">
              <DropdownMenuItem
                onSelect={(event) => {
                  event.preventDefault();
                  localStorage.removeItem('pocket-listing-draft');
                  const ts = Date.now();
                  window.setTimeout(() => {
                    navigate('/dashboard/listings/new', { state: { type: 'sale', _ts: ts } });
                    if (isMobile) setOpenMobile(false);
                  }, 10);
                }}
              >
                <Home size={14} className="mr-2 text-primary" />
                Sale Listing
              </DropdownMenuItem>
              <DropdownMenuItem
                onSelect={(event) => {
                  event.preventDefault();
                  localStorage.removeItem('pocket-listing-draft');
                  const ts = Date.now();
                  window.setTimeout(() => {
                    navigate('/dashboard/listings/new', { state: { type: 'rental', _ts: ts } });
                    if (isMobile) setOpenMobile(false);
                  }, 10);
                }}
              >
                <Building2 size={14} className="mr-2 text-primary" />
                Rental Listing
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
          {!collapsed && (
            <Button
              size="sm"
              variant="outline"
              onClick={() => navigate('/')}
              className="gap-1.5 text-xs"
            >
              <Search size={14} />
              Market
            </Button>
          )}
        </div>

        {/* Team Overview — principals/admins only */}
        {(isPrincipal || isAdmin) && (
          <div
            onClick={() => {
              navigate('/dashboard/team-overview');
              if (isMobile) setOpenMobile(false);
            }}
            className={`flex items-center gap-2.5 px-3 py-2 mx-2 rounded-lg text-sm cursor-pointer transition-colors mb-1 ${
              location.pathname === '/dashboard/team-overview'
                ? 'bg-secondary text-foreground font-medium'
                : 'text-muted-foreground hover:bg-secondary/60 hover:text-foreground'
            }`}
          >
            <Users size={16} />
            {!collapsed && 'Team Overview'}
          </div>
        )}

        {/* 6 top-level sections — each is clickable and expands to show sub-items */}
        {NAV_SECTIONS.map((section) => renderSection(section))}

        {(isPrincipal || isAdmin) && renderGroup('Principal', PRINCIPAL_NAV)}
        {renderGroup('Account', ACCOUNT_NAV)}
        {ADMIN_NAV.length > 0 && renderGroup('Admin', ADMIN_NAV)}
      </SidebarContent>

      <SidebarFooter className="border-t border-border p-3">
        {!collapsed ? (
          <div className="flex flex-col gap-2">
            <button
              onClick={() => navigate('/dashboard/help')}
              className={`flex items-center gap-1.5 text-xs transition-colors ${
                isActive('/dashboard/help')
                  ? 'bg-primary/10 text-primary font-medium rounded-lg px-2 py-1.5'
                  : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              <HelpCircle size={14} className="shrink-0" />
              Help & FAQ
            </button>
            <div className="flex items-center gap-2">
              <SidebarTrigger className="shrink-0" />
              <button onClick={handleSignOut} className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors">
                <LogOut size={14} /> Sign out
              </button>
            </div>
          </div>
        ) : (
          <div className="flex flex-col items-center gap-2">
            <button
              onClick={() => navigate('/dashboard/help')}
              className={`p-1.5 rounded-lg transition-colors ${
                isActive('/dashboard/help')
                  ? 'bg-primary/10 text-primary'
                  : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              <HelpCircle size={16} />
            </button>
            <SidebarTrigger className="shrink-0" />
          </div>
        )}
      </SidebarFooter>
    </Sidebar>
  );
};

export default AgentDashboardSidebar;
