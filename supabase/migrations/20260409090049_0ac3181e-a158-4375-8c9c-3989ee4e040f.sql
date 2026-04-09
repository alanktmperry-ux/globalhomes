ALTER TABLE public.trust_transactions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Agent sees own trust transactions" ON public.trust_transactions
  FOR ALL USING (
    trust_account_id IN (
      SELECT id FROM public.trust_accounts 
      WHERE agent_id = (SELECT id FROM public.agents WHERE user_id = auth.uid())
    )
  );