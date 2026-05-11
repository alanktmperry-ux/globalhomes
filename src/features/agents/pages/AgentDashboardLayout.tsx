import { useState, useEffect, Suspense, useMemo } from 'react';
import { SidebarProvider, SidebarTrigger } from '@/components/ui/sidebar';
import { Outlet, useNavigate, useLocation, Link } from 'react-router-dom';
import { Search } from 'lucide-react';
import { useAuth } from '@/features/auth/AuthProvider';
import { useIsMobile } from '@/shared/hooks/use-mobile';
import { NotificationBell } from '@/features/agents/components/dashboard/NotificationBell';
import AgentDashboardSidebar from '@/features/agents/components/dashboard/AgentDashboardSidebar';
import { DashboardBottomTabs } from '@/features/agents/components/dashboard/DashboardBottomTabs';
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
  const [showMfaPromo, setShowMfaPromo] = useState(false);
  const [paymentBannerVisible, setPaymentBannerVisible] = useState(false);

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
        // If session is fully at aal2 already, no promo needed. If nextLevel === currentLevel === 'aal1', no factor enrolled — show promo (unless dismissed).
        if (data.currentLevel === 'aal1' && data.nextLevel === 'aal1') {
          if (sessionStorage.getItem('mfa_promo_dismissed') !== '1') {
            const { data: factors } = await supabase.auth.mfa.listFactors();
            const hasMfa = factors?.totp?.some((f) => f.status === 'verified');
            if (!cancelled && !hasMfa) setShowMfaPromo(true);
          }
        }
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

  // Breadcrumbs: derive from path segments
  const breadcrumbs = useMemo(() => {
    const segments = location.pathname.split('/').filter(Boolean);
    return segments.map((seg, i) => ({
      label: seg
        .replace(/-/g, ' ')
        .replace(/\b\w/g, (c) => c.toUpperCase()),
      href: '/' + segments.slice(0, i + 1).join('/'),
    }));
  }, [location.pathname]);

  if (mfaChecked && mfaRequired) {
    return <MFAChallenge />;
  }

  const agentInitials = (agent?.name || user?.email || 'A')
    .split(/\s+/)
    .map((s) => s[0])
    .join('')
    .slice(0, 2)
    .toUpperCase();

  return (
    <SidebarProvider style={{ ['--sidebar-width' as string]: '260px' }}>
      <div
        data-aplus-shell="1"
        className="h-screen flex w-full text-foreground relative"
        style={{ background: '#F9FAFB' }}
      >
        <AgentDashboardSidebar />
        <main id="main-content" className="relative z-10 flex-1 flex flex-col min-w-0 overflow-y-auto pb-[env(safe-area-inset-bottom)]" style={{ background: '#F9FAFB' }}>
          <PaymentStatusBanner onVisibleChange={setPaymentBannerVisible} />
          {!paymentBannerVisible && trustPending && (
            <div className="bg-amber-500/10 border border-amber-500/30 text-amber-600 text-sm px-4 py-3 flex items-center justify-between">
              <span> Complete your trust account setup to enable rent roll and disbursements.</span>
              <a href="/dashboard/onboarding" className="underline font-semibold ml-4 shrink-0">Set up now →</a>
            </div>
          )}
          {!paymentBannerVisible && !trustPending && showMfaPromo && (
            <div className="bg-primary/10 border-b border-primary/20 text-sm px-4 py-3 flex items-center justify-between gap-4">
              <span className="text-foreground">
                 Protect your account — enable two-factor authentication.
              </span>
              <div className="flex items-center gap-2 shrink-0">
                <a
                  href="/dashboard/settings?tab=security"
                  className="underline font-semibold text-primary"
                >
                  Set up now →
                </a>
                <button
                  onClick={() => { sessionStorage.setItem('mfa_promo_dismissed', '1'); setShowMfaPromo(false); }}
                  className="text-muted-foreground hover:text-foreground px-2"
                  aria-label="Dismiss"
                >
                  ×
                </button>
              </div>
            </div>
          )}
          {isMobile ? (
            <div className="sticky top-0 z-30 flex items-center justify-between px-3 h-12 border-b border-border bg-background/95 backdrop-blur-sm">
              <SidebarTrigger />
              <span className="text-sm font-bold tracking-tight">ListHQ</span>
              <NotificationBell />
            </div>
          ) : (
            <header
              className="sticky top-0 z-30 h-16 bg-white border-b flex items-center justify-between px-8"
              style={{ borderColor: '#E5E5E5' }}
            >
              <nav aria-label="Breadcrumb" className="flex items-center gap-2 text-[14px] min-w-0">
                {breadcrumbs.map((b, i) => {
                  const isLast = i === breadcrumbs.length - 1;
                  return (
                    <span key={b.href} className="flex items-center gap-2 min-w-0">
                      {i > 0 && <span className="text-[#9CA3AF]">/</span>}
                      {isLast ? (
                        <span className="font-bold text-[#0a0f1e] truncate">{b.label}</span>
                      ) : (
                        <Link to={b.href} className="text-[#6a6a6a] hover:text-[#0a0f1e] truncate">
                          {b.label}
                        </Link>
                      )}
                    </span>
                  );
                })}
              </nav>
              <div className="flex items-center gap-3 shrink-0">
                <label className="relative hidden md:flex items-center">
                  <Search size={14} className="absolute left-3 text-[#9CA3AF]" />
                  <input
                    type="search"
                    placeholder="Search…"
                    className="rounded-full bg-[#F9FAFB] border border-[#E5E5E5] w-72 h-9 pl-9 pr-4 text-[13px] text-[#0a0f1e] placeholder:text-[#9CA3AF] focus:outline-none focus:border-[#2563EB] transition-colors"
                  />
                </label>
                <NotificationBell />
                <Link
                  to="/dashboard/profile"
                  className="w-11 h-11 rounded-full bg-gradient-to-br from-[#2563EB] to-[#1E40AF] flex items-center justify-center text-white text-[13px] font-bold hover:opacity-90 transition-opacity"
                  aria-label="View profile"
                >
                  {agentInitials}
                </Link>
              </div>
            </header>
          )}
          <div className="p-4 md:p-6 flex-1 pb-20 lg:pb-6">
            <Suspense fallback={<PageSkeleton />}>
              <Outlet />
            </Suspense>
          </div>
        </main>
        <DashboardBottomTabs />
      </div>
    </SidebarProvider>
  );
};

export default AgentDashboardLayout;