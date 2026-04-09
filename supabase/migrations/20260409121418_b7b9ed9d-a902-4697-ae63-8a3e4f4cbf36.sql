
-- Helper function
CREATE OR REPLACE FUNCTION public.get_my_agent_id()
RETURNS uuid
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT id FROM public.agents WHERE user_id = auth.uid() LIMIT 1;
$$;

-- Immutability function
CREATE OR REPLACE FUNCTION public.prevent_trust_edit()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  RAISE EXCEPTION 'Trust entries are immutable. Create a correction entry.';
END;
$$;

-- trust_receipts
ALTER TABLE public.trust_receipts ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Agent receipts" ON public.trust_receipts;
CREATE POLICY "Agent receipts" ON public.trust_receipts FOR ALL
  USING (agent_id = public.get_my_agent_id())
  WITH CHECK (agent_id = public.get_my_agent_id());
DROP TRIGGER IF EXISTS trust_receipts_immutable ON public.trust_receipts;
CREATE TRIGGER trust_receipts_immutable
  BEFORE UPDATE ON public.trust_receipts
  FOR EACH ROW EXECUTE FUNCTION public.prevent_trust_edit();

-- trust_payments
ALTER TABLE public.trust_payments ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Agent payments" ON public.trust_payments;
CREATE POLICY "Agent payments" ON public.trust_payments FOR ALL
  USING (agent_id = public.get_my_agent_id())
  WITH CHECK (agent_id = public.get_my_agent_id());
DROP TRIGGER IF EXISTS trust_payments_immutable ON public.trust_payments;
CREATE TRIGGER trust_payments_immutable
  BEFORE UPDATE ON public.trust_payments
  FOR EACH ROW EXECUTE FUNCTION public.prevent_trust_edit();

-- trust_transactions
ALTER TABLE public.trust_transactions ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Agent transactions" ON public.trust_transactions;
CREATE POLICY "Agent transactions" ON public.trust_transactions FOR ALL
  USING (trust_account_id IN (
    SELECT id FROM public.trust_accounts WHERE agent_id = public.get_my_agent_id()
  ));

-- tenancies
ALTER TABLE public.tenancies ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Agent tenancies" ON public.tenancies;
CREATE POLICY "Agent tenancies" ON public.tenancies FOR ALL
  USING (agent_id = public.get_my_agent_id())
  WITH CHECK (agent_id = public.get_my_agent_id());

-- rent_payments
ALTER TABLE public.rent_payments ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Agent rent payments" ON public.rent_payments;
CREATE POLICY "Agent rent payments" ON public.rent_payments FOR ALL
  USING (agent_id = public.get_my_agent_id())
  WITH CHECK (agent_id = public.get_my_agent_id());

-- rental_applications
ALTER TABLE public.rental_applications ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Applicant own" ON public.rental_applications;
CREATE POLICY "Applicant own" ON public.rental_applications FOR SELECT
  USING (auth.uid() = user_id);
DROP POLICY IF EXISTS "Agent applications" ON public.rental_applications;
CREATE POLICY "Agent applications" ON public.rental_applications FOR ALL
  USING (EXISTS (
    SELECT 1 FROM public.properties p
    WHERE p.id = property_id AND p.agent_id = public.get_my_agent_id()
  ));
