-- Add trial_ends_at to agent_subscriptions
ALTER TABLE public.agent_subscriptions
  ADD COLUMN IF NOT EXISTS trial_ends_at timestamptz;

-- Backfill: demo-plan agents get 60-day trial from subscription_start
UPDATE public.agent_subscriptions
SET trial_ends_at = subscription_start + INTERVAL '60 days'
WHERE plan_type = 'demo' AND trial_ends_at IS NULL;

-- Helpful index for "trials ending soon" admin queries
CREATE INDEX IF NOT EXISTS idx_agent_subscriptions_trial_ends_at
  ON public.agent_subscriptions (trial_ends_at)
  WHERE trial_ends_at IS NOT NULL;