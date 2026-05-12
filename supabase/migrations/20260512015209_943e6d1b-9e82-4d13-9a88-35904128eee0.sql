CREATE EXTENSION IF NOT EXISTS pg_net WITH SCHEMA extensions;

CREATE OR REPLACE FUNCTION public.trigger_translate_message()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, extensions
AS $$
BEGIN
  IF NEW.translation_status = 'pending' THEN
    BEGIN
      PERFORM net.http_post(
        url := 'https://ngrkbohpmkzjonaofgbb.supabase.co/functions/v1/translate-message',
        headers := '{"Content-Type": "application/json", "Authorization": "Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im5ncmtib2hwbWt6am9uYW9mZ2JiIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzI5MDg5ODMsImV4cCI6MjA4ODQ4NDk4M30.UO9tGua8mfz1ava1zg75lzzOflK9z6z0yh7IwbWqsCU"}'::jsonb,
        body := jsonb_build_object('messageId', NEW.id::text)
      );
    EXCEPTION WHEN OTHERS THEN
      RAISE WARNING 'translate-message dispatch failed for msg %: %', NEW.id, SQLERRM;
    END;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS messages_translate_on_insert ON public.messages;
CREATE TRIGGER messages_translate_on_insert
  AFTER INSERT ON public.messages
  FOR EACH ROW
  EXECUTE FUNCTION public.trigger_translate_message();
