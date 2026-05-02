-- 1. Unique constraint to make Stripe webhook idempotent
ALTER TABLE public.halo_credit_purchases
  DROP CONSTRAINT IF EXISTS halo_credit_purchases_session_id_unique;
ALTER TABLE public.halo_credit_purchases
  ADD CONSTRAINT halo_credit_purchases_session_id_unique UNIQUE (stripe_session_id);

-- 2. Atomic credit increment RPC (UPSERT semantics)
CREATE OR REPLACE FUNCTION public.increment_halo_credits(
  p_agent_id UUID,
  p_credits INTEGER
)
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_new_balance INTEGER;
BEGIN
  INSERT INTO public.halo_credits (agent_id, balance, updated_at)
  VALUES (p_agent_id, p_credits, now())
  ON CONFLICT (agent_id) DO UPDATE
    SET balance = public.halo_credits.balance + EXCLUDED.balance,
        updated_at = now()
  RETURNING balance INTO v_new_balance;
  RETURN v_new_balance;
END;
$$;

REVOKE ALL ON FUNCTION public.increment_halo_credits(UUID, INTEGER) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.increment_halo_credits(UUID, INTEGER) TO service_role;