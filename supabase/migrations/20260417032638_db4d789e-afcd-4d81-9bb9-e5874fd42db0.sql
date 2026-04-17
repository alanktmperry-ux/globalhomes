
-- 1. Tenancy fields
ALTER TABLE public.tenancies ADD COLUMN IF NOT EXISTS tenant_portal_token text UNIQUE;
ALTER TABLE public.tenancies ADD COLUMN IF NOT EXISTS tenant_email text;
ALTER TABLE public.tenancies ADD COLUMN IF NOT EXISTS tenant_name text;
ALTER TABLE public.tenancies ADD COLUMN IF NOT EXISTS tenant_phone text;

-- Backfill tokens for existing tenancies
UPDATE public.tenancies
SET tenant_portal_token = encode(gen_random_bytes(32), 'hex')
WHERE tenant_portal_token IS NULL;

CREATE INDEX IF NOT EXISTS idx_tenancies_portal_token ON public.tenancies(tenant_portal_token);

-- 2. Tenant documents table
CREATE TABLE IF NOT EXISTS public.tenant_documents (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenancy_id uuid REFERENCES public.tenancies(id) ON DELETE CASCADE NOT NULL,
  document_type text NOT NULL DEFAULT 'other',
  label text,
  file_url text NOT NULL,
  uploaded_at timestamptz NOT NULL DEFAULT now(),
  uploaded_by uuid,
  visible_to_tenant boolean NOT NULL DEFAULT true
);

CREATE INDEX IF NOT EXISTS idx_tenant_documents_tenancy ON public.tenant_documents(tenancy_id);

ALTER TABLE public.tenant_documents ENABLE ROW LEVEL SECURITY;

-- Agents who own the parent property/tenancy can manage these documents
CREATE POLICY "Agents manage their tenancy documents"
ON public.tenant_documents
FOR ALL
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.tenancies t
    JOIN public.properties p ON p.id = t.property_id
    WHERE t.id = tenant_documents.tenancy_id
      AND p.agent_id IN (SELECT id FROM public.agents WHERE user_id = auth.uid())
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.tenancies t
    JOIN public.properties p ON p.id = t.property_id
    WHERE t.id = tenant_documents.tenancy_id
      AND p.agent_id IN (SELECT id FROM public.agents WHERE user_id = auth.uid())
  )
);

-- 3. Public token-based access RPC for portal load
CREATE OR REPLACE FUNCTION public.get_tenancy_by_portal_token(p_token text)
RETURNS json
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_tenancy RECORD;
  v_property RECORD;
  v_agent RECORD;
  v_documents json;
  v_maintenance json;
  v_payments json;
  v_inspections json;
BEGIN
  SELECT * INTO v_tenancy FROM public.tenancies WHERE tenant_portal_token = p_token LIMIT 1;
  IF NOT FOUND THEN
    RETURN json_build_object('error', 'not_found');
  END IF;

  SELECT id, address, suburb, state, postcode, title
    INTO v_property
  FROM public.properties WHERE id = v_tenancy.property_id;

  SELECT a.id, a.name, a.email, a.phone, a.profile_photo_url, a.avatar_url
    INTO v_agent
  FROM public.properties p
  JOIN public.agents a ON a.id = p.agent_id
  WHERE p.id = v_tenancy.property_id;

  SELECT COALESCE(json_agg(json_build_object(
    'id', d.id,
    'document_type', d.document_type,
    'label', d.label,
    'file_url', d.file_url,
    'uploaded_at', d.uploaded_at
  ) ORDER BY d.uploaded_at DESC), '[]'::json)
  INTO v_documents
  FROM public.tenant_documents d
  WHERE d.tenancy_id = v_tenancy.id AND d.visible_to_tenant = true;

  -- Maintenance requests for this tenancy (best-effort: column may be tenancy_id)
  BEGIN
    EXECUTE 'SELECT COALESCE(json_agg(json_build_object(
      ''id'', id,
      ''title'', title,
      ''category'', category,
      ''priority'', priority,
      ''status'', status,
      ''created_at'', created_at
    ) ORDER BY created_at DESC), ''[]''::json)
    FROM public.maintenance_jobs WHERE tenancy_id = $1'
    INTO v_maintenance USING v_tenancy.id;
  EXCEPTION WHEN OTHERS THEN
    v_maintenance := '[]'::json;
  END;

  -- Recent rent payments
  BEGIN
    EXECUTE 'SELECT COALESCE(json_agg(json_build_object(
      ''id'', id,
      ''amount'', amount,
      ''payment_date'', payment_date,
      ''payment_method'', payment_method,
      ''status'', COALESCE(status, ''paid'')
    ) ORDER BY payment_date DESC), ''[]''::json)
    FROM (SELECT * FROM public.rent_payments WHERE tenancy_id = $1 ORDER BY payment_date DESC LIMIT 6) sub'
    INTO v_payments USING v_tenancy.id;
  EXCEPTION WHEN OTHERS THEN
    v_payments := '[]'::json;
  END;

  -- Inspections
  BEGIN
    EXECUTE 'SELECT COALESCE(json_agg(json_build_object(
      ''id'', id,
      ''inspection_type'', inspection_type,
      ''scheduled_date'', scheduled_date,
      ''status'', status,
      ''report_token'', report_token
    ) ORDER BY scheduled_date DESC), ''[]''::json)
    FROM public.property_inspections WHERE property_id = $1'
    INTO v_inspections USING v_tenancy.property_id;
  EXCEPTION WHEN OTHERS THEN
    v_inspections := '[]'::json;
  END;

  RETURN json_build_object(
    'tenancy', json_build_object(
      'id', v_tenancy.id,
      'tenant_name', v_tenancy.tenant_name,
      'tenant_email', v_tenancy.tenant_email,
      'tenant_phone', v_tenancy.tenant_phone,
      'lease_start', v_tenancy.lease_start,
      'lease_end', v_tenancy.lease_end,
      'rent_amount', v_tenancy.rent_amount,
      'rent_frequency', v_tenancy.rent_frequency,
      'bond_amount', v_tenancy.bond_amount,
      'bond_lodgement_ref', v_tenancy.bond_lodgement_ref,
      'status', v_tenancy.status,
      'renewal_status', v_tenancy.renewal_status,
      'next_rent_due_date', v_tenancy.next_rent_due_date,
      'rent_paid_to_date', v_tenancy.rent_paid_to_date
    ),
    'property', row_to_json(v_property),
    'agent', row_to_json(v_agent),
    'documents', v_documents,
    'maintenance', v_maintenance,
    'payments', v_payments,
    'inspections', v_inspections
  );
END;
$$;

-- 4. Tenant maintenance submission via token
CREATE OR REPLACE FUNCTION public.submit_tenant_maintenance(
  p_token text,
  p_title text,
  p_description text,
  p_category text,
  p_priority text,
  p_photos text[] DEFAULT NULL
)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_tenancy RECORD;
  v_property_id uuid;
  v_agent_id uuid;
  v_job_id uuid;
BEGIN
  SELECT t.*, p.agent_id INTO v_tenancy
  FROM public.tenancies t
  JOIN public.properties p ON p.id = t.property_id
  WHERE t.tenant_portal_token = p_token LIMIT 1;

  IF NOT FOUND THEN
    RETURN json_build_object('error', 'invalid_token');
  END IF;

  v_property_id := v_tenancy.property_id;
  v_agent_id := v_tenancy.agent_id;

  INSERT INTO public.maintenance_jobs (
    tenancy_id, property_id, agent_id, title, description,
    category, priority, status, reported_by_tenant, photos
  )
  VALUES (
    v_tenancy.id, v_property_id, v_agent_id,
    LEFT(COALESCE(p_title, 'Maintenance request'), 200),
    LEFT(COALESCE(p_description, ''), 4000),
    COALESCE(p_category, 'general'),
    CASE WHEN p_priority IN ('urgent','routine','low') THEN p_priority ELSE 'routine' END,
    'new',
    true,
    COALESCE(p_photos, ARRAY[]::text[])
  )
  RETURNING id INTO v_job_id;

  RETURN json_build_object('success', true, 'id', v_job_id);
END;
$$;

-- 5. Storage bucket for tenant docs
INSERT INTO storage.buckets (id, name, public)
VALUES ('tenant-documents', 'tenant-documents', true)
ON CONFLICT (id) DO NOTHING;

DROP POLICY IF EXISTS "Tenant documents are publicly readable" ON storage.objects;
CREATE POLICY "Tenant documents are publicly readable"
ON storage.objects FOR SELECT
USING (bucket_id = 'tenant-documents');

DROP POLICY IF EXISTS "Authenticated agents upload tenant documents" ON storage.objects;
CREATE POLICY "Authenticated agents upload tenant documents"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (bucket_id = 'tenant-documents');

DROP POLICY IF EXISTS "Authenticated agents update tenant documents" ON storage.objects;
CREATE POLICY "Authenticated agents update tenant documents"
ON storage.objects FOR UPDATE
TO authenticated
USING (bucket_id = 'tenant-documents');

DROP POLICY IF EXISTS "Authenticated agents delete tenant documents" ON storage.objects;
CREATE POLICY "Authenticated agents delete tenant documents"
ON storage.objects FOR DELETE
TO authenticated
USING (bucket_id = 'tenant-documents');

-- Trigger: auto-generate portal token on new tenancy
CREATE OR REPLACE FUNCTION public.set_tenant_portal_token()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  IF NEW.tenant_portal_token IS NULL OR NEW.tenant_portal_token = '' THEN
    NEW.tenant_portal_token := encode(gen_random_bytes(32), 'hex');
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_set_tenant_portal_token ON public.tenancies;
CREATE TRIGGER trg_set_tenant_portal_token
BEFORE INSERT ON public.tenancies
FOR EACH ROW EXECUTE FUNCTION public.set_tenant_portal_token();
