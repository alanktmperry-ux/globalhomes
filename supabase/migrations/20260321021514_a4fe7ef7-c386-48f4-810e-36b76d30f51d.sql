
-- PART 1: Add partner to the app_role enum
ALTER TYPE public.app_role ADD VALUE IF NOT EXISTS 'partner';

-- PART 2: Create partners table
CREATE TABLE public.partners (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL UNIQUE,
  company_name TEXT NOT NULL,
  logo_url TEXT,
  abn TEXT,
  contact_name TEXT NOT NULL,
  contact_email TEXT NOT NULL,
  contact_phone TEXT,
  website TEXT,
  is_verified BOOLEAN NOT NULL DEFAULT false,
  verified_at TIMESTAMPTZ,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.partners ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Partners can view own profile"
  ON public.partners FOR SELECT TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Partners can update own profile"
  ON public.partners FOR UPDATE TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Partners can insert own profile"
  ON public.partners FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Admins can view all partners"
  ON public.partners FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can update all partners"
  ON public.partners FOR UPDATE TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

-- PART 3: Create partner_agencies table
CREATE TABLE public.partner_agencies (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  partner_id UUID NOT NULL REFERENCES public.partners(id) ON DELETE CASCADE,
  agency_id UUID NOT NULL REFERENCES public.agencies(id) ON DELETE CASCADE,
  invited_by_agent_id UUID REFERENCES public.agents(id) ON DELETE SET NULL,
  status TEXT NOT NULL DEFAULT 'pending',
  access_level TEXT NOT NULL DEFAULT 'trust_and_pm',
  invite_token TEXT UNIQUE,
  invite_expires_at TIMESTAMPTZ,
  invited_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  accepted_at TIMESTAMPTZ,
  revoked_at TIMESTAMPTZ,
  revoked_by UUID REFERENCES auth.users(id),
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(partner_id, agency_id)
);

-- Validation trigger instead of CHECK constraints
CREATE OR REPLACE FUNCTION public.validate_partner_agency()
  RETURNS trigger
  LANGUAGE plpgsql
  SET search_path TO 'public'
AS $$
BEGIN
  IF NEW.status NOT IN ('pending', 'active', 'revoked') THEN
    RAISE EXCEPTION 'Invalid partner_agencies status: %', NEW.status;
  END IF;
  IF NEW.access_level NOT IN ('trust_only', 'trust_and_pm', 'full_pm') THEN
    RAISE EXCEPTION 'Invalid partner_agencies access_level: %', NEW.access_level;
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_validate_partner_agency
  BEFORE INSERT OR UPDATE ON public.partner_agencies
  FOR EACH ROW EXECUTE FUNCTION public.validate_partner_agency();

ALTER TABLE public.partner_agencies ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Partners can view own agencies"
  ON public.partner_agencies FOR SELECT TO authenticated
  USING (
    partner_id IN (
      SELECT id FROM public.partners WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Agency members can view their partners"
  ON public.partner_agencies FOR SELECT TO authenticated
  USING (
    public.is_agency_owner_or_admin(auth.uid(), agency_id)
  );

CREATE POLICY "Agency admins can insert partner links"
  ON public.partner_agencies FOR INSERT TO authenticated
  WITH CHECK (
    public.is_agency_owner_or_admin(auth.uid(), agency_id)
  );

CREATE POLICY "Agency admins can update partner links"
  ON public.partner_agencies FOR UPDATE TO authenticated
  USING (
    public.is_agency_owner_or_admin(auth.uid(), agency_id)
  );

CREATE POLICY "Admins can view all partner agencies"
  ON public.partner_agencies FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

-- PART 4: Security definer helper for partner access checks
CREATE OR REPLACE FUNCTION public.is_partner_for_agency(_user_id UUID, _agency_id UUID)
  RETURNS boolean
  LANGUAGE sql
  STABLE
  SECURITY DEFINER
  SET search_path TO 'public'
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.partner_agencies pa
    JOIN public.partners p ON p.id = pa.partner_id
    WHERE p.user_id = _user_id
      AND pa.agency_id = _agency_id
      AND pa.status = 'active'
  )
$$;
