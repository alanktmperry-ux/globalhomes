-- Suppliers (tradespeople) directory
CREATE TABLE IF NOT EXISTS public.suppliers (
  id uuid primary key default gen_random_uuid(),
  agent_id uuid references public.agents(id) on delete cascade,
  business_name text not null,
  contact_name text,
  email text,
  phone text,
  trade_category text not null,
  abn text,
  license_number text,
  insurance_expiry date,
  insurance_document_url text,
  preferred boolean default false,
  rating_avg numeric default 0,
  jobs_completed int default 0,
  jobs_cancelled int default 0,
  notes text,
  status text default 'active',
  portal_token text unique default encode(gen_random_bytes(32), 'hex'),
  created_at timestamptz default now()
);

CREATE INDEX IF NOT EXISTS idx_suppliers_agent ON public.suppliers(agent_id);
CREATE INDEX IF NOT EXISTS idx_suppliers_token ON public.suppliers(portal_token);

ALTER TABLE public.suppliers ENABLE ROW LEVEL SECURITY;

-- Validate enums
CREATE OR REPLACE FUNCTION public.validate_supplier()
RETURNS trigger LANGUAGE plpgsql SET search_path TO 'public' AS $$
BEGIN
  IF NEW.trade_category NOT IN (
    'plumbing','electrical','carpentry','painting','cleaning','pest_control',
    'landscaping','roofing','hvac','locksmith','glazing','general_maintenance','other'
  ) THEN
    RAISE EXCEPTION 'Invalid trade_category: %', NEW.trade_category;
  END IF;
  IF NEW.status NOT IN ('active','inactive','blacklisted') THEN
    RAISE EXCEPTION 'Invalid supplier status: %', NEW.status;
  END IF;
  IF NEW.portal_token IS NULL OR NEW.portal_token = '' THEN
    NEW.portal_token := encode(gen_random_bytes(32), 'hex');
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_validate_supplier ON public.suppliers;
CREATE TRIGGER trg_validate_supplier BEFORE INSERT OR UPDATE ON public.suppliers
FOR EACH ROW EXECUTE FUNCTION public.validate_supplier();

-- RLS: agent owns their suppliers
CREATE POLICY "Agents manage their suppliers" ON public.suppliers
FOR ALL TO authenticated
USING (agent_id = public.get_my_agent_id())
WITH CHECK (agent_id = public.get_my_agent_id());

-- Public read by token (for supplier portal) — handled via SECURITY DEFINER RPC below
-- (no broad public select policy)

-- Supplier reviews
CREATE TABLE IF NOT EXISTS public.supplier_reviews (
  id uuid primary key default gen_random_uuid(),
  supplier_id uuid references public.suppliers(id) on delete cascade,
  maintenance_job_id uuid references public.maintenance_jobs(id) on delete cascade,
  agent_id uuid references public.agents(id),
  rating int check (rating between 1 and 5),
  review_text text,
  created_at timestamptz default now()
);

CREATE INDEX IF NOT EXISTS idx_supplier_reviews_supplier ON public.supplier_reviews(supplier_id);

ALTER TABLE public.supplier_reviews ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Agents manage their supplier reviews" ON public.supplier_reviews
FOR ALL TO authenticated
USING (agent_id = public.get_my_agent_id())
WITH CHECK (agent_id = public.get_my_agent_id());

-- Recalculate supplier rating on review changes
CREATE OR REPLACE FUNCTION public.refresh_supplier_rating(p_supplier_id uuid)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public' AS $$
BEGIN
  UPDATE public.suppliers s SET
    rating_avg = COALESCE((SELECT ROUND(AVG(rating)::numeric, 2) FROM public.supplier_reviews WHERE supplier_id = p_supplier_id), 0),
    jobs_completed = (SELECT COUNT(*) FROM public.maintenance_jobs WHERE assigned_supplier_id = p_supplier_id AND status = 'completed')
  WHERE s.id = p_supplier_id;
END;
$$;

CREATE OR REPLACE FUNCTION public.on_supplier_review_change()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public' AS $$
BEGIN
  PERFORM public.refresh_supplier_rating(COALESCE(NEW.supplier_id, OLD.supplier_id));
  RETURN COALESCE(NEW, OLD);
END;
$$;

DROP TRIGGER IF EXISTS trg_supplier_review_change ON public.supplier_reviews;
CREATE TRIGGER trg_supplier_review_change AFTER INSERT OR UPDATE OR DELETE ON public.supplier_reviews
FOR EACH ROW EXECUTE FUNCTION public.on_supplier_review_change();

-- Add supplier assignment fields to maintenance_jobs (project uses maintenance_jobs, not maintenance_requests)
ALTER TABLE public.maintenance_jobs ADD COLUMN IF NOT EXISTS assigned_supplier_id uuid REFERENCES public.suppliers(id);
ALTER TABLE public.maintenance_jobs ADD COLUMN IF NOT EXISTS supplier_notified_at timestamptz;
ALTER TABLE public.maintenance_jobs ADD COLUMN IF NOT EXISTS supplier_accepted_at timestamptz;
ALTER TABLE public.maintenance_jobs ADD COLUMN IF NOT EXISTS supplier_scheduled_date date;
ALTER TABLE public.maintenance_jobs ADD COLUMN IF NOT EXISTS supplier_scheduled_time text;
ALTER TABLE public.maintenance_jobs ADD COLUMN IF NOT EXISTS completion_notes text;
ALTER TABLE public.maintenance_jobs ADD COLUMN IF NOT EXISTS final_cost_aud numeric;
ALTER TABLE public.maintenance_jobs ADD COLUMN IF NOT EXISTS invoice_url text;

CREATE INDEX IF NOT EXISTS idx_maintenance_jobs_supplier ON public.maintenance_jobs(assigned_supplier_id);

-- RPC: supplier portal data by token
CREATE OR REPLACE FUNCTION public.get_supplier_by_portal_token(p_token text)
RETURNS json LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path TO 'public' AS $$
DECLARE
  v_supplier RECORD;
  v_agent RECORD;
  v_active_jobs json;
  v_completed_jobs json;
BEGIN
  SELECT * INTO v_supplier FROM public.suppliers WHERE portal_token = p_token LIMIT 1;
  IF NOT FOUND THEN
    RETURN json_build_object('error', 'not_found');
  END IF;

  SELECT a.id, a.name, a.email, a.phone INTO v_agent
  FROM public.agents a WHERE a.id = v_supplier.agent_id;

  SELECT COALESCE(json_agg(json_build_object(
    'id', mj.id, 'title', mj.title, 'description', mj.description,
    'priority', mj.priority, 'status', mj.status, 'created_at', mj.created_at,
    'supplier_notified_at', mj.supplier_notified_at,
    'supplier_accepted_at', mj.supplier_accepted_at,
    'supplier_scheduled_date', mj.supplier_scheduled_date,
    'supplier_scheduled_time', mj.supplier_scheduled_time,
    'property_address', p.address || ', ' || COALESCE(p.suburb,'') || ' ' || COALESCE(p.state,''),
    'tenant_name', t.tenant_name,
    'tenant_phone', t.tenant_phone
  ) ORDER BY mj.created_at DESC), '[]'::json)
  INTO v_active_jobs
  FROM public.maintenance_jobs mj
  LEFT JOIN public.properties p ON p.id = mj.property_id
  LEFT JOIN public.tenancies t ON t.id = mj.tenancy_id
  WHERE mj.assigned_supplier_id = v_supplier.id
    AND mj.status NOT IN ('completed','cancelled');

  SELECT COALESCE(json_agg(json_build_object(
    'id', mj.id, 'title', mj.title,
    'completed_at', mj.completed_date,
    'final_cost_aud', mj.final_cost_aud,
    'property_address', p.address || ', ' || COALESCE(p.suburb,'') || ' ' || COALESCE(p.state,''),
    'rating', (SELECT rating FROM public.supplier_reviews WHERE maintenance_job_id = mj.id LIMIT 1)
  ) ORDER BY mj.completed_date DESC NULLS LAST), '[]'::json)
  INTO v_completed_jobs
  FROM (
    SELECT * FROM public.maintenance_jobs
    WHERE assigned_supplier_id = v_supplier.id AND status = 'completed'
    ORDER BY completed_date DESC NULLS LAST LIMIT 10
  ) mj
  LEFT JOIN public.properties p ON p.id = mj.property_id;

  RETURN json_build_object(
    'supplier', json_build_object(
      'id', v_supplier.id, 'business_name', v_supplier.business_name,
      'contact_name', v_supplier.contact_name, 'email', v_supplier.email,
      'phone', v_supplier.phone, 'trade_category', v_supplier.trade_category,
      'abn', v_supplier.abn, 'license_number', v_supplier.license_number,
      'insurance_expiry', v_supplier.insurance_expiry,
      'rating_avg', v_supplier.rating_avg,
      'jobs_completed', v_supplier.jobs_completed
    ),
    'agent', row_to_json(v_agent),
    'active_jobs', v_active_jobs,
    'completed_jobs', v_completed_jobs
  );
END;
$$;

-- RPC: supplier actions (accept / propose schedule / mark complete)
CREATE OR REPLACE FUNCTION public.supplier_action_on_job(
  p_token text, p_job_id uuid, p_action text,
  p_scheduled_date date DEFAULT NULL, p_scheduled_time text DEFAULT NULL,
  p_completion_notes text DEFAULT NULL, p_final_cost numeric DEFAULT NULL,
  p_invoice_url text DEFAULT NULL
)
RETURNS json LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public' AS $$
DECLARE
  v_supplier RECORD;
  v_job RECORD;
BEGIN
  SELECT * INTO v_supplier FROM public.suppliers WHERE portal_token = p_token LIMIT 1;
  IF NOT FOUND THEN RETURN json_build_object('error','invalid_token'); END IF;

  SELECT * INTO v_job FROM public.maintenance_jobs WHERE id = p_job_id AND assigned_supplier_id = v_supplier.id;
  IF NOT FOUND THEN RETURN json_build_object('error','job_not_found'); END IF;

  IF p_action = 'accept' THEN
    UPDATE public.maintenance_jobs SET supplier_accepted_at = now(), status = 'assigned' WHERE id = p_job_id;
  ELSIF p_action = 'schedule' THEN
    UPDATE public.maintenance_jobs SET
      supplier_scheduled_date = p_scheduled_date,
      supplier_scheduled_time = p_scheduled_time
    WHERE id = p_job_id;
  ELSIF p_action = 'complete' THEN
    UPDATE public.maintenance_jobs SET
      status = 'completed',
      completed_date = CURRENT_DATE,
      completion_notes = COALESCE(p_completion_notes, completion_notes),
      final_cost_aud = COALESCE(p_final_cost, final_cost_aud),
      invoice_url = COALESCE(p_invoice_url, invoice_url)
    WHERE id = p_job_id;
    PERFORM public.refresh_supplier_rating(v_supplier.id);
  ELSE
    RETURN json_build_object('error','invalid_action');
  END IF;

  RETURN json_build_object('success', true);
END;
$$;

GRANT EXECUTE ON FUNCTION public.get_supplier_by_portal_token(text) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.supplier_action_on_job(text, uuid, text, date, text, text, numeric, text) TO anon, authenticated;

-- Storage bucket for supplier insurance docs and invoices
INSERT INTO storage.buckets (id, name, public)
VALUES ('supplier-docs', 'supplier-docs', true)
ON CONFLICT (id) DO NOTHING;

CREATE POLICY "Public read supplier-docs" ON storage.objects
FOR SELECT USING (bucket_id = 'supplier-docs');

CREATE POLICY "Authenticated upload supplier-docs" ON storage.objects
FOR INSERT TO authenticated WITH CHECK (bucket_id = 'supplier-docs');

CREATE POLICY "Authenticated update supplier-docs" ON storage.objects
FOR UPDATE TO authenticated USING (bucket_id = 'supplier-docs');

CREATE POLICY "Authenticated delete supplier-docs" ON storage.objects
FOR DELETE TO authenticated USING (bucket_id = 'supplier-docs');