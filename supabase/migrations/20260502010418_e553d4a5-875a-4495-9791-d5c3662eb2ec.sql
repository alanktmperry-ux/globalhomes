-- Fix month-end close to read from trust_receipts/trust_payments and fix supplier RPC column names

-- 1. Drop old trigger on trust_transactions (wrong table)
DROP TRIGGER IF EXISTS trust_transactions_period_lock ON public.trust_transactions;

-- 2. Rewrite period-lock trigger function for receipts/payments
CREATE OR REPLACE FUNCTION public.prevent_closed_period_changes_rp()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_year INTEGER;
  v_month INTEGER;
  v_date DATE;
  v_agent_id UUID;
  v_closed BOOLEAN;
BEGIN
  IF TG_TABLE_NAME = 'trust_receipts' THEN
    v_date := NEW.date_received;
  ELSE
    v_date := NEW.date_paid;
  END IF;
  v_agent_id := NEW.agent_id;

  IF v_date IS NULL OR v_agent_id IS NULL THEN
    RETURN NEW;
  END IF;

  v_year := EXTRACT(YEAR FROM v_date)::INTEGER;
  v_month := EXTRACT(MONTH FROM v_date)::INTEGER;

  SELECT bool_or(tab.is_closed) INTO v_closed
  FROM public.trust_account_balances tab
  JOIN public.trust_accounts ta ON ta.id = tab.trust_account_id
  WHERE ta.agent_id = v_agent_id
    AND tab.period_year = v_year
    AND tab.period_month = v_month;

  IF v_closed IS TRUE THEN
    RAISE EXCEPTION 'Cannot modify transactions in a closed period (% / %)', v_month, v_year;
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trust_receipts_period_lock ON public.trust_receipts;
CREATE TRIGGER trust_receipts_period_lock
  BEFORE INSERT OR UPDATE ON public.trust_receipts
  FOR EACH ROW
  EXECUTE FUNCTION public.prevent_closed_period_changes_rp();

DROP TRIGGER IF EXISTS trust_payments_period_lock ON public.trust_payments;
CREATE TRIGGER trust_payments_period_lock
  BEFORE INSERT OR UPDATE ON public.trust_payments
  FOR EACH ROW
  EXECUTE FUNCTION public.prevent_closed_period_changes_rp();

-- 3. Rewrite close_trust_period to read from trust_receipts/trust_payments
CREATE OR REPLACE FUNCTION public.close_trust_period(
  p_agent_id UUID,
  p_year INTEGER,
  p_month INTEGER
)
RETURNS NUMERIC
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_receipts NUMERIC := 0;
  v_payments NUMERIC := 0;
  v_period_net NUMERIC := 0;
  v_opening NUMERIC := 0;
  v_closing NUMERIC := 0;
  v_account RECORD;
  v_next_year INTEGER;
  v_next_month INTEGER;
  v_period_start DATE;
  v_period_end DATE;
BEGIN
  v_period_start := make_date(p_year, p_month, 1);
  v_period_end := (v_period_start + INTERVAL '1 month')::DATE;

  IF p_month = 12 THEN
    v_next_year := p_year + 1;
    v_next_month := 1;
  ELSE
    v_next_year := p_year;
    v_next_month := p_month + 1;
  END IF;

  -- Aggregate at the agent level (receipts/payments are per-agent, not per-account)
  SELECT COALESCE(SUM(amount), 0) INTO v_receipts
  FROM public.trust_receipts
  WHERE agent_id = p_agent_id
    AND date_received >= v_period_start
    AND date_received < v_period_end;

  SELECT COALESCE(SUM(amount), 0) INTO v_payments
  FROM public.trust_payments
  WHERE agent_id = p_agent_id
    AND date_paid >= v_period_start
    AND date_paid < v_period_end;

  v_period_net := v_receipts - v_payments;

  -- Apply per trust account belonging to the agent
  FOR v_account IN
    SELECT id FROM public.trust_accounts WHERE agent_id = p_agent_id
  LOOP
    SELECT COALESCE(opening_balance, 0) INTO v_opening
    FROM public.trust_account_balances
    WHERE trust_account_id = v_account.id
      AND period_year = p_year
      AND period_month = p_month;

    v_closing := COALESCE(v_opening, 0) + v_period_net;

    INSERT INTO public.trust_account_balances
      (trust_account_id, period_year, period_month, opening_balance, closing_balance, is_closed, closed_at, closed_by)
    VALUES (v_account.id, p_year, p_month, COALESCE(v_opening, 0), v_closing, true, now(), auth.uid())
    ON CONFLICT (trust_account_id, period_year, period_month)
    DO UPDATE SET
      closing_balance = EXCLUDED.closing_balance,
      is_closed = true,
      closed_at = now(),
      closed_by = auth.uid(),
      updated_at = now();

    INSERT INTO public.trust_account_balances
      (trust_account_id, period_year, period_month, opening_balance, is_closed)
    VALUES (v_account.id, v_next_year, v_next_month, v_closing, false)
    ON CONFLICT (trust_account_id, period_year, period_month)
    DO UPDATE SET opening_balance = EXCLUDED.opening_balance, updated_at = now()
    WHERE public.trust_account_balances.is_closed = false;
  END LOOP;

  RETURN v_period_net;
END;
$$;

GRANT EXECUTE ON FUNCTION public.close_trust_period(UUID, INTEGER, INTEGER) TO authenticated;

-- 4. Fix supplier RPCs — completed_date doesn't exist, use completed_at (timestamptz)
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
    'completed_at', mj.completed_at,
    'final_cost_aud', mj.final_cost_aud,
    'property_address', p.address || ', ' || COALESCE(p.suburb,'') || ' ' || COALESCE(p.state,''),
    'rating', (SELECT rating FROM public.supplier_reviews WHERE maintenance_job_id = mj.id LIMIT 1)
  ) ORDER BY mj.completed_at DESC NULLS LAST), '[]'::json)
  INTO v_completed_jobs
  FROM (
    SELECT * FROM public.maintenance_jobs
    WHERE assigned_supplier_id = v_supplier.id AND status = 'completed'
    ORDER BY completed_at DESC NULLS LAST LIMIT 10
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
      completed_at = now(),
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