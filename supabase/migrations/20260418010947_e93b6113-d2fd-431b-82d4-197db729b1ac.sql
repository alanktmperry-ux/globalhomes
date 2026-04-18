CREATE TABLE public.mortgage_referrals (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  email TEXT NOT NULL,
  phone TEXT NOT NULL,
  purchase_price NUMERIC,
  timeframe TEXT NOT NULL,
  source_page TEXT NOT NULL,
  property_id UUID,
  agent_id UUID,
  status TEXT NOT NULL DEFAULT 'new',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_mortgage_referrals_agent_id ON public.mortgage_referrals(agent_id);
CREATE INDEX idx_mortgage_referrals_property_id ON public.mortgage_referrals(property_id);
CREATE INDEX idx_mortgage_referrals_status ON public.mortgage_referrals(status);
CREATE INDEX idx_mortgage_referrals_created_at ON public.mortgage_referrals(created_at DESC);

ALTER TABLE public.mortgage_referrals ENABLE ROW LEVEL SECURITY;

-- Anyone can submit a referral (public lead capture)
CREATE POLICY "Anyone can submit mortgage referrals"
ON public.mortgage_referrals
FOR INSERT
WITH CHECK (true);

-- Agents can view referrals tied to their agent record
CREATE POLICY "Agents can view their referrals"
ON public.mortgage_referrals
FOR SELECT
USING (
  agent_id IN (
    SELECT id FROM public.agents WHERE user_id = auth.uid()
  )
);

-- Trigger for updated_at
CREATE TRIGGER update_mortgage_referrals_updated_at
BEFORE UPDATE ON public.mortgage_referrals
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();