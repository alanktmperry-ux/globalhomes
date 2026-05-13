UPDATE storage.buckets SET public = false WHERE id = 'rental-applications';

ALTER TABLE public.rental_applications ADD COLUMN IF NOT EXISTS identity_document_path text;

DROP POLICY IF EXISTS "Applicants can upload their own docs" ON storage.objects;
CREATE POLICY "Applicants can upload their own docs"
  ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'rental-applications' AND auth.uid()::text = (storage.foldername(name))[2]);

DROP POLICY IF EXISTS "Agents can read application docs for their properties" ON storage.objects;
CREATE POLICY "Agents can read application docs for their properties"
  ON storage.objects FOR SELECT TO authenticated
  USING (
    bucket_id = 'rental-applications' AND (
      auth.uid()::text = (storage.foldername(name))[2]
      OR EXISTS (
        SELECT 1 FROM public.agents a
        JOIN public.properties p ON p.agent_id = a.id
        WHERE a.user_id = auth.uid()
        AND p.id::text = (storage.foldername(name))[1]
      )
    )
  );