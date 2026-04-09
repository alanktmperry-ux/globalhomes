
-- 1b. Add compliance columns to agents (licence_expiry_date already exists, licence_number already exists)
ALTER TABLE public.agents
ADD COLUMN IF NOT EXISTS cpd_hours_completed integer DEFAULT 0,
ADD COLUMN IF NOT EXISTS cpd_hours_required integer DEFAULT 12,
ADD COLUMN IF NOT EXISTS professional_indemnity_expiry date;

-- 1c. Create audit_log table
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

-- Principals/admins see all agency audit entries; agents see their own
CREATE POLICY "Principals view agency audit log"
ON public.audit_log FOR SELECT
USING (
  agency_id IN (
    SELECT a.agency_id FROM public.agents a
    WHERE a.user_id = auth.uid()
      AND a.agency_role IN ('principal', 'admin')
  )
  OR user_id = auth.uid()
);

-- Authenticated users can insert their own audit entries
CREATE POLICY "Users can insert own audit entries"
ON public.audit_log FOR INSERT
WITH CHECK (user_id = auth.uid());

-- 1d. Update principals contacts policy (drop and recreate)
DROP POLICY IF EXISTS "Principals view agency contacts" ON public.contacts;
CREATE POLICY "Principals view agency contacts"
ON public.contacts FOR SELECT
USING (
  created_by = auth.uid()
  OR agency_id IN (
    SELECT a.agency_id FROM public.agents a
    WHERE a.user_id = auth.uid()
      AND a.agency_role IN ('principal', 'admin')
  )
);

-- 1e. Principals can update agency contacts (for reassignment)
DROP POLICY IF EXISTS "Principals update agency contacts" ON public.contacts;
CREATE POLICY "Principals update agency contacts"
ON public.contacts FOR UPDATE
USING (
  agency_id IN (
    SELECT a.agency_id FROM public.agents a
    WHERE a.user_id = auth.uid()
      AND a.agency_role IN ('principal', 'admin')
  )
);

-- 1f. Principals can view all agency properties
DROP POLICY IF EXISTS "Principals view agency listings" ON public.properties;
CREATE POLICY "Principals view agency listings"
ON public.properties FOR SELECT
USING (
  agent_id IN (
    SELECT id FROM public.agents
    WHERE agency_id IN (
      SELECT a.agency_id FROM public.agents a
      WHERE a.user_id = auth.uid()
        AND a.agency_role IN ('principal', 'admin')
    )
  )
);

-- 1g. Principals can update agency properties (for reassignment)
DROP POLICY IF EXISTS "Principals update agency listings" ON public.properties;
CREATE POLICY "Principals update agency listings"
ON public.properties FOR UPDATE
USING (
  agent_id IN (
    SELECT id FROM public.agents
    WHERE agency_id IN (
      SELECT a.agency_id FROM public.agents a
      WHERE a.user_id = auth.uid()
        AND a.agency_role IN ('principal', 'admin')
    )
  )
);
