DO $$
DECLARE
  v_val text := 'listhq-cron-2026-xK9mP3qR';
  v_id uuid;
BEGIN
  SELECT id INTO v_id FROM vault.secrets WHERE name = 'CRON_SECRET' LIMIT 1;
  IF v_id IS NULL THEN
    PERFORM vault.create_secret(v_val, 'CRON_SECRET', 'Shared bearer for scheduled jobs');
  ELSE
    PERFORM vault.update_secret(v_id, v_val);
  END IF;
END $$;