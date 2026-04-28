INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'inspection-photos',
  'inspection-photos',
  true,
  20971520,
  ARRAY['image/jpeg', 'image/jpg', 'image/png', 'image/heic', 'image/webp']
)
ON CONFLICT (id) DO NOTHING;

DROP POLICY IF EXISTS "Agents upload inspection photos" ON storage.objects;
DROP POLICY IF EXISTS "Public read inspection photos" ON storage.objects;
DROP POLICY IF EXISTS "Agents delete inspection photos" ON storage.objects;

CREATE POLICY "Agents upload inspection photos"
ON storage.objects FOR INSERT TO authenticated
WITH CHECK (bucket_id = 'inspection-photos');

CREATE POLICY "Public read inspection photos"
ON storage.objects FOR SELECT TO public
USING (bucket_id = 'inspection-photos');

CREATE POLICY "Agents delete inspection photos"
ON storage.objects FOR DELETE TO authenticated
USING (bucket_id = 'inspection-photos');