ALTER TABLE public.referral_leads
ADD COLUMN IF NOT EXISTS message_original text,
ADD COLUMN IF NOT EXISTS original_language text,
ADD COLUMN IF NOT EXISTS message_en text;

COMMENT ON COLUMN public.referral_leads.message_original IS 'Phase 3B. Buyer enquiry message in original language. NULL if buyer wrote in English.';
COMMENT ON COLUMN public.referral_leads.original_language IS 'Phase 3B. ISO 639-1 code of detected language. NULL or "en" means no translation needed.';
COMMENT ON COLUMN public.referral_leads.message_en IS 'Phase 3B. English translation of message_original. NULL if buyer wrote in English.';