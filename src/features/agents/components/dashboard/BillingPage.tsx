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
      'Multilingual listing generator (30+ languages)',
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

const SUPPORT_EMAIL = 'hello@listhq.com.au';

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

  const currentPlanMeta = currentFrontendPlan ? PLANS.find(p => p.id === currentFrontendPlan) : null;
  const currentPlanLabel = currentFrontendPlan
    ? `${currentPlanMeta?.name ?? currentFrontendPlan} Plan`.toUpperCase()
    : 'FREE TRIAL';
  const currentPlanPrice = currentPlanMeta ? `$${currentPlanMeta.founding}` : '$0';

  return (
    <div className="p-4 sm:p-6 max-w-6xl mx-auto">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-[#0a0f1e] tracking-tight">Billing &amp; Plans</h1>
        <p className="text-sm font-light text-[#6B7280] mt-1">Choose the plan that fits your business.</p>
      </div>

      <div className="space-y-6">
        {showSuccess && (
          <div
            className="rounded-[12px] p-4 flex items-start gap-3 bg-[#ECFDF5]"
            style={{ border: '1px solid rgba(52,211,153,0.30)' }}
          >
            <div className="w-8 h-8 rounded-full bg-[#34D399]/20 flex items-center justify-center shrink-0">
              <CheckCircle2 size={18} className="text-[#065F46]" />
            </div>
            <div className="flex-1">
              <p className="text-sm font-bold text-[#065F46]">Subscription activated</p>
              <p className="text-xs text-[#065F46]/80 mt-0.5">Welcome to ListHQ. Your account is now fully active.</p>
            </div>
            <button onClick={dismissBanner} className="text-[#6B7280] hover:text-[#0a0f1e]" aria-label="Dismiss">
              <X size={16} />
            </button>
          </div>
        )}
        {showCancelled && (
          <div
            className="rounded-[12px] p-4 flex items-start gap-3 bg-[#F9FAFB]"
            style={{ border: '1px solid #E5E7EB' }}
          >
            <p className="text-sm text-[#374151] flex-1">Checkout cancelled. Your account is unchanged.</p>
            <button onClick={dismissBanner} className="text-[#6B7280] hover:text-[#0a0f1e]" aria-label="Dismiss">
              <X size={16} />
            </button>
          </div>
        )}

        {/* Current plan card — dark with blue glow */}
        <div className="bg-[#0a0f1e] rounded-[12px] p-6 text-white relative overflow-hidden">
          <div
            className="absolute top-0 right-0 w-64 h-64 rounded-full blur-3xl opacity-30 pointer-events-none"
            style={{ background: '#2563EB' }}
          />
          <div className="relative z-10">
            <span
              className="inline-flex items-center px-2.5 py-1 rounded-full text-[10px] font-semibold uppercase mb-4"
              style={{ background: 'rgba(37,99,235,0.30)', color: '#93C5FD', letterSpacing: '0.10em' }}
            >
              {currentPlanLabel}
            </span>
            <div className="text-2xl font-bold mb-1 capitalize">{currentPlanMeta?.name ?? 'Free Trial'}</div>
            <div className="flex items-baseline gap-2">
              <span className="text-4xl font-bold tabular-nums">{currentPlanPrice}</span>
              {currentPlanMeta && <span className="text-sm font-light text-white/60">/ month</span>}
            </div>
            {trialEndDate && (
              <div className="mt-3">
                <TrialCountdown trialEndsAt={trialEndDate} className="" />
              </div>
            )}
            {isSubscribed && (
              <button
                onClick={openPortal}
                disabled={portalLoading}
                className="bg-white text-[#0a0f1e] hover:bg-white/95 font-semibold rounded-[10px] px-4 py-2 text-sm mt-5 inline-flex items-center gap-2 transition-all disabled:opacity-60"
              >
                {portalLoading
                  ? <Loader2 size={14} className="animate-spin" />
                  : <ExternalLink size={14} />}
                Manage subscription
              </button>
            )}
          </div>
        </div>

        {/* Founding member banner */}
        <div
          className="bg-[#EFF6FF] rounded-[12px] p-5 flex items-start gap-4"
          style={{ border: '1px solid #DBEAFE' }}
        >
          <div className="w-10 h-10 rounded-[10px] bg-white flex items-center justify-center shrink-0">
            <Sparkles size={20} className="text-[#2563EB]" />
          </div>
          <div>
            <h2 className="text-sm font-bold text-[#1E40AF]">Founding Member Pricing</h2>
            <p className="text-xs text-[#1E40AF]/80 mt-1 font-light">
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
                className="bg-white rounded-[12px] p-6 flex flex-col"
                style={{
                  border: isCurrent ? '2px solid #2563EB' : '1px solid #E5E7EB',
                  boxShadow: isCurrent ? '0 0 0 4px rgba(37,99,235,0.10)' : undefined,
                }}
              >
                <div className="flex items-center justify-between mb-3">
                  <h3 className="text-base font-bold text-[#0a0f1e]">{plan.name}</h3>
                  {plan.popular && !isCurrent && (
                    <span
                      className="inline-flex items-center px-2.5 py-1 rounded-full text-[10px] font-semibold uppercase"
                      style={{ background: '#EFF6FF', color: '#1E40AF', letterSpacing: '0.08em' }}
                    >
                      Most popular
                    </span>
                  )}
                  {isCurrent && (
                    <span
                      className="inline-flex items-center px-2.5 py-1 rounded-full text-[10px] font-semibold uppercase"
                      style={{ background: '#ECFDF5', color: '#065F46', letterSpacing: '0.08em' }}
                    >
                      Current
                    </span>
                  )}
                </div>

                <div className="mb-1">
                  <span className="text-3xl font-bold text-[#0a0f1e] tabular-nums">${plan.founding}</span>
                  <span className="text-sm text-[#6B7280]">/month</span>
                </div>
                <p className="text-xs text-[#9CA3AF] line-through mb-4 tabular-nums">
                  ${plan.full}/mo full price
                </p>

                <ul className="space-y-2 mb-5 flex-1">
                  {plan.features.map((f) => (
                    <li key={f} className="flex items-start gap-2 text-sm text-[#374151]">
                      <Check size={14} className="text-[#2563EB] mt-0.5 shrink-0" />
                      <span>{f}</span>
                    </li>
                  ))}
                </ul>

                {isCurrent ? (
                  <button
                    disabled
                    className="w-full rounded-[10px] px-4 py-2.5 text-sm font-semibold bg-[#F3F4F6] text-[#9CA3AF]"
                  >
                    Current plan
                  </button>
                ) : (
                  <button
                    onClick={() => subscribe(plan)}
                    disabled={isLoading || loadingPlan !== null}
                    className="w-full rounded-[10px] px-4 py-2.5 text-sm font-semibold bg-[#2563EB] text-white hover:bg-[#1D4ED8] transition-all disabled:opacity-60 flex items-center justify-center gap-2"
                  >
                    {isLoading ? (
                      <><Loader2 size={14} className="animate-spin" /> Redirecting…</>
                    ) : (
                      <>Subscribe now →</>
                    )}
                  </button>
                )}
              </div>
            );
          })}
        </div>

        {/* FAQ row */}
        <div className="bg-white rounded-[12px] p-6" style={{ border: '1px solid #E5E7EB' }}>
          <h3 className="text-base font-bold text-[#0a0f1e] mb-2">Questions about pricing?</h3>
          <p className="text-sm text-[#374151]">
            Email{' '}
            <a href={`mailto:${SUPPORT_EMAIL}`} className="text-[#2563EB] hover:text-[#1D4ED8] font-semibold">
              {SUPPORT_EMAIL}
            </a>{' '}
            or call during business hours.
          </p>
          <p className="text-xs text-[#6B7280] mt-2 font-light">
            Founding member pricing is locked for life — it never increases as long as your subscription stays active.
          </p>
        </div>
      </div>
    </div>
  );
}
