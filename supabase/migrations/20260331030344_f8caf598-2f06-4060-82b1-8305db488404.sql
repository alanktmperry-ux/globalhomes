
-- Create the property-images bucket (public read, authenticated write)
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'property-images',
  'property-images',
  true,
  10485760,
  ARRAY['image/jpeg', 'image/png', 'image/webp', 'image/gif']
)
ON CONFLICT (id) DO NOTHING;

-- Policy: any authenticated user can upload
CREATE POLICY "Authenticated users can upload property images"
  ON storage.objects FOR INSERT
  TO authenticated
  WITH CHECK (bucket_id = 'property-images');

-- Policy: public can read
CREATE POLICY "Public can view property images"
  ON storage.objects FOR SELECT
  TO public
  USING (bucket_id = 'property-images');

-- Policy: owner can delete their own uploads
CREATE POLICY "Owners can delete their property images"
  ON storage.objects FOR DELETE
  TO authenticated
  USING (bucket_id = 'property-images' AND auth.uid()::text = (storage.foldername(name))[1]);

-- Add cover_index column
ALTER TABLE public.properties
  ADD COLUMN IF NOT EXISTS cover_index integer DEFAULT 0;
