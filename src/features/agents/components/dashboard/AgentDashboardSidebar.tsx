import { useEffect, useState } from 'react';
import {
  LayoutDashboard, List, Mic, BarChart3, Users, Settings, Plus, LogOut, Building2, UserPlus, Home,
  User, FileText, CreditCard, Star, MapPinned, Shield, Contact, Kanban, Scale, Landmark,
  ClipboardCheck, CalendarDays, Search, TrendingUp, Receipt, PartyPopper, Calculator, HelpCircle, ClipboardList, Settings2, Flame,
  Handshake,
} from 'lucide-react';
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
import { useAgentListings } from '@/features/agents/hooks/useAgentListings';
import { supabase } from '@/integrations/supabase/client';

interface NavItem {
  title: string;
  url: string;
  icon: any;
  badgeKey?: string;
  comingSoon?: boolean;
}

const SALES_NAV: NavItem[] = [
  { title: 'My Listings', url: '/dashboard/listings', icon: List, badgeKey: 'listings' },
  { title: 'Contacts', url: '/dashboard/contacts', icon: Contact },
  { title: 'Pipeline', url: '/dashboard/pipeline', icon: Kanban },
  { title: 'Voice Leads', url: '/dashboard/leads', icon: Mic, badgeKey: 'leads' },
  { title: 'Off-Market Network', url: '/dashboard/network', icon: Users },
];

const PROPERTY_NAV: NavItem[] = [
  { title: 'Rent Roll', url: '/dashboard/rent-roll', icon: Home, badgeKey: 'rentRoll' },
  { title: 'Applications', url: '/dashboard/rental-applications', icon: ClipboardList },
  { title: 'Inspection Day', url: '/dashboard/inspection-mode', icon: CalendarDays },
  { title: 'Trust Accounting', url: '/dashboard/trust', icon: Landmark },
  { title: 'Settlement', url: '/dashboard/settlements', icon: PartyPopper },
];

const INSIGHTS_NAV: NavItem[] = [
  { title: 'Analytics', url: '/dashboard/analytics', icon: BarChart3 },
  { title: 'Reports', url: '/dashboard/reports', icon: FileText },
  { title: 'Commission', url: '/dashboard/commission', icon: Calculator },
];




const AgentDashboardSidebar = () => {
  const { state } = useSidebar();
  const collapsed = state === 'collapsed';
  const isMobile = useIsMobile();
  const { setOpenMobile } = useSidebar();
  const location = useLocation();
  const navigate = useNavigate();
  const { signOut, isAdmin, user } = useAuth();
  const { listings } = useAgentListings();
  const { plan, foundingMember } = useSubscription();
  const [arrearsCount, setArrearsCount] = useState(0);
  const [onboardingComplete, setOnboardingComplete] = useState(true);
  const [agentLogo, setAgentLogo] = useState<string | null>(null);
  const [agentName, setAgentName] = useState<string | null>(null);
  const [agencyName, setAgencyName] = useState<string | null>(null);

  useEffect(() => {
    if (!user) return;
    const fetchArrears = async () => {
      const { data: agent } = await supabase.from('agents').select('id').eq('user_id', user.id).single();
      if (!agent) return;
      const { data: tenancies } = await supabase
        .from('tenancies').select('id, rent_amount, lease_start').eq('agent_id', agent.id).eq('status', 'active');
      if (!tenancies || tenancies.length === 0) return;
      const { data: payments } = await supabase
        .from('rent_payments').select('tenancy_id, period_to, status')
        .in('tenancy_id', tenancies.map(t => t.id))
        .order('payment_date', { ascending: false });
      const today = new Date();
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
  }, [user]);

  useEffect(() => {
    if (!user) return;
    const fetchAgentInfo = () => {
      supabase
        .from('agents')
        .select('company_logo_url, name, agency, agency_id')
        .eq('user_id', user.id)
        .single()
        .then(async ({ data }) => {
          if (data) {
            setAgentLogo(data.company_logo_url || null);
            setAgentName(data.name || null);
            // Prefer agency name from agencies table if linked
            if (data.agency_id) {
              const { data: agencyData } = await supabase
                .from('agencies')
                .select('name')
                .eq('id', data.agency_id)
                .single();
              setAgencyName(agencyData?.name || data.agency || null);
            } else {
              setAgencyName(data.agency || null);
            }
          }
        });
    };
    fetchAgentInfo();
    // Refetch when navigating back to catch profile edits
    const interval = setInterval(fetchAgentInfo, 30000);
    return () => clearInterval(interval);
  }, [user, location.pathname]);

  // Check onboarding status
  useEffect(() => {
    if (!user) return;
    const checkOnboarding = async () => {
      const { data: agent } = await supabase.from('agents').select('onboarding_complete').eq('user_id', user.id).single();
      if (agent) setOnboardingComplete(!!(agent as any).onboarding_complete);
    };
    checkOnboarding();
  }, [user]);

  const activeCount = listings.filter(l => ('_mock_status' in l ? l._mock_status !== 'sold' : (l as any).status !== 'sold')).length;

  const badgeValues: Record<string, string> = {
    listings: activeCount > 0 ? String(activeCount) : '',
    leads: '',
    rentRoll: arrearsCount > 0 ? String(arrearsCount) : '',
  };

  const ACCOUNT_NAV: NavItem[] = [
    { title: 'Profile', url: '/dashboard/profile', icon: User },
    { title: 'My Agencies', url: '/dashboard/agencies', icon: Building2 },
    { title: 'Territory', url: '/dashboard/territory', icon: MapPinned },
    { title: 'Team', url: '/dashboard/team', icon: UserPlus },
    { title: 'Partner Access', url: '/dashboard/partner-access', icon: Handshake },
    { title: 'Billing', url: '/dashboard/billing', icon: CreditCard },
    { title: 'Reviews', url: '/dashboard/reviews', icon: Star },
    { title: 'Settings', url: '/dashboard/settings', icon: Settings },
    ...(!onboardingComplete ? [{ title: 'Setup', url: '/dashboard/onboarding', icon: Settings2 }] : []),
  ];

  const ADMIN_NAV: NavItem[] = isAdmin ? [{ title: 'Admin Panel', url: '/admin', icon: Shield }] : [];

  const handleSignOut = async () => {
    await signOut();
    navigate('/');
  };

  const isActive = (path: string) =>
    path === '/dashboard'
      ? location.pathname === '/dashboard'
      : location.pathname.startsWith(path);

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
                  <item.icon size={16} className="shrink-0" />
                  {!collapsed && (
                    <>
                      <span className="flex-1 text-left">{item.title}</span>
                      {item.comingSoon && (
                        <Badge variant="outline" className="text-[8px] px-1 py-0 h-4 border-muted-foreground/30 text-muted-foreground/50">
                          Soon
                        </Badge>
                      )}
                      {item.badgeKey && badgeValues[item.badgeKey] && (
                        <Badge variant="secondary" className="text-[10px] px-1.5 py-0 h-5">
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
                    plan === 'pro' ? 'bg-primary/10 text-primary border-primary/20' :
                    plan === 'agency' ? 'bg-emerald-500/10 text-emerald-600 border-emerald-500/20' :
                    plan === 'enterprise' ? 'bg-violet-500/10 text-violet-600 border-violet-500/20' :
                    'bg-muted text-muted-foreground'
                  }`}>
                    {plan === 'demo' ? 'Demo' : plan.charAt(0).toUpperCase() + plan.slice(1)}
                  </Badge>
                  {foundingMember && <Flame size={10} className="text-amber-500" />}
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
          <Button
            size="sm"
            onClick={() => {
              navigate('/pocket-listing');
              if (isMobile) setOpenMobile(false);
            }}
            className={`flex-1 gap-1.5 text-xs font-bold relative ${collapsed ? 'px-0 justify-center' : ''}`}
          >
            <span className="absolute -top-0.5 -right-0.5 w-2 h-2 bg-success rounded-full animate-pulse" />
            <Plus size={14} />
            {!collapsed && 'New Listing'}
          </Button>
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

        <div
          onClick={() => navigate('/dashboard')}
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
