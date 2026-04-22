
-- Brokers: add missing fields
ALTER TABLE public.brokers
  ADD COLUMN IF NOT EXISTS full_name text,
  ADD COLUMN IF NOT EXISTS loan_types text[] DEFAULT '{}'::text[],
  ADD COLUMN IF NOT EXISTS is_exclusive boolean DEFAULT false,
  ADD COLUMN IF NOT EXISTS last_assigned_at timestamptz;

-- Referral leads: add missing fields
ALTER TABLE public.referral_leads
  ADD COLUMN IF NOT EXISTS agent_id uuid,
  ADD COLUMN IF NOT EXISTS buyer_language text,
  ADD COLUMN IF NOT EXISTS loan_type text,
  ADD COLUMN IF NOT EXISTS estimated_loan_amount numeric,
  ADD COLUMN IF NOT EXISTS message text,
  ADD COLUMN IF NOT EXISTS assigned_broker_id uuid REFERENCES public.brokers(id),
  ADD COLUMN IF NOT EXISTS claimed_at timestamptz,
  ADD COLUMN IF NOT EXISTS response_time_hours numeric,
  ADD COLUMN IF NOT EXISTS referral_fee_type text,
  ADD COLUMN IF NOT EXISTS referral_fee_amount numeric,
  ADD COLUMN IF NOT EXISTS platform_fee_amount numeric,
  ADD COLUMN IF NOT EXISTS fee_agreed boolean DEFAULT false,
  ADD COLUMN IF NOT EXISTS fee_agreed_at timestamptz,
  ADD COLUMN IF NOT EXISTS calendly_booking_url text,
  ADD COLUMN IF NOT EXISTS ghl_contact_id text,
  ADD COLUMN IF NOT EXISTS settled_at timestamptz;

-- Default status if not set
UPDATE public.referral_leads SET status = 'new' WHERE status IS NULL;

-- updated_at trigger
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

DROP TRIGGER IF EXISTS update_referral_leads_updated_at ON public.referral_leads;
CREATE TRIGGER update_referral_leads_updated_at
  BEFORE UPDATE ON public.referral_leads
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Helper: current broker id
CREATE OR REPLACE FUNCTION public.current_broker_id()
RETURNS uuid
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT id FROM public.brokers WHERE auth_user_id = auth.uid() LIMIT 1;
$$;

-- Enable RLS
ALTER TABLE public.referral_leads ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.brokers ENABLE ROW LEVEL SECURITY;

-- Referral leads policies
DROP POLICY IF EXISTS "Brokers view assigned or unclaimed leads" ON public.referral_leads;
CREATE POLICY "Brokers view assigned or unclaimed leads"
  ON public.referral_leads FOR SELECT
  TO authenticated
  USING (
    assigned_broker_id = public.current_broker_id()
    OR (status = 'new' AND assigned_broker_id IS NULL)
    OR agent_id IN (SELECT id FROM public.agents WHERE user_id = auth.uid())
  );

DROP POLICY IF EXISTS "Brokers update assigned leads" ON public.referral_leads;
CREATE POLICY "Brokers update assigned leads"
  ON public.referral_leads FOR UPDATE
  TO authenticated
  USING (
    assigned_broker_id = public.current_broker_id()
    OR (status = 'new' AND assigned_broker_id IS NULL)
  );

-- Brokers policies
DROP POLICY IF EXISTS "Brokers view own record" ON public.brokers;
CREATE POLICY "Brokers view own record"
  ON public.brokers FOR SELECT
  TO authenticated
  USING (auth_user_id = auth.uid());

DROP POLICY IF EXISTS "Brokers update own record" ON public.brokers;
CREATE POLICY "Brokers update own record"
  ON public.brokers FOR UPDATE
  TO authenticated
  USING (auth_user_id = auth.uid());
