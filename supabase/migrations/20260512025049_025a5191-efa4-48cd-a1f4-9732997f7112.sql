-- NOTE: project's "enquiries" surface is implemented as the `leads` table.
-- We also mirror the same columns onto `crm_leads` because the agent's CRM inbox reads from there.

ALTER TABLE public.leads
  ADD COLUMN IF NOT EXISTS original_message text,
  ADD COLUMN IF NOT EXISTS original_lang text,
  ADD COLUMN IF NOT EXISTS translated_messages jsonb NOT NULL DEFAULT '{}'::jsonb,
  ADD COLUMN IF NOT EXISTS translation_status text NOT NULL DEFAULT 'pending'
    CHECK (translation_status IN ('pending','translating','complete','failed','skipped'));

ALTER TABLE public.crm_leads
  ADD COLUMN IF NOT EXISTS original_message text,
  ADD COLUMN IF NOT EXISTS original_lang text,
  ADD COLUMN IF NOT EXISTS translated_messages jsonb NOT NULL DEFAULT '{}'::jsonb,
  ADD COLUMN IF NOT EXISTS translation_status text NOT NULL DEFAULT 'pending'
    CHECK (translation_status IN ('pending','translating','complete','failed','skipped'));

-- Backfill leads
UPDATE public.leads
SET original_message = COALESCE(message_original, message)
WHERE original_message IS NULL AND (message_original IS NOT NULL OR message IS NOT NULL);

UPDATE public.leads
SET original_lang = COALESCE(original_language, 'en')
WHERE original_lang IS NULL;

UPDATE public.leads
SET translated_messages = jsonb_build_object('en', message_en)
WHERE (translated_messages = '{}'::jsonb OR translated_messages IS NULL)
  AND message_en IS NOT NULL
  AND original_language IS NOT NULL
  AND original_language <> 'en';

UPDATE public.leads
SET translation_status = CASE
  WHEN message_en IS NOT NULL AND original_language IS NOT NULL AND original_language <> 'en' THEN 'complete'
  ELSE 'skipped'
END
WHERE translation_status = 'pending' AND created_at < NOW();

-- Backfill crm_leads
UPDATE public.crm_leads
SET original_message = COALESCE(message_original, message)
WHERE original_message IS NULL AND (message_original IS NOT NULL OR message IS NOT NULL);

UPDATE public.crm_leads
SET original_lang = COALESCE(original_language, 'en')
WHERE original_lang IS NULL;

UPDATE public.crm_leads
SET translated_messages = jsonb_build_object('en', message_en)
WHERE (translated_messages = '{}'::jsonb OR translated_messages IS NULL)
  AND message_en IS NOT NULL
  AND original_language IS NOT NULL
  AND original_language <> 'en';

UPDATE public.crm_leads
SET translation_status = CASE
  WHEN message_en IS NOT NULL AND original_language IS NOT NULL AND original_language <> 'en' THEN 'complete'
  ELSE 'skipped'
END
WHERE translation_status = 'pending' AND created_at < NOW();

-- Indexes (partial worker index + GIN over translation map)
CREATE INDEX IF NOT EXISTS idx_leads_translation_status
  ON public.leads(translation_status)
  WHERE translation_status IN ('pending','translating');

CREATE INDEX IF NOT EXISTS idx_leads_translated_messages
  ON public.leads USING GIN (translated_messages);

CREATE INDEX IF NOT EXISTS idx_crm_leads_translation_status
  ON public.crm_leads(translation_status)
  WHERE translation_status IN ('pending','translating');

CREATE INDEX IF NOT EXISTS idx_crm_leads_translated_messages
  ON public.crm_leads USING GIN (translated_messages);

COMMENT ON COLUMN public.leads.original_message IS 'Exact enquiry text the buyer typed, in their native language.';
COMMENT ON COLUMN public.leads.original_lang IS 'ISO 639-1 (or 2-3 letter custom) source language code.';
COMMENT ON COLUMN public.leads.translated_messages IS 'Map of {locale: translated_text} populated by translate-enquiry for the recipient agent locale.';
COMMENT ON COLUMN public.leads.translation_status IS 'pending | translating | complete | failed | skipped';

-- Backfill safety: ensure original_message NOT NULL going forward for new rows that supply it
-- (kept nullable for historic rows that had message = NULL).

-- ============= Trigger to fire translate-enquiry on insert =============

CREATE EXTENSION IF NOT EXISTS pg_net WITH SCHEMA extensions;

CREATE OR REPLACE FUNCTION public.trigger_translate_enquiry()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, extensions
AS $$
BEGIN
  IF NEW.translation_status = 'pending' THEN
    BEGIN
      PERFORM net.http_post(
        url := 'https://ngrkbohpmkzjonaofgbb.supabase.co/functions/v1/translate-enquiry',
        headers := '{"Content-Type": "application/json", "Authorization": "Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im5ncmtib2hwbWt6am9uYW9mZ2JiIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzI5MDg5ODMsImV4cCI6MjA4ODQ4NDk4M30.UO9tGua8mfz1ava1zg75lzzOflK9z6z0yh7IwbWqsCU"}'::jsonb,
        body := jsonb_build_object('enquiryId', NEW.id::text)
      );
    EXCEPTION WHEN OTHERS THEN
      RAISE WARNING 'translate-enquiry dispatch failed for lead %: %', NEW.id, SQLERRM;
    END;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS leads_translate_on_insert ON public.leads;
CREATE TRIGGER leads_translate_on_insert
  AFTER INSERT ON public.leads
  FOR EACH ROW
  EXECUTE FUNCTION public.trigger_translate_enquiry();