
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

  SELECT COALESCE(json_agg(json_build_object(
    'id', id,
    'title', title,
    'description', description,
    'priority', priority,
    'status', status,
    'created_at', created_at
  ) ORDER BY created_at DESC), '[]'::json)
  INTO v_maintenance
  FROM public.maintenance_jobs
  WHERE tenancy_id = v_tenancy.id;

  SELECT COALESCE(json_agg(json_build_object(
    'id', id,
    'amount', amount,
    'payment_date', payment_date,
    'period_from', period_from,
    'period_to', period_to,
    'payment_method', payment_method,
    'status', COALESCE(status, 'paid')
  ) ORDER BY payment_date DESC), '[]'::json)
  INTO v_payments
  FROM (SELECT * FROM public.rent_payments WHERE tenancy_id = v_tenancy.id ORDER BY payment_date DESC LIMIT 6) sub;

  SELECT COALESCE(json_agg(json_build_object(
    'id', id,
    'inspection_type', inspection_type,
    'scheduled_date', scheduled_date,
    'status', status,
    'report_token', report_token
  ) ORDER BY scheduled_date DESC), '[]'::json)
  INTO v_inspections
  FROM public.property_inspections
  WHERE property_id = v_tenancy.property_id;

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
      'bond_lodgement_number', v_tenancy.bond_lodgement_number,
      'bond_authority', v_tenancy.bond_authority,
      'status', v_tenancy.status
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
  v_full_description text;
BEGIN
  SELECT t.*, p.agent_id AS prop_agent_id INTO v_tenancy
  FROM public.tenancies t
  JOIN public.properties p ON p.id = t.property_id
  WHERE t.tenant_portal_token = p_token LIMIT 1;

  IF NOT FOUND THEN
    RETURN json_build_object('error', 'invalid_token');
  END IF;

  v_property_id := v_tenancy.property_id;
  v_agent_id := v_tenancy.prop_agent_id;

  v_full_description := '[Submitted via tenant portal'
    || CASE WHEN p_category IS NOT NULL AND p_category <> '' THEN ' — Category: ' || p_category ELSE '' END
    || ']' || E'\n\n' || COALESCE(p_description, '')
    || CASE WHEN p_photos IS NOT NULL AND array_length(p_photos, 1) > 0
         THEN E'\n\nPhotos:\n' || array_to_string(p_photos, E'\n')
         ELSE '' END;

  INSERT INTO public.maintenance_jobs (
    tenancy_id, property_id, agent_id, title, description,
    priority, status, reported_by
  )
  VALUES (
    v_tenancy.id, v_property_id, v_agent_id,
    LEFT(COALESCE(p_title, 'Maintenance request'), 200),
    LEFT(v_full_description, 4000),
    CASE WHEN p_priority IN ('urgent','routine','low') THEN p_priority ELSE 'routine' END,
    'new',
    COALESCE(v_tenancy.tenant_name, 'Tenant')
  )
  RETURNING id INTO v_job_id;

  RETURN json_build_object('success', true, 'id', v_job_id);
END;
$$;
