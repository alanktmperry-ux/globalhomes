
-- Enable pg_net for HTTP calls from triggers
CREATE EXTENSION IF NOT EXISTS pg_net SCHEMA extensions;

-- Recreate trigger function to pass voice search data and use service role key
CREATE OR REPLACE FUNCTION public.trigger_buyer_concierge()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _url text;
  _key text;
BEGIN
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
    url := _url || '/functions/v1/orchestrate-buyer-concierge',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'Authorization', 'Bearer ' || _key
    ),
    body := jsonb_build_object(
      'voice_search_id', NEW.id,
      'transcript', NEW.transcript,
      'user_id', NEW.user_id
    )
  );
  RETURN NEW;
EXCEPTION WHEN OTHERS THEN
  RETURN NEW;
END;
$$;

-- Drop any existing trigger
DROP TRIGGER IF EXISTS on_voice_search_insert ON public.voice_searches;

-- Create the trigger
CREATE TRIGGER on_voice_search_insert
  AFTER INSERT ON public.voice_searches
  FOR EACH ROW
  EXECUTE FUNCTION public.trigger_buyer_concierge();
