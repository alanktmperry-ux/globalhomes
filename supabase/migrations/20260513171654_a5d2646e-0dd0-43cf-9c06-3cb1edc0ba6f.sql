-- Add photo_urls column to maintenance_jobs
ALTER TABLE public.maintenance_jobs
  ADD COLUMN IF NOT EXISTS photo_urls text[] NOT NULL DEFAULT '{}';

-- Create private storage bucket for maintenance photos
INSERT INTO storage.buckets (id, name, public)
VALUES ('maintenance-photos', 'maintenance-photos', false)
ON CONFLICT (id) DO NOTHING;

-- RLS policies on storage.objects scoped to agent_id folder
-- Path convention: {agent_id}/{job_id}/{filename}
CREATE POLICY "Agents can view their own maintenance photos"
ON storage.objects FOR SELECT
TO authenticated
USING (
  bucket_id = 'maintenance-photos'
  AND (storage.foldername(name))[1] IN (
    SELECT id::text FROM public.agents WHERE user_id = auth.uid()
  )
);

CREATE POLICY "Agents can upload their own maintenance photos"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'maintenance-photos'
  AND (storage.foldername(name))[1] IN (
    SELECT id::text FROM public.agents WHERE user_id = auth.uid()
  )
);

CREATE POLICY "Agents can delete their own maintenance photos"
ON storage.objects FOR DELETE
TO authenticated
USING (
  bucket_id = 'maintenance-photos'
  AND (storage.foldername(name))[1] IN (
    SELECT id::text FROM public.agents WHERE user_id = auth.uid()
  )
);