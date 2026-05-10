-- Phase 3A multilingual: store buyer message in original language + English translation
ALTER TABLE leads
ADD COLUMN IF NOT EXISTS message_original text,
ADD COLUMN IF NOT EXISTS original_language text,
ADD COLUMN IF NOT EXISTS message_en text;

COMMENT ON COLUMN leads.message_original IS
  'Phase 3A. The buyer-submitted message verbatim. NULL if buyer wrote in English.';

COMMENT ON COLUMN leads.original_language IS
  'Phase 3A. ISO 639-1 code of detected language. NULL or "en" means no translation needed.';

COMMENT ON COLUMN leads.message_en IS
  'Phase 3A. English translation of message_original. NULL if buyer wrote in English.';