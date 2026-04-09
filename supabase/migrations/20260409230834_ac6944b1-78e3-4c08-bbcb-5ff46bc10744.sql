
-- 1a. agency_role column (may already exist from prior migration, use DO block)
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='agents' AND column_name='agency_role') THEN
    ALTER TABLE public.agents ADD COLUMN agency_role text DEFAULT 'agent';
  END IF;
END $$;

-- Validation trigger for agency_role (idempotent)
CREATE OR REPLACE FUNCTION public.validate_agency_role()
RETURNS trigger LANGUAGE plpgsql SET search_path = 'public' AS $$
BEGIN
  IF NEW.agency_role NOT IN ('agent', 'principal', 'admin') THEN
    RAISE EXCEPTION 'Invalid agency_role: %', NEW.agency_role;
  END IF;
  RETURN NEW;
END; $$;

DROP TRIGGER IF EXISTS trg_validate_agency_role ON public.agents;
CREATE TRIGGER trg_validate_agency_role BEFORE INSERT OR UPDATE ON public.agents
FOR EACH ROW EXECUTE FUNCTION public.validate_agency_role();

-- 1b. Compliance columns (most already exist, add if missing)
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='agents' AND column_name='licence_expiry_date') THEN
    ALTER TABLE public.agents ADD COLUMN licence_expiry_date date;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='agents' AND column_name='cpd_hours_completed') THEN
    ALTER TABLE public.agents ADD COLUMN cpd_hours_completed integer DEFAULT 0;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='agents' AND column_name='cpd_hours_required') THEN
    ALTER TABLE public.agents ADD COLUMN cpd_hours_required integer DEFAULT 12;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='agents' AND column_name='professional_indemnity_expiry') THEN
    ALTER TABLE public.agents ADD COLUMN professional_indemnity_expiry date;
  END IF;
END $$;

-- 1c. audit_log table (idempotent)
CREATE TABLE IF NOT EXISTS public.audit_log (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  agency_id uuid REFERENCES public.agencies(id),
  agent_id uuid REFERENCES public.agents(id),
  user_id uuid NOT NULL,
  action_type text NOT NULL,
  entity_type text NOT NULL,
  entity_id uuid,
  description text,
  metadata jsonb DEFAULT '{}',
  created_at timestamptz DEFAULT now()
);

ALTER TABLE public.audit_log ENABLE ROW LEVEL SECURITY;

-- RLS for audit_log
DROP POLICY IF EXISTS "Principals view agency audit log" ON public.audit_log;
CREATE POLICY "Principals view agency audit log"
ON public.audit_log FOR SELECT
USING (
  agency_id IN (
    SELECT agency_id FROM public.agents
    WHERE user_id = auth.uid()
    AND agency_role IN ('principal', 'admin')
  )
  OR agent_id IN (
    SELECT id FROM public.agents WHERE user_id = auth.uid()
  )
);

DROP POLICY IF EXISTS "Agents can insert audit log" ON public.audit_log;
CREATE POLICY "Agents can insert audit log"
ON public.audit_log FOR INSERT
WITH CHECK (user_id = auth.uid());

-- 1d. RLS: principals see all agency contacts
DROP POLICY IF EXISTS "Principals view agency contacts" ON public.contacts;
CREATE POLICY "Principals view agency contacts"
ON public.contacts FOR SELECT
USING (
  created_by = auth.uid()
  OR agency_id IN (
    SELECT agency_id FROM public.agents
    WHERE user_id = auth.uid()
    AND agency_role IN ('principal', 'admin')
  )
);

-- 1e. RLS: principals can update agency contacts
DROP POLICY IF EXISTS "Principals update agency contacts" ON public.contacts;
CREATE POLICY "Principals update agency contacts"
ON public.contacts FOR UPDATE
USING (
  created_by = auth.uid()
  OR agency_id IN (
    SELECT agency_id FROM public.agents
    WHERE user_id = auth.uid()
    AND agency_role IN ('principal', 'admin')
  )
);

-- 1f. RLS: principals see all agency properties
DROP POLICY IF EXISTS "Principals view agency listings" ON public.properties;
CREATE POLICY "Principals view agency listings"
ON public.properties FOR SELECT
USING (
  agent_id IN (
    SELECT id FROM public.agents
    WHERE agency_id IN (
      SELECT agency_id FROM public.agents
      WHERE user_id = auth.uid()
      AND agency_role IN ('principal', 'admin')
    )
  )
  OR agent_id IN (SELECT id FROM public.agents WHERE user_id = auth.uid())
);

-- 1g. RLS: principals can update agency properties
DROP POLICY IF EXISTS "Principals update agency listings" ON public.properties;
CREATE POLICY "Principals update agency listings"
ON public.properties FOR UPDATE
USING (
  agent_id IN (
    SELECT id FROM public.agents
    WHERE agency_id IN (
      SELECT agency_id FROM public.agents
      WHERE user_id = auth.uid()
      AND agency_role IN ('principal', 'admin')
    )
  )
);
