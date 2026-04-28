ALTER TABLE public.referral_leads
  ADD COLUMN IF NOT EXISTS claim_expires_at timestamp with time zone;

CREATE INDEX IF NOT EXISTS idx_referral_leads_unclaimed
  ON public.referral_leads (created_at DESC)
  WHERE assigned_broker_id IS NULL AND status = 'new';