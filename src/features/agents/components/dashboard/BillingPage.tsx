import { Sparkles, Check } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useCurrentAgent } from '@/features/agents/hooks/useCurrentAgent';
import DashboardHeader from './DashboardHeader';
import { cn } from '@/lib/utils';

interface Plan {
  id: 'starter' | 'pro' | 'agency';
  name: string;
  founding: number;
  full: number;
  popular?: boolean;
  features: string[];
}

const PLANS: Plan[] = [
  {
    id: 'starter',
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

function formatTrialExpiry(createdAt: string | null | undefined): string | null {
  if (!createdAt) return null;
  const created = new Date(createdAt);
  if (isNaN(created.getTime())) return null;
  const expiry = new Date(created.getTime() + 60 * 24 * 60 * 60 * 1000);
  return expiry.toLocaleDateString('en-AU', { day: 'numeric', month: 'long', year: 'numeric' });
}

export default function BillingPage() {
  const { agent } = useCurrentAgent();
  const currentPlan = (agent as any)?.subscription_plan as string | null | undefined;
  const isSubscribed = !!agent?.is_subscribed;
  const trialExpiry = !isSubscribed ? formatTrialExpiry(agent?.created_at) : null;

  return (
    <div>
      <DashboardHeader title="Billing & Plans" subtitle="Choose the plan that fits your business." />

      <div className="p-4 sm:p-6 max-w-6xl mx-auto space-y-6">
        {/* Current plan summary */}
        <div className="rounded-xl border border-border bg-card p-5">
          <p className="text-sm text-muted-foreground">Current plan</p>
          <p className="text-lg font-semibold text-foreground capitalize">
            {currentPlan ?? 'Free Trial'}
          </p>
          {trialExpiry && (
            <p className="text-xs text-muted-foreground mt-1">
              Trial expires: <span className="font-medium text-foreground">{trialExpiry}</span>
            </p>
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
            const isCurrent = currentPlan?.toLowerCase() === plan.id;
            const mailto = `mailto:${SUPPORT_EMAIL}?subject=${encodeURIComponent(`ListHQ ${plan.name} Subscription`)}`;
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
                  <Button asChild className="w-full">
                    <a href={mailto}>Contact us to activate →</a>
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
