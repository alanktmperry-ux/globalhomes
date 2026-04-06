import { useState, useEffect } from 'react';
import { SidebarProvider, SidebarTrigger } from '@/components/ui/sidebar';
import { Outlet, useNavigate, useLocation } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/features/auth/AuthProvider';
import { useIsMobile } from '@/shared/hooks/use-mobile';
import { NotificationBell } from '@/features/agents/components/dashboard/NotificationBell';
import AgentDashboardSidebar from '@/features/agents/components/dashboard/AgentDashboardSidebar';

const AgentDashboardLayout = () => {
  const { user, impersonatedUserId } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const isMobile = useIsMobile();
  const [checked, setChecked] = useState(false);
  const [onboardingComplete, setOnboardingComplete] = useState(true);

  useEffect(() => {
    const effectiveUserId = impersonatedUserId || user?.id;
    if (!effectiveUserId || checked) return;
    const checkOnboarding = async () => {
      const { data: agent } = await supabase.from('agents').select('onboarding_complete').eq('user_id', effectiveUserId).single();
      if (agent) {
        const complete = !!(agent as any).onboarding_complete;
        setOnboardingComplete(complete);
        if (!complete && !impersonatedUserId && !location.pathname.includes('/dashboard/onboarding')) {
          navigate('/dashboard/onboarding', { replace: true });
        }
      }
      setChecked(true);
    };
    checkOnboarding();
  }, [user, impersonatedUserId, checked, location.pathname, navigate]);

  return (
    <SidebarProvider>
      <div className="h-screen flex w-full bg-background text-foreground">
        <AgentDashboardSidebar />
        <main className="flex-1 flex flex-col min-w-0 overflow-y-auto pb-[env(safe-area-inset-bottom)]">
          {isMobile && (
            <div className="sticky top-0 z-30 flex items-center justify-between px-3 h-12 border-b border-border bg-background/95 backdrop-blur-sm">
              <SidebarTrigger />
              <span className="text-sm font-bold tracking-tight">ListHQ</span>
              <NotificationBell />
            </div>
          )}
          <Outlet />
        </main>
      </div>
    </SidebarProvider>
  );
};

export default AgentDashboardLayout;