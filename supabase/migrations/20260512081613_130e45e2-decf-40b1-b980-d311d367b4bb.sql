CREATE OR REPLACE FUNCTION public.bump_rate_limit(
  p_bucket_key text,
  p_window_seconds integer,
  p_max_requests integer
)
RETURNS TABLE (
  request_count integer,
  window_start timestamptz,
  blocked_until timestamptz,
  allowed boolean
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_now timestamptz := now();
  v_window_floor timestamptz := v_now - make_interval(secs => p_window_seconds);
  v_row public.rate_limits%ROWTYPE;
BEGIN
  -- Atomic upsert: increment if same window, reset if window expired.
  INSERT INTO public.rate_limits (bucket_key, request_count, window_start, last_request_at, blocked_until)
  VALUES (p_bucket_key, 1, v_now, v_now, NULL)
  ON CONFLICT (bucket_key) DO UPDATE
  SET
    request_count = CASE
      WHEN public.rate_limits.window_start <= v_window_floor THEN 1
      ELSE public.rate_limits.request_count + 1
    END,
    window_start = CASE
      WHEN public.rate_limits.window_start <= v_window_floor THEN v_now
      ELSE public.rate_limits.window_start
    END,
    last_request_at = v_now,
    blocked_until = CASE
      WHEN public.rate_limits.blocked_until IS NOT NULL AND public.rate_limits.blocked_until > v_now
        THEN public.rate_limits.blocked_until
      WHEN public.rate_limits.window_start <= v_window_floor THEN NULL
      WHEN public.rate_limits.request_count + 1 > p_max_requests
        THEN public.rate_limits.window_start + make_interval(secs => p_window_seconds)
      ELSE NULL
    END
  RETURNING * INTO v_row;

  RETURN QUERY SELECT
    v_row.request_count,
    v_row.window_start,
    v_row.blocked_until,
    (v_row.request_count <= p_max_requests AND (v_row.blocked_until IS NULL OR v_row.blocked_until <= v_now))::boolean AS allowed;
END;
$$;

REVOKE ALL ON FUNCTION public.bump_rate_limit(text, integer, integer) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.bump_rate_limit(text, integer, integer) TO service_role;