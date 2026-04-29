CREATE TABLE public.halo_credits (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  agent_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  balance INTEGER NOT NULL DEFAULT 0,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(agent_id)
);

CREATE TABLE public.halo_credit_transactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  agent_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  amount INTEGER NOT NULL,
  type TEXT NOT NULL CHECK (type IN ('grant','spend','refund')),
  halo_id UUID REFERENCES public.halos(id) ON DELETE SET NULL,
  note TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE public.halo_responses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  halo_id UUID NOT NULL REFERENCES public.halos(id) ON DELETE CASCADE,
  agent_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  unlocked_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(halo_id, agent_id)
);

CREATE INDEX idx_halo_credit_tx_agent ON public.halo_credit_transactions(agent_id, created_at DESC);
CREATE INDEX idx_halo_responses_agent ON public.halo_responses(agent_id);
CREATE INDEX idx_halo_responses_halo ON public.halo_responses(halo_id);

ALTER TABLE public.halo_credits ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.halo_credit_transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.halo_responses ENABLE ROW LEVEL SECURITY;

-- Agents own their data
CREATE POLICY "agents_select_own_credits" ON public.halo_credits
  FOR SELECT USING (auth.uid() = agent_id);
CREATE POLICY "agents_update_own_credits" ON public.halo_credits
  FOR UPDATE USING (auth.uid() = agent_id);
CREATE POLICY "agents_insert_own_credits" ON public.halo_credits
  FOR INSERT WITH CHECK (auth.uid() = agent_id);

CREATE POLICY "agents_select_own_transactions" ON public.halo_credit_transactions
  FOR SELECT USING (auth.uid() = agent_id);
CREATE POLICY "agents_insert_own_transactions" ON public.halo_credit_transactions
  FOR INSERT WITH CHECK (auth.uid() = agent_id);

CREATE POLICY "agents_select_own_responses" ON public.halo_responses
  FOR SELECT USING (auth.uid() = agent_id);
CREATE POLICY "agents_insert_own_responses" ON public.halo_responses
  FOR INSERT WITH CHECK (auth.uid() = agent_id);

-- Admins can see/manage credits & transactions for credit management UI
CREATE POLICY "admins_all_credits" ON public.halo_credits
  FOR ALL USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "admins_all_transactions" ON public.halo_credit_transactions
  FOR ALL USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "admins_all_responses" ON public.halo_responses
  FOR SELECT USING (public.has_role(auth.uid(), 'admin'));

-- Authenticated agents can read active halos on the board
CREATE POLICY "agents_read_active_halos" ON public.halos
  FOR SELECT TO authenticated USING (status = 'active');
