import {
  LayoutDashboard, List, Mic, BarChart3, Users, Settings, Plus, Bell, LogOut,
} from 'lucide-react';
import { useLocation, useNavigate } from 'react-router-dom';
import {
  Sidebar, SidebarContent, SidebarGroup, SidebarGroupContent, SidebarGroupLabel,
  SidebarMenu, SidebarMenuButton, SidebarMenuItem, SidebarHeader, SidebarFooter,
  SidebarTrigger, useSidebar,
} from '@/components/ui/sidebar';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';

const NAV = [
  { title: 'Dashboard', url: '/dashboard', icon: LayoutDashboard },
  { title: 'My Listings', url: '/dashboard/listings', icon: List, badge: '12' },
  { title: 'Voice Leads', url: '/dashboard/leads', icon: Mic, badge: '4' },
  { title: 'Analytics', url: '/dashboard/analytics', icon: BarChart3 },
  { title: 'Off-Market Network', url: '/dashboard/network', icon: Users },
  { title: 'Settings', url: '/dashboard/settings', icon: Settings },
];

const AgentDashboardSidebar = () => {
  const { state } = useSidebar();
  const collapsed = state === 'collapsed';
  const location = useLocation();
  const navigate = useNavigate();

  const isActive = (path: string) =>
    path === '/dashboard'
      ? location.pathname === '/dashboard'
      : location.pathname.startsWith(path);

  return (
    <Sidebar collapsible="icon" className="border-r border-border">
      <SidebarHeader className="p-4">
        {!collapsed && (
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-primary flex items-center justify-center">
              <span className="text-primary-foreground font-bold text-sm">W</span>
            </div>
            <div>
              <p className="font-display text-sm font-bold leading-none">WPP Agent</p>
              <p className="text-[10px] text-muted-foreground">Dashboard</p>
            </div>
          </div>
        )}
        {collapsed && (
          <div className="w-8 h-8 rounded-lg bg-primary flex items-center justify-center mx-auto">
            <span className="text-primary-foreground font-bold text-sm">W</span>
          </div>
        )}
      </SidebarHeader>

      <SidebarContent>
        {/* Create button */}
        <div className="px-3 mb-2">
          <Button
            size="sm"
            onClick={() => navigate('/pocket-listing')}
            className={`w-full gap-1.5 text-xs font-bold relative ${collapsed ? 'px-0 justify-center' : ''}`}
          >
            <span className="absolute -top-0.5 -right-0.5 w-2 h-2 bg-success rounded-full animate-pulse" />
            <Plus size={14} />
            {!collapsed && 'New Listing'}
          </Button>
        </div>

        <SidebarGroup>
          <SidebarGroupLabel>{!collapsed && 'Navigation'}</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {NAV.map((item) => (
                <SidebarMenuItem key={item.title}>
                  <SidebarMenuButton
                    asChild
                    isActive={isActive(item.url)}
                  >
                    <button
                      onClick={() => navigate(item.url)}
                      className={`flex items-center gap-2 w-full px-3 py-2 rounded-lg text-sm transition-colors ${
                        isActive(item.url)
                          ? 'bg-primary/10 text-primary font-medium'
                          : 'text-muted-foreground hover:text-foreground hover:bg-accent'
                      }`}
                    >
                      <item.icon size={16} className="shrink-0" />
                      {!collapsed && (
                        <>
                          <span className="flex-1 text-left">{item.title}</span>
                          {item.badge && (
                            <Badge variant="secondary" className="text-[10px] px-1.5 py-0 h-5">
                              {item.badge}
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
      </SidebarContent>

      <SidebarFooter className="p-3">
        <div className="flex items-center gap-2">
          <SidebarTrigger className="shrink-0" />
          {!collapsed && (
            <button className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors">
              <LogOut size={14} /> Sign out
            </button>
          )}
        </div>
      </SidebarFooter>
    </Sidebar>
  );
};

export default AgentDashboardSidebar;
