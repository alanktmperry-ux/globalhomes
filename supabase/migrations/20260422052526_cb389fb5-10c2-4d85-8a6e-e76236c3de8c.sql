
-- 1. Broker agencies (e.g. "Smith Finance Group")
CREATE TABLE IF NOT EXISTS public.broker_agencies (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  acl_number TEXT,
  created_by UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 2. Add agency_id + role to brokers
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='brokers' AND column_name='agency_id') THEN
    ALTER TABLE public.brokers ADD COLUMN agency_id UUID REFERENCES public.broker_agencies(id) ON DELETE SET NULL;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='brokers' AND column_name='agency_role') THEN
    ALTER TABLE public.brokers ADD COLUMN agency_role TEXT NOT NULL DEFAULT 'principal' CHECK (agency_role IN ('principal','associate'));
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_brokers_agency_id ON public.brokers(agency_id);

-- 3. Pending invites for associates
CREATE TABLE IF NOT EXISTS public.broker_agency_invites (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  agency_id UUID NOT NULL REFERENCES public.broker_agencies(id) ON DELETE CASCADE,
  email TEXT NOT NULL,
  full_name TEXT,
  invited_by UUID NOT NULL REFERENCES public.brokers(id) ON DELETE CASCADE,
  token TEXT NOT NULL UNIQUE DEFAULT encode(gen_random_bytes(16), 'hex'),
  accepted_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_broker_agency_invites_agency_id ON public.broker_agency_invites(agency_id);
CREATE INDEX IF NOT EXISTS idx_broker_agency_invites_email ON public.broker_agency_invites(lower(email));

-- 4. Helper functions (security definer, avoids RLS recursion)
CREATE OR REPLACE FUNCTION public.current_broker_id()
RETURNS UUID
LANGUAGE SQL STABLE SECURITY DEFINER SET search_path = public
AS $$
  SELECT id FROM public.brokers WHERE auth_user_id = auth.uid() LIMIT 1;
$$;

CREATE OR REPLACE FUNCTION public.current_broker_agency()
RETURNS UUID
LANGUAGE SQL STABLE SECURITY DEFINER SET search_path = public
AS $$
  SELECT agency_id FROM public.brokers WHERE auth_user_id = auth.uid() LIMIT 1;
$$;

CREATE OR REPLACE FUNCTION public.current_broker_is_principal()
RETURNS BOOLEAN
LANGUAGE SQL STABLE SECURITY DEFINER SET search_path = public
AS $$
  SELECT COALESCE((SELECT agency_role = 'principal' FROM public.brokers WHERE auth_user_id = auth.uid() LIMIT 1), false);
$$;

-- 5. RLS for new tables
ALTER TABLE public.broker_agencies ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.broker_agency_invites ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Brokers view own agency" ON public.broker_agencies;
CREATE POLICY "Brokers view own agency" ON public.broker_agencies
  FOR SELECT TO authenticated
  USING (id = public.current_broker_agency());

DROP POLICY IF EXISTS "Principals update own agency" ON public.broker_agencies;
CREATE POLICY "Principals update own agency" ON public.broker_agencies
  FOR UPDATE TO authenticated
  USING (id = public.current_broker_agency() AND public.current_broker_is_principal());

DROP POLICY IF EXISTS "Authenticated brokers can create agency" ON public.broker_agencies;
CREATE POLICY "Authenticated brokers can create agency" ON public.broker_agencies
  FOR INSERT TO authenticated
  WITH CHECK (created_by = auth.uid());

DROP POLICY IF EXISTS "Principals manage invites" ON public.broker_agency_invites;
CREATE POLICY "Principals manage invites" ON public.broker_agency_invites
  FOR ALL TO authenticated
  USING (agency_id = public.current_broker_agency() AND public.current_broker_is_principal())
  WITH CHECK (agency_id = public.current_broker_agency() AND public.current_broker_is_principal());

-- 6. Update brokers RLS so principals can see/update agency members
DROP POLICY IF EXISTS "Principals view agency brokers" ON public.brokers;
CREATE POLICY "Principals view agency brokers" ON public.brokers
  FOR SELECT TO authenticated
  USING (
    auth_user_id = auth.uid()
    OR (agency_id IS NOT NULL AND agency_id = public.current_broker_agency() AND public.current_broker_is_principal())
  );

DROP POLICY IF EXISTS "Principals update agency brokers" ON public.brokers;
CREATE POLICY "Principals update agency brokers" ON public.brokers
  FOR UPDATE TO authenticated
  USING (
    auth_user_id = auth.uid()
    OR (agency_id IS NOT NULL AND agency_id = public.current_broker_agency() AND public.current_broker_is_principal())
  );

-- Drop the now-redundant single-record policies
DROP POLICY IF EXISTS "Broker can read own record" ON public.brokers;
DROP POLICY IF EXISTS "Brokers view own record" ON public.brokers;
DROP POLICY IF EXISTS "Brokers update own record" ON public.brokers;

-- 7. referral_leads RLS for broker visibility
DROP POLICY IF EXISTS "Brokers view assigned leads" ON public.referral_leads;
CREATE POLICY "Brokers view assigned leads" ON public.referral_leads
  FOR SELECT TO authenticated
  USING (
    assigned_broker_id = public.current_broker_id()
    OR (
      public.current_broker_is_principal()
      AND assigned_broker_id IN (
        SELECT id FROM public.brokers WHERE agency_id = public.current_broker_agency()
      )
    )
  );

DROP POLICY IF EXISTS "Brokers update assigned leads" ON public.referral_leads;
CREATE POLICY "Brokers update assigned leads" ON public.referral_leads
  FOR UPDATE TO authenticated
  USING (
    assigned_broker_id = public.current_broker_id()
    OR (
      public.current_broker_is_principal()
      AND assigned_broker_id IN (
        SELECT id FROM public.brokers WHERE agency_id = public.current_broker_agency()
      )
    )
  );

-- 8. Backfill: every existing broker becomes a principal of their own single-broker agency
DO $$
DECLARE
  b RECORD;
  new_agency_id UUID;
BEGIN
  FOR b IN SELECT id, name, full_name, company, acl_number, auth_user_id FROM public.brokers WHERE agency_id IS NULL LOOP
    INSERT INTO public.broker_agencies (name, acl_number, created_by)
    VALUES (COALESCE(b.company, b.full_name, b.name, 'Broker Agency'), b.acl_number, b.auth_user_id)
    RETURNING id INTO new_agency_id;
    UPDATE public.brokers SET agency_id = new_agency_id, agency_role = 'principal' WHERE id = b.id;
  END LOOP;
END $$;

-- 9. updated_at trigger
DROP TRIGGER IF EXISTS broker_agencies_set_updated_at ON public.broker_agencies;
CREATE TRIGGER broker_agencies_set_updated_at
  BEFORE UPDATE ON public.broker_agencies
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
