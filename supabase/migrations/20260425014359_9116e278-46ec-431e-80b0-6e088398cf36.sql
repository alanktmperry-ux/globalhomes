-- ============================================================
-- Batch 6 Item 3 — Rule-based automation triggers
-- ============================================================

-- Enums
CREATE TYPE public.automation_trigger_type AS ENUM (
  'lead_going_cold',
  'hot_lead_new',
  'inspection_followup',
  'appraisal_followup',
  'under_offer_stale',
  'settlement_reminder'
);

CREATE TYPE public.automation_action_type AS ENUM (
  'notify_agent',
  'suggest_template',
  'create_task',
  'set_next_action'
);

-- Rules table
CREATE TABLE public.automation_rules (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  agency_id uuid NOT NULL REFERENCES public.agencies(id) ON DELETE CASCADE,
  name text NOT NULL,
  trigger_type public.automation_trigger_type NOT NULL,
  conditions jsonb NOT NULL DEFAULT '{}'::jsonb,
  action_type public.automation_action_type NOT NULL,
  action_config jsonb NOT NULL DEFAULT '{}'::jsonb,
  is_active boolean NOT NULL DEFAULT true,
  source_data_available boolean NOT NULL DEFAULT true,
  created_by uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_automation_rules_agency ON public.automation_rules(agency_id);
CREATE INDEX idx_automation_rules_active ON public.automation_rules(is_active, trigger_type) WHERE is_active = true;

-- Log table
CREATE TABLE public.automation_log (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  rule_id uuid NOT NULL REFERENCES public.automation_rules(id) ON DELETE CASCADE,
  agency_id uuid NOT NULL REFERENCES public.agencies(id) ON DELETE CASCADE,
  target_id uuid NOT NULL,
  target_type text NOT NULL,
  fired_at timestamptz NOT NULL DEFAULT now(),
  fired_date date NOT NULL DEFAULT (now() AT TIME ZONE 'UTC')::date,
  action_taken text,
  error_msg text
);

-- Dedup index: same rule+target combo at most once per day
CREATE UNIQUE INDEX uq_automation_log_dedup
  ON public.automation_log(rule_id, target_id, fired_date);

CREATE INDEX idx_automation_log_agency ON public.automation_log(agency_id, fired_at DESC);
CREATE INDEX idx_automation_log_rule ON public.automation_log(rule_id, fired_at DESC);

-- Updated_at trigger
CREATE TRIGGER trg_automation_rules_updated_at
BEFORE UPDATE ON public.automation_rules
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- RLS
ALTER TABLE public.automation_rules ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.automation_log ENABLE ROW LEVEL SECURITY;

-- Rules: agency members can read; admin/owner/principal can write
CREATE POLICY "Agency members read automation_rules"
ON public.automation_rules FOR SELECT
USING (public.is_agency_member(auth.uid(), agency_id));

CREATE POLICY "Agency admins insert automation_rules"
ON public.automation_rules FOR INSERT
WITH CHECK (
  public.is_agency_member(auth.uid(), agency_id)
  AND EXISTS (
    SELECT 1 FROM public.agency_members am
    WHERE am.agency_id = automation_rules.agency_id
      AND am.user_id = auth.uid()
      AND am.role IN ('owner','admin','principal')
  )
);

CREATE POLICY "Agency admins update automation_rules"
ON public.automation_rules FOR UPDATE
USING (
  EXISTS (
    SELECT 1 FROM public.agency_members am
    WHERE am.agency_id = automation_rules.agency_id
      AND am.user_id = auth.uid()
      AND am.role IN ('owner','admin','principal')
  )
);

CREATE POLICY "Agency admins delete automation_rules"
ON public.automation_rules FOR DELETE
USING (
  EXISTS (
    SELECT 1 FROM public.agency_members am
    WHERE am.agency_id = automation_rules.agency_id
      AND am.user_id = auth.uid()
      AND am.role IN ('owner','admin','principal')
  )
);

-- Log: agency members can read; service role writes (no client insert)
CREATE POLICY "Agency members read automation_log"
ON public.automation_log FOR SELECT
USING (public.is_agency_member(auth.uid(), agency_id));

-- Seed defaults for existing agencies (idempotent — only insert if no rule of that type exists for the agency)
INSERT INTO public.automation_rules (agency_id, name, trigger_type, conditions, action_type, action_config, is_active, source_data_available)
SELECT a.id, 'Hot lead arrives → notify assigned agent', 'hot_lead_new',
       '{"language_match_required": false}'::jsonb,
       'notify_agent',
       '{"channel": "in_app", "recipient": "assigned"}'::jsonb,
       true, true
FROM public.agencies a
WHERE NOT EXISTS (SELECT 1 FROM public.automation_rules r WHERE r.agency_id = a.id AND r.trigger_type = 'hot_lead_new');

INSERT INTO public.automation_rules (agency_id, name, trigger_type, conditions, action_type, action_config, is_active, source_data_available)
SELECT a.id, 'Lead uncontacted 6 days → notify assigned agent', 'lead_going_cold',
       '{"days_since_last_contact": 6, "tiers": ["warm","cool"]}'::jsonb,
       'notify_agent',
       '{"channel": "in_app", "recipient": "assigned"}'::jsonb,
       true, true
FROM public.agencies a
WHERE NOT EXISTS (SELECT 1 FROM public.automation_rules r WHERE r.agency_id = a.id AND r.trigger_type = 'lead_going_cold');

INSERT INTO public.automation_rules (agency_id, name, trigger_type, conditions, action_type, action_config, is_active, source_data_available)
SELECT a.id, 'Inspection attended, no follow-up 48h → suggest template', 'inspection_followup',
       '{"hours_since_inspection": 48, "attended_only": true}'::jsonb,
       'suggest_template',
       '{"template_category": "open_home", "require_agent_approval": true}'::jsonb,
       false, false  -- inactive: open-home attendance not yet tracked
FROM public.agencies a
WHERE NOT EXISTS (SELECT 1 FROM public.automation_rules r WHERE r.agency_id = a.id AND r.trigger_type = 'inspection_followup');

INSERT INTO public.automation_rules (agency_id, name, trigger_type, conditions, action_type, action_config, is_active, source_data_available)
SELECT a.id, 'Under Offer no update 7 days → notify principal', 'under_offer_stale',
       '{"days_since_stage_change": 7}'::jsonb,
       'notify_agent',
       '{"channel": "in_app", "recipient": "principal"}'::jsonb,
       true, true
FROM public.agencies a
WHERE NOT EXISTS (SELECT 1 FROM public.automation_rules r WHERE r.agency_id = a.id AND r.trigger_type = 'under_offer_stale');

-- Seed-on-create trigger for new agencies
CREATE OR REPLACE FUNCTION public.seed_default_automation_rules()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.automation_rules (agency_id, name, trigger_type, conditions, action_type, action_config, is_active, source_data_available)
  VALUES
    (NEW.id, 'Hot lead arrives → notify assigned agent', 'hot_lead_new',
     '{"language_match_required": false}'::jsonb, 'notify_agent',
     '{"channel": "in_app", "recipient": "assigned"}'::jsonb, true, true),
    (NEW.id, 'Lead uncontacted 6 days → notify assigned agent', 'lead_going_cold',
     '{"days_since_last_contact": 6, "tiers": ["warm","cool"]}'::jsonb, 'notify_agent',
     '{"channel": "in_app", "recipient": "assigned"}'::jsonb, true, true),
    (NEW.id, 'Inspection attended, no follow-up 48h → suggest template', 'inspection_followup',
     '{"hours_since_inspection": 48, "attended_only": true}'::jsonb, 'suggest_template',
     '{"template_category": "open_home", "require_agent_approval": true}'::jsonb, false, false),
    (NEW.id, 'Under Offer no update 7 days → notify principal', 'under_offer_stale',
     '{"days_since_stage_change": 7}'::jsonb, 'notify_agent',
     '{"channel": "in_app", "recipient": "principal"}'::jsonb, true, true);
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_seed_automation_rules
AFTER INSERT ON public.agencies
FOR EACH ROW EXECUTE FUNCTION public.seed_default_automation_rules();