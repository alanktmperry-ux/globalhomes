
DROP POLICY IF EXISTS "Public can read signature requests" ON public.signature_requests;

DROP POLICY IF EXISTS "Anyone can update chat sessions" ON public.listing_chat_sessions;
DROP POLICY IF EXISTS "Authenticated can update chat sessions" ON public.listing_chat_sessions;
DROP POLICY IF EXISTS "Public can update chat sessions" ON public.listing_chat_sessions;
CREATE POLICY "Agents can update chat sessions for their listings"
ON public.listing_chat_sessions
FOR UPDATE
TO authenticated
USING (EXISTS (SELECT 1 FROM public.properties p WHERE p.id = listing_chat_sessions.listing_id AND p.agent_id = auth.uid()))
WITH CHECK (EXISTS (SELECT 1 FROM public.properties p WHERE p.id = listing_chat_sessions.listing_id AND p.agent_id = auth.uid()));

DROP POLICY IF EXISTS "Authenticated agents upload tenant documents" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated agents update tenant documents" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated agents delete tenant documents" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated upload owner statements" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated update owner statements" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated upload supplier-docs" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated update supplier-docs" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated delete supplier-docs" ON storage.objects;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname='storage' AND tablename='objects' AND policyname='tenant_docs_agent_update') THEN
    CREATE POLICY "tenant_docs_agent_update" ON storage.objects FOR UPDATE TO authenticated
    USING (bucket_id = 'tenant-documents' AND (storage.foldername(name))[1] = (get_agent_id_for_user(auth.uid()))::text)
    WITH CHECK (bucket_id = 'tenant-documents' AND (storage.foldername(name))[1] = (get_agent_id_for_user(auth.uid()))::text);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname='storage' AND tablename='objects' AND policyname='tenant_docs_agent_delete') THEN
    CREATE POLICY "tenant_docs_agent_delete" ON storage.objects FOR DELETE TO authenticated
    USING (bucket_id = 'tenant-documents' AND (storage.foldername(name))[1] = (get_agent_id_for_user(auth.uid()))::text);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname='storage' AND tablename='objects' AND policyname='owner_statements_agent_write') THEN
    CREATE POLICY "owner_statements_agent_write" ON storage.objects FOR INSERT TO authenticated
    WITH CHECK (bucket_id = 'owner-statements' AND (storage.foldername(name))[1] = (get_agent_id_for_user(auth.uid()))::text);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname='storage' AND tablename='objects' AND policyname='owner_statements_agent_update') THEN
    CREATE POLICY "owner_statements_agent_update" ON storage.objects FOR UPDATE TO authenticated
    USING (bucket_id = 'owner-statements' AND (storage.foldername(name))[1] = (get_agent_id_for_user(auth.uid()))::text)
    WITH CHECK (bucket_id = 'owner-statements' AND (storage.foldername(name))[1] = (get_agent_id_for_user(auth.uid()))::text);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname='storage' AND tablename='objects' AND policyname='supplier_docs_agent_update') THEN
    CREATE POLICY "supplier_docs_agent_update" ON storage.objects FOR UPDATE TO authenticated
    USING (bucket_id = 'supplier-docs' AND (storage.foldername(name))[1] = (get_agent_id_for_user(auth.uid()))::text)
    WITH CHECK (bucket_id = 'supplier-docs' AND (storage.foldername(name))[1] = (get_agent_id_for_user(auth.uid()))::text);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname='storage' AND tablename='objects' AND policyname='supplier_docs_agent_delete') THEN
    CREATE POLICY "supplier_docs_agent_delete" ON storage.objects FOR DELETE TO authenticated
    USING (bucket_id = 'supplier-docs' AND (storage.foldername(name))[1] = (get_agent_id_for_user(auth.uid()))::text);
  END IF;
END $$;

DROP POLICY IF EXISTS "Agents can view all buyer intent" ON public.buyer_intent;
CREATE POLICY "Agents can view buyer intent for their leads"
ON public.buyer_intent
FOR SELECT
TO authenticated
USING (
  auth.uid() = buyer_id
  OR EXISTS (
    SELECT 1 FROM public.leads l
    JOIN public.agents a ON a.id = l.agent_id
    WHERE a.user_id = auth.uid()
      AND l.user_id = buyer_intent.buyer_id
  )
);

DROP POLICY IF EXISTS "Anyone can insert audit logs" ON public.audit_logs;
DROP POLICY IF EXISTS "audit_logs_insert_allowed" ON public.audit_logs;
CREATE POLICY "audit_logs_authenticated_insert"
ON public.audit_logs
FOR INSERT
TO authenticated
WITH CHECK (user_id IS NULL OR user_id = auth.uid());
CREATE POLICY "audit_logs_anon_portal_insert"
ON public.audit_logs
FOR INSERT
TO anon
WITH CHECK (
  user_id IS NULL
  AND event_type = ANY (ARRAY['portal_access','maintenance_submitted','owner_decision','supplier_action','document_viewed','lease_signed'])
);

ALTER TABLE realtime.messages ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Authenticated users can use realtime" ON realtime.messages;
CREATE POLICY "Authenticated users can use realtime"
ON realtime.messages
FOR SELECT
TO authenticated
USING (true);
