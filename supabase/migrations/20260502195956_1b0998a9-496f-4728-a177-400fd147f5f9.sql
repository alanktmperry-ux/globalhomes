CREATE INDEX IF NOT EXISTS idx_contacts_agency_id_updated_at
ON public.contacts(agency_id, updated_at DESC);