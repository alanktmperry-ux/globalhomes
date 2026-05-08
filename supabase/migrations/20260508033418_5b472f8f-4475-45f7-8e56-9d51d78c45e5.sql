CREATE TABLE IF NOT EXISTS public.partner_buyer_leads (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  partner_code TEXT NOT NULL,
  name TEXT NOT NULL,
  email TEXT NOT NULL,
  phone TEXT,
  suburb_interest TEXT,
  consent_given BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS partner_buyer_leads_code_idx ON public.partner_buyer_leads(partner_code);

ALTER TABLE public.partner_buyer_leads ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can submit a partner referral lead"
ON public.partner_buyer_leads
FOR INSERT
WITH CHECK (true);
