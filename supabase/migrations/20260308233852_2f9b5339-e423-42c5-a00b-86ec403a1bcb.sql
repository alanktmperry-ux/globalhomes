
-- Create agency-logos storage bucket
INSERT INTO storage.buckets (id, name, public)
VALUES ('agency-logos', 'agency-logos', true);

-- Allow authenticated users to upload to agency-logos bucket
CREATE POLICY "Authenticated users can upload agency logos"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (bucket_id = 'agency-logos');

-- Allow anyone to view agency logos (public bucket)
CREATE POLICY "Anyone can view agency logos"
ON storage.objects FOR SELECT
TO public
USING (bucket_id = 'agency-logos');

-- Allow authenticated users to update their uploads
CREATE POLICY "Users can update own agency logos"
ON storage.objects FOR UPDATE
TO authenticated
USING (bucket_id = 'agency-logos');

-- Allow authenticated users to delete their uploads
CREATE POLICY "Users can delete own agency logos"
ON storage.objects FOR DELETE
TO authenticated
USING (bucket_id = 'agency-logos');
