-- ── Item 1: structured intent extraction fields ──
DO $$ BEGIN
  ALTER TABLE public.crm_leads
    ADD COLUMN intent_suburb TEXT,
    ADD COLUMN intent_state TEXT,
    ADD COLUMN intent_budget_min NUMERIC,
    ADD COLUMN intent_budget_max NUMERIC,
    ADD COLUMN intent_bedrooms_min INTEGER,
    ADD COLUMN intent_bathrooms_min INTEGER,
    ADD COLUMN intent_property_type TEXT,
    ADD COLUMN intent_timeline TEXT,
    ADD COLUMN intent_purpose TEXT,
    ADD COLUMN intent_language_detected TEXT,
    ADD COLUMN intent_confidence NUMERIC,
    ADD COLUMN intent_raw JSONB,
    ADD COLUMN is_thin_search BOOLEAN NOT NULL DEFAULT false;
EXCEPTION WHEN duplicate_column THEN NULL; END $$;

CREATE INDEX IF NOT EXISTS idx_crm_leads_intent_suburb ON public.crm_leads(lower(intent_suburb)) WHERE intent_suburb IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_crm_leads_intent_language ON public.crm_leads(intent_language_detected) WHERE intent_language_detected IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_crm_leads_is_thin_search ON public.crm_leads(is_thin_search) WHERE is_thin_search = true;
CREATE INDEX IF NOT EXISTS idx_crm_leads_intent_budget ON public.crm_leads(intent_budget_min, intent_budget_max) WHERE intent_budget_min IS NOT NULL OR intent_budget_max IS NOT NULL;

-- Soft validation
DO $$ BEGIN
  ALTER TABLE public.crm_leads
    ADD CONSTRAINT chk_intent_confidence_range CHECK (intent_confidence IS NULL OR (intent_confidence >= 0 AND intent_confidence <= 100));
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- ── Item 4: transparent scoring ──
DO $$ BEGIN
  ALTER TABLE public.crm_leads
    ADD COLUMN lead_score INTEGER,
    ADD COLUMN lead_score_breakdown JSONB,
    ADD COLUMN lead_score_updated_at TIMESTAMPTZ;
EXCEPTION WHEN duplicate_column THEN NULL; END $$;

DO $$ BEGIN
  ALTER TABLE public.crm_leads
    ADD CONSTRAINT chk_lead_score_range CHECK (lead_score IS NULL OR (lead_score >= 0 AND lead_score <= 100));
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

CREATE INDEX IF NOT EXISTS idx_crm_leads_lead_score ON public.crm_leads(lead_score DESC NULLS LAST) WHERE lead_score IS NOT NULL;