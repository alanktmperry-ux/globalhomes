import { useState, useEffect, Suspense } from 'react';
import { SidebarProvider, SidebarTrigger } from '@/components/ui/sidebar';
import { Outlet, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '@/features/auth/AuthProvider';
import { useIsMobile } from '@/shared/hooks/use-mobile';
import { NotificationBell } from '@/features/agents/components/dashboard/NotificationBell';
import AgentDashboardSidebar from '@/features/agents/components/dashboard/AgentDashboardSidebar';
import { PaymentStatusBanner } from '@/features/agents/components/PaymentStatusBanner';
import { useCurrentAgent } from '@/features/agents/hooks/useCurrentAgent';
import { PageSkeleton } from '@/shared/components/PageSkeleton';
import { MFAChallenge } from '@/features/auth/components/MFAChallenge';
import { supabase } from '@/integrations/supabase/client';


const AgentDashboardLayout = () => {
  const { user, impersonatedUserId } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const isMobile = useIsMobile();
  const { agent, loading: agentLoading } = useCurrentAgent();
  const [checked, setChecked] = useState(false);
  const [onboardingComplete, setOnboardingComplete] = useState(true);
  const [trustPending, setTrustPending] = useState(false);
  const [mfaRequired, setMfaRequired] = useState(false);
  const [mfaChecked, setMfaChecked] = useState(false);

  // Check Authenticator Assurance Level — if user enrolled TOTP but session is still aal1, gate the dashboard.
  useEffect(() => {
    if (!user || impersonatedUserId) { setMfaRequired(false); setMfaChecked(true); return; }
    let cancelled = false;
    (async () => {
      try {
        const { data, error } = await supabase.auth.mfa.getAuthenticatorAssuranceLevel();
        if (cancelled) return;
        if (error) { setMfaRequired(false); return; }
        // nextLevel === 'aal2' && currentLevel === 'aal1' means a verified factor exists but hasn't been satisfied for this session.
        setMfaRequired(data.currentLevel === 'aal1' && data.nextLevel === 'aal2');
      } finally {
        if (!cancelled) setMfaChecked(true);
      }
    })();
    const { data: sub } = supabase.auth.onAuthStateChange((event) => {
      if (event === 'MFA_CHALLENGE_VERIFIED' || event === 'SIGNED_IN' || event === 'TOKEN_REFRESHED') {
        supabase.auth.mfa.getAuthenticatorAssuranceLevel().then(({ data }) => {
          if (!data) return;
          setMfaRequired(data.currentLevel === 'aal1' && data.nextLevel === 'aal2');
        });
      }
    });
    return () => { cancelled = true; sub.subscription.unsubscribe(); };
  }, [user, impersonatedUserId]);

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


  if (mfaChecked && mfaRequired) {
    return <MFAChallenge />;
  }

  return (
    <SidebarProvider>
      <div className="h-screen flex w-full bg-background text-foreground">
        <AgentDashboardSidebar />
        <main id="main-content" className="flex-1 flex flex-col min-w-0 overflow-y-auto pb-[env(safe-area-inset-bottom)]">
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
            <Suspense fallback={<PageSkeleton />}>
              <Outlet />
            </Suspense>
          </div>
        </main>
      </div>
    </SidebarProvider>
  );
};

export default AgentDashboardLayout;