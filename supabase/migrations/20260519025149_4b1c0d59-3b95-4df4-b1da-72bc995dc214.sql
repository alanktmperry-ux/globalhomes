-- Rotate / create CRON_SECRET in Vault using a freshly generated value.
-- The same value must be written to the edge function secret CRON_SECRET (user step).
DO $$
DECLARE
  v_new text := encode(gen_random_bytes(32), 'hex');
  v_id uuid;
BEGIN
  SELECT id INTO v_id FROM vault.secrets WHERE name = 'CRON_SECRET' LIMIT 1;
  IF v_id IS NULL THEN
    PERFORM vault.create_secret(v_new, 'CRON_SECRET', 'Shared bearer for scheduled jobs');
  ELSE
    PERFORM vault.update_secret(v_id, v_new);
  END IF;
END $$;