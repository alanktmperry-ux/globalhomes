DROP POLICY IF EXISTS "Brokers can view assigned leads" ON public.referral_leads;
CREATE POLICY "Brokers can view assigned leads"
ON public.referral_leads
FOR SELECT
USING (
  assigned_broker_id IN (
    SELECT id FROM public.brokers WHERE auth_user_id = auth.uid()
  )
);

DROP POLICY IF EXISTS "Agents can view own referral leads" ON public.referral_leads;
CREATE POLICY "Agents can view own referral leads"
ON public.referral_leads
FOR SELECT
USING (
  agent_id IN (
    SELECT id FROM public.agents WHERE user_id = auth.uid()
  )
);