import { useEffect, useState } from 'react';
import {
  LayoutDashboard, List, Mic, BarChart3, Users, Settings, Plus, LogOut, Building2, UserPlus, Home,
  User, FileText, CreditCard, Star, MapPinned, Shield, Contact, Kanban, Scale, Landmark,
  ClipboardCheck, CalendarDays, Search, TrendingUp, Receipt, PartyPopper, Calculator, HelpCircle, ClipboardList, Settings2, Flame,
  Handshake, Sparkles, Target, ShoppingBag, ChevronDown, Mail, Wrench, Activity, AlertCircle, RefreshCw,
  HandCoins,
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
import { Button } from '@/components/ui/button';
import { supabase } from '@/integrations/supabase/client';
import { useCurrentAgent } from '@/features/agents/hooks/useCurrentAgent';

interface NavItem {
  title: string;
  url: string;
  icon: any;
  badgeKey?: string;
  comingSoon?: boolean;
  alertWhenBadge?: boolean; // when true, badge uses red/amber styling and icon coloring
}

const SALES_NAV: NavItem[] = [
  { title: 'My Listings', url: '/dashboard/listings', icon: List, badgeKey: 'listings' },
  { title: 'Inbox', url: '/dashboard/inbox', icon: Mail, badgeKey: 'inbox', alertWhenBadge: true },
  { title: 'Contacts', url: '/dashboard/contacts', icon: Contact },
  { title: 'Listings', url: '/dashboard/pipeline', icon: Kanban },
  { title: 'Leads', url: '/dashboard/crm', icon: Flame },
  { title: 'Voice Leads', url: '/dashboard/leads', icon: Mic, badgeKey: 'leads' },
  { title: 'AI Concierge', url: '/dashboard/concierge', icon: Sparkles, badgeKey: 'buyerMatches', alertWhenBadge: true },
  { title: 'Lead Marketplace', url: '/dashboard/lead-marketplace', icon: ShoppingBag },
  { title: 'Pre-Market', url: '/dashboard/pre-market', icon: Target },
  { title: 'Off-Market Network', url: '/dashboard/network', icon: Users },
  { title: 'Opportunities', url: '/dashboard/opportunities', icon: Target },
  { title: 'Exclusive Program', url: '/exclusive/listings', icon: Star },
  { title: 'Open Homes', url: '/dashboard/open-homes', icon: CalendarDays },
  { title: 'Settlement', url: '/dashboard/settlements', icon: PartyPopper },
];

const PROPERTY_NAV_URGENT: NavItem[] = [
  { title: 'Arrears', url: '/dashboard/rent-roll?filter=arrears', icon: AlertCircle, badgeKey: 'arrears', alertWhenBadge: true },
  { title: 'Renewals Due', url: '/dashboard/rent-roll?filter=renewals', icon: RefreshCw, badgeKey: 'renewals', alertWhenBadge: true },
];

const PROPERTY_NAV_TENANCY: NavItem[] = [
  { title: 'Rent Roll', url: '/dashboard/rent-roll', icon: Home },
  { title: 'Rental Applications', url: '/dashboard/rental-applications', icon: ClipboardList },
  { title: 'Vacancies', url: '/dashboard/vacancies', icon: Building2 },
  { title: 'Vacancy KPIs', url: '/dashboard/vacancy-kpi', icon: Activity },
];

const PROPERTY_NAV_OPERATIONS: NavItem[] = [
  { title: 'Maintenance', url: '/dashboard/maintenance', icon: Wrench },
  { title: 'Routine Inspections', url: '/dashboard/pm-inspections', icon: CalendarDays },
  { title: 'Suppliers', url: '/dashboard/suppliers', icon: Wrench },
  { title: 'Key Register', url: '/dashboard/keys', icon: Scale },
];

const PROPERTY_NAV_FINANCE: NavItem[] = [
  { title: 'Trust Accounting', url: '/dashboard/trust', icon: Landmark },
  { title: 'Statements', url: '/dashboard/statements', icon: Receipt },
  { title: 'Automation', url: '/dashboard/automation', icon: Mail },
  { title: 'Partner Access', url: '/dashboard/partner-access', icon: Handshake },
];

const INSIGHTS_NAV: NavItem[] = [
  { title: 'Performance', url: '/dashboard/performance', icon: TrendingUp },
  { title: 'Analytics', url: '/dashboard/analytics', icon: BarChart3 },
  { title: 'Reports', url: '/dashboard/reports', icon: FileText },
  { title: 'Commission', url: '/dashboard/commission', icon: Calculator },
  { title: 'Conveyancing', url: '/conveyancing', icon: FileText },
  { title: 'Broker Referrals', url: '/dashboard/broker-referrals', icon: HandCoins },
  { title: 'Referral Program', url: '/refer', icon: Handshake },
];

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
  const { signOut, isAdmin, isPrincipal } = useAuth();
  const { agent } = useCurrentAgent();
  const { plan } = useSubscription();
  const [activeCount, setActiveCount] = useState(0);
  const [arrearsCount, setArrearsCount] = useState(0);
  const [renewalsCount, setRenewalsCount] = useState(0);
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

        <div
          onClick={() => {
            navigate('/dashboard');
            if (isMobile) setOpenMobile(false);
          }}
          className={`flex items-center gap-2.5 px-3 py-2 mx-2 rounded-lg text-sm cursor-pointer transition-colors mb-1 ${
            location.pathname === '/dashboard'
              ? 'bg-secondary text-foreground font-medium'
              : 'text-muted-foreground hover:bg-secondary/60 hover:text-foreground'
          }`}
        >
          <LayoutDashboard size={16} />
          {!collapsed && 'Dashboard'}
        </div>

        {renderGroup('Sales', SALES_NAV)}
        {renderGroup('Property Management', PROPERTY_NAV)}
        {renderGroup('Insights', INSIGHTS_NAV)}
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
