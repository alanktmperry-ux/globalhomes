-- Restrict sensitive columns from anonymous SELECT on properties
REVOKE SELECT (owner_portal_token, owner_portal_token_expires_at, owner_email, owner_phone, owner_name, vendor_email, vendor_phone, vendor_name) ON public.properties FROM anon;

-- Restrict support_pin from public/anon SELECT on agents (still readable by authenticated agents themselves; UI should use get_my_support_pin())
REVOKE SELECT (support_pin) ON public.agents FROM anon;

-- Tighten maintenance-invoices update policy to agent-scoped
DROP POLICY IF EXISTS "maintenance_invoices_auth_update" ON storage.objects;
CREATE POLICY "maint_invoices_agent_update" ON storage.objects
  FOR UPDATE TO authenticated
  USING (
    bucket_id = 'maintenance-invoices'
    AND (storage.foldername(name))[1] = (public.get_agent_id_for_user(auth.uid()))::text
  )
  WITH CHECK (
    bucket_id = 'maintenance-invoices'
    AND (storage.foldername(name))[1] = (public.get_agent_id_for_user(auth.uid()))::text
  );