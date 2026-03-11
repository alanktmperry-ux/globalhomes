
-- Add commission fields to properties table
ALTER TABLE public.properties
  ADD COLUMN IF NOT EXISTS commission_rate numeric(5,2) DEFAULT 2.0,
  ADD COLUMN IF NOT EXISTS agent_split_percent numeric(5,2) DEFAULT 60.0,
  ADD COLUMN IF NOT EXISTS agency_authority text DEFAULT 'exclusive',
  ADD COLUMN IF NOT EXISTS land_size numeric(10,2),
  ADD COLUMN IF NOT EXISTS marketing_budget numeric(12,2) DEFAULT 0;

-- LISTING_DOCUMENTS table
CREATE TABLE public.listing_documents (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  property_id uuid NOT NULL REFERENCES public.properties(id) ON DELETE CASCADE,
  uploaded_by uuid NOT NULL,
  category text NOT NULL DEFAULT 'general', -- contract, authority, marketing, vendor_statement, building_report, pest_report, strata, general
  file_name text NOT NULL,
  file_url text NOT NULL,
  file_size integer,
  mime_type text,
  esign_status text DEFAULT 'none', -- none, pending, sent, signed, declined
  esign_sent_at timestamptz,
  esign_signed_at timestamptz,
  notes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.listing_documents ENABLE ROW LEVEL SECURITY;

-- Agents can view docs for their own properties
CREATE POLICY "Agents can view own listing documents" ON public.listing_documents
  FOR SELECT TO authenticated
  USING (property_id IN (SELECT id FROM properties WHERE agent_id IN (SELECT id FROM agents WHERE user_id = auth.uid())));

-- Agency members can view docs for agency properties
CREATE POLICY "Agency members can view listing documents" ON public.listing_documents
  FOR SELECT TO authenticated
  USING (property_id IN (
    SELECT p.id FROM properties p
    JOIN agents a ON p.agent_id = a.id
    WHERE a.agency_id IN (SELECT agency_id FROM agency_members WHERE user_id = auth.uid())
  ));

CREATE POLICY "Agents can insert listing documents" ON public.listing_documents
  FOR INSERT TO authenticated
  WITH CHECK (uploaded_by = auth.uid());

CREATE POLICY "Uploaders can update listing documents" ON public.listing_documents
  FOR UPDATE TO authenticated
  USING (uploaded_by = auth.uid());

CREATE POLICY "Uploaders can delete listing documents" ON public.listing_documents
  FOR DELETE TO authenticated
  USING (uploaded_by = auth.uid());

-- Storage bucket for listing documents
INSERT INTO storage.buckets (id, name, public) VALUES ('listing-documents', 'listing-documents', false)
ON CONFLICT (id) DO NOTHING;

-- Storage RLS: authenticated users can upload/read their own listing docs
CREATE POLICY "Authenticated users can upload listing docs" ON storage.objects
  FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'listing-documents');

CREATE POLICY "Authenticated users can read listing docs" ON storage.objects
  FOR SELECT TO authenticated
  USING (bucket_id = 'listing-documents');

CREATE POLICY "Users can delete own listing docs" ON storage.objects
  FOR DELETE TO authenticated
  USING (bucket_id = 'listing-documents' AND (storage.foldername(name))[1] = auth.uid()::text);

-- Updated_at trigger
CREATE TRIGGER update_listing_documents_updated_at BEFORE UPDATE ON public.listing_documents
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
