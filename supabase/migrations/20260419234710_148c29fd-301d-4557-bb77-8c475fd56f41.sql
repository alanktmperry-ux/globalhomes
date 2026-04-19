-- Enable pg_net for async HTTP calls from triggers
CREATE EXTENSION IF NOT EXISTS pg_net WITH SCHEMA extensions;

-- Helper function: called by trigger to fire the readiness edge function
CREATE OR REPLACE FUNCTION public.trigger_buyer_readiness_recalc()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, extensions
AS $$
DECLARE
  fn_url text;
  anon_key text;
BEGIN
  -- Only recalculate when we have a buyer_id
  IF NEW.buyer_id IS NULL THEN
    RETURN NEW;
  END IF;

  -- Build the edge function URL from the project ref
  fn_url := 'https://ngrkbohpmkzjonaofgbb.supabase.co/functions/v1/calculate-buyer-readiness';
  anon_key := 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im5ncmtib2hwbWt6am9uYW9mZ2JiIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzI5MDg5ODMsImV4cCI6MjA4ODQ4NDk4M30.UO9tGua8mfz1ava1zg75lzzOflK9z6z0yh7IwbWqsCU';

  -- Fire-and-forget HTTP call
  PERFORM extensions.http_post(
    url := fn_url,
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'Authorization', 'Bearer ' || anon_key,
      'apikey', anon_key
    ),
    body := jsonb_build_object('buyer_id', NEW.buyer_id)
  );

  RETURN NEW;
EXCEPTION WHEN OTHERS THEN
  -- Never block the insert if the HTTP call fails
  RAISE WARNING 'trigger_buyer_readiness_recalc failed: %', SQLERRM;
  RETURN NEW;
END;
$$;

-- Attach trigger to buyer_activity_events
DROP TRIGGER IF EXISTS buyer_activity_events_readiness_trigger ON public.buyer_activity_events;
CREATE TRIGGER buyer_activity_events_readiness_trigger
  AFTER INSERT ON public.buyer_activity_events
  FOR EACH ROW
  EXECUTE FUNCTION public.trigger_buyer_readiness_recalc();