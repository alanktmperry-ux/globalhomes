-- Ensure RLS is enabled
ALTER TABLE public.rent_payments ENABLE ROW LEVEL SECURITY;

-- Allow agents to read their own rent payments
DROP POLICY IF EXISTS "agents_select_own_rent_payments" ON public.rent_payments;
CREATE POLICY "agents_select_own_rent_payments"
ON public.rent_payments
FOR SELECT
USING (agent_id IN (SELECT id FROM public.agents WHERE user_id = auth.uid()));

-- Allow agents to insert rent payments for their tenancies
DROP POLICY IF EXISTS "agents_insert_own_rent_payments" ON public.rent_payments;
CREATE POLICY "agents_insert_own_rent_payments"
ON public.rent_payments
FOR INSERT
WITH CHECK (agent_id IN (SELECT id FROM public.agents WHERE user_id = auth.uid()));

-- Allow agents to update their own rent payments
DROP POLICY IF EXISTS "agents_update_own_rent_payments" ON public.rent_payments;
CREATE POLICY "agents_update_own_rent_payments"
ON public.rent_payments
FOR UPDATE
USING (agent_id IN (SELECT id FROM public.agents WHERE user_id = auth.uid()));

-- Block hard deletes — void via status update only
DROP POLICY IF EXISTS "rent_payments_no_delete" ON public.rent_payments;
CREATE POLICY "rent_payments_no_delete"
ON public.rent_payments
FOR DELETE
USING (false);