import { useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Sparkles, Check, CheckCircle2, X, Loader2, ExternalLink } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useCurrentAgent } from '@/features/agents/hooks/useCurrentAgent';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import DashboardHeader from './DashboardHeader';
import { cn } from '@/lib/utils';
import { usePageTitle } from '@/lib/usePageTitle';
import { useSubscription } from '@/features/agents/hooks/useSubscription';
import { TrialCountdown } from './TrialCountdown';

interface Plan {
  id: 'starter' | 'pro' | 'agency';
  /** Plan id used by the create-subscription-checkout edge function. */
  backendPlanId: 'solo' | 'agency' | 'agency_pro';
  name: string;
  founding: number;
  full: number;
  popular?: boolean;
  features: string[];
}

const PLANS: Plan[] = [
  {
    id: 'starter',
    backendPlanId: 'solo',
    name: 'Starter',
    founding: 299,
    full: 499,
    features: [
      'Up to 20 listings',
      'Multilingual listing generator (10 languages)',
      'Halo buyer matching',
      'Basic CRM',
    ],
  },
  {
    id: 'pro',
    backendPlanId: 'agency',
    name: 'Pro',
    founding: 599,
    full: 999,
    popular: true,
    features: [
      'Up to 75 listings',
      'Everything in Starter',
      'Trust accounting (AFA compliant)',
      'Priority buyer match notifications',
      'PDF trust statements',
    ],
  },
  {
    id: 'agency',
    backendPlanId: 'agency_pro',
    name: 'Agency',
    founding: 1199,
    full: 1999,
    features: [
      'Unlimited listings',
      'Everything in Pro',
      'Multi-agent team access',
      'Xero integration (coming soon)',
      'Dedicated onboarding support',
    ],
  },
];

const SUPPORT_EMAIL = 'alan@squaredevelopment.com.au';

const PLAN_ID_TO_FRONTEND: Record<string, Plan['id']> = {
  solo: 'starter',
  agency: 'pro',
  agency_pro: 'agency',
};

function formatTrialExpiry(createdAt: string | null | undefined): string | null {
  if (!createdAt) return null;
  const created = new Date(createdAt);
  if (isNaN(created.getTime())) return null;
  const expiry = new Date(created.getTime() + 60 * 24 * 60 * 60 * 1000);
  return expiry.toLocaleDateString('en-AU', { day: 'numeric', month: 'long', year: 'numeric' });
}

export default function BillingPage() {
  usePageTitle('Billing & Pricing');
  const { agent } = useCurrentAgent();
  const { trialEndsAt } = useSubscription();
  const [searchParams, setSearchParams] = useSearchParams();
  const [loadingPlan, setLoadingPlan] = useState<string | null>(null);
  const [portalLoading, setPortalLoading] = useState(false);

  const rawPlan = (agent as any)?.subscription_plan as string | null | undefined;
  const currentFrontendPlan = rawPlan ? PLAN_ID_TO_FRONTEND[rawPlan] ?? null : null;
  const isSubscribed = !!agent?.is_subscribed;
  const trialEndDate = !isSubscribed
    ? (trialEndsAt
        ?? (agent?.created_at
              ? new Date(new Date(agent.created_at).getTime() + 60 * 24 * 60 * 60 * 1000).toISOString()
              : null))
    : null;
  const showSuccess = searchParams.get('success') === 'true';
  const showCancelled = searchParams.get('cancelled') === 'true';

  async function subscribe(plan: Plan) {
    try {
      setLoadingPlan(plan.id);
      const { data, error } = await supabase.functions.invoke('create-subscription-checkout', {
        body: { planId: plan.backendPlanId, annual: false },
      });
      if (error) throw error;
      if (data?.url) {
        window.location.href = data.url;
        return;
      }
      throw new Error(data?.error ?? 'Could not start checkout');
    } catch (e: any) {
      toast.error(e?.message ?? 'Something went wrong starting checkout');
      setLoadingPlan(null);
    }
  }

  async function openPortal() {
    try {
      setPortalLoading(true);
      const { data, error } = await supabase.functions.invoke('create-billing-portal', {});
      if (error) throw error;
      if (data?.url) {
        window.location.href = data.url;
        return;
      }
      throw new Error(data?.error ?? 'Could not open billing portal');
    } catch (e: any) {
      toast.error(e?.message ?? 'Could not open billing portal');
      setPortalLoading(false);
    }
  }

  function dismissBanner() {
    searchParams.delete('success');
    searchParams.delete('cancelled');
    setSearchParams(searchParams, { replace: true });
  }

  return (
    <div>
      <DashboardHeader title="Billing & Plans" subtitle="Choose the plan that fits your business." />

      <div className="p-4 sm:p-6 max-w-6xl mx-auto space-y-6">
        {showSuccess && (
          <div className="rounded-xl border border-success/30 bg-success/10 p-4 flex items-start gap-3">
            <div className="w-8 h-8 rounded-full bg-success/20 flex items-center justify-center shrink-0">
              <CheckCircle2 size={18} className="text-success" />
            </div>
            <div className="flex-1">
              <p className="font-semibold text-foreground">Subscription activated</p>
              <p className="text-sm text-muted-foreground">Welcome to ListHQ. Your account is now fully active.</p>
            </div>
            <button onClick={dismissBanner} className="text-muted-foreground hover:text-foreground" aria-label="Dismiss">
              <X size={16} />
            </button>
          </div>
        )}
        {showCancelled && (
          <div className="rounded-xl border border-border bg-muted/40 p-4 flex items-start gap-3">
            <p className="text-sm text-foreground flex-1">Checkout cancelled. Your account is unchanged.</p>
            <button onClick={dismissBanner} className="text-muted-foreground hover:text-foreground" aria-label="Dismiss">
              <X size={16} />
            </button>
          </div>
        )}

        {/* Current plan summary */}
        <div className="rounded-xl border border-border bg-card p-5 flex items-start justify-between gap-4 flex-wrap">
          <div>
            <p className="text-sm text-muted-foreground">Current plan</p>
            <p className="text-lg font-semibold text-foreground capitalize">
              {currentFrontendPlan ?? 'Free Trial'}
            </p>
            {trialEndDate && (
              <TrialCountdown trialEndsAt={trialEndDate} className="mt-1" />
            )}
          </div>
          {isSubscribed && (
            <Button variant="outline" size="sm" onClick={openPortal} disabled={portalLoading}>
              {portalLoading ? <Loader2 size={14} className="animate-spin mr-2" /> : <ExternalLink size={14} className="mr-2" />}
              Manage subscription
            </Button>
          )}
        </div>

        {/* Founding member banner */}
        <div className="rounded-xl border border-primary/30 bg-primary/5 p-5 flex items-start gap-4">
          <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
            <Sparkles size={20} className="text-primary" />
          </div>
          <div>
            <h2 className="font-semibold text-foreground">Founding Member Pricing</h2>
            <p className="text-sm text-muted-foreground">
              Lock in discounted rates permanently — available to the first 50 agents only.
            </p>
          </div>
        </div>

        {/* Plan cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {PLANS.map((plan) => {
            const isCurrent = currentFrontendPlan === plan.id;
            const isLoading = loadingPlan === plan.id;
            return (
              <div
                key={plan.id}
                className={cn(
                  'rounded-xl border bg-card p-5 flex flex-col',
                  isCurrent ? 'border-primary ring-2 ring-primary/40' : 'border-border'
                )}
              >
                <div className="flex items-center justify-between mb-3">
                  <h3 className="font-semibold text-base text-foreground">{plan.name}</h3>
                  {plan.popular && !isCurrent && (
                    <Badge className="bg-primary text-primary-foreground hover:bg-primary">
                      Most popular
                    </Badge>
                  )}
                  {isCurrent && (
                    <Badge variant="outline" className="border-primary text-primary">
                      Current plan
                    </Badge>
                  )}
                </div>

                <div className="mb-1">
                  <span className="text-3xl font-bold text-foreground">${plan.founding}</span>
                  <span className="text-sm text-muted-foreground">/month</span>
                </div>
                <p className="text-xs text-muted-foreground line-through mb-4">
                  ${plan.full}/mo full price
                </p>

                <ul className="space-y-2 mb-5 flex-1">
                  {plan.features.map((f) => (
                    <li key={f} className="flex items-start gap-2 text-sm text-foreground">
                      <Check size={14} className="text-primary mt-0.5 shrink-0" />
                      <span>{f}</span>
                    </li>
                  ))}
                </ul>

                {isCurrent ? (
                  <Button variant="outline" disabled className="w-full">
                    Current plan
                  </Button>
                ) : (
                  <Button
                    className="w-full"
                    onClick={() => subscribe(plan)}
                    disabled={isLoading || loadingPlan !== null}
                  >
                    {isLoading ? (
                      <><Loader2 size={14} className="animate-spin mr-2" /> Redirecting…</>
                    ) : (
                      <>Subscribe now →</>
                    )}
                  </Button>
                )}
              </div>
            );
          })}
        </div>

        {/* FAQ row */}
        <div className="rounded-xl border border-border bg-card p-5 space-y-2">
          <h3 className="font-semibold text-sm text-foreground">Questions about pricing?</h3>
          <p className="text-sm text-muted-foreground">
            Email{' '}
            <a href={`mailto:${SUPPORT_EMAIL}`} className="text-primary hover:underline">
              {SUPPORT_EMAIL}
            </a>{' '}
            or call during business hours.
          </p>
          <p className="text-xs text-muted-foreground">
            Founding member pricing is locked for life — it never increases as long as your subscription stays active.
          </p>
        </div>
      </div>
    </div>
  );
}
