CREATE OR REPLACE FUNCTION trigger_notify_offmarket_subscribers()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public' AS $$
DECLARE
  _url text;
  _key text;
BEGIN
  IF NEW.listing_mode NOT IN ('off_market', 'eoi') THEN
    RETURN NEW;
  END IF;

  _url := coalesce(
    current_setting('app.settings.supabase_url', true),
    'https://ngrkbohpmkzjonaofgbb.supabase.co'
  );
  _key := coalesce(
    current_setting('app.settings.service_role_key', true),
    current_setting('app.settings.supabase_anon_key', true),
    'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im5ncmtib2hwbWt6am9uYW9mZ2JiIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzI5MDg5ODMsImV4cCI6MjA4ODQ4NDk4M30.UO9tGua8mfz1ava1zg75lzzOflK9z6z0yh7IwbWqsCU'
  );

  PERFORM net.http_post(
    url := _url || '/functions/v1/notify-offmarket-subscribers',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'Authorization', 'Bearer ' || _key
    ),
    body := jsonb_build_object('record', row_to_json(NEW))
  );
  RETURN NEW;
EXCEPTION WHEN OTHERS THEN
  RAISE WARNING 'notify-offmarket-subscribers trigger error: %', SQLERRM;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_notify_offmarket_subscribers ON properties;
CREATE TRIGGER trg_notify_offmarket_subscribers
  AFTER INSERT OR UPDATE OF listing_mode ON properties
  FOR EACH ROW
  EXECUTE FUNCTION trigger_notify_offmarket_subscribers();