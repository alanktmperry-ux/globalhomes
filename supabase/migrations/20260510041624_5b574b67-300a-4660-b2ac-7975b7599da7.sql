ALTER TABLE crm_leads
ADD COLUMN IF NOT EXISTS message text,
ADD COLUMN IF NOT EXISTS message_original text,
ADD COLUMN IF NOT EXISTS original_language text,
ADD COLUMN IF NOT EXISTS message_en text;

COMMENT ON COLUMN crm_leads.message IS 'Phase 3A-UI. Buyer enquiry message (English version when translated).';
COMMENT ON COLUMN crm_leads.message_original IS 'Phase 3A-UI. Buyer message in original language.';
COMMENT ON COLUMN crm_leads.original_language IS 'Phase 3A-UI. ISO 639-1 code or NULL/en.';
COMMENT ON COLUMN crm_leads.message_en IS 'Phase 3A-UI. English translation of message_original.';