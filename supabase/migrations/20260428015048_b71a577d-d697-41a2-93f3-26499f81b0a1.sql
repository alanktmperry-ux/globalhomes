ALTER TABLE public.properties
  ADD COLUMN IF NOT EXISTS owner_portal_token_expires_at timestamptz;

CREATE OR REPLACE FUNCTION public.get_property_by_owner_token(p_token text)
 RETURNS json
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_property RECORD;
  v_agent RECORD;
  v_tenancy RECORD;
  v_maintenance json;
  v_statements json;
  v_inspections json;
  v_documents json;
  v_payment_status text := 'no_tenancy';
  v_days_overdue int := 0;
  v_latest RECORD;
BEGIN
  SELECT * INTO v_property FROM public.properties WHERE owner_portal_token = p_token LIMIT 1;
  IF NOT FOUND THEN
    RETURN json_build_object('error', 'not_found');
  END IF;

  -- Reject expired tokens (legacy tokens with NULL expiry remain valid)
  IF v_property.owner_portal_token_expires_at IS NOT NULL
     AND v_property.owner_portal_token_expires_at < now() THEN
    RETURN json_build_object('error', 'expired');
  END IF;

  SELECT a.id, a.name, a.email, a.phone, a.profile_photo_url, a.avatar_url
    INTO v_agent FROM public.agents a WHERE a.id = v_property.agent_id;

  SELECT * INTO v_tenancy FROM public.tenancies
  WHERE property_id = v_property.id AND status = 'active'
  ORDER BY lease_start DESC LIMIT 1;

  IF v_tenancy.id IS NOT NULL THEN
    SELECT * INTO v_latest FROM public.rent_payments
    WHERE tenancy_id = v_tenancy.id ORDER BY payment_date DESC LIMIT 1;
    IF NOT FOUND THEN
      v_days_overdue := GREATEST(0, (CURRENT_DATE - v_tenancy.lease_start)::int);
      v_payment_status := CASE WHEN v_days_overdue > 3 THEN 'overdue' ELSE 'current' END;
    ELSE
      v_days_overdue := GREATEST(0, (CURRENT_DATE - v_latest.period_to)::int);
      v_payment_status := CASE WHEN v_days_overdue > 3 AND COALESCE(v_latest.status,'paid') <> 'paid' THEN 'overdue' ELSE 'current' END;
    END IF;
  END IF;

  SELECT COALESCE(json_agg(json_build_object(
    'id', id, 'title', title, 'description', description,
    'priority', priority, 'status', status, 'created_at', created_at,
    'quoted_amount_aud', quoted_amount_aud, 'quote_document_url', quote_document_url,
    'owner_approval_required', owner_approval_required,
    'owner_approval_status', owner_approval_status,
    'owner_approved_at', owner_approved_at,
    'owner_decline_reason', owner_decline_reason,
    'cost_aud', actual_cost
  ) ORDER BY created_at DESC), '[]'::json)
  INTO v_maintenance
  FROM public.maintenance_jobs WHERE property_id = v_property.id;

  SELECT COALESCE(json_agg(json_build_object(
    'id', id, 'period_start', period_start, 'period_end', period_end,
    'gross_rent_aud', gross_rent_aud, 'management_fee_aud', management_fee_aud,
    'maintenance_costs_aud', maintenance_costs_aud,
    'other_deductions_aud', other_deductions_aud,
    'net_amount_aud', net_amount_aud,
    'statement_notes', statement_notes, 'pdf_url', pdf_url,
    'created_at', created_at
  ) ORDER BY period_end DESC), '[]'::json)
  INTO v_statements
  FROM public.owner_statements WHERE property_id = v_property.id;

  SELECT COALESCE(json_agg(json_build_object(
    'id', id, 'inspection_type', inspection_type,
    'scheduled_date', scheduled_date, 'conducted_date', conducted_date,
    'status', status, 'report_token', report_token
  ) ORDER BY scheduled_date DESC), '[]'::json)
  INTO v_inspections
  FROM public.property_inspections WHERE property_id = v_property.id;

  SELECT COALESCE(json_agg(json_build_object(
    'id', d.id, 'document_type', d.document_type, 'label', d.label,
    'file_url', d.file_url, 'uploaded_at', d.uploaded_at
  ) ORDER BY d.uploaded_at DESC), '[]'::json)
  INTO v_documents
  FROM public.tenant_documents d
  JOIN public.tenancies t ON t.id = d.tenancy_id
  WHERE t.property_id = v_property.id;

  RETURN json_build_object(
    'property', json_build_object(
      'id', v_property.id, 'address', v_property.address,
      'suburb', v_property.suburb, 'state', v_property.state,
      'postcode', v_property.postcode, 'title', v_property.title,
      'price', v_property.price, 'owner_name', v_property.owner_name,
      'owner_email', v_property.owner_email,
      'maintenance_approval_threshold_aud', v_property.maintenance_approval_threshold_aud
    ),
    'agent', row_to_json(v_agent),
    'tenancy', CASE WHEN v_tenancy.id IS NOT NULL THEN json_build_object(
      'id', v_tenancy.id, 'tenant_name', v_tenancy.tenant_name,
      'lease_start', v_tenancy.lease_start, 'lease_end', v_tenancy.lease_end,
      'rent_amount', v_tenancy.rent_amount, 'rent_frequency', v_tenancy.rent_frequency,
      'status', v_tenancy.status,
      'payment_status', v_payment_status, 'days_overdue', v_days_overdue
    ) ELSE NULL END,
    'maintenance', v_maintenance,
    'statements', v_statements,
    'inspections', v_inspections,
    'documents', v_documents
  );
END;
$function$;