
-- CRM Leads
CREATE TABLE IF NOT EXISTS public.crm_leads (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  agent_id        uuid NOT NULL,
  property_id     uuid REFERENCES public.properties(id) ON DELETE SET NULL,
  buyer_id        uuid,
  first_name      text NOT NULL,
  last_name       text,
  email           text,
  phone           text,
  stage           text NOT NULL DEFAULT 'new',
  priority        text NOT NULL DEFAULT 'medium',
  source          text NOT NULL DEFAULT 'manual',
  budget_min      numeric,
  budget_max      numeric,
  pre_approved    boolean DEFAULT false,
  pre_approval_amount numeric,
  notes           text,
  tags            text[] DEFAULT '{}',
  lost_reason     text,
  expected_close  date,
  last_contacted  timestamptz,
  created_at      timestamptz NOT NULL DEFAULT now(),
  updated_at      timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.crm_leads ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Agents manage own crm_leads"
  ON public.crm_leads FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM public.agents a WHERE a.id = crm_leads.agent_id AND a.user_id = auth.uid()
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.agents a WHERE a.id = crm_leads.agent_id AND a.user_id = auth.uid()
    )
  );

CREATE INDEX IF NOT EXISTS idx_crm_leads_agent    ON public.crm_leads (agent_id);
CREATE INDEX IF NOT EXISTS idx_crm_leads_stage    ON public.crm_leads (agent_id, stage);
CREATE INDEX IF NOT EXISTS idx_crm_leads_property ON public.crm_leads (property_id);

-- CRM Activities
CREATE TABLE IF NOT EXISTS public.crm_activities (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  lead_id     uuid NOT NULL REFERENCES public.crm_leads(id) ON DELETE CASCADE,
  agent_id    uuid NOT NULL,
  type        text NOT NULL,
  subject     text,
  body        text NOT NULL,
  completed   boolean NOT NULL DEFAULT true,
  due_at      timestamptz,
  created_at  timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.crm_activities ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Agents manage own crm_activities"
  ON public.crm_activities FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM public.agents a WHERE a.id = crm_activities.agent_id AND a.user_id = auth.uid()
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.agents a WHERE a.id = crm_activities.agent_id AND a.user_id = auth.uid()
    )
  );

CREATE INDEX IF NOT EXISTS idx_crm_activities_lead ON public.crm_activities (lead_id);

-- CRM Tasks
CREATE TABLE IF NOT EXISTS public.crm_tasks (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  lead_id     uuid NOT NULL REFERENCES public.crm_leads(id) ON DELETE CASCADE,
  agent_id    uuid NOT NULL,
  title       text NOT NULL,
  due_at      timestamptz NOT NULL,
  completed   boolean NOT NULL DEFAULT false,
  created_at  timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.crm_tasks ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Agents manage own crm_tasks"
  ON public.crm_tasks FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM public.agents a WHERE a.id = crm_tasks.agent_id AND a.user_id = auth.uid()
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.agents a WHERE a.id = crm_tasks.agent_id AND a.user_id = auth.uid()
    )
  );

CREATE INDEX IF NOT EXISTS idx_crm_tasks_agent_due
  ON public.crm_tasks (agent_id, due_at) WHERE completed = false;

-- Validation triggers
CREATE OR REPLACE FUNCTION public.validate_crm_lead()
RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  IF NEW.stage NOT IN ('new','contacted','qualified','offer_stage','under_contract','settled','lost') THEN
    RAISE EXCEPTION 'Invalid CRM lead stage: %', NEW.stage;
  END IF;
  IF NEW.priority NOT IN ('low','medium','high') THEN
    RAISE EXCEPTION 'Invalid CRM lead priority: %', NEW.priority;
  END IF;
  IF NEW.source NOT IN ('manual','enquiry_form','open_home','eoi','pre_approval','referral','portal') THEN
    RAISE EXCEPTION 'Invalid CRM lead source: %', NEW.source;
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_validate_crm_lead
  BEFORE INSERT OR UPDATE ON public.crm_leads
  FOR EACH ROW EXECUTE FUNCTION public.validate_crm_lead();

CREATE OR REPLACE FUNCTION public.validate_crm_activity_type()
RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  IF NEW.type NOT IN ('note','call','email','meeting','task') THEN
    RAISE EXCEPTION 'Invalid CRM activity type: %', NEW.type;
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_validate_crm_activity
  BEFORE INSERT OR UPDATE ON public.crm_activities
  FOR EACH ROW EXECUTE FUNCTION public.validate_crm_activity_type();

-- updated_at trigger for crm_leads
CREATE OR REPLACE FUNCTION public.update_crm_lead_updated_at()
RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END;
$$;

CREATE TRIGGER crm_lead_updated_at
  BEFORE UPDATE ON public.crm_leads
  FOR EACH ROW EXECUTE FUNCTION public.update_crm_lead_updated_at();
