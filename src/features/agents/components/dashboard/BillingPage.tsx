import { useState, useEffect } from 'react';
import AdminReports from '@/features/admin/components/AdminReports';
import { CreditCard, Check, Loader2, Mail, Users, UserMinus, Sparkles, AlertTriangle, Clock } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Separator } from '@/components/ui/separator';
import { Switch } from '@/components/ui/switch';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/features/auth/AuthProvider';
import { useSubscription } from '@/features/agents/hooks/useSubscription';
import { useTeamAgents } from '@/features/agents/hooks/useTeamAgents';
import { logAction } from '@/shared/lib/auditLog';
import { useNavigate } from 'react-router-dom';
import DashboardHeader from './DashboardHeader';
import { getErrorMessage } from '@/shared/lib/errorUtils';
import { capture } from '@/shared/lib/posthog';

interface PlanDef {
  id: string;
  name: string;
  tagline: string;
  price: number | null;        // cents AUD
  priceLabel?: string;          // for "Custom" tiers
  seatLimit: number;
  seatsIncluded?: number;
  extraSeatPrice?: number;      // cents AUD per extra seat
  listingLimit: number;
  featuredPerMonth: number;
  premiumPerMonth: number;
  pocketPerMonth: number;
  featuredCredits?: number;     // cents AUD bundled featured credits
  popular?: boolean;
  comparison: string;
  features: string[];
}

const PLANS: PlanDef[] = [
  {
    id: 'solo',
    name: 'Solo',
    tagline: 'For the independent agent',
    price: 29900,
    seatLimit: 1,
    listingLimit: 15,
    featuredPerMonth: 2,
    premiumPerMonth: 0,
    pocketPerMonth: 20,
    comparison: 'One REA Premiere listing costs $2,700–$4,700. Solo gives you a full platform plus 2 featured listings every month.',
    features: [
      '1 agent seat',
      '15 active listings',
      '2 featured listings/month',
      '20 pocket (pre-market) listings/month',
      'Full CRM, pipeline, contacts',
      'Basic trust accounting',
      'AI buyer matching, voice search, 24 languages',
      'AI listing writer (4 tones)',
      'Email support',
    ],
  },
  {
    id: 'agency',
    name: 'Agency',
    tagline: 'For small–medium agencies',
    price: 89900,
    seatLimit: 12,
    seatsIncluded: 5,
    extraSeatPrice: 7900,
    listingLimit: 75,
    featuredPerMonth: 15,
    premiumPerMonth: 3,
    pocketPerMonth: Infinity,
    popular: true,
    comparison: '15 featured listings = ~$13,500 in REA Highlight equivalents. 3 premium = ~$8,100–$14,100 in REA Premiere. You save $13K+/mo.',
    features: [
      '5 seats included (+$79/extra seat, up to 12)',
      '75 active listings',
      '15 featured listings/month',
      '3 premium listings/month',
      'Unlimited pocket listings',
      'Full trust accounting + bank reconciliation',
      'Xero integration (Coming Soon)',
      'Mortgage broker partner widget on listings',
      'Priority AI matching + lead analytics',
      'Agency-branded profile page',
      'Lead routing automation',
      'Phone + email support',
    ],
  },
  {
    id: 'agency_pro',
    name: 'Agency Pro',
    tagline: 'For larger agencies and multi-branch',
    price: 199900,
    seatLimit: Infinity,
    listingLimit: Infinity,
    featuredPerMonth: 50,
    premiumPerMonth: 10,
    pocketPerMonth: Infinity,
    featuredCredits: 75000,
    comparison: '$750/mo of featured credits included = ~7 free featured listings. Trust accountant integration alone replaces $200–500/mo of bookkeeping fees.',
    features: [
      'Unlimited seats',
      'Unlimited listings',
      '50 featured listings/month',
      '10 premium listings/month',
      '$750/mo featured listing credits included',
      'Multi-branch dashboard',
      'White-label option',
      'Trust accountant partner full integration',
      'API access',
      'Custom onboarding + dedicated AM',
      'Compliance + audit + advanced reporting',
      'Phone SLA support',
    ],
  },
  {
    id: 'enterprise',
    name: 'Enterprise',
    tagline: 'For franchises and multi-state networks',
    price: null,
    priceLabel: 'From $4,999/mo',
    seatLimit: Infinity,
    listingLimit: Infinity,
    featuredPerMonth: Infinity,
    premiumPerMonth: 25,
    pocketPerMonth: Infinity,
    featuredCredits: 200000,
    comparison: 'For Ray White / LJ Hooker / Belle-tier networks doing 50+ listings/mo across multiple states.',
    features: [
      'Everything in Agency Pro',
      '25+ premium listings/month',
      '$2,000/mo featured credits included',
      'Multi-state, multi-brand support',
      'Custom integrations',
      'Dedicated infrastructure',
      'Custom SLA + 24/7 support',
      'Tailored contracts',
    ],
  },
];

const ADD_ONS = [
  { name: 'Extra featured listing', price: '$99', unit: 'each' },
  { name: 'Extra premium listing', price: '$299', unit: 'each' },
  { name: 'Pocket listing pack (10 listings)', price: '$49', unit: 'pack' },
  { name: 'Extra seat (Agency only)', price: '$79', unit: '/mo' },
  { name: 'Multilingual translation pack', price: '$29', unit: '/listing' },
];

const formatAUD = (cents: number) => `$${Math.round(cents / 100).toLocaleString('en-AU')}`;
const PLAN_ORDER = ['demo', 'solo', 'agency', 'agency_pro', 'enterprise'];

const BillingPage = () => {
  const { user, isPrincipal, isAdmin, agencyId } = useAuth();
  const navigate = useNavigate();
  const sub = useSubscription();
  const { agents: teamAgents, refetch: refetchTeam } = useTeamAgents();
  const [listingsUsed, setListingsUsed] = useState(0);
  const [upgrading, setUpgrading] = useState<string | null>(null);
  const [agentId, setAgentId] = useState<string | null>(null);
  const [annual, setAnnual] = useState(false);

  useEffect(() => {
    if (!user) return;
    const countListings = async () => {
      const { data: agentData } = await supabase.from('agents').select('id').eq('user_id', user.id).maybeSingle();
      if (!agentData) return;
      const { count } = await supabase.from('properties').select('id', { count: 'exact', head: true }).eq('agent_id', agentData.id).neq('status', 'sold');
      setListingsUsed(count || 0);
      setAgentId(agentData.id);
    };
    countListings();
  }, [user]);

  const handleUpgrade = async (planId: string) => {
    if (!user) return;
    const planDef = PLANS.find(p => p.id === planId);
    if (!planDef) return;
    if (planDef.price == null) {
      window.location.href = 'mailto:sales@listhq.com.au?subject=Enterprise%20enquiry';
      return;
    }
    setUpgrading(planId);
    try {
      const { data: agent } = await supabase.from('agents').select('id').eq('user_id', user.id).maybeSingle();
      if (!agent) throw new Error('Agent not found');

      const { data: existing } = await supabase.from('agent_subscriptions').select('id').eq('agent_id', agent.id).maybeSingle();

      const listingLimitCol = planDef.listingLimit === Infinity ? 999999 : planDef.listingLimit;
      const seatLimitCol = planDef.seatLimit === Infinity ? 999999 : planDef.seatLimit;

      const payload: any = {
        agent_id: agent.id,
        plan_type: planId,
        listing_limit: listingLimitCol,
        seat_limit: seatLimitCol,
        monthly_price_aud: annual ? Math.round((planDef.price * 10) / 12) : planDef.price,
        annual_billing: annual,
      };

      if (existing) {
        await supabase.from('agent_subscriptions').update(payload).eq('id', (existing as any).id);
      } else {
        await supabase.from('agent_subscriptions').insert(payload);
      }
      await supabase.from('agents').update({ is_subscribed: true }).eq('id', agent.id);

      try {
        capture('subscription_started', {
          agent_id: agent.id,
          plan: planId,
          mrr: payload.monthly_price_aud,
        });
      } catch {}

      toast.success("Plan updated! Stripe billing is coming — we'll email you when payment is ready.");
      window.location.reload();
    } catch (err: unknown) {
      toast.error(getErrorMessage(err) || 'Upgrade failed');
    } finally {
      setUpgrading(null);
    }
  };

  if (sub.loading) {
    return <div className="flex justify-center py-20"><Loader2 className="animate-spin text-primary" size={24} /></div>;
  }

  const listingLimitDisplay = sub.listingLimit === Infinity ? '∞' : sub.listingLimit;
  const usagePercent = sub.listingLimit > 0 && sub.listingLimit !== Infinity
    ? Math.min((listingsUsed / sub.listingLimit) * 100, 100) : 0;
  const currentIdx = PLAN_ORDER.indexOf(sub.plan || 'demo');

  const planLabel = sub.plan === 'agency_pro' ? 'Agency Pro'
    : sub.plan === 'demo' ? 'Demo'
    : sub.plan ? sub.plan.charAt(0).toUpperCase() + sub.plan.slice(1) : 'Demo';

  return (
    <div>
      <DashboardHeader title="Subscription & Billing" subtitle="Manage your plan and payment" />
      <div className="p-4 sm:p-6 max-w-5xl space-y-6">

        {/* Current Plan */}
        <div className="bg-card border border-border rounded-xl p-5 space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-sm font-bold">Current Plan</h3>
              <p className="text-2xl font-bold text-primary mt-1">{planLabel}</p>
            </div>
          </div>
          {sub.isDemo && (
            <p className="text-sm text-amber-600">
              You're on the demo plan. Upgrade to start listing and accepting leads.
            </p>
          )}
          <div>
            <div className="flex justify-between text-xs text-muted-foreground mb-1">
              <span>Listings: {listingsUsed} / {listingLimitDisplay}</span>
              {sub.listingLimit !== Infinity && <span>{usagePercent.toFixed(0)}%</span>}
            </div>
            <Progress value={sub.listingLimit === Infinity ? 5 : usagePercent} className="h-2" />
          </div>
          {sub.subscriptionEnd && (() => {
            const daysLeft = Math.ceil((new Date(sub.subscriptionEnd).getTime() - Date.now()) / 86400000);
            const colorClass = daysLeft <= 0 ? 'bg-destructive/10 text-destructive'
              : daysLeft <= 14 ? 'bg-amber-500/10 text-amber-600'
              : 'bg-secondary text-muted-foreground';
            const label = daysLeft <= 0 ? 'Subscription expired'
              : `Renews ${new Date(sub.subscriptionEnd).toLocaleDateString('en-AU', { day: 'numeric', month: 'short', year: 'numeric' })} (${daysLeft} days)`;
            return (
              <div className={`flex items-center justify-between text-xs rounded-lg p-3 ${colorClass}`}>
                <span>{label}</span>
                <span className="font-medium">{sub.autoRenew ? 'Auto-renew ON' : 'Auto-renew OFF'}</span>
              </div>
            );
          })()}
        </div>

        {/* Annual prepay toggle */}
        <div className="flex items-center justify-between bg-card border border-border rounded-xl px-5 py-3">
          <div>
            <p className="text-sm font-semibold text-foreground">Annual prepay</p>
            <p className="text-xs text-muted-foreground">Pay yearly and get 2 months free on every plan</p>
          </div>
          <div className="flex items-center gap-3">
            {annual && <Badge className="bg-emerald-500/10 text-emerald-600 border-emerald-500/20 text-[10px]">2 months free</Badge>}
            <Switch checked={annual} onCheckedChange={setAnnual} />
          </div>
        </div>

        {/* Plan cards */}
        <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {PLANS.map(plan => {
            const isCurrent = sub.plan === plan.id;
            const planIdx = PLAN_ORDER.indexOf(plan.id);
            const isUpgrade = planIdx > currentIdx;

            const monthlyDisplay = plan.price == null
              ? plan.priceLabel || 'Contact us'
              : annual
                ? `${formatAUD(Math.round((plan.price * 10) / 12))}/mo`
                : `${formatAUD(plan.price)}/mo`;
            const annualTotal = plan.price != null ? formatAUD(plan.price * 10) : null;

            return (
              <div key={plan.id} className={`bg-card border rounded-xl p-5 space-y-4 relative flex flex-col ${plan.popular ? 'border-primary ring-1 ring-primary/20' : 'border-border'}`}>
                <div className="flex gap-1.5 min-h-[20px]">
                  {plan.popular && (
                    <Badge className="bg-primary/10 text-primary border-primary/20 text-[9px]">Most popular</Badge>
                  )}
                </div>

                <div>
                  <h4 className="text-base font-semibold">{plan.name}</h4>
                  <p className="text-xs text-muted-foreground mt-0.5">{plan.tagline}</p>
                </div>

                <div>
                  <div className="text-2xl font-bold">{monthlyDisplay}</div>
                  {annual && plan.price != null && annualTotal && (
                    <p className="text-[11px] text-emerald-600 font-medium mt-0.5">
                      {annualTotal} billed annually · 2 months free
                    </p>
                  )}
                  {!annual && plan.price != null && (
                    <p className="text-[11px] text-muted-foreground mt-0.5">Billed monthly · cancel anytime</p>
                  )}
                </div>

                <Separator />

                <ul className="space-y-2 flex-1">
                  {plan.features.map(f => (
                    <li key={f} className="text-xs flex items-start gap-2">
                      <Check size={12} className="text-emerald-600 shrink-0 mt-0.5" />
                      <span className="text-muted-foreground leading-relaxed">{f}</span>
                    </li>
                  ))}
                </ul>

                <div className="bg-muted/50 rounded-lg p-3">
                  <p className="text-[11px] text-muted-foreground leading-relaxed">{plan.comparison}</p>
                </div>

                <Button
                  className="w-full"
                  variant={isCurrent ? 'secondary' : plan.popular ? 'default' : 'outline'}
                  disabled={isCurrent || upgrading === plan.id}
                  onClick={() => handleUpgrade(plan.id)}
                >
                  {upgrading === plan.id ? <Loader2 size={14} className="animate-spin mr-1" /> : null}
                  {isCurrent
                    ? 'Current Plan'
                    : plan.price == null
                      ? 'Contact Sales'
                      : sub.isDemo
                        ? 'Get Started'
                        : isUpgrade ? 'Upgrade' : 'Switch'}
                </Button>
              </div>
            );
          })}
        </div>

        {/* Add-ons */}
        <div className="bg-card border border-border rounded-xl p-5 space-y-3">
          <div className="flex items-center gap-2">
            <Sparkles size={14} className="text-primary" />
            <h3 className="text-sm font-bold">Add-ons</h3>
            <span className="text-xs text-muted-foreground">— available on any tier</span>
          </div>
          <div className="grid sm:grid-cols-2 gap-2">
            {ADD_ONS.map(a => (
              <div key={a.name} className="flex items-center justify-between rounded-lg border border-border/60 px-3 py-2.5 bg-muted/30">
                <span className="text-xs text-foreground">{a.name}</span>
                <span className="text-xs font-semibold text-foreground">
                  {a.price}<span className="text-muted-foreground font-normal"> {a.unit}</span>
                </span>
              </div>
            ))}
            {(sub.plan === 'solo' || sub.plan === 'agency') && (
              <div className="flex items-center justify-between rounded-lg border border-border/60 px-3 py-2.5 bg-muted/30">
                <div className="flex flex-col">
                  <span className="text-xs text-foreground flex items-center gap-1.5">
                    <Sparkles size={12} className="text-primary" /> Concierge intro pack
                  </span>
                  <span className="text-[10px] text-muted-foreground mt-0.5">15 additional buyer introductions</span>
                </div>
                <span className="text-xs font-semibold text-foreground">$99</span>
              </div>
            )}
          </div>
        </div>

        <p className="text-[11px] text-muted-foreground text-center">
          All prices in AUD + GST · No lock-in contracts, cancel anytime · Annual prepay = 2 months free
        </p>

        {/* Team Seats — Principal only */}
        {(isPrincipal || isAdmin) && agencyId && teamAgents.length > 0 && (
          <div className="bg-card border border-border rounded-xl p-5 space-y-4">
            <h3 className="text-sm font-bold flex items-center gap-1.5">
              <Users size={14} /> Team Seats
            </h3>
            <p className="text-sm text-muted-foreground">
              You have <strong>{teamAgents.length}</strong> active agent{teamAgents.length !== 1 ? 's' : ''} on your plan.
            </p>
            <div className="space-y-2">
              {teamAgents.map(agent => (
                <div key={agent.id} className="flex items-center justify-between p-3 rounded-xl bg-muted/30 border border-border/50">
                  <div>
                    <p className="text-sm font-medium">{agent.name}</p>
                    <p className="text-xs text-muted-foreground">{agent.email || '—'} · {agent.agency_role}</p>
                  </div>
                  {agent.agency_role !== 'principal' && (
                    <Button
                      variant="ghost"
                      size="sm"
                      className="text-xs text-destructive hover:text-destructive gap-1"
                      onClick={async () => {
                        await supabase.from('agents').update({ is_subscribed: false } as any).eq('id', agent.id);
                        if (user) {
                          logAction({ agencyId, agentId: null, userId: user.id, actionType: 'deactivated', entityType: 'agent', entityId: agent.id, description: `Removed seat for ${agent.name}` });
                        }
                        toast.success(`${agent.name} seat removed`);
                        refetchTeam();
                      }}
                    >
                      <UserMinus size={12} /> Remove seat
                    </Button>
                  )}
                </div>
              ))}
            </div>
            <Button variant="outline" size="sm" onClick={() => navigate('/dashboard/team')}>
              <Users size={14} className="mr-1.5" /> Manage Team
            </Button>
          </div>
        )}

        {/* Payment Method */}
        <div className="bg-card border border-border rounded-xl p-5 space-y-3">
          <h3 className="text-sm font-bold flex items-center gap-1.5">
            <CreditCard size={14} /> Payment Method
          </h3>
          <p className="text-sm text-muted-foreground">No payment method on file.</p>
          <Button variant="outline" size="sm" onClick={() => toast.info("Stripe billing coming soon — we'll notify you when it's ready.")}>
            Add Payment Method
          </Button>

          {agentId && (
            <AdminReports isAdmin={false} currentAgentId={agentId} />
          )}
        </div>

        <div className="text-center text-xs text-muted-foreground">
          Need a custom enterprise package?{' '}
          <a href="mailto:sales@listhq.com.au" className="text-primary hover:underline inline-flex items-center gap-1">
            <Mail size={12} /> sales@listhq.com.au
          </a>
        </div>
      </div>
    </div>
  );
};

export default BillingPage;
