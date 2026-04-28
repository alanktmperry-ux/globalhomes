INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'property-docs',
  'property-docs',
  false,
  10485760,
  ARRAY[
    'application/pdf',
    'application/msword',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'image/jpeg',
    'image/jpg',
    'image/png'
  ]
)
ON CONFLICT (id) DO NOTHING;

CREATE POLICY "Agents upload own documents"
ON storage.objects FOR INSERT TO authenticated
WITH CHECK (
  bucket_id = 'property-docs' AND
  (storage.foldername(name))[1] = (
    SELECT id::text FROM public.agents WHERE user_id = auth.uid() LIMIT 1
  )
);

CREATE POLICY "Agents read own documents"
ON storage.objects FOR SELECT TO authenticated
USING (
  bucket_id = 'property-docs' AND
  (storage.foldername(name))[1] = (
    SELECT id::text FROM public.agents WHERE user_id = auth.uid() LIMIT 1
  )
);

CREATE POLICY "Agents delete own documents"
ON storage.objects FOR DELETE TO authenticated
USING (
  bucket_id = 'property-docs' AND
  (storage.foldername(name))[1] = (
    SELECT id::text FROM public.agents WHERE user_id = auth.uid() LIMIT 1
  )
);