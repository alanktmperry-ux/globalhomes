import { useState, useEffect } from 'react';
import { CreditCard, Check, Loader2, Zap, Crown, Building2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/lib/AuthProvider';
import DashboardHeader from './DashboardHeader';

const PLANS = [
  {
    name: 'Basic',
    price: 'Free',
    icon: Zap,
    features: ['3 active listings', 'Basic profile', 'Email support', 'Standard analytics'],
    listingLimit: 3,
  },
  {
    name: 'Pro',
    price: '$499/mo',
    icon: Crown,
    popular: true,
    features: ['10 active listings', 'Featured placement', 'Verified badge', 'Advanced analytics', 'Priority support', 'Lead scoring'],
    listingLimit: 10,
  },
  {
    name: 'Agency',
    price: '$999/mo',
    icon: Building2,
    features: ['50 active listings', 'Up to 5 agents', 'All Pro features', 'Team analytics', 'White-label options', 'API access'],
    listingLimit: 50,
  },
];

const BillingPage = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [currentPlan, setCurrentPlan] = useState('basic');
  const [listingsUsed, setListingsUsed] = useState(0);
  const [listingLimit, setListingLimit] = useState(3);

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
    toast({ title: 'Coming Soon', description: `${plan} plan upgrade will be available soon with Stripe integration.` });
  };

  if (loading) return <div className="flex justify-center py-20"><Loader2 className="animate-spin text-primary" size={24} /></div>;

  const usagePercent = Math.min((listingsUsed / listingLimit) * 100, 100);

  return (
    <div>
      <DashboardHeader title="Subscription & Billing" subtitle="Manage your plan and payment methods" />
      <div className="p-4 sm:p-6 max-w-4xl space-y-6">
        {/* Current Plan */}
        <div className="bg-card border border-border rounded-xl p-5 space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="font-display text-sm font-bold">Current Plan</h3>
              <p className="text-2xl font-bold text-primary capitalize mt-1">{currentPlan}</p>
            </div>
            <Badge variant="secondary" className="capitalize">{currentPlan}</Badge>
          </div>
          <div>
            <div className="flex justify-between text-xs text-muted-foreground mb-1">
              <span>Listings: {listingsUsed} / {listingLimit}</span>
              <span>{usagePercent.toFixed(0)}%</span>
            </div>
            <Progress value={usagePercent} className="h-2" />
          </div>
        </div>

        {/* Plans */}
        <div className="grid sm:grid-cols-3 gap-4">
          {PLANS.map(plan => {
            const isCurrent = currentPlan === plan.name.toLowerCase();
            return (
              <div key={plan.name} className={`bg-card border rounded-xl p-5 space-y-4 relative ${plan.popular ? 'border-primary ring-1 ring-primary/20' : 'border-border'}`}>
                {plan.popular && (
                  <Badge className="absolute -top-2.5 left-1/2 -translate-x-1/2 bg-primary text-primary-foreground text-[10px]">Most Popular</Badge>
                )}
                <div className="text-center">
                  <plan.icon size={24} className="mx-auto text-primary mb-2" />
                  <h4 className="font-display font-bold">{plan.name}</h4>
                  <p className="text-2xl font-bold mt-1">{plan.price}</p>
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
                  {isCurrent ? 'Current Plan' : 'Upgrade'}
                </Button>
              </div>
            );
          })}
        </div>

        {/* Payment */}
        <div className="bg-card border border-border rounded-xl p-5 space-y-3">
          <h3 className="font-display text-sm font-bold flex items-center gap-1.5">
            <CreditCard size={14} /> Payment Method
          </h3>
          <p className="text-sm text-muted-foreground">No payment method on file.</p>
          <Button variant="outline" size="sm" onClick={() => toast({ title: 'Coming Soon', description: 'Payment management will be available with Stripe integration.' })}>
            Add Payment Method
          </Button>
        </div>
      </div>
    </div>
  );
};

export default BillingPage;
