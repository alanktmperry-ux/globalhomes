
REVOKE SELECT (owner_portal_token, vendor_email, vendor_phone, vendor_name,
               owner_name, owner_email, owner_phone)
  ON public.properties FROM anon, authenticated;

CREATE OR REPLACE FUNCTION public.get_property_private_fields(p_id uuid)
RETURNS TABLE (
  owner_portal_token text, vendor_email text, vendor_phone text, vendor_name text,
  owner_name text, owner_email text, owner_phone text
)
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM public.properties p
    WHERE p.id = p_id AND (
      p.agent_id = public.get_agent_id_for_user(auth.uid())
      OR p.vendor_id = auth.uid()
      OR public.has_role(auth.uid(), 'admin'::public.app_role)
    )
  ) THEN RAISE EXCEPTION 'forbidden'; END IF;
  RETURN QUERY
    SELECT p.owner_portal_token, p.vendor_email, p.vendor_phone, p.vendor_name,
           p.owner_name, p.owner_email, p.owner_phone
    FROM public.properties p WHERE p.id = p_id;
END; $$;
REVOKE EXECUTE ON FUNCTION public.get_property_private_fields(uuid) FROM anon, public;
GRANT EXECUTE ON FUNCTION public.get_property_private_fields(uuid) TO authenticated;

REVOKE SELECT (support_pin) ON public.agents FROM anon, authenticated;
CREATE OR REPLACE FUNCTION public.get_my_support_pin()
RETURNS text LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT support_pin FROM public.agents WHERE user_id = auth.uid() LIMIT 1;
$$;
REVOKE EXECUTE ON FUNCTION public.get_my_support_pin() FROM anon, public;
GRANT EXECUTE ON FUNCTION public.get_my_support_pin() TO authenticated;

DROP POLICY IF EXISTS "agents_read_active_halos" ON public.halos;
CREATE POLICY "agents_read_active_halos" ON public.halos FOR SELECT TO authenticated
  USING (status = 'active' AND EXISTS (SELECT 1 FROM public.agents a WHERE a.user_id = auth.uid()));

DROP POLICY IF EXISTS "Agents can view all activity events" ON public.buyer_activity_events;
CREATE POLICY "Agents can view events on their listings" ON public.buyer_activity_events FOR SELECT TO authenticated
  USING (EXISTS (SELECT 1 FROM public.properties p JOIN public.agents a ON a.id = p.agent_id
                 WHERE p.id = buyer_activity_events.listing_id AND a.user_id = auth.uid()));

DROP POLICY IF EXISTS "Anyone can update chat sessions" ON public.listing_chat_sessions;
DROP POLICY IF EXISTS "Anyone can create chat sessions" ON public.listing_chat_sessions;

DROP POLICY IF EXISTS "Public can read by signing token" ON public.signature_request_parties;
CREATE OR REPLACE FUNCTION public.get_signature_party_by_token(p_token uuid)
RETURNS TABLE (id uuid, request_id uuid, signer_name text, signer_email text,
               order_index integer, signed_at timestamptz)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT id, request_id, signer_name, signer_email, order_index, signed_at
  FROM public.signature_request_parties WHERE signing_token = p_token LIMIT 1;
$$;
GRANT EXECUTE ON FUNCTION public.get_signature_party_by_token(uuid) TO anon, authenticated;

UPDATE storage.buckets SET public = false
  WHERE id IN ('tenant-documents','owner-statements','maintenance-invoices','supplier-docs','inspection-photos');

DROP POLICY IF EXISTS "Tenant documents are publicly readable" ON storage.objects;
DROP POLICY IF EXISTS "Public read owner statements"          ON storage.objects;
DROP POLICY IF EXISTS "maintenance_invoices_public_read"      ON storage.objects;
DROP POLICY IF EXISTS "Public read supplier-docs"             ON storage.objects;
DROP POLICY IF EXISTS "Public can view inspection photos"     ON storage.objects;
DROP POLICY IF EXISTS "maintenance_invoices_anon_upload"      ON storage.objects;

CREATE POLICY "tenant_docs_agent_read" ON storage.objects FOR SELECT TO authenticated
  USING (bucket_id = 'tenant-documents' AND (storage.foldername(name))[1] = public.get_agent_id_for_user(auth.uid())::text);
CREATE POLICY "tenant_docs_agent_write" ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'tenant-documents' AND (storage.foldername(name))[1] = public.get_agent_id_for_user(auth.uid())::text);

CREATE POLICY "owner_statements_agent_read" ON storage.objects FOR SELECT TO authenticated
  USING (bucket_id = 'owner-statements' AND (storage.foldername(name))[1] = public.get_agent_id_for_user(auth.uid())::text);
CREATE POLICY "owner_statements_agent_write" ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'owner-statements' AND (storage.foldername(name))[1] = public.get_agent_id_for_user(auth.uid())::text);

CREATE POLICY "maint_invoices_agent_read" ON storage.objects FOR SELECT TO authenticated
  USING (bucket_id = 'maintenance-invoices' AND (storage.foldername(name))[1] = public.get_agent_id_for_user(auth.uid())::text);
CREATE POLICY "maint_invoices_agent_write" ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'maintenance-invoices' AND (storage.foldername(name))[1] = public.get_agent_id_for_user(auth.uid())::text);

CREATE POLICY "supplier_docs_agent_read" ON storage.objects FOR SELECT TO authenticated
  USING (bucket_id = 'supplier-docs' AND (storage.foldername(name))[1] = public.get_agent_id_for_user(auth.uid())::text);
CREATE POLICY "supplier_docs_agent_write" ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'supplier-docs' AND (storage.foldername(name))[1] = public.get_agent_id_for_user(auth.uid())::text);

CREATE POLICY "inspection_photos_agent_read" ON storage.objects FOR SELECT TO authenticated
  USING (bucket_id = 'inspection-photos' AND (storage.foldername(name))[1] = public.get_agent_id_for_user(auth.uid())::text);
CREATE POLICY "inspection_photos_agent_write" ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'inspection-photos' AND (storage.foldername(name))[1] = public.get_agent_id_for_user(auth.uid())::text);
