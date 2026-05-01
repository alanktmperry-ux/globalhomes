CREATE OR REPLACE FUNCTION public.test_webhook(p_webhook_name text)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_supabase_url text;
  v_service_key text;
  v_response jsonb;
  v_path text;
  v_request_id bigint;
BEGIN
  IF NOT public.has_role(auth.uid(), 'admin') THEN
    RAISE EXCEPTION 'admin role required';
  END IF;

  v_supabase_url := coalesce(
    nullif(current_setting('app.supabase_url', true), ''),
    'https://ngrkbohpmkzjonaofgbb.supabase.co'
  );
  v_service_key := coalesce(
    nullif(current_setting('app.service_role_key', true), ''),
    nullif(current_setting('app.settings.supabase_anon_key', true), ''),
    ''
  );

  v_path := CASE p_webhook_name
    WHEN 'search_alerts'         THEN '/functions/v1/send-search-alerts'
    WHEN 'buyer_concierge'       THEN '/functions/v1/orchestrate-buyer-concierge'
    WHEN 'lead_notifications'    THEN '/functions/v1/send-notification-email'
    WHEN 'offmarket_subscribers' THEN '/functions/v1/notify-offmarket-subscribers'
    WHEN 'strata_health'         THEN '/functions/v1/compute-strata-health-score'
    ELSE NULL
  END;

  IF v_path IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'unknown webhook: ' || p_webhook_name);
  END IF;

  BEGIN
    SELECT net.http_post(
      url := v_supabase_url || v_path,
      headers := jsonb_build_object(
        'Content-Type', 'application/json',
        'Authorization', 'Bearer ' || v_service_key
      ),
      body := jsonb_build_object('test', true, 'mode', 'diagnostic')
    ) INTO v_request_id;

    RETURN jsonb_build_object(
      'success', true,
      'request_id', v_request_id,
      'url', v_supabase_url || v_path,
      'note', 'Request queued via pg_net. Check Edge Function logs for execution result.'
    );
  EXCEPTION WHEN OTHERS THEN
    RETURN jsonb_build_object('success', false, 'error', SQLERRM, 'url', v_supabase_url || v_path);
  END;
END;
$$;

REVOKE ALL ON FUNCTION public.test_webhook(text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.test_webhook(text) TO authenticated;