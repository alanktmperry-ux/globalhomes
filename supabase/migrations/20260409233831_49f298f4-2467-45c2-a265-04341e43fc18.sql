
-- Create the security definer function first
CREATE OR REPLACE FUNCTION public.get_user_agency_id()
RETURNS uuid
LANGUAGE sql
SECURITY DEFINER
STABLE
SET search_path = public
AS $$
  SELECT agency_id FROM agents 
  WHERE user_id = auth.uid() 
  LIMIT 1;
$$;

-- Agents policies
DROP POLICY IF EXISTS "Principals view agency agents" ON agents;

CREATE POLICY "Principals view agency agents"
ON agents FOR SELECT
USING (
  agency_id = public.get_user_agency_id()
  OR user_id = auth.uid()
);

-- Properties policies
DROP POLICY IF EXISTS "Principals view agency listings" ON properties;

CREATE POLICY "Principals view agency listings"
ON properties FOR SELECT
USING (
  agent_id IN (
    SELECT id FROM agents WHERE agency_id = public.get_user_agency_id()
  )
  OR agent_id IN (SELECT id FROM agents WHERE user_id = auth.uid())
);

DROP POLICY IF EXISTS "Principals update agency listings" ON properties;

CREATE POLICY "Principals update agency listings"
ON properties FOR UPDATE
USING (
  agent_id IN (
    SELECT id FROM agents WHERE agency_id = public.get_user_agency_id()
  )
);

-- Contacts policies
DROP POLICY IF EXISTS "Principals view agency contacts" ON contacts;

CREATE POLICY "Principals view agency contacts"
ON contacts FOR SELECT
USING (
  created_by = auth.uid()
  OR agency_id = public.get_user_agency_id()
);

DROP POLICY IF EXISTS "Principals update agency contacts" ON contacts;

CREATE POLICY "Principals update agency contacts"
ON contacts FOR UPDATE
USING (
  agency_id = public.get_user_agency_id()
);
