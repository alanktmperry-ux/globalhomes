
-- Create lead_purchases table for audit trail
CREATE TABLE public.lead_purchases (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  lead_id UUID NOT NULL REFERENCES public.consumer_profiles(id) ON DELETE CASCADE,
  agent_id UUID NOT NULL REFERENCES public.agents(id) ON DELETE CASCADE,
  price INTEGER NOT NULL DEFAULT 0,
  stripe_charge_id TEXT,
  status TEXT NOT NULL DEFAULT 'completed',
  purchased_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  contacted_at TIMESTAMPTZ,
  followed_up BOOLEAN DEFAULT false,
  outcome TEXT,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_lead_purchases_agent ON public.lead_purchases(agent_id);
CREATE INDEX idx_lead_purchases_lead ON public.lead_purchases(lead_id);
CREATE INDEX idx_lead_purchases_status ON public.lead_purchases(status);

ALTER TABLE public.lead_purchases ENABLE ROW LEVEL SECURITY;

-- Agents can view their own purchases
CREATE POLICY "Agents can view own purchases"
  ON public.lead_purchases
  FOR SELECT
  TO authenticated
  USING (
    agent_id IN (
      SELECT id FROM public.agents WHERE user_id = auth.uid()
    )
  );

-- Only service role can insert (via Edge Function)
CREATE POLICY "Service role can insert purchases"
  ON public.lead_purchases
  FOR INSERT
  TO service_role
  WITH CHECK (true);

-- Agents can update their own purchases (contacted_at, outcome, notes)
CREATE POLICY "Agents can update own purchases"
  ON public.lead_purchases
  FOR UPDATE
  TO authenticated
  USING (
    agent_id IN (
      SELECT id FROM public.agents WHERE user_id = auth.uid()
    )
  )
  WITH CHECK (
    agent_id IN (
      SELECT id FROM public.agents WHERE user_id = auth.uid()
    )
  );
