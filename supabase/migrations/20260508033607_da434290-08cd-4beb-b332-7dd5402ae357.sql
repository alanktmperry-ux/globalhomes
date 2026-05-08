CREATE TABLE IF NOT EXISTS public.referral_partners (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  partner_code TEXT NOT NULL UNIQUE,
  display_name TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX IF NOT EXISTS referral_partners_user_id_idx ON public.referral_partners(user_id);

ALTER TABLE public.referral_partners ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Partners can view their own record"
ON public.referral_partners
FOR SELECT
TO authenticated
USING (auth.uid() = user_id);

ALTER TABLE public.partner_buyer_leads ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Partners can view their own leads"
ON public.partner_buyer_leads
FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.referral_partners rp
    WHERE rp.user_id = auth.uid()
      AND rp.partner_code = partner_buyer_leads.partner_code
  )
);
