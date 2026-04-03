CREATE OR REPLACE FUNCTION reset_reminder_flags_on_reschedule()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  IF NEW.starts_at IS DISTINCT FROM OLD.starts_at THEN
    NEW.reminder_24h_sent := false;
    NEW.reminder_1h_sent  := false;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_reset_reminder_flags ON open_homes;
CREATE TRIGGER trg_reset_reminder_flags
  BEFORE UPDATE ON open_homes
  FOR EACH ROW
  EXECUTE FUNCTION reset_reminder_flags_on_reschedule();