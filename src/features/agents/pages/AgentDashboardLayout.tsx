import { useState, useEffect } from 'react';
import { SidebarProvider, SidebarTrigger } from '@/components/ui/sidebar';
import { Outlet, useNavigate, useLocation } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/features/auth/AuthProvider';
import { useIsMobile } from '@/shared/hooks/use-mobile';
import { NotificationBell } from '@/features/agents/components/dashboard/NotificationBell';
import AgentDashboardSidebar from '@/features/agents/components/dashboard/AgentDashboardSidebar';
import { PaymentStatusBanner } from '@/features/agents/components/PaymentStatusBanner';
import { Clock, XCircle } from 'lucide-react';

const AgentDashboardLayout = () => {
  const { user, impersonatedUserId } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const isMobile = useIsMobile();
  const [checked, setChecked] = useState(false);
  const [onboardingComplete, setOnboardingComplete] = useState(true);
  const [trustPending, setTrustPending] = useState(false);
  const [approvalStatus, setApprovalStatus] = useState<string | null>(null);

  useEffect(() => {
    const effectiveUserId = impersonatedUserId || user?.id;
    if (!effectiveUserId || checked) return;
    const checkOnboarding = async () => {
      const { data: agent } = await supabase.from('agents').select('onboarding_complete, approval_status').eq('user_id', effectiveUserId).maybeSingle();
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
      setApprovalStatus((agent as any).approval_status ?? null);
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

  // Approval gate — only for non-impersonated users after check completes
  if (checked && !impersonatedUserId) {
    if (approvalStatus === 'pending') {
      return (
        <div className="min-h-screen flex items-center justify-center bg-background px-4">
          <div className="max-w-md text-center space-y-4">
            <div className="mx-auto w-16 h-16 rounded-full bg-amber-100 dark:bg-amber-900/30 flex items-center justify-center">
              <Clock className="w-8 h-8 text-amber-600 dark:text-amber-400" />
            </div>
            <h1 className="text-2xl font-bold text-foreground">Account Under Review</h1>
            <p className="text-muted-foreground">
              Your agent account is currently being reviewed by our team. You'll receive an email once approved — usually within 1 business day.
            </p>
            <p className="text-sm text-muted-foreground">
              Questions? Contact <a href="mailto:support@listhq.com.au" className="underline">support@listhq.com.au</a>
            </p>
          </div>
        </div>
      );
    }
    if (approvalStatus === 'rejected') {
      return (
        <div className="min-h-screen flex items-center justify-center bg-background px-4">
          <div className="max-w-md text-center space-y-4">
            <div className="mx-auto w-16 h-16 rounded-full bg-red-100 dark:bg-red-900/30 flex items-center justify-center">
              <XCircle className="w-8 h-8 text-red-600 dark:text-red-400" />
            </div>
            <h1 className="text-2xl font-bold text-foreground">Application Not Approved</h1>
            <p className="text-muted-foreground">
              Unfortunately your agent application was not approved at this time. Please contact our support team to discuss.
            </p>
            <p className="text-sm text-muted-foreground">
              Contact <a href="mailto:support@listhq.com.au" className="underline">support@listhq.com.au</a>
            </p>
          </div>
        </div>
      );
    }
  }

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