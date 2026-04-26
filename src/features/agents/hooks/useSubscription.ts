import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/features/auth/AuthProvider';
import { useCurrentAgent } from '@/features/agents/hooks/useCurrentAgent';

export type PlanType = 'demo' | 'starter' | 'pro' | 'agency' | 'enterprise' | null;

export interface PlanFeatures {
  canAccessTrust: boolean;
  canAccessNetwork: boolean;
  canAccessInspections: boolean;
  canAccessSettlement: boolean;
  canAccessCommission: boolean;
  canAccessRentRoll: boolean;
  canAccessTeam: boolean;
  canAccessAgencyDashboard: boolean;
  canAccessWhiteLabel: boolean;
  canAccessOwnerPortal: boolean;
  canAccessLeadRouting: boolean;
  canUnlimitedListings: boolean;
}

export interface SubscriptionState extends PlanFeatures {
  plan: PlanType;
  isDemo: boolean;
  isStarter: boolean;
  isPro: boolean;
  isAgency: boolean;
  isEnterprise: boolean;
  isPaid: boolean;
  listingLimit: number;
  seatLimit: number;
  foundingMember: boolean;
  subscriptionEnd: string | null;
  autoRenew: boolean;
  loading: boolean;
  subLoadingTimeout: boolean;
}

const PRO_PLUS = ['pro', 'agency', 'enterprise'];
const AGENCY_PLUS = ['agency', 'enterprise'];

export function getPlanFeatures(plan: string | null): PlanFeatures {
  const p = plan || 'demo';
  return {
    canAccessTrust: PRO_PLUS.includes(p),
    canAccessNetwork: PRO_PLUS.includes(p),
    canAccessInspections: PRO_PLUS.includes(p),
    canAccessSettlement: PRO_PLUS.includes(p),
    canAccessCommission: PRO_PLUS.includes(p),
    canAccessRentRoll: PRO_PLUS.includes(p),
    canAccessTeam: AGENCY_PLUS.includes(p),
    canAccessAgencyDashboard: AGENCY_PLUS.includes(p),
    canAccessWhiteLabel: AGENCY_PLUS.includes(p),
    canAccessOwnerPortal: AGENCY_PLUS.includes(p),
    canAccessLeadRouting: AGENCY_PLUS.includes(p),
    canUnlimitedListings: PRO_PLUS.includes(p),
  };
}

export function useSubscription(): SubscriptionState {
  const { user } = useAuth();
  const { agent } = useCurrentAgent();
  const [state, setState] = useState<SubscriptionState>({
    plan: null,
    isDemo: true,
    isStarter: false,
    isPro: false,
    isAgency: false,
    isEnterprise: false,
    isPaid: false,
    listingLimit: 3,
    seatLimit: 1,
    foundingMember: false,
    subscriptionEnd: null,
    autoRenew: false,
    loading: true,
    subLoadingTimeout: false,
    ...getPlanFeatures(null),
  });

  // Safety net: if loading takes longer than 3s, treat as loaded to unblock the UI
  const [subLoadingTimeout, setSubLoadingTimeout] = useState(false);

  useEffect(() => {
    if (!state.loading) return;
    const timer = setTimeout(() => setSubLoadingTimeout(true), 3000);
    return () => clearTimeout(timer);
  }, [state.loading]);

  useEffect(() => {
    if (!user) {
      setState(prev => ({ ...prev, loading: false }));
      return;
    }

    if (!agent?.id) {
      setState(prev => ({ ...prev, loading: false }));
      return;
    }

    let cancelled = false;

    const fetch = async () => {
      try {
        const { data: sub } = await supabase
          .from('agent_subscriptions')
          .select('*')
          .eq('agent_id', agent.id)
          .maybeSingle();

        if (cancelled) return;

        const plan = (sub as any)?.plan_type as string || 'demo';
        const normalPlan = (['starter', 'pro', 'agency', 'enterprise'].includes(plan) ? plan : 'demo') as PlanType;
        const features = getPlanFeatures(normalPlan);

        setState({
          plan: normalPlan,
          isDemo: normalPlan === 'demo',
          isStarter: normalPlan === 'starter',
          isPro: normalPlan === 'pro',
          isAgency: normalPlan === 'agency',
          isEnterprise: normalPlan === 'enterprise',
          isPaid: normalPlan !== 'demo',
          listingLimit: (sub as any)?.listing_limit ?? 3,
          seatLimit: (sub as any)?.seat_limit ?? 1,
          foundingMember: (sub as any)?.founding_member ?? false,
          subscriptionEnd: (sub as any)?.subscription_end ?? null,
          autoRenew: (sub as any)?.auto_renew ?? false,
          loading: false,
          subLoadingTimeout: false,
          ...features,
        });
      } catch {
        if (!cancelled) setState(prev => ({ ...prev, loading: false }));
      }
    };

    fetch();
    return () => { cancelled = true; };
  }, [user, agent?.id]);

  // If the timeout fired but we're still loading, return loading: false to unblock pages
  if (subLoadingTimeout && state.loading) {
    return { ...state, loading: false, subLoadingTimeout: true };
  }

  return state;
}
