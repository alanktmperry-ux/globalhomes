
CREATE OR REPLACE FUNCTION public.trigger_buyer_concierge()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  PERFORM net.http_post(
    url := 'https://ngrkbohpmkzjonaofgbb.supabase.co/functions/v1/orchestrate-buyer-concierge',
    headers := '{"Content-Type": "application/json", "Authorization": "Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im5ncmtib2hwbWt6am9uYW9mZ2JiIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzI5MDg5ODMsImV4cCI6MjA4ODQ4NDk4M30.UO9tGua8mfz1ava1zg75lzzOflK9z6z0yh7IwbWqsCU"}'::jsonb,
    body := '{}'::jsonb
  );
  RETURN NEW;
END;
$$;

CREATE TRIGGER on_voice_search_insert
  AFTER INSERT ON public.voice_searches
  FOR EACH ROW
  EXECUTE FUNCTION public.trigger_buyer_concierge();
