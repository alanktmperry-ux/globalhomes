CREATE OR REPLACE FUNCTION public.admin_halo_diagnostics()
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, cron
AS $$
DECLARE
  v_is_admin boolean;
  v_halos_total int;
  v_halos_embedded int;
  v_halos_stale int;
  v_props_total int;
  v_props_embedded int;
  v_props_stale int;
  v_jobs jsonb;
  v_cutoff timestamptz := now() - interval '30 days';
BEGIN
  SELECT public.has_role(auth.uid(), 'admin') INTO v_is_admin;
  IF NOT COALESCE(v_is_admin, false) THEN
    RAISE EXCEPTION 'forbidden';
  END IF;

  SELECT count(*) INTO v_halos_total FROM halos WHERE status = 'active';
  SELECT count(*) INTO v_halos_embedded FROM halos WHERE status = 'active' AND embedding IS NOT NULL;
  SELECT count(*) INTO v_halos_stale FROM halos WHERE status = 'active' AND embedding IS NOT NULL AND embedding_updated_at < v_cutoff;

  SELECT count(*) INTO v_props_total FROM properties WHERE is_active = true;
  SELECT count(*) INTO v_props_embedded FROM properties WHERE is_active = true AND embedding IS NOT NULL;
  SELECT count(*) INTO v_props_stale FROM properties WHERE is_active = true AND embedding IS NOT NULL AND embedding_updated_at < v_cutoff;

  SELECT jsonb_agg(jsonb_build_object(
    'jobname', j.jobname,
    'schedule', j.schedule,
    'active', j.active,
    'last_status', r.status,
    'last_start', r.start_time,
    'last_end', r.end_time,
    'last_error', LEFT(COALESCE(r.return_message, ''), 200)
  ) ORDER BY j.jobname)
  INTO v_jobs
  FROM cron.job j
  LEFT JOIN LATERAL (
    SELECT status, start_time, end_time, return_message
    FROM cron.job_run_details
    WHERE jobid = j.jobid
    ORDER BY start_time DESC
    LIMIT 1
  ) r ON true
  WHERE j.jobname ILIKE ANY (ARRAY['%halo%','%embed%','%agent-digest%','%match-saved%','%search-alerts%','%boost-expiry%','%dunning%','%email-queue%']);

  RETURN jsonb_build_object(
    'halos', jsonb_build_object('total', v_halos_total, 'embedded', v_halos_embedded, 'stale', v_halos_stale),
    'properties', jsonb_build_object('total', v_props_total, 'embedded', v_props_embedded, 'stale', v_props_stale),
    'jobs', COALESCE(v_jobs, '[]'::jsonb)
  );
END $$;

REVOKE ALL ON FUNCTION public.admin_halo_diagnostics() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.admin_halo_diagnostics() TO authenticated;