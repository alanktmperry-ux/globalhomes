ALTER TABLE crm_activities
  ADD COLUMN IF NOT EXISTS outcome text CHECK (outcome IN ('answered','missed','voicemail','no_answer')),
  ADD COLUMN IF NOT EXISTS duration_seconds integer,
  ADD COLUMN IF NOT EXISTS phone_number text;

ALTER TABLE crm_activities DROP CONSTRAINT IF EXISTS crm_activities_type_check;
ALTER TABLE crm_activities ADD CONSTRAINT crm_activities_type_check CHECK (type IN ('note','call','sms','email','meeting','task'));

CREATE INDEX IF NOT EXISTS idx_crm_activities_agent_type ON crm_activities (agent_id, type, created_at DESC);