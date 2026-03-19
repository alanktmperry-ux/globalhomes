import { useState, useEffect } from 'react';
import { CreditCard, Check, Loader2, Zap, Crown, Building2, Flame, Mail, Clock } from 'lucide-react';
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
    foundingPrice: 99,
    fullPrice: 199,
    annualPrice: 84,
    icon: Zap,
    features: [
      '10 active listings (no per-listing fee)',
      '14-Day GlobalHomes First pre-market window',
      'Basic CRM',
      'AI listing writer',
      'Buyer intent scoring',
      'Agent profile',
      'Voice lead matching',
      'Standard analytics',
      'Email support',
    ],
    saving: 'Save $800+/mo vs REA Pro + CRM',
    listingLimit: 10,
  },
  {
    name: 'Pro',
    foundingPrice: 199,
    fullPrice: 349,
    annualPrice: 169,
    icon: Crown,
    popular: true,
    features: [
      'Unlimited listings',
      '14-Day GlobalHomes First + Day-7 match report',
      'Full CRM',
      'Trust accounting',
      'Whisper Market',
      'Inspection Day Mode',
      'Settlement Concierge',
      'Reputation Score',
      'Commission Calculator',
      'Advanced analytics',
      'GCI reports',
      'Verified badge',
      'Priority support',
    ],
    saving: 'Save $1,200+/mo vs full agency stack',
    listingLimit: 999,
  },
  {
    name: 'Agency',
    foundingPrice: 399,
    fullPrice: 699,
    annualPrice: 339,
    icon: Building2,
    features: [
      'Everything in Pro',
      'Up to 5 agent seats',
      'Team analytics dashboard',
      'Agency profile & branding',
      'Lead routing between agents',
      'Xero integration (coming soon)',
      'API access',
      'Dedicated account manager',
    ],
    saving: 'Save $2,000+/mo for your whole team',
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

        {/* 60-Day Free Trial Banner */}
        <div className="bg-primary/10 border border-primary/20 rounded-2xl p-6 mb-8">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <div>
              <h3 className="text-lg font-bold text-foreground">60 Days Free — No Credit Card</h3>
              <p className="text-sm text-muted-foreground mt-1">
                Try GlobalHomes free for 60 days. Full platform access, unlimited listings. After 60 days, keep everything from $99/month.
              </p>
            </div>
            <div className="flex flex-col items-start sm:items-end gap-1 shrink-0">
              <Button
                size="lg"
                onClick={() => handleUpgrade('trial')}
                className="text-base px-8 py-5 rounded-xl font-bold bg-primary text-primary-foreground hover:bg-primary/90 transition-all shadow-lg shadow-primary/30"
              >
                <Zap size={18} className="mr-2" />
                Start Free 60-Day Trial
              </Button>
              <span className="text-[11px] text-muted-foreground">Then from $99/mo · Cancel anytime</span>
            </div>
          </div>
        </div>

        {/* Founding Member Counter */}
        <div className="bg-amber-500/10 border border-amber-500/20 rounded-xl px-5 py-3 text-sm mb-6 flex items-center gap-2">
          <Flame size={16} className="text-amber-500 shrink-0" />
          <span className="text-foreground">
            <strong>Founding Member spots:</strong> 73 of 100 remaining — lock your rate for life
          </span>
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
            const price = billingCycle === 'annual' ? plan.annualPrice : plan.foundingPrice;
            return (
              <div key={plan.name} className={`bg-card border rounded-xl p-5 space-y-4 relative ${plan.popular ? 'border-primary ring-1 ring-primary/20' : 'border-border'}`}>
                {plan.popular && (
                  <Badge className="absolute -top-2.5 left-1/2 -translate-x-1/2 bg-primary text-primary-foreground text-[10px]">Most Popular</Badge>
                )}
                <div className="text-center">
                  <plan.icon size={24} className="mx-auto text-primary mb-2" />
                  <h4 className="font-display font-bold">{plan.name}</h4>
                  <p className="text-2xl font-bold mt-1">${price}<span className="text-sm font-normal text-muted-foreground">/mo</span></p>
                  <p className="text-xs text-muted-foreground line-through mt-0.5">
                    ${plan.fullPrice}/mo after first 100
                  </p>
                  {billingCycle === 'annual' && (
                    <p className="text-[10px] text-muted-foreground mt-0.5">
                      ${plan.annualPrice * 12}/yr billed annually
                    </p>
                  )}
                  <p className="text-success text-[10px] font-medium mt-1">{plan.saving}</p>
                  <p className="text-amber-500 text-[10px] mt-0.5">Rate locked for life · First 100 agencies only</p>
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

        {/* Enterprise Card */}
        <div className="bg-foreground text-background rounded-2xl p-6 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div>
            <h4 className="font-display font-bold text-lg">Enterprise</h4>
            <p className="text-sm opacity-80 mt-1">Multi-branch agencies, white label, and API access</p>
          </div>
          <div className="flex flex-col items-start sm:items-end gap-1 shrink-0">
            <span className="text-lg font-bold">From $1,499/mo</span>
            <Button variant="secondary" size="sm" asChild>
              <a href="mailto:sales@everythingeco.com.au">
                <Mail size={14} />
                Contact Sales
              </a>
            </Button>
          </div>
        </div>

        {/* What's Coming Next */}
        <div className="bg-secondary border border-border rounded-2xl p-6 mt-6">
          <h3 className="font-bold text-lg mb-4">What's Coming Next 🚀</h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {[
              { title: 'Xero Integration', desc: 'Sync trust accounting and commission invoices to Xero automatically. No more double entry.' },
              { title: 'AI Property Valuation', desc: 'Instant AI-powered market estimates on any address. Capture vendor leads 24/7.' },
              { title: 'Mortgage Referral Network', desc: 'Earn $200–$800 per settled mortgage when buyers use your recommended broker.' },
              { title: 'International Buyer Tools', desc: 'FIRB eligibility flags, Mandarin listings, and SGD/AED/CNY/MYR pricing for Asian buyers.' },
            ].map(item => (
              <div key={item.title} className="flex items-start gap-3 p-3 bg-background rounded-xl border border-border">
                <Clock size={16} className="text-amber-500 mt-0.5 shrink-0" />
                <div>
                  <p className="text-sm font-semibold text-foreground">{item.title}</p>
                  <p className="text-xs text-muted-foreground mt-0.5">{item.desc}</p>
                </div>
              </div>
            ))}
          </div>
        <p className="text-[11px] text-muted-foreground text-center">
          All prices in AUD + GST. Annual plans billed as a single payment. No per-listing fees — ever. Founding Member rate locked for life while subscribed.
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
