-- 1. Properties: Revoke sensitive vendor PII and commission columns from anon/authenticated
REVOKE SELECT (vendor_email, vendor_phone, vendor_name, vendor_id, commission_rate, agent_split_percent) 
ON public.properties FROM anon, authenticated;

-- Re-grant these columns to service_role so edge functions still work
GRANT SELECT (vendor_email, vendor_phone, vendor_name, vendor_id, commission_rate, agent_split_percent) 
ON public.properties TO service_role;

-- 2. Agent Reviews: Revoke reviewer_email from public access
REVOKE SELECT (reviewer_email) ON public.agent_reviews FROM anon, authenticated;
GRANT SELECT (reviewer_email) ON public.agent_reviews TO service_role;

-- 3. Brokers: Revoke PII from anonymous users (keep for authenticated since they are professional contacts)
REVOKE SELECT (email, phone, acl_number) ON public.brokers FROM anon;
GRANT SELECT (email, phone, acl_number) ON public.brokers TO service_role;

-- 4. Collab Views: Replace overly permissive SELECT policy
DROP POLICY IF EXISTS "Anyone can view collab views" ON public.collab_views;
CREATE POLICY "Users can view own collab views"
  ON public.collab_views FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());

-- 5. Open Home Registrations: Tighten INSERT to enforce ownership
DROP POLICY IF EXISTS "oh_reg_insert" ON public.open_home_registrations;
CREATE POLICY "oh_reg_insert"
  ON public.open_home_registrations FOR INSERT
  TO authenticated
  WITH CHECK (user_id = auth.uid() OR user_id IS NULL);