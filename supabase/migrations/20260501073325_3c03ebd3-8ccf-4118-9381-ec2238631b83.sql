CREATE OR REPLACE FUNCTION public.get_agent_sidebar_counts(p_agent_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_active_count integer;
  v_arrears_count integer;
  v_renewals_count integer;
  v_dispute_count integer;
  v_smoke_count integer;
  today date := current_date;
BEGIN
  SELECT COUNT(*) INTO v_active_count
  FROM properties
  WHERE agent_id = p_agent_id AND is_active = true;

  SELECT COUNT(*) INTO v_renewals_count
  FROM tenancies
  WHERE agent_id = p_agent_id
    AND status = 'active'
    AND lease_end IS NOT NULL
    AND lease_end BETWEEN today AND today + interval '90 days'
    AND (renewal_status IS NULL OR renewal_status IN ('none', 'declined'));

  SELECT COUNT(*) INTO v_arrears_count
  FROM (
    SELECT DISTINCT ON (rp.tenancy_id) rp.tenancy_id, rp.period_to, rp.status
    FROM rent_payments rp
    JOIN tenancies t ON t.id = rp.tenancy_id
    WHERE t.agent_id = p_agent_id AND t.status = 'active'
    ORDER BY rp.tenancy_id, rp.payment_date DESC
  ) latest
  WHERE (today - latest.period_to::date) > 3
    AND latest.status != 'paid';

  SELECT COUNT(*) INTO v_dispute_count
  FROM property_inspections pi
  JOIN tenancies t ON t.id = pi.tenancy_id
  WHERE t.agent_id = p_agent_id
    AND pi.tenant_disputed_at IS NOT NULL
    AND pi.dispute_resolved_at IS NULL;

  SELECT COUNT(*) INTO v_smoke_count
  FROM smoke_alarm_records
  WHERE agent_id = p_agent_id
    AND next_service_due < today;

  RETURN jsonb_build_object(
    'active_count', v_active_count,
    'renewals_count', v_renewals_count,
    'arrears_count', v_arrears_count,
    'dispute_count', v_dispute_count,
    'smoke_alarm_overdue', v_smoke_count
  );
END;
$$;

GRANT EXECUTE ON FUNCTION public.get_agent_sidebar_counts(uuid) TO authenticated;
