
-- Auto-assign new leads round-robin
CREATE OR REPLACE FUNCTION public.assign_referral_lead_round_robin()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  next_broker uuid;
BEGIN
  IF NEW.assigned_broker_id IS NOT NULL THEN
    RETURN NEW;
  END IF;

  SELECT id INTO next_broker
  FROM public.brokers
  WHERE is_active = true
  ORDER BY last_assigned_at NULLS FIRST, created_at ASC
  LIMIT 1;

  IF next_broker IS NOT NULL THEN
    NEW.assigned_broker_id := next_broker;
    UPDATE public.brokers SET last_assigned_at = now() WHERE id = next_broker;
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_assign_referral_lead ON public.referral_leads;
CREATE TRIGGER trg_assign_referral_lead
  BEFORE INSERT ON public.referral_leads
  FOR EACH ROW EXECUTE FUNCTION public.assign_referral_lead_round_robin();

-- Rotate unclaimed leads (call from cron or edge fn)
CREATE OR REPLACE FUNCTION public.rotate_unclaimed_referral_leads()
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  rotated integer := 0;
  lead_row RECORD;
  next_broker uuid;
BEGIN
  FOR lead_row IN
    SELECT id, assigned_broker_id FROM public.referral_leads
    WHERE status = 'new'
      AND claimed_at IS NULL
      AND created_at < (now() - interval '24 hours')
  LOOP
    SELECT id INTO next_broker
    FROM public.brokers
    WHERE is_active = true AND id <> COALESCE(lead_row.assigned_broker_id, '00000000-0000-0000-0000-000000000000'::uuid)
    ORDER BY last_assigned_at NULLS FIRST, created_at ASC
    LIMIT 1;

    IF next_broker IS NOT NULL THEN
      UPDATE public.referral_leads SET assigned_broker_id = next_broker, updated_at = now() WHERE id = lead_row.id;
      UPDATE public.brokers SET last_assigned_at = now() WHERE id = next_broker;
      rotated := rotated + 1;
    END IF;
  END LOOP;
  RETURN rotated;
END;
$$;
