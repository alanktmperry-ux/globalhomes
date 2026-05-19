CREATE OR REPLACE FUNCTION public.get_agent_halo_analytics(_agent_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _caller uuid := auth.uid();
  _is_admin boolean;
  _unlocks int;
  _pitched int;
  _accepted int;
  _refunds int;
  _credits_spent int;
  _credits_refunded int;
  _avg_hours numeric;
BEGIN
  IF _caller IS NULL THEN
    RAISE EXCEPTION 'unauthenticated';
  END IF;

  _is_admin := public.has_role(_caller, 'admin');

  IF _caller <> _agent_id AND NOT _is_admin THEN
    RAISE EXCEPTION 'forbidden';
  END IF;

  SELECT COUNT(*) INTO _unlocks
  FROM halo_responses WHERE agent_id = _agent_id AND unlocked_at IS NOT NULL;

  SELECT COUNT(*) INTO _pitched
  FROM halo_responses WHERE agent_id = _agent_id AND body IS NOT NULL AND length(trim(body)) > 0;

  SELECT COUNT(*) INTO _accepted
  FROM halo_responses WHERE agent_id = _agent_id AND accepted = true;

  SELECT COALESCE(SUM(amount), 0) INTO _credits_spent
  FROM halo_credit_transactions WHERE agent_id = _agent_id AND type = 'spend';

  SELECT COUNT(*), COALESCE(SUM(amount), 0)
  INTO _refunds, _credits_refunded
  FROM halo_credit_transactions
  WHERE agent_id = _agent_id AND type = 'grant' AND note ILIKE '%refund%';

  SELECT ROUND(AVG(EXTRACT(EPOCH FROM (accepted_at - created_at)) / 3600.0)::numeric, 1)
  INTO _avg_hours
  FROM halo_responses
  WHERE agent_id = _agent_id AND accepted = true AND accepted_at IS NOT NULL;

  RETURN jsonb_build_object(
    'unlocks', _unlocks,
    'pitched', _pitched,
    'accepted', _accepted,
    'accept_rate', CASE WHEN _pitched > 0 THEN ROUND((_accepted::numeric / _pitched) * 100, 1) ELSE 0 END,
    'credits_spent', _credits_spent,
    'refunds', _refunds,
    'credits_refunded', _credits_refunded,
    'refund_rate', CASE WHEN _unlocks > 0 THEN ROUND((_refunds::numeric / _unlocks) * 100, 1) ELSE 0 END,
    'avg_hours_to_accept', COALESCE(_avg_hours, 0)
  );
END;
$$;

GRANT EXECUTE ON FUNCTION public.get_agent_halo_analytics(uuid) TO authenticated;