
-- Drop conflicting SELECT policies on properties
DROP POLICY IF EXISTS "Anon read public listings" ON public.properties;
DROP POLICY IF EXISTS "Authenticated read listings" ON public.properties;
DROP POLICY IF EXISTS "Public view active listings" ON public.properties;
DROP POLICY IF EXISTS "Anyone can view active listings" ON public.properties;
DROP POLICY IF EXISTS "anon_select_properties" ON public.properties;
DROP POLICY IF EXISTS "Public can view active properties" ON public.properties;

-- Anon: only active public listings
CREATE POLICY "Anon read public listings" ON public.properties
FOR SELECT TO anon
USING (
  is_active = true
  AND status IN ('public', 'active', 'coming-soon')
);

-- Authenticated: public listings + own listings + admin + vendor
CREATE POLICY "Authenticated read listings" ON public.properties
FOR SELECT TO authenticated
USING (
  (is_active = true AND status IN ('public', 'active', 'coming-soon'))
  OR agent_id IN (SELECT id FROM agents WHERE user_id = auth.uid())
  OR public.has_role(auth.uid(), 'admin')
  OR vendor_id = auth.uid()
);
