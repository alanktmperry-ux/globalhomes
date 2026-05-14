import { supabase } from '@/integrations/supabase/client';

export type StripeConnectionState = 'not_connected' | 'configured' | 'live';

export interface StripeHealth {
  keys_present: boolean;
  webhook_secret_present: boolean;
  subscription_webhook_secret_present: boolean;
  credit_webhook_secret_present: boolean;
  last_subscription_webhook_at: string | null;
  last_successful_charge_at: string | null;
  subscription_count: number;
  credit_purchase_count_30d: number;
  checked_at: string;
}

export interface StripeStatus {
  state: StripeConnectionState;
  health: StripeHealth | null;
  error: string | null;
}

/**
 * Resolve the connection state from a health payload.
 *  - not_connected: no STRIPE_SECRET_KEY in env
 *  - configured:    keys present but no webhook activity / live charges yet
 *  - live:          keys present AND we've seen a successful charge or active subscription
 */
export function resolveState(h: StripeHealth | null): StripeConnectionState {
  if (!h || !h.keys_present) return 'not_connected';
  const hasActivity =
    !!h.last_successful_charge_at ||
    !!h.last_subscription_webhook_at ||
    (h.subscription_count ?? 0) > 0 ||
    (h.credit_purchase_count_30d ?? 0) > 0;
  return hasActivity ? 'live' : 'configured';
}

export async function fetchStripeStatus(): Promise<StripeStatus> {
  try {
    const { data, error } = await supabase.functions.invoke('stripe-health', {
      method: 'POST',
    });
    if (error) {
      return { state: 'not_connected', health: null, error: error.message };
    }
    const health = data as StripeHealth;
    return { state: resolveState(health), health, error: null };
  } catch (e) {
    return {
      state: 'not_connected',
      health: null,
      error: (e as Error).message || 'Failed to fetch Stripe health',
    };
  }
}
