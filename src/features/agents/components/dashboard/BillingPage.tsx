import { useState, useEffect } from 'react';
import AdminReports from '@/features/admin/components/AdminReports';
import { CreditCard, Check, Loader2, Zap, Crown, Building2, Flame, Mail, Lock, Users } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Separator } from '@/components/ui/separator';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/features/auth/AuthProvider';
import { useSubscription, getPlanFeatures } from '@/features/agents/hooks/useSubscription';
import { useNavigate } from 'react-router-dom';
import DashboardHeader from './DashboardHeader';

interface PlanFeature {
  text: string;
  key: boolean;
}

interface PlanDef {
  id: string;
  name: string;
  tagline: string;
  foundingPrice: number;
  fullPrice: number;
  seatLimit: number;
  listingLimit: number;
  popular?: boolean;
  saving: string;
  comparison: string;
  features: PlanFeature[];
  seatsLabel: string;
  seatsVariant: 'solo' | 'team';
}

const PLANS: PlanDef[] = [
  {
    id: 'starter',
    name: 'Starter',
    tagline: 'For individual agents getting started',
    foundingPrice: 9900,
    fullPrice: 19900,
    seatLimit: 1,
    listingLimit: 10,
    saving: 'Save $100/mo — locked for life',
    comparison: 'REA subscription alone starts at $400+/mo. You get a full platform, CRM, AI writer and voice leads for $99.',
    features: [
      { text: '10 active listings', key: true },
      { text: 'AI listing writer (4 tones)', key: true },
      { text: 'Voice lead matching', key: true },
      { text: '14-day pre-market window', key: false },
      { text: 'Basic CRM', key: false },
      { text: 'Agent profile page', key: false },
      { text: 'Standard analytics', key: false },
      { text: 'Email support', key: false },
    ],
    seatsLabel: '1 agent login',
    seatsVariant: 'solo',
  },
  {
    id: 'pro',
    name: 'Pro',
    tagline: 'For established agents managing sales and rentals',
    foundingPrice: 19900,
    fullPrice: 34900,
    seatLimit: 1,
    listingLimit: 9999,
    popular: true,
    saving: 'Save $150/mo — locked for life',
    comparison: 'Rex CRM is $150–$240/mo. PropertyMe is $176/mo. That is $326–$416/mo for just those two — no portal, no AI, no voice leads.',
    features: [
      { text: 'Everything in Starter', key: false },
      { text: 'Unlimited listings', key: true },
      { text: 'Featured listing boosts ($49–$99/mo)', key: true },
      { text: 'Full trust accounting', key: true },
      { text: 'Off-market network', key: true },
      { text: 'Rent roll management', key: true },
      { text: 'Full CRM + pipeline board', key: false },
      { text: 'Inspection Day Mode', key: false },
      { text: 'Settlement Concierge', key: false },
      { text: 'Commission calculator', key: false },
      { text: 'Advanced analytics + reports', key: false },
      { text: 'Verified agent badge', key: false },
      { text: 'Priority support', key: false },
    ],
    seatsLabel: '1 agent login',
    seatsVariant: 'solo',
  },
  {
    id: 'agency',
    name: 'Agency',
    tagline: 'For principals running a team under one roof',
    foundingPrice: 39900,
    fullPrice: 69900,
    seatLimit: 8,
    listingLimit: 9999,
    saving: 'Save $300/mo — locked for life',
    comparison: '5 agents on Rex + PropertyMe + REA costs $1,500–$2,700/mo. Agency tier replaces all three for $399/mo — saving $1,100+/mo.',
    features: [
      { text: 'Everything in Pro — for every agent', key: false },
      { text: 'Featured listing boosts ($49–$99/mo)', key: true },
      { text: 'Up to 8 separate agent logins', key: true },
      { text: 'Principal dashboard — whole office view', key: true },
      { text: 'Centralised trust accounting', key: true },
      { text: 'White-label listing pages', key: true },
      { text: 'Owner portal for landlords', key: true },
      { text: 'Agency-wide rent roll', key: true },
      { text: 'Lead routing by suburb', key: false },
      { text: 'Agency performance reports', key: false },
      { text: 'Xero integration (coming soon)', key: false },
      { text: 'Priority onboarding call', key: false },
    ],
    seatsLabel: 'Up to 8 agent logins — one bill',
    seatsVariant: 'team',
  },
];

const formatAUD = (cents: number) => `$${(cents / 100).toLocaleString('en-AU')}`;

const PLAN_ORDER = ['demo', 'starter', 'pro', 'agency', 'enterprise'];

const BillingPage = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const sub = useSubscription();
  const [listingsUsed, setListingsUsed] = useState(0);
  const [upgrading, setUpgrading] = useState<string | null>(null);

  useEffect(() => {
    if (!user) return;
    const countListings = async () => {
      const { data: agent } = await supabase.from('agents').select('id').eq('user_id', user.id).single();
      if (!agent) return;
      const { count } = await supabase.from('properties').select('id', { count: 'exact', head: true }).eq('agent_id', agent.id).neq('status', 'sold');
      setListingsUsed(count || 0);
    };
    countListings();
  }, [user]);

  const handleUpgrade = async (planId: string) => {
    if (!user) return;
    setUpgrading(planId);
    try {
      const { data: agent } = await supabase.from('agents').select('id').eq('user_id', user.id).single();
      if (!agent) throw new Error('Agent not found');

      const planDef = PLANS.find(p => p.id === planId);
      if (!planDef) return;

      // Upsert subscription
      const { data: existing } = await supabase.from('agent_subscriptions').select('id').eq('agent_id', agent.id).maybeSingle();

      const payload = {
        agent_id: agent.id,
        plan_type: planId,
        listing_limit: planDef.listingLimit,
        seat_limit: planDef.seatLimit,
        founding_member: true,
        monthly_price_aud: planDef.foundingPrice,
      };

      if (existing) {
        await supabase.from('agent_subscriptions').update(payload).eq('id', (existing as any).id);
      } else {
        await supabase.from('agent_subscriptions').insert(payload);
      }

      // Mark agent as subscribed
      await supabase.from('agents').update({ is_subscribed: true }).eq('id', agent.id);

      toast.success("Plan updated! Stripe billing coming soon — we'll email you when payment is ready. Your founding rate is reserved.");
      // Force reload to update subscription state
      window.location.reload();
    } catch (err: any) {
      toast.error(err.message || 'Upgrade failed');
    } finally {
      setUpgrading(null);
    }
  };

  if (sub.loading) {
    return <div className="flex justify-center py-20"><Loader2 className="animate-spin text-primary" size={24} /></div>;
  }

  const usagePercent = sub.listingLimit > 0 ? Math.min((listingsUsed / sub.listingLimit) * 100, 100) : 0;
  const currentIdx = PLAN_ORDER.indexOf(sub.plan || 'demo');

  const displayPlan = sub.plan === 'demo' ? 'Demo' : (sub.plan || 'Demo');

  return (
    <div>
      <DashboardHeader title="Subscription & Billing" subtitle="Manage your plan and payment" />
      <div className="p-4 sm:p-6 max-w-4xl space-y-6">

        {/* A) Current Plan Card */}
        <div className="bg-card border border-border rounded-xl p-5 space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-sm font-bold">Current Plan</h3>
              <p className="text-2xl font-bold text-primary capitalize mt-1">{displayPlan}</p>
            </div>
            <div className="flex items-center gap-2">
              {sub.foundingMember && (
                <Badge className="bg-emerald-500/10 text-emerald-600 border-emerald-500/20 text-[10px] gap-1">
                  <Flame size={10} className="text-amber-500" /> Founding Member — rate locked for life
                </Badge>
              )}
              <Badge variant={sub.isDemo ? 'destructive' : 'secondary'} className="capitalize text-xs">
                {displayPlan}
              </Badge>
            </div>
          </div>
          {sub.isDemo && (
            <p className="text-sm text-amber-600">
              You're on the demo plan. Upgrade to start listing and accepting leads.
            </p>
          )}
          <div>
            <div className="flex justify-between text-xs text-muted-foreground mb-1">
              <span>Listings: {listingsUsed} / {sub.listingLimit >= 9999 ? '∞' : sub.listingLimit}</span>
              {sub.listingLimit < 9999 && <span>{usagePercent.toFixed(0)}%</span>}
            </div>
            <Progress value={sub.listingLimit >= 9999 ? 5 : usagePercent} className="h-2" />
          </div>
        </div>

        {/* B) Founding Member Urgency Banner */}
        {(sub.isDemo || !sub.isPaid) && (
          <div className="bg-amber-500/10 border border-amber-500/20 rounded-xl px-5 py-3 text-sm flex items-center gap-2">
            <Flame size={16} className="text-amber-500 shrink-0" />
            <span className="text-foreground">
              <strong>73 of 100 founding member spots remaining</strong> — lock your rate for life
            </span>
          </div>
        )}

        {/* C) Plan Cards Grid */}
        <div className="grid sm:grid-cols-3 gap-4">
          {PLANS.map(plan => {
            const isCurrent = sub.plan === plan.id;
            const planIdx = PLAN_ORDER.indexOf(plan.id);
            const isUpgrade = planIdx > currentIdx;

            return (
              <div key={plan.id} className={`bg-card border rounded-xl p-5 space-y-4 relative flex flex-col ${plan.popular ? 'border-primary ring-1 ring-primary/20' : 'border-border'}`}>
                {/* Badges */}
                <div className="flex gap-1.5">
                  {!plan.popular && (
                    <Badge className="bg-amber-500/10 text-amber-600 border-amber-500/20 text-[9px]">Founding rate</Badge>
                  )}
                  {plan.popular && (
                    <Badge className="bg-primary/10 text-primary border-primary/20 text-[9px]">Most popular</Badge>
                  )}
                </div>

                {/* Name & tagline */}
                <div>
                  <h4 className="text-[15px] font-medium">{plan.name}</h4>
                  <p className="text-xs text-muted-foreground mt-0.5">{plan.tagline}</p>
                </div>

                {/* Seats pill */}
                <Badge variant="outline" className={`text-[10px] w-fit ${plan.seatsVariant === 'team' ? 'bg-emerald-500/10 text-emerald-600 border-emerald-500/20' : 'bg-muted text-muted-foreground'}`}>
                  <Users size={10} className="mr-1" />
                  {plan.seatsLabel}
                </Badge>

                {/* Pricing */}
                <div>
                  <span className="text-3xl font-bold">{formatAUD(plan.foundingPrice)}</span>
                  <span className="text-sm text-muted-foreground">/mo</span>
                  <p className="text-xs text-muted-foreground line-through mt-0.5">
                    {formatAUD(plan.fullPrice)}/mo after launch
                  </p>
                  <p className="text-xs text-emerald-600 font-medium mt-1">{plan.saving}</p>
                </div>

                <Separator />

                {/* Features */}
                <ul className="space-y-2 flex-1">
                  {plan.features.map(f => (
                    <li key={f.text} className="text-xs flex items-start gap-2">
                      <span className={`w-1.5 h-1.5 rounded-full mt-1.5 shrink-0 ${f.key ? 'bg-emerald-500' : 'bg-muted-foreground/30'}`} />
                      <span className="text-muted-foreground">{f.text}</span>
                    </li>
                  ))}
                </ul>

                {/* Comparison box */}
                <div className="bg-muted/50 rounded-lg p-3">
                  <p className="text-[11px] text-muted-foreground leading-relaxed">{plan.comparison}</p>
                </div>

                {/* CTA */}
                <Button
                  className="w-full"
                  variant={isCurrent ? 'secondary' : 'default'}
                  disabled={isCurrent || upgrading === plan.id}
                  onClick={() => handleUpgrade(plan.id)}
                >
                  {upgrading === plan.id ? <Loader2 size={14} className="animate-spin mr-1" /> : null}
                  {isCurrent ? 'Current Plan' : sub.isDemo ? 'Get Started' : isUpgrade ? 'Upgrade' : 'Switch'}
                </Button>
              </div>
            );
          })}
        </div>

        {/* D) Enterprise Bar */}
        <div className="bg-muted border border-border rounded-xl p-5 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div>
            <h4 className="font-bold">Enterprise — 9+ agents</h4>
            <p className="text-sm text-muted-foreground mt-0.5">Multi-office agencies, white label, API access, and custom integrations</p>
          </div>
          <div className="flex flex-col items-start sm:items-end gap-1 shrink-0">
            <span className="text-lg font-bold">From $999/mo</span>
            <Button variant="outline" size="sm" asChild>
              <a href="mailto:sales@listhq.com.au">
                <Mail size={14} className="mr-1" /> Contact Sales
              </a>
            </Button>
          </div>
        </div>

        {/* E) Footnote */}
        <p className="text-[11px] text-muted-foreground text-center">
          All prices in AUD + GST · No lock-in contracts, cancel anytime · Founding rate locked for life while subscribed · Annual billing available — save an additional 15% on any plan
        </p>

        {/* Payment Method */}
        <div className="bg-card border border-border rounded-xl p-5 space-y-3">
          <h3 className="text-sm font-bold flex items-center gap-1.5">
            <CreditCard size={14} /> Payment Method
          </h3>
          <p className="text-sm text-muted-foreground">No payment method on file.</p>
          <Button variant="outline" size="sm" onClick={() => toast.info("Stripe billing coming soon — we'll notify you when it's ready.")}>
            Add Payment Method
          </Button>
        </div>
      </div>
    </div>
  );
};

export default BillingPage;
