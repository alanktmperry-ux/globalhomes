CREATE TABLE IF NOT EXISTS public.rate_limits (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  bucket_key text NOT NULL,
  request_count integer NOT NULL DEFAULT 1,
  window_start timestamptz NOT NULL DEFAULT now(),
  last_request_at timestamptz NOT NULL DEFAULT now(),
  blocked_until timestamptz,
  UNIQUE (bucket_key)
);

CREATE INDEX IF NOT EXISTS idx_rate_limits_bucket ON public.rate_limits(bucket_key);
CREATE INDEX IF NOT EXISTS idx_rate_limits_window ON public.rate_limits(window_start);
CREATE INDEX IF NOT EXISTS idx_rate_limits_blocked ON public.rate_limits(blocked_until) WHERE blocked_until IS NOT NULL;

ALTER TABLE public.rate_limits ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "service_role_only_rate_limits" ON public.rate_limits;
CREATE POLICY "service_role_only_rate_limits"
  ON public.rate_limits
  FOR ALL TO service_role
  USING (true) WITH CHECK (true);

CREATE OR REPLACE FUNCTION public.cleanup_old_rate_limits()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  DELETE FROM public.rate_limits
  WHERE window_start < NOW() - INTERVAL '1 hour'
    AND (blocked_until IS NULL OR blocked_until < NOW());
END;
$$;

CREATE OR REPLACE VIEW public.rate_limit_dashboard AS
SELECT
  split_part(bucket_key, ':', 1) AS endpoint,
  split_part(bucket_key, ':', 2) AS scope,
  COUNT(*) AS active_buckets,
  SUM(request_count) AS total_requests_this_window,
  COUNT(*) FILTER (WHERE blocked_until IS NOT NULL AND blocked_until > NOW()) AS currently_blocked
FROM public.rate_limits
WHERE window_start > NOW() - INTERVAL '5 minutes'
GROUP BY 1, 2
ORDER BY total_requests_this_window DESC;

REVOKE ALL ON public.rate_limit_dashboard FROM PUBLIC;
GRANT SELECT ON public.rate_limit_dashboard TO service_role;