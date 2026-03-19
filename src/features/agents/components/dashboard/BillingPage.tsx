import { useState, useEffect } from 'react';
import { CreditCard, Check, Loader2, Zap, Crown, Building2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { useToast } from '@/shared/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/features/auth/AuthProvider';
import DashboardHeader from './DashboardHeader';

const PLANS = [
  {
    name: 'Starter',
    monthlyPrice: 79,
    annualPrice: 67,
    icon: Zap,
    features: [
      '10 active listings',
      'Voice lead matching',
      'Basic CRM (contacts + pipeline)',
      'Agent profile page',
      'Email support',
      'Standard analytics',
    ],
    listingLimit: 10,
  },
  {
    name: 'Pro',
    monthlyPrice: 179,
    annualPrice: 152,
    icon: Crown,
    popular: true,
    features: [
      'Unlimited active listings',
      'Voice lead matching + AI reply',
      'Full CRM — contacts, pipeline, tasks',
      'Trust accounting & reconciliation',
      'Advanced analytics & reports',
      'Verified agent badge',
      'Off-market network access',
      'Priority support',
    ],
    listingLimit: 999,
  },
  {
    name: 'Agency',
    monthlyPrice: 349,
    annualPrice: 297,
    icon: Building2,
    features: [
      'Everything in Pro',
      'Up to 5 agent seats',
      'Team analytics dashboard',
      'Agency profile & branding',
      'Lead routing between agents',
      'API access',
      'Dedicated account manager',
    ],
    listingLimit: 999,
  },
];

const BillingPage = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [currentPlan, setCurrentPlan] = useState('demo');
  const [listingsUsed, setListingsUsed] = useState(0);
  const [listingLimit, setListingLimit] = useState(3);
  const [billingCycle, setBillingCycle] = useState<'monthly' | 'annual'>('monthly');

  useEffect(() => {
    if (user) loadBilling();
  }, [user]);

  const loadBilling = async () => {
    if (!user) return;
    try {
      const { data: agent } = await supabase.from('agents').select('id, is_subscribed').eq('user_id', user.id).single();
      if (!agent) return;

      const { data: sub } = await supabase.from('agent_subscriptions').select('*').eq('agent_id', agent.id).maybeSingle();
      if (sub) {
        setCurrentPlan((sub as any).plan_type);
        setListingLimit((sub as any).listing_limit);
      } else {
        setCurrentPlan('demo');
        setListingLimit(3);
      }

      const { count } = await supabase.from('properties').select('id', { count: 'exact', head: true }).eq('agent_id', agent.id).neq('status', 'sold');
      setListingsUsed(count || 0);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleUpgrade = (plan: string) => {
    toast({ title: 'Coming Soon', description: "Stripe billing coming soon — we'll notify you when it's ready." });
  };

  if (loading) return <div className="flex justify-center py-20"><Loader2 className="animate-spin text-primary" size={24} /></div>;

  const usagePercent = Math.min((listingsUsed / listingLimit) * 100, 100);
  const isDemo = currentPlan === 'demo' || currentPlan === 'basic' || currentPlan === 'free';

  return (
    <div>
      <DashboardHeader title="Subscription & Billing" subtitle="Manage your plan and payment methods" />
      <div className="p-4 sm:p-6 max-w-4xl space-y-6">
        {/* Current Plan */}
        <div className="bg-card border border-border rounded-xl p-5 space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="font-display text-sm font-bold">Current Plan</h3>
              <p className="text-2xl font-bold text-primary capitalize mt-1">{isDemo ? 'Demo' : currentPlan}</p>
            </div>
            <Badge variant={isDemo ? 'destructive' : 'secondary'} className="capitalize">
              {isDemo ? 'Demo — Upgrade to unlock' : currentPlan}
            </Badge>
          </div>
          {isDemo && (
            <p className="text-sm text-muted-foreground">
              You're currently on the demo plan. Upgrade to a paid plan to unlock all features and start listing properties.
            </p>
          )}
          <div>
            <div className="flex justify-between text-xs text-muted-foreground mb-1">
              <span>Listings: {listingsUsed} / {listingLimit}</span>
              <span>{usagePercent.toFixed(0)}%</span>
            </div>
            <Progress value={usagePercent} className="h-2" />
          </div>
        </div>

        {/* Billing toggle */}
        <div className="flex items-center justify-center gap-3">
          <button
            onClick={() => setBillingCycle('monthly')}
            className={`text-sm font-medium px-4 py-1.5 rounded-full transition-colors ${
              billingCycle === 'monthly' ? 'bg-primary text-primary-foreground' : 'text-muted-foreground hover:text-foreground'
            }`}
          >
            Monthly
          </button>
          <button
            onClick={() => setBillingCycle('annual')}
            className={`text-sm font-medium px-4 py-1.5 rounded-full transition-colors flex items-center gap-1.5 ${
              billingCycle === 'annual' ? 'bg-primary text-primary-foreground' : 'text-muted-foreground hover:text-foreground'
            }`}
          >
            Annual
            <Badge className="bg-success text-success-foreground text-[9px] px-1.5 py-0 h-4 border-0">Save 15%</Badge>
          </button>
        </div>

        {/* Plans */}
        <div className="grid sm:grid-cols-3 gap-4">
          {PLANS.map(plan => {
            const isCurrent = currentPlan === plan.name.toLowerCase();
            const price = billingCycle === 'annual' ? plan.annualPrice : plan.monthlyPrice;
            return (
              <div key={plan.name} className={`bg-card border rounded-xl p-5 space-y-4 relative ${plan.popular ? 'border-primary ring-1 ring-primary/20' : 'border-border'}`}>
                {plan.popular && (
                  <Badge className="absolute -top-2.5 left-1/2 -translate-x-1/2 bg-primary text-primary-foreground text-[10px]">Most Popular</Badge>
                )}
                <div className="text-center">
                  <plan.icon size={24} className="mx-auto text-primary mb-2" />
                  <h4 className="font-display font-bold">{plan.name}</h4>
                  <p className="text-2xl font-bold mt-1">${price}<span className="text-sm font-normal text-muted-foreground">/mo</span></p>
                  {billingCycle === 'annual' && (
                    <p className="text-[10px] text-muted-foreground mt-0.5">
                      ${plan.annualPrice * 12}/yr billed annually
                    </p>
                  )}
                </div>
                <ul className="space-y-2">
                  {plan.features.map(f => (
                    <li key={f} className="text-xs flex items-start gap-2">
                      <Check size={12} className="text-success mt-0.5 shrink-0" />
                      <span className="text-muted-foreground">{f}</span>
                    </li>
                  ))}
                </ul>
                <Button
                  className="w-full"
                  variant={isCurrent ? 'secondary' : plan.popular ? 'default' : 'outline'}
                  disabled={isCurrent}
                  onClick={() => handleUpgrade(plan.name)}
                >
                  {isCurrent ? 'Current Plan' : isDemo ? 'Get Started' : 'Upgrade'}
                </Button>
              </div>
            );
          })}
        </div>

        <p className="text-[11px] text-muted-foreground text-center">
          All prices in AUD + GST. Annual plans billed as one payment.
        </p>

        {/* Payment */}
        <div className="bg-card border border-border rounded-xl p-5 space-y-3">
          <h3 className="font-display text-sm font-bold flex items-center gap-1.5">
            <CreditCard size={14} /> Payment Method
          </h3>
          <p className="text-sm text-muted-foreground">No payment method on file.</p>
          <Button variant="outline" size="sm" onClick={() => toast({ title: 'Coming Soon', description: "Stripe billing coming soon — we'll notify you when it's ready." })}>
            Add Payment Method
          </Button>
        </div>
      </div>
    </div>
  );
};

export default BillingPage;
