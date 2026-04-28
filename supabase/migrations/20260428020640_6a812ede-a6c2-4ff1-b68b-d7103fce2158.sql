INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'inspection-photos',
  'inspection-photos',
  true,
  20971520,
  ARRAY['image/jpeg', 'image/jpg', 'image/png', 'image/heic', 'image/webp', 'image/gif']
)
ON CONFLICT (id) DO UPDATE SET
  allowed_mime_types = EXCLUDED.allowed_mime_types,
  file_size_limit = EXCLUDED.file_size_limit,
  public = EXCLUDED.public;

DROP POLICY IF EXISTS "Authenticated users upload inspection photos" ON storage.objects;
DROP POLICY IF EXISTS "Public can view inspection photos" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated users delete own inspection photos" ON storage.objects;
DROP POLICY IF EXISTS "Agents upload inspection photos" ON storage.objects;
DROP POLICY IF EXISTS "Public read inspection photos" ON storage.objects;
DROP POLICY IF EXISTS "Agents delete inspection photos" ON storage.objects;

CREATE POLICY "Authenticated users upload inspection photos"
ON storage.objects FOR INSERT TO authenticated
WITH CHECK (bucket_id = 'inspection-photos');

CREATE POLICY "Public can view inspection photos"
ON storage.objects FOR SELECT TO public
USING (bucket_id = 'inspection-photos');

CREATE POLICY "Authenticated users delete own inspection photos"
ON storage.objects FOR DELETE TO authenticated
USING (bucket_id = 'inspection-photos');