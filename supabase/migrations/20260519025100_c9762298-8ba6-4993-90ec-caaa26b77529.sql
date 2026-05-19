-- Admin-only RPC to inspect & manage CRON_SECRET in Vault
CREATE OR REPLACE FUNCTION public.admin_get_cron_secret_status()
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, vault
AS $$
DECLARE
  v_exists boolean;
  v_value text;
BEGIN
  IF NOT public.has_role(auth.uid(), 'admin') THEN
    RAISE EXCEPTION 'Forbidden';
  END IF;
  SELECT EXISTS (SELECT 1 FROM vault.decrypted_secrets WHERE name = 'CRON_SECRET') INTO v_exists;
  IF v_exists THEN
    SELECT decrypted_secret INTO v_value FROM vault.decrypted_secrets WHERE name = 'CRON_SECRET' LIMIT 1;
    RETURN jsonb_build_object('exists', true, 'length', length(v_value), 'preview', left(v_value, 6) || '...');
  END IF;
  RETURN jsonb_build_object('exists', false);
END;
$$;

CREATE OR REPLACE FUNCTION public.admin_set_cron_secret(p_value text)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, vault, extensions
AS $$
DECLARE
  v_id uuid;
BEGIN
  IF NOT public.has_role(auth.uid(), 'admin') THEN
    RAISE EXCEPTION 'Forbidden';
  END IF;
  IF p_value IS NULL OR length(p_value) < 16 THEN
    RAISE EXCEPTION 'Value too short';
  END IF;
  SELECT id INTO v_id FROM vault.secrets WHERE name = 'CRON_SECRET' LIMIT 1;
  IF v_id IS NULL THEN
    PERFORM vault.create_secret(p_value, 'CRON_SECRET', 'Shared secret for scheduled jobs to authenticate with edge functions');
  ELSE
    PERFORM vault.update_secret(v_id, p_value);
  END IF;
  RETURN jsonb_build_object('ok', true);
END;
$$;

REVOKE ALL ON FUNCTION public.admin_get_cron_secret_status() FROM PUBLIC;
REVOKE ALL ON FUNCTION public.admin_set_cron_secret(text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.admin_get_cron_secret_status() TO authenticated;
GRANT EXECUTE ON FUNCTION public.admin_set_cron_secret(text) TO authenticated;