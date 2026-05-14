CREATE OR REPLACE FUNCTION public.grant_initial_halo_credits()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.approval_status = 'approved'
     AND COALESCE(OLD.approval_status, 'pending') <> 'approved' THEN
    INSERT INTO public.halo_credits (agent_id, balance)
    VALUES (NEW.user_id, 3)
    ON CONFLICT (agent_id) DO NOTHING;

    INSERT INTO public.halo_credit_transactions (agent_id, amount, type, note)
    VALUES (NEW.user_id, 3, 'grant', 'Founding agent welcome — 3 free credits');
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_grant_initial_halo_credits ON public.agents;
CREATE TRIGGER trg_grant_initial_halo_credits
AFTER INSERT OR UPDATE OF approval_status ON public.agents
FOR EACH ROW
EXECUTE FUNCTION public.grant_initial_halo_credits();

INSERT INTO public.halo_credits (agent_id, balance)
SELECT a.user_id, 3
FROM public.agents a
WHERE a.approval_status = 'approved'
  AND a.user_id NOT IN (SELECT agent_id FROM public.halo_credits)
ON CONFLICT (agent_id) DO NOTHING;