import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/features/auth/AuthProvider';
import { useCurrentAgent } from '@/features/agents/hooks/useCurrentAgent';

export type PlanType = 'demo' | 'solo' | 'agency' | 'agency_pro' | 'enterprise' | null;

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
  canAccessTrustAccountantPartner: boolean;
  canAccessMortgageBrokerWidget: boolean;
  canAccessApi: boolean;
  canAccessMultiBranch: boolean;
  canAccessBuyerConcierge: boolean;
  canAccessSettlementConcierge: boolean;
  conciergeMatchesPerMonth: number;
  conciergeIntrosPerMonth: number;
}

export interface PlanLimits {
  listingLimit: number;
  featuredListingsPerMonth: number;
  premiumListingsPerMonth: number;
  pocketListingsPerMonth: number;
  seatLimit: number;
  featuredCreditsAud: number;
}

export interface SubscriptionState extends PlanFeatures, PlanLimits {
  plan: PlanType;
  isDemo: boolean;
  isSolo: boolean;
  isAgency: boolean;
  isAgencyPro: boolean;
  isEnterprise: boolean;
  isPaid: boolean;
  subscriptionEnd: string | null;
  trialEndsAt: string | null;
  autoRenew: boolean;
  loading: boolean;
  subLoadingTimeout: boolean;
}

const SOLO_PLUS = ['solo', 'agency', 'agency_pro', 'enterprise'];
const AGENCY_PLUS = ['agency', 'agency_pro', 'enterprise'];
const PRO_PLUS = ['agency_pro', 'enterprise'];

export function getPlanFeatures(plan: string | null): PlanFeatures {
  const p = plan || 'demo';
  return {
    canAccessTrust: SOLO_PLUS.includes(p),
    canAccessNetwork: SOLO_PLUS.includes(p),
    canAccessInspections: SOLO_PLUS.includes(p),
    canAccessSettlement: SOLO_PLUS.includes(p),
    canAccessCommission: SOLO_PLUS.includes(p),
    canAccessRentRoll: SOLO_PLUS.includes(p),
    canAccessTeam: AGENCY_PLUS.includes(p),
    canAccessAgencyDashboard: AGENCY_PLUS.includes(p),
    canAccessWhiteLabel: PRO_PLUS.includes(p),
    canAccessOwnerPortal: AGENCY_PLUS.includes(p),
    canAccessLeadRouting: AGENCY_PLUS.includes(p),
    canUnlimitedListings: PRO_PLUS.includes(p),
    canAccessTrustAccountantPartner: PRO_PLUS.includes(p),
    canAccessMortgageBrokerWidget: AGENCY_PLUS.includes(p),
    canAccessApi: PRO_PLUS.includes(p),
    canAccessMultiBranch: PRO_PLUS.includes(p),
    canAccessBuyerConcierge: SOLO_PLUS.includes(p),
    canAccessSettlementConcierge: AGENCY_PLUS.includes(p),
    conciergeMatchesPerMonth:
      p === 'solo' ? 20 :
      p === 'agency' ? 100 :
      (PRO_PLUS.includes(p)) ? Infinity : 0,
    conciergeIntrosPerMonth:
      p === 'solo' ? 5 :
      p === 'agency' ? 30 :
      (PRO_PLUS.includes(p)) ? Infinity : 0,
  };
}

export function getPlanLimits(plan: string | null): PlanLimits {
  switch (plan) {
    case 'solo':
      return { listingLimit: 15, featuredListingsPerMonth: 2, premiumListingsPerMonth: 0, pocketListingsPerMonth: 20, seatLimit: 1, featuredCreditsAud: 0 };
    case 'agency':
      return { listingLimit: 75, featuredListingsPerMonth: 15, premiumListingsPerMonth: 3, pocketListingsPerMonth: Infinity, seatLimit: 12, featuredCreditsAud: 0 };
    case 'agency_pro':
      return { listingLimit: Infinity, featuredListingsPerMonth: 50, premiumListingsPerMonth: 10, pocketListingsPerMonth: Infinity, seatLimit: Infinity, featuredCreditsAud: 750 };
    case 'enterprise':
      return { listingLimit: Infinity, featuredListingsPerMonth: Infinity, premiumListingsPerMonth: 25, pocketListingsPerMonth: Infinity, seatLimit: Infinity, featuredCreditsAud: 2000 };
    default:
      return { listingLimit: 3, featuredListingsPerMonth: 0, premiumListingsPerMonth: 0, pocketListingsPerMonth: 5, seatLimit: 1, featuredCreditsAud: 0 };
  }
}

const initialLimits = getPlanLimits(null);

export function useSubscription(): SubscriptionState {
  const { user } = useAuth();
  const { agent } = useCurrentAgent();
  const [state, setState] = useState<SubscriptionState>({
    plan: null,
    isDemo: true,
    isSolo: false,
    isAgency: false,
    isAgencyPro: false,
    isEnterprise: false,
    isPaid: false,
    subscriptionEnd: null,
    trialEndsAt: null,
    autoRenew: false,
    loading: true,
    subLoadingTimeout: false,
    ...getPlanFeatures(null),
    ...initialLimits,
  });

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

        const rawPlan = (sub as any)?.plan_type as string || 'demo';
        const normalPlan = (['solo', 'agency', 'agency_pro', 'enterprise'].includes(rawPlan) ? rawPlan : 'demo') as PlanType;
        const features = getPlanFeatures(normalPlan);
        const limits = getPlanLimits(normalPlan);

        setState({
          plan: normalPlan,
          isDemo: normalPlan === 'demo',
          isSolo: normalPlan === 'solo',
          isAgency: normalPlan === 'agency',
          isAgencyPro: normalPlan === 'agency_pro',
          isEnterprise: normalPlan === 'enterprise',
          isPaid: normalPlan !== 'demo',
          subscriptionEnd: (sub as any)?.subscription_end ?? null,
          trialEndsAt: (sub as any)?.trial_ends_at ?? null,
          autoRenew: (sub as any)?.auto_renew ?? false,
          loading: false,
          subLoadingTimeout: false,
          ...features,
          ...limits,
        });
      } catch {
        if (!cancelled) setState(prev => ({ ...prev, loading: false }));
      }
    };

    fetch();
    return () => { cancelled = true; };
  }, [user, agent?.id]);

  if (subLoadingTimeout && state.loading) {
    return { ...state, loading: false, subLoadingTimeout: true };
  }

  return state;
}
