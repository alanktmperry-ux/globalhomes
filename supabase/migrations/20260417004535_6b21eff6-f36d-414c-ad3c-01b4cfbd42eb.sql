-- ============================================================
-- International Agent Referral Portal
-- ============================================================

-- Helper: generate unique 8-character uppercase alphanumeric code
CREATE OR REPLACE FUNCTION public.generate_referral_code()
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  chars text := 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  result text;
  i int;
  exists_check boolean;
BEGIN
  LOOP
    result := '';
    FOR i IN 1..8 LOOP
      result := result || substr(chars, floor(random() * length(chars))::int + 1, 1);
    END LOOP;
    SELECT EXISTS (SELECT 1 FROM public.referral_agents WHERE referral_code = result) INTO exists_check;
    EXIT WHEN NOT exists_check;
  END LOOP;
  RETURN result;
END;
$$;

-- ============================================================
-- referral_agents
-- ============================================================
CREATE TABLE public.referral_agents (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE,
  full_name text NOT NULL,
  email text NOT NULL,
  country text NOT NULL,
  language_preference text DEFAULT 'zh',
  referral_code text UNIQUE NOT NULL,
  agency_name text,
  phone text,
  wechat_id text,
  status text NOT NULL DEFAULT 'pending',
  tier text NOT NULL DEFAULT 'standard',
  total_referrals int NOT NULL DEFAULT 0,
  converted_referrals int NOT NULL DEFAULT 0,
  total_commission_aud numeric(12,2) NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_referral_agents_user_id ON public.referral_agents(user_id);
CREATE INDEX idx_referral_agents_referral_code ON public.referral_agents(referral_code);

-- Validation triggers (avoid CHECK constraints per project guidelines)
CREATE OR REPLACE FUNCTION public.validate_referral_agent()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  IF NEW.status NOT IN ('pending','active','suspended') THEN
    RAISE EXCEPTION 'Invalid referral_agent status: %', NEW.status;
  END IF;
  IF NEW.tier NOT IN ('standard','silver','gold','platinum') THEN
    RAISE EXCEPTION 'Invalid referral_agent tier: %', NEW.tier;
  END IF;
  IF NEW.language_preference IS NOT NULL AND NEW.language_preference NOT IN ('zh','zh-TW','en','ja','ko','ms','th','vi') THEN
    RAISE EXCEPTION 'Invalid language_preference: %', NEW.language_preference;
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_validate_referral_agent
BEFORE INSERT OR UPDATE ON public.referral_agents
FOR EACH ROW EXECUTE FUNCTION public.validate_referral_agent();

CREATE TRIGGER trg_referral_agents_updated_at
BEFORE UPDATE ON public.referral_agents
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Auto-generate referral_code on insert if not provided
CREATE OR REPLACE FUNCTION public.set_referral_code()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  IF NEW.referral_code IS NULL OR NEW.referral_code = '' THEN
    NEW.referral_code := public.generate_referral_code();
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_set_referral_code
BEFORE INSERT ON public.referral_agents
FOR EACH ROW EXECUTE FUNCTION public.set_referral_code();

-- ============================================================
-- referral_leads
-- ============================================================
CREATE TABLE public.referral_leads (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  referral_agent_id uuid NOT NULL REFERENCES public.referral_agents(id) ON DELETE CASCADE,
  referred_by_code text NOT NULL,
  buyer_name text,
  buyer_email text,
  buyer_phone text,
  buyer_country text,
  property_id uuid REFERENCES public.properties(id) ON DELETE SET NULL,
  property_url text,
  status text NOT NULL DEFAULT 'new',
  commission_aud numeric(12,2) NOT NULL DEFAULT 0,
  notes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_referral_leads_agent_id ON public.referral_leads(referral_agent_id);
CREATE INDEX idx_referral_leads_status ON public.referral_leads(status);
CREATE INDEX idx_referral_leads_referred_by_code ON public.referral_leads(referred_by_code);

CREATE OR REPLACE FUNCTION public.validate_referral_lead()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  IF NEW.status NOT IN ('new','contacted','viewing','offer','settled','lost') THEN
    RAISE EXCEPTION 'Invalid referral_lead status: %', NEW.status;
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_validate_referral_lead
BEFORE INSERT OR UPDATE ON public.referral_leads
FOR EACH ROW EXECUTE FUNCTION public.validate_referral_lead();

CREATE TRIGGER trg_referral_leads_updated_at
BEFORE UPDATE ON public.referral_leads
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- ============================================================
-- Aggregate counters trigger
-- ============================================================
CREATE OR REPLACE FUNCTION public.refresh_referral_agent_stats(p_agent_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  UPDATE public.referral_agents ra
  SET
    total_referrals = (SELECT COUNT(*) FROM public.referral_leads WHERE referral_agent_id = p_agent_id),
    converted_referrals = (SELECT COUNT(*) FROM public.referral_leads WHERE referral_agent_id = p_agent_id AND status = 'settled'),
    total_commission_aud = (SELECT COALESCE(SUM(commission_aud),0) FROM public.referral_leads WHERE referral_agent_id = p_agent_id AND status = 'settled'),
    updated_at = now()
  WHERE ra.id = p_agent_id;
END;
$$;

CREATE OR REPLACE FUNCTION public.on_referral_lead_change()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF TG_OP = 'DELETE' THEN
    PERFORM public.refresh_referral_agent_stats(OLD.referral_agent_id);
    RETURN OLD;
  ELSE
    PERFORM public.refresh_referral_agent_stats(NEW.referral_agent_id);
    IF TG_OP = 'UPDATE' AND NEW.referral_agent_id <> OLD.referral_agent_id THEN
      PERFORM public.refresh_referral_agent_stats(OLD.referral_agent_id);
    END IF;
    RETURN NEW;
  END IF;
END;
$$;

CREATE TRIGGER trg_referral_lead_stats
AFTER INSERT OR UPDATE OR DELETE ON public.referral_leads
FOR EACH ROW EXECUTE FUNCTION public.on_referral_lead_change();

-- ============================================================
-- RLS
-- ============================================================
ALTER TABLE public.referral_agents ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.referral_leads ENABLE ROW LEVEL SECURITY;

-- Anyone authenticated can create their own referral agent record (signup)
CREATE POLICY "Users can create their own referral agent profile"
  ON public.referral_agents FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

-- Referral agents can view their own profile
CREATE POLICY "Referral agents can view own profile"
  ON public.referral_agents FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id OR public.has_role(auth.uid(), 'admin'));

-- Referral agents can update their own profile (limited fields enforced in app)
CREATE POLICY "Referral agents can update own profile"
  ON public.referral_agents FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id OR public.has_role(auth.uid(), 'admin'));

-- Admins can delete
CREATE POLICY "Admins can delete referral agents"
  ON public.referral_agents FOR DELETE
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

-- Referral leads — owner can CRUD their own; admins see all
CREATE POLICY "Referral agents can view own leads"
  ON public.referral_leads FOR SELECT
  TO authenticated
  USING (
    referral_agent_id IN (SELECT id FROM public.referral_agents WHERE user_id = auth.uid())
    OR public.has_role(auth.uid(), 'admin')
  );

CREATE POLICY "Referral agents can create own leads"
  ON public.referral_leads FOR INSERT
  TO authenticated
  WITH CHECK (
    referral_agent_id IN (SELECT id FROM public.referral_agents WHERE user_id = auth.uid())
  );

CREATE POLICY "Referral agents can update own leads"
  ON public.referral_leads FOR UPDATE
  TO authenticated
  USING (
    referral_agent_id IN (SELECT id FROM public.referral_agents WHERE user_id = auth.uid())
    OR public.has_role(auth.uid(), 'admin')
  );

CREATE POLICY "Admins can delete referral leads"
  ON public.referral_leads FOR DELETE
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));
