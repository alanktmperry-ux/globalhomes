import {
  LayoutDashboard, List, Mic, BarChart3, Users, Settings, Plus, LogOut, Building2, UserPlus,
  User, FileText, CreditCard, Star, MapPinned, Shield, Contact, Kanban, Scale, Landmark,
  ClipboardCheck, CalendarDays, Search, TrendingUp, Receipt,
} from 'lucide-react';
import { useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '@/lib/AuthProvider';
import {
  Sidebar, SidebarContent, SidebarGroup, SidebarGroupContent, SidebarGroupLabel,
  SidebarMenu, SidebarMenuButton, SidebarMenuItem, SidebarHeader, SidebarFooter,
  SidebarTrigger, useSidebar,
} from '@/components/ui/sidebar';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { useAgentListings } from '@/hooks/useAgentListings';

interface NavItem {
  title: string;
  url: string;
  icon: any;
  badgeKey?: string;
  comingSoon?: boolean;
}

const CORE_NAV: NavItem[] = [
  { title: 'Dashboard', url: '/dashboard', icon: LayoutDashboard },
  { title: 'Profile', url: '/dashboard/profile', icon: User },
  { title: 'Territory', url: '/dashboard/territory', icon: MapPinned },
];

const CRM_NAV: NavItem[] = [
  { title: 'Contacts', url: '/dashboard/contacts', icon: Contact },
  { title: 'Pipeline', url: '/dashboard/pipeline', icon: Kanban, comingSoon: true },
  { title: 'My Listings', url: '/dashboard/listings', icon: List, badgeKey: 'listings' },
  { title: 'Voice Leads', url: '/dashboard/leads', icon: Mic, badgeKey: 'leads' },
];

const BUSINESS_NAV: NavItem[] = [
  { title: 'Investments', url: '/dashboard/investments', icon: TrendingUp },
  { title: 'Trust Accounting', url: '/dashboard/trust', icon: Landmark },
  { title: 'Trust Ledger', url: '/dashboard/trust-ledger', icon: Receipt },
  { title: 'Reconciliation', url: '/dashboard/reconciliation', icon: Scale },
  { title: 'Compliance', url: '/dashboard/compliance', icon: ClipboardCheck, comingSoon: true },
  { title: 'Analytics', url: '/dashboard/analytics', icon: BarChart3 },
  { title: 'Reports', url: '/dashboard/reports', icon: FileText },
];

const TEAM_NAV: NavItem[] = [
  { title: 'Off-Market Network', url: '/dashboard/network', icon: Users },
  { title: 'Team', url: '/dashboard/team', icon: UserPlus },
  { title: 'My Agencies', url: '/dashboard/agencies', icon: Building2 },
];

const ACCOUNT_NAV: NavItem[] = [
  { title: 'Documents', url: '/dashboard/documents', icon: FileText },
  { title: 'Billing', url: '/dashboard/billing', icon: CreditCard },
  { title: 'Reviews', url: '/dashboard/reviews', icon: Star },
  { title: 'Settings', url: '/dashboard/settings', icon: Settings },
];

const AgentDashboardSidebar = () => {
  const { state } = useSidebar();
  const collapsed = state === 'collapsed';
  const location = useLocation();
  const navigate = useNavigate();
  const { signOut, isAdmin } = useAuth();
  const { listings } = useAgentListings();

  const activeCount = listings.filter(l => ('_mock_status' in l ? l._mock_status !== 'sold' : (l as any).status !== 'sold')).length;

  const badgeValues: Record<string, string> = {
    listings: String(activeCount),
    leads: '3',
  };

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
                  onClick={() => !item.comingSoon && navigate(item.url)}
                  className={`flex items-center gap-2 w-full px-3 py-2 rounded-lg text-sm transition-colors ${
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
    <Sidebar collapsible="icon" className="border-r border-border">
      <SidebarHeader className="p-4">
        {!collapsed ? (
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-primary flex items-center justify-center">
              <span className="text-primary-foreground font-bold text-sm">G</span>
            </div>
            <div>
              <p className="font-display text-sm font-bold leading-none">Global Homes</p>
              <p className="text-[10px] text-muted-foreground">Agent CRM</p>
            </div>
          </div>
        ) : (
          <div className="w-8 h-8 rounded-lg bg-primary flex items-center justify-center mx-auto">
            <span className="text-primary-foreground font-bold text-sm">G</span>
          </div>
        )}
      </SidebarHeader>

      <SidebarContent>
        {/* Quick actions */}
        <div className="px-3 mb-2 flex gap-1.5">
          <Button
            size="sm"
            onClick={() => navigate('/pocket-listing')}
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

        {renderGroup('Core', CORE_NAV)}
        {renderGroup('CRM', CRM_NAV)}
        {renderGroup('Business', BUSINESS_NAV)}
        {renderGroup('Team & Network', TEAM_NAV)}
        {renderGroup('Account', ACCOUNT_NAV)}
        {ADMIN_NAV.length > 0 && renderGroup('Admin', ADMIN_NAV)}
      </SidebarContent>

      <SidebarFooter className="p-3">
        <div className="flex items-center gap-2">
          <SidebarTrigger className="shrink-0" />
          {!collapsed && (
            <button onClick={handleSignOut} className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors">
              <LogOut size={14} /> Sign out
            </button>
          )}
        </div>
      </SidebarFooter>
    </Sidebar>
  );
};

export default AgentDashboardSidebar;
