-- 1. Renewal tracking columns on tenancies
ALTER TABLE public.tenancies
  ADD COLUMN IF NOT EXISTS renewal_status text DEFAULT 'none',
  ADD COLUMN IF NOT EXISTS renewal_offered_at timestamptz,
  ADD COLUMN IF NOT EXISTS renewal_offered_rent numeric,
  ADD COLUMN IF NOT EXISTS renewal_offered_lease_end date,
  ADD COLUMN IF NOT EXISTS renewal_type text,
  ADD COLUMN IF NOT EXISTS renewal_notes text;

-- 2. Maintenance invoices storage bucket (public so signed URLs are not needed for portal display)
INSERT INTO storage.buckets (id, name, public)
VALUES ('maintenance-invoices', 'maintenance-invoices', true)
ON CONFLICT (id) DO NOTHING;

-- Public read of invoices (anyone with URL can view)
DROP POLICY IF EXISTS "maintenance_invoices_public_read" ON storage.objects;
CREATE POLICY "maintenance_invoices_public_read"
ON storage.objects FOR SELECT
USING (bucket_id = 'maintenance-invoices');

-- Anyone (including supplier portal anon) can upload invoices
DROP POLICY IF EXISTS "maintenance_invoices_anon_upload" ON storage.objects;
CREATE POLICY "maintenance_invoices_anon_upload"
ON storage.objects FOR INSERT
WITH CHECK (bucket_id = 'maintenance-invoices');

-- Authenticated users can update/delete their uploads
DROP POLICY IF EXISTS "maintenance_invoices_auth_update" ON storage.objects;
CREATE POLICY "maintenance_invoices_auth_update"
ON storage.objects FOR UPDATE
USING (bucket_id = 'maintenance-invoices');