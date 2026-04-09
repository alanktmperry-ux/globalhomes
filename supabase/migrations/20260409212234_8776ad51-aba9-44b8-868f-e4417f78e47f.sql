ALTER TABLE public.agents
ADD COLUMN subscription_status text DEFAULT 'active',
ADD COLUMN payment_failed_at timestamptz,
ADD COLUMN admin_grace_until timestamptz;

-- Use a validation trigger instead of CHECK constraint
CREATE OR REPLACE FUNCTION public.validate_agent_subscription_status()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = 'public'
AS $$
BEGIN
  IF NEW.subscription_status NOT IN ('active', 'payment_failed', 'locked', 'cancelled') THEN
    RAISE EXCEPTION 'Invalid subscription_status: %', NEW.subscription_status;
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_validate_agent_subscription_status
BEFORE INSERT OR UPDATE ON public.agents
FOR EACH ROW
EXECUTE FUNCTION public.validate_agent_subscription_status();