-- Add translation infrastructure columns to messages
ALTER TABLE public.messages
  ADD COLUMN IF NOT EXISTS original_body text,
  ADD COLUMN IF NOT EXISTS original_lang text,
  ADD COLUMN IF NOT EXISTS translated_bodies jsonb NOT NULL DEFAULT '{}'::jsonb,
  ADD COLUMN IF NOT EXISTS translation_status text NOT NULL DEFAULT 'pending'
    CHECK (translation_status IN ('pending','translating','complete','failed','skipped'));

-- Backfill original_body from existing `content` column (this codebase uses `content`, not `body`)
UPDATE public.messages
SET original_body = content
WHERE original_body IS NULL AND content IS NOT NULL;

-- Default original_lang to 'en' for legacy rows
UPDATE public.messages
SET original_lang = 'en'
WHERE original_lang IS NULL;

-- Mark all pre-existing rows as 'skipped' so the new pipeline ignores them
UPDATE public.messages
SET translation_status = 'skipped'
WHERE translation_status = 'pending' AND created_at < NOW();

-- Enforce NOT NULL now that backfill is complete
ALTER TABLE public.messages
  ALTER COLUMN original_body SET NOT NULL,
  ALTER COLUMN original_lang SET NOT NULL;

-- Indexes
CREATE INDEX IF NOT EXISTS idx_messages_translation_status
  ON public.messages(translation_status)
  WHERE translation_status IN ('pending','translating');

CREATE INDEX IF NOT EXISTS idx_messages_translated_bodies
  ON public.messages USING GIN (translated_bodies);

COMMENT ON COLUMN public.messages.original_body IS 'The exact text the sender typed in their native language. Never mutated after insert.';
COMMENT ON COLUMN public.messages.original_lang IS 'ISO 639-1 source language detected by the translate-message edge function on insert.';
COMMENT ON COLUMN public.messages.translated_bodies IS 'Map of {locale: translated_text} populated lazily by translate-message. Read by useMessages with fallback to original_body.';
COMMENT ON COLUMN public.messages.translation_status IS 'Lifecycle: pending -> translating -> complete (or failed/skipped). pending = insert just happened, edge fn hasnt fired yet.';

-- Helper view: list of distinct participant locales per conversation.
-- conversation_participants.user_id joins profiles.user_id (NOT profiles.id) in this schema.
CREATE OR REPLACE VIEW public.conversation_participant_locales AS
SELECT
  cp.conversation_id,
  array_agg(DISTINCT COALESCE(p.locale, p.language_preference, p.preferred_language, 'en')
            ORDER BY COALESCE(p.locale, p.language_preference, p.preferred_language, 'en')) AS locales
FROM public.conversation_participants cp
LEFT JOIN public.profiles p ON p.user_id = cp.user_id
GROUP BY cp.conversation_id;

GRANT SELECT ON public.conversation_participant_locales TO authenticated;
