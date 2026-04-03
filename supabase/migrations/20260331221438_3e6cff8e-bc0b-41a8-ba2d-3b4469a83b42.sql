
-- ── DOCUMENT CATEGORIES ────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS document_categories (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  slug          TEXT UNIQUE NOT NULL,
  label         TEXT NOT NULL,
  description   TEXT,
  icon          TEXT,
  visible_to    TEXT[] NOT NULL,
  requires_nda  BOOLEAN DEFAULT false,
  sort_order    INT DEFAULT 0
);

INSERT INTO document_categories (slug, label, description, icon, visible_to, sort_order)
VALUES
  ('contract_of_sale',   'Contract of Sale',          'Signed or draft sale contract',                    '📝', ARRAY['agent','buyer','vendor'],              10),
  ('section32',          'Section 32 / Vendor Statement', 'Vendor disclosure statement (VIC/other states)', '📋', ARRAY['agent','buyer','vendor'],              20),
  ('building_inspection','Building & Pest Report',    'Pre-purchase inspection report',                   '🔍', ARRAY['agent','buyer','vendor'],              30),
  ('strata_report',      'Strata / Body Corporate Report', 'Owners corporation records',                  '🏢', ARRAY['agent','buyer','vendor'],              40),
  ('title_search',       'Certificate of Title',      'Land title and encumbrances',                      '📜', ARRAY['agent','buyer','vendor'],              50),
  ('council_rates',      'Council Rates Notice',      'Current council rates certificate',                '🏛️', ARRAY['agent','vendor'],                       60),
  ('land_tax',           'Land Tax Certificate',       'State land tax clearance',                        '📊', ARRAY['agent','vendor'],                       70),
  ('floor_plan',         'Floor Plan',                'Architectural or sales floor plan',                '📐', ARRAY['agent','buyer','vendor','public'],      80),
  ('lease_agreement',    'Lease Agreement',            'Current or historical lease',                     '🔑', ARRAY['agent','tenant','pm','vendor'],         90),
  ('condition_report',   'Property Condition Report', 'Entry/exit inspection report',                     '✅', ARRAY['agent','tenant','pm'],                  100),
  ('rental_application', 'Rental Application',        'Tenant application form',                         '📄', ARRAY['agent','pm'],                           110),
  ('identity_doc',       'Identity Document',         'Passport or drivers licence (encrypted)',          '🪪', ARRAY['agent','pm'],                           120),
  ('other',              'Other',                     'Miscellaneous document',                           '📎', ARRAY['agent','buyer','vendor','tenant','pm'], 200)
ON CONFLICT (slug) DO NOTHING;

ALTER TABLE document_categories ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Categories are public" ON document_categories FOR SELECT USING (true);

-- ── PROPERTY DOCUMENTS ─────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS property_documents (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  property_id     UUID NOT NULL REFERENCES properties(id) ON DELETE CASCADE,
  category_slug   TEXT NOT NULL REFERENCES document_categories(slug),
  uploaded_by     UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  uploader_role   TEXT NOT NULL,
  file_name       TEXT NOT NULL,
  file_path       TEXT NOT NULL,
  file_size_bytes BIGINT,
  mime_type       TEXT,
  label           TEXT,
  description     TEXT,
  version         INT DEFAULT 1,
  is_current      BOOLEAN DEFAULT true,
  access_level    TEXT NOT NULL DEFAULT 'agent_only',
  visible_to_roles TEXT[] DEFAULT ARRAY['agent'],
  expires_at      TIMESTAMPTZ,
  signed          BOOLEAN DEFAULT false,
  signed_at       TIMESTAMPTZ,
  signed_by       UUID REFERENCES auth.users(id),
  download_count  INT DEFAULT 0,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE property_documents ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Agents manage own listing docs" ON property_documents
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM properties p
      JOIN agents a ON a.id = p.agent_id
      WHERE p.id = property_documents.property_id
        AND a.user_id = auth.uid()
    )
  );

CREATE POLICY "Buyers read accessible docs" ON property_documents
  FOR SELECT USING (
    'buyer' = ANY(visible_to_roles)
    AND access_level IN ('registered_buyers', 'public')
    AND EXISTS (SELECT 1 FROM auth.users WHERE id = auth.uid())
  );

CREATE POLICY "Public docs are public" ON property_documents
  FOR SELECT USING (access_level = 'public');

CREATE POLICY "Vendors read own property docs" ON property_documents
  FOR SELECT USING (
    'vendor' = ANY(visible_to_roles)
    AND EXISTS (
      SELECT 1 FROM properties p
      WHERE p.id = property_documents.property_id
        AND p.vendor_id = auth.uid()
    )
  );

CREATE POLICY "Tenants read own lease docs" ON property_documents
  FOR SELECT USING (
    'tenant' = ANY(visible_to_roles)
    AND EXISTS (
      SELECT 1 FROM rental_applications ra
      WHERE ra.property_id = property_documents.property_id
        AND ra.user_id = auth.uid()
        AND ra.status = 'approved'
    )
  );

CREATE INDEX idx_docs_property    ON property_documents (property_id, is_current, category_slug);
CREATE INDEX idx_docs_uploaded_by ON property_documents (uploaded_by);
CREATE INDEX idx_docs_expires     ON property_documents (expires_at) WHERE expires_at IS NOT NULL;

CREATE TRIGGER docs_updated_at BEFORE UPDATE ON property_documents
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ── DOCUMENT REQUESTS ──────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS document_requests (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  property_id     UUID NOT NULL REFERENCES properties(id) ON DELETE CASCADE,
  requested_by    UUID NOT NULL REFERENCES auth.users(id),
  requested_from  UUID REFERENCES auth.users(id),
  requested_email TEXT,
  category_slug   TEXT REFERENCES document_categories(slug),
  custom_label    TEXT,
  message         TEXT,
  due_date        DATE,
  status          TEXT NOT NULL DEFAULT 'pending',
  fulfilled_by_doc_id UUID REFERENCES property_documents(id) ON DELETE SET NULL,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  fulfilled_at    TIMESTAMPTZ
);

ALTER TABLE document_requests ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Requester manages own requests" ON document_requests
  FOR ALL USING (requested_by = auth.uid());

CREATE POLICY "Recipient sees own requests" ON document_requests
  FOR SELECT USING (
    requested_from = auth.uid()
    OR requested_email = (SELECT email FROM auth.users WHERE id = auth.uid())
  );

-- ── DOCUMENT DOWNLOAD LOG ──────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS document_downloads (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  document_id UUID NOT NULL REFERENCES property_documents(id) ON DELETE CASCADE,
  downloaded_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  session_id  TEXT,
  ip_hint     TEXT,
  downloaded_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE document_downloads ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Agents see downloads for own docs" ON document_downloads
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM property_documents pd
      JOIN properties p ON p.id = pd.property_id
      JOIN agents a ON a.id = p.agent_id
      WHERE pd.id = document_downloads.document_id
        AND a.user_id = auth.uid()
    )
  );
CREATE POLICY "Log insert open" ON document_downloads FOR INSERT WITH CHECK (true);

-- ── RPC: log_document_download ─────────────────────────────────────────
CREATE OR REPLACE FUNCTION log_document_download(p_document_id UUID, p_session_id TEXT DEFAULT NULL)
RETURNS TEXT LANGUAGE plpgsql SECURITY DEFINER
SET search_path TO 'public' AS $$
DECLARE v_path TEXT;
BEGIN
  SELECT file_path INTO v_path FROM property_documents WHERE id = p_document_id;
  INSERT INTO document_downloads (document_id, downloaded_by, session_id)
  VALUES (p_document_id, auth.uid(), p_session_id);
  UPDATE property_documents SET download_count = download_count + 1 WHERE id = p_document_id;
  RETURN v_path;
END;
$$;

-- ── STORAGE BUCKET ─────────────────────────────────────────────────────
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'property-documents',
  'property-documents',
  false,
  52428800,
  ARRAY[
    'application/pdf',
    'application/msword',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'image/jpeg', 'image/png', 'image/webp',
    'application/zip',
    'application/vnd.ms-excel',
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    'text/plain'
  ]
) ON CONFLICT (id) DO NOTHING;

CREATE POLICY "Agent upload to property-documents" ON storage.objects
  FOR INSERT WITH CHECK (
    bucket_id = 'property-documents'
    AND auth.role() = 'authenticated'
  );
CREATE POLICY "Agent read property-documents" ON storage.objects
  FOR SELECT USING (
    bucket_id = 'property-documents'
    AND auth.role() = 'authenticated'
  );
