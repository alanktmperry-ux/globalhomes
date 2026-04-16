import { useState, useEffect } from 'react';
import { SidebarProvider, SidebarTrigger } from '@/components/ui/sidebar';
import { Outlet, useNavigate, useLocation } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/features/auth/AuthProvider';
import { useIsMobile } from '@/shared/hooks/use-mobile';
import { NotificationBell } from '@/features/agents/components/dashboard/NotificationBell';
import AgentDashboardSidebar from '@/features/agents/components/dashboard/AgentDashboardSidebar';
import { PaymentStatusBanner } from '@/features/agents/components/PaymentStatusBanner';


const AgentDashboardLayout = () => {
  const { user, impersonatedUserId } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const isMobile = useIsMobile();
  const [checked, setChecked] = useState(false);
  const [onboardingComplete, setOnboardingComplete] = useState(true);
  const [trustPending, setTrustPending] = useState(false);

  useEffect(() => {
    const effectiveUserId = impersonatedUserId || user?.id;
    if (!effectiveUserId || checked) return;
    const checkOnboarding = async () => {
      const { data: agent } = await supabase.from('agents').select('onboarding_complete').eq('user_id', effectiveUserId).maybeSingle();
      if (!agent) {
        if (!impersonatedUserId && !location.pathname.includes('/dashboard/onboarding')) {
          navigate('/dashboard/onboarding', { replace: true });
        }
        setOnboardingComplete(false);
        setChecked(true);
        return;
      }
      const complete = !!(agent as any).onboarding_complete;
      setOnboardingComplete(complete);
      if (!complete && !impersonatedUserId && !location.pathname.includes('/dashboard/onboarding')) {
        navigate('/dashboard/onboarding', { replace: true });
      }
      setChecked(true);
    };
    checkOnboarding();
  }, [user, impersonatedUserId, checked, location.pathname, navigate]);

  useEffect(() => {
    const effectiveUserId = impersonatedUserId || user?.id;
    if (!effectiveUserId) return;
    supabase.from('agents').select('trust_setup_pending').eq('user_id', effectiveUserId).maybeSingle()
      .then(({ data }) => {
        if ((data as any)?.trust_setup_pending) setTrustPending(true);
      });
  }, [user?.id, impersonatedUserId]);


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
          <div className="p-4 md:p-6 flex-1">
            <Outlet />
          </div>
        </main>
      </div>
    </SidebarProvider>
  );
};

export default AgentDashboardLayout;