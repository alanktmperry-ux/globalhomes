
-- Add new columns to agent_subscriptions
ALTER TABLE public.agent_subscriptions
  ADD COLUMN IF NOT EXISTS seat_limit INTEGER NOT NULL DEFAULT 1,
  ADD COLUMN IF NOT EXISTS founding_member BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS annual_billing BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS monthly_price_aud INTEGER NOT NULL DEFAULT 0;

-- Drop existing check constraint on plan_type if any, then add new one
-- Use a DO block to safely handle the constraint
DO $$
BEGIN
  -- Try to drop any existing constraint on plan_type
  BEGIN
    ALTER TABLE public.agent_subscriptions DROP CONSTRAINT IF EXISTS agent_subscriptions_plan_type_check;
  EXCEPTION WHEN OTHERS THEN NULL;
  END;
END $$;

ALTER TABLE public.agent_subscriptions
  ADD CONSTRAINT agent_subscriptions_plan_type_check
  CHECK (plan_type IN ('basic', 'free', 'demo', 'starter', 'pro', 'agency', 'enterprise'));
