
-- Allow uploaders to access their own files
CREATE POLICY "Uploaders can access own files"
ON storage.objects
FOR ALL
USING (
  bucket_id = 'rental-applications'
  AND (storage.foldername(name))[1] = auth.uid()::text
)
WITH CHECK (
  bucket_id = 'rental-applications'
  AND (storage.foldername(name))[1] = auth.uid()::text
);

-- Allow the property's agent to access application files
-- Assumes file path convention: {user_id}/{property_id}/filename
CREATE POLICY "Agents can read application files for their properties"
ON storage.objects
FOR SELECT
USING (
  bucket_id = 'rental-applications'
  AND EXISTS (
    SELECT 1 FROM public.properties p
    JOIN public.agents a ON a.id = p.agent_id
    WHERE a.user_id = auth.uid()
      AND p.id::text = (storage.foldername(name))[2]
  )
);
