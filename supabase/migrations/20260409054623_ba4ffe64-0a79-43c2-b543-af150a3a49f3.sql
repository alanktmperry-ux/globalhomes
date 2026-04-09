-- Drop existing SELECT policies for properties (except admin)
DROP POLICY IF EXISTS "Public read active listings" ON public.properties;
DROP POLICY IF EXISTS "Public read active properties" ON public.properties;
DROP POLICY IF EXISTS "Properties viewable by everyone" ON public.properties;

-- Anon: only active + public/active/coming-soon
CREATE POLICY "Public read active listings"
  ON public.properties FOR SELECT TO anon
  USING (
    is_active = true
    AND status IN ('public', 'active', 'coming-soon')
  );

-- Authenticated: public listings OR own listings (agent/admin/vendor)
CREATE POLICY "Agents read own listings"
  ON public.properties FOR SELECT TO authenticated
  USING (
    (is_active = true AND status IN ('public', 'active', 'coming-soon'))
    OR agent_id IN (SELECT id FROM agents WHERE user_id = auth.uid())
    OR public.has_role(auth.uid(), 'admin'::app_role)
    OR vendor_id = auth.uid()
  );