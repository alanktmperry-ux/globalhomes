-- Properties: owner contact + portal token + threshold
ALTER TABLE public.properties ADD COLUMN IF NOT EXISTS owner_name text;
ALTER TABLE public.properties ADD COLUMN IF NOT EXISTS owner_email text;
ALTER TABLE public.properties ADD COLUMN IF NOT EXISTS owner_phone text;
ALTER TABLE public.properties ADD COLUMN IF NOT EXISTS owner_portal_token text UNIQUE;
ALTER TABLE public.properties ADD COLUMN IF NOT EXISTS maintenance_approval_threshold_aud numeric DEFAULT 500;

UPDATE public.properties SET owner_portal_token = encode(gen_random_bytes(32), 'hex') WHERE owner_portal_token IS NULL;

CREATE OR REPLACE FUNCTION public.set_owner_portal_token()
RETURNS trigger LANGUAGE plpgsql SET search_path = public AS $$
BEGIN
  IF NEW.owner_portal_token IS NULL OR NEW.owner_portal_token = '' THEN
    NEW.owner_portal_token := encode(gen_random_bytes(32), 'hex');
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_set_owner_portal_token ON public.properties;
CREATE TRIGGER trg_set_owner_portal_token
BEFORE INSERT ON public.properties
FOR EACH ROW EXECUTE FUNCTION public.set_owner_portal_token();

-- Owner statements
CREATE TABLE IF NOT EXISTS public.owner_statements (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  property_id uuid REFERENCES public.properties(id) ON DELETE CASCADE,
  agent_id uuid REFERENCES public.agents(id),
  period_start date NOT NULL,
  period_end date NOT NULL,
  gross_rent_aud numeric DEFAULT 0,
  management_fee_aud numeric DEFAULT 0,
  maintenance_costs_aud numeric DEFAULT 0,
  other_deductions_aud numeric DEFAULT 0,
  other_deductions_breakdown jsonb DEFAULT '[]'::jsonb,
  net_amount_aud numeric DEFAULT 0,
  statement_notes text,
  pdf_url text,
  emailed_to_owner boolean DEFAULT false,
  emailed_at timestamptz,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE public.owner_statements ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Agents manage their own statements" ON public.owner_statements;
CREATE POLICY "Agents manage their own statements"
ON public.owner_statements FOR ALL
USING (agent_id IN (SELECT id FROM public.agents WHERE user_id = auth.uid()))
WITH CHECK (agent_id IN (SELECT id FROM public.agents WHERE user_id = auth.uid()));

CREATE INDEX IF NOT EXISTS idx_owner_statements_property ON public.owner_statements(property_id);
CREATE INDEX IF NOT EXISTS idx_owner_statements_agent ON public.owner_statements(agent_id);

-- Maintenance jobs: quote + owner approval
ALTER TABLE public.maintenance_jobs ADD COLUMN IF NOT EXISTS quoted_amount_aud numeric;
ALTER TABLE public.maintenance_jobs ADD COLUMN IF NOT EXISTS quote_document_url text;
ALTER TABLE public.maintenance_jobs ADD COLUMN IF NOT EXISTS owner_approval_required boolean DEFAULT false;
ALTER TABLE public.maintenance_jobs ADD COLUMN IF NOT EXISTS owner_approval_status text DEFAULT 'not_required';
ALTER TABLE public.maintenance_jobs ADD COLUMN IF NOT EXISTS owner_approved_at timestamptz;
ALTER TABLE public.maintenance_jobs ADD COLUMN IF NOT EXISTS owner_decline_reason text;

-- Extend pm_automation_rules check constraint to allow owner_statement_reminder
ALTER TABLE public.pm_automation_rules DROP CONSTRAINT IF EXISTS pm_automation_rules_rule_type_check;
ALTER TABLE public.pm_automation_rules ADD CONSTRAINT pm_automation_rules_rule_type_check
  CHECK (rule_type IN ('arrears_sequence','lease_renewal_notice','inspection_entry_notice','maintenance_update','owner_statement_reminder'));

-- RPC: owner portal fetch
CREATE OR REPLACE FUNCTION public.get_property_by_owner_token(p_token text)
RETURNS json LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public AS $$
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
$$;

-- RPC: owner approves/declines
CREATE OR REPLACE FUNCTION public.owner_decision_on_maintenance(
  p_token text, p_job_id uuid, p_decision text, p_decline_reason text DEFAULT NULL
)
RETURNS json LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_property RECORD;
  v_job RECORD;
BEGIN
  SELECT * INTO v_property FROM public.properties WHERE owner_portal_token = p_token LIMIT 1;
  IF NOT FOUND THEN RETURN json_build_object('error', 'invalid_token'); END IF;

  SELECT * INTO v_job FROM public.maintenance_jobs WHERE id = p_job_id AND property_id = v_property.id;
  IF NOT FOUND THEN RETURN json_build_object('error', 'job_not_found'); END IF;

  IF p_decision NOT IN ('approved','declined') THEN
    RETURN json_build_object('error', 'invalid_decision');
  END IF;

  UPDATE public.maintenance_jobs
  SET owner_approval_status = p_decision,
      owner_approved_at = CASE WHEN p_decision = 'approved' THEN now() ELSE owner_approved_at END,
      owner_decline_reason = CASE WHEN p_decision = 'declined' THEN p_decline_reason ELSE NULL END
  WHERE id = p_job_id;

  RETURN json_build_object('success', true, 'decision', p_decision);
END;
$$;

-- Seed owner_statement_reminder rule for all agents
CREATE OR REPLACE FUNCTION public.seed_owner_statement_reminder_rule(_agent_id uuid)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM public.pm_automation_rules
    WHERE agent_id = _agent_id AND rule_type = 'owner_statement_reminder'
  ) THEN
    INSERT INTO public.pm_automation_rules (agent_id, rule_type, trigger_day, channel, template_subject, template_body, is_active)
    VALUES (_agent_id, 'owner_statement_reminder', 1, 'email', 'Reminder: Owner statements due',
      E'Hi {agent_name},\n\nIt''s the start of a new month — owner statements for last month are due for these properties:\n\n{property_list}\n\nGo to your dashboard → Statements to generate and send them.\n\nListHQ', true);
  END IF;
END;
$$;

DO $$
DECLARE _a RECORD;
BEGIN
  FOR _a IN SELECT id FROM public.agents LOOP
    PERFORM public.seed_owner_statement_reminder_rule(_a.id);
  END LOOP;
END $$;