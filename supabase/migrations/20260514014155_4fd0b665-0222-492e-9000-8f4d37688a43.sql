ALTER TABLE public.agent_subscriptions
  ADD COLUMN IF NOT EXISTS amount_cents INTEGER,
  ADD COLUMN IF NOT EXISTS canceled_at TIMESTAMPTZ;

COMMENT ON COLUMN public.agent_subscriptions.amount_cents IS
  'Authoritative Stripe price (cents AUD) — populated by stripe-subscription-webhook. Falls back to PLAN_MRR constant when null (pre-Stripe agents).';
COMMENT ON COLUMN public.agent_subscriptions.canceled_at IS
  'Set by stripe-subscription-webhook when customer.subscription.deleted fires. Authoritative churn signal — do not infer from updated_at.';

CREATE INDEX IF NOT EXISTS idx_agent_subscriptions_canceled_at
  ON public.agent_subscriptions(canceled_at) WHERE canceled_at IS NOT NULL;