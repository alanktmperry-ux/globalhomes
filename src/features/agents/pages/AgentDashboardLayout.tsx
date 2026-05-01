import { useState, useEffect } from 'react';
import { SidebarProvider, SidebarTrigger } from '@/components/ui/sidebar';
import { Outlet, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '@/features/auth/AuthProvider';
import { useIsMobile } from '@/shared/hooks/use-mobile';
import { NotificationBell } from '@/features/agents/components/dashboard/NotificationBell';
import AgentDashboardSidebar from '@/features/agents/components/dashboard/AgentDashboardSidebar';
import { PaymentStatusBanner } from '@/features/agents/components/PaymentStatusBanner';
import { useCurrentAgent } from '@/features/agents/hooks/useCurrentAgent';


const AgentDashboardLayout = () => {
  const { user, impersonatedUserId } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const isMobile = useIsMobile();
  const { agent, loading: agentLoading } = useCurrentAgent();
  const [checked, setChecked] = useState(false);
  const [onboardingComplete, setOnboardingComplete] = useState(true);
  const [trustPending, setTrustPending] = useState(false);

  useEffect(() => {
    const effectiveUserId = impersonatedUserId || user?.id;
    if (!effectiveUserId || checked || agentLoading) return;

    if (!agent) {
      if (!impersonatedUserId && !location.pathname.includes('/dashboard/onboarding')) {
        navigate('/dashboard/onboarding', { replace: true });
      }
      setOnboardingComplete(false);
      setChecked(true);
      return;
    }

    const complete = !!agent.onboarding_complete;
    setOnboardingComplete(complete);
    if (!complete && !impersonatedUserId && !location.pathname.includes('/dashboard/onboarding')) {
      navigate('/dashboard/onboarding', { replace: true });
    }
    setChecked(true);
  }, [user, impersonatedUserId, checked, location.pathname, navigate, agent, agentLoading]);

  useEffect(() => {
    setTrustPending(!!agent?.trust_setup_pending);
  }, [agent?.trust_setup_pending]);


  return (
    <SidebarProvider>
      <div className="h-screen flex w-full bg-background text-foreground">
        <AgentDashboardSidebar />
        <main className="flex-1 flex flex-col min-w-0 overflow-y-auto pb-[env(safe-area-inset-bottom)]">
          <PaymentStatusBanner />
          {trustPending && (
            <div className="bg-amber-500/10 border border-amber-500/30 text-amber-600 dark:text-amber-400 text-sm px-4 py-3 flex items-center justify-between">
              <span>⚠️ Complete your trust account setup to enable rent roll and disbursements.</span>
              <a href="/dashboard/onboarding" className="underline font-semibold ml-4 shrink-0">Set up now →</a>
            </div>
          )}
          {isMobile && (
            <div className="sticky top-0 z-30 flex items-center justify-between px-3 h-12 border-b border-border bg-background/95 backdrop-blur-sm">
              <SidebarTrigger />
              <span className="text-sm font-bold tracking-tight">ListHQ</span>
              <NotificationBell />
            </div>
          )}
          <div id="main-content" className="p-4 md:p-6 flex-1">
            <Outlet />
          </div>
        </main>
      </div>
    </SidebarProvider>
  );
};

export default AgentDashboardLayout;