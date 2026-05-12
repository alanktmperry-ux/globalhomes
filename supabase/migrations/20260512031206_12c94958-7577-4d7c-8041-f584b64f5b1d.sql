-- Legacy column mapping: notifications.title -> original_title, notifications.message -> original_body
ALTER TABLE public.notifications
  ADD COLUMN IF NOT EXISTS original_title text,
  ADD COLUMN IF NOT EXISTS original_body text,
  ADD COLUMN IF NOT EXISTS original_lang text NOT NULL DEFAULT 'en',
  ADD COLUMN IF NOT EXISTS translated_titles jsonb NOT NULL DEFAULT '{}'::jsonb,
  ADD COLUMN IF NOT EXISTS translated_bodies jsonb NOT NULL DEFAULT '{}'::jsonb,
  ADD COLUMN IF NOT EXISTS translation_status text NOT NULL DEFAULT 'pending'
    CHECK (translation_status IN ('pending','translating','complete','failed','skipped'));

-- Backfill from legacy columns
UPDATE public.notifications
SET original_title = COALESCE(original_title, title),
    original_body  = COALESCE(original_body, message, '')
WHERE original_title IS NULL OR original_body IS NULL;

-- Existing rows shouldn't be translated retroactively
UPDATE public.notifications
SET translation_status = 'skipped'
WHERE translation_status = 'pending' AND created_at < NOW();

ALTER TABLE public.notifications
  ALTER COLUMN original_title SET NOT NULL,
  ALTER COLUMN original_body SET NOT NULL;

CREATE INDEX IF NOT EXISTS idx_notifications_translation_status
  ON public.notifications(translation_status)
  WHERE translation_status IN ('pending','translating');

CREATE INDEX IF NOT EXISTS idx_notifications_translated_bodies
  ON public.notifications USING GIN (translated_bodies);

COMMENT ON COLUMN public.notifications.original_title IS 'Exact title authored, mirrors legacy column "title".';
COMMENT ON COLUMN public.notifications.original_body  IS 'Exact body authored, mirrors legacy column "message".';
COMMENT ON COLUMN public.notifications.translated_titles IS 'Map of {locale: translated_title} populated by translate-notification.';
COMMENT ON COLUMN public.notifications.translated_bodies IS 'Map of {locale: translated_body} populated by translate-notification.';
COMMENT ON COLUMN public.notifications.translation_status IS 'pending | translating | complete | failed | skipped';

-- ============= Trigger =============
CREATE EXTENSION IF NOT EXISTS pg_net WITH SCHEMA extensions;

CREATE OR REPLACE FUNCTION public.trigger_translate_notification()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, extensions
AS $$
BEGIN
  IF NEW.translation_status = 'pending' THEN
    BEGIN
      PERFORM net.http_post(
        url := 'https://ngrkbohpmkzjonaofgbb.supabase.co/functions/v1/translate-notification',
        headers := '{"Content-Type": "application/json", "Authorization": "Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im5ncmtib2hwbWt6am9uYW9mZ2JiIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzI5MDg5ODMsImV4cCI6MjA4ODQ4NDk4M30.UO9tGua8mfz1ava1zg75lzzOflK9z6z0yh7IwbWqsCU"}'::jsonb,
        body := jsonb_build_object('notificationId', NEW.id::text)
      );
    EXCEPTION WHEN OTHERS THEN
      RAISE WARNING 'translate-notification dispatch failed for notification %: %', NEW.id, SQLERRM;
    END;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS notifications_translate_on_insert ON public.notifications;
CREATE TRIGGER notifications_translate_on_insert
  AFTER INSERT ON public.notifications
  FOR EACH ROW
  EXECUTE FUNCTION public.trigger_translate_notification();