INSERT INTO storage.buckets (id, name, public) VALUES ('property-photos', 'property-photos', true);

CREATE POLICY "Authenticated users can upload property photos"
ON storage.objects FOR INSERT TO authenticated
WITH CHECK (bucket_id = 'property-photos');

CREATE POLICY "Authenticated users can update property photos"
ON storage.objects FOR UPDATE TO authenticated
USING (bucket_id = 'property-photos');

CREATE POLICY "Authenticated users can delete property photos"
ON storage.objects FOR DELETE TO authenticated
USING (bucket_id = 'property-photos');

CREATE POLICY "Public can view property photos"
ON storage.objects FOR SELECT TO public
USING (bucket_id = 'property-photos');