CREATE OR REPLACE FUNCTION public.verify_webhook_config()
RETURNS jsonb
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT jsonb_build_object(
    'supabase_url', current_setting('app.supabase_url', true),
    'service_role_key_set',
      current_setting('app.service_role_key', true) IS NOT NULL
      AND current_setting('app.service_role_key', true) != '',
    'webhook_ready',
      current_setting('app.supabase_url', true) IS NOT NULL
      AND current_setting('app.supabase_url', true) != ''
      AND current_setting('app.service_role_key', true) IS NOT NULL
      AND current_setting('app.service_role_key', true) != ''
  );
$$;

REVOKE ALL ON FUNCTION public.verify_webhook_config() FROM public;
GRANT EXECUTE ON FUNCTION public.verify_webhook_config() TO authenticated;