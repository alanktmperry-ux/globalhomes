
-- Preserve note: 1 real enquiry being dropped, exported in chat:
-- {"id":"5b3cef94-ae6b-4ef4-85ef-41f227ab2235","agent_id":"d2ce06e8-0d0e-4ce8-9600-b9d3b838a625","first_name":"alan","email":"alan@everythingeco.com.au","phone":"0438383883","source":"enquiry_form","stage":"new","notes":"Hi, I'm interested in House in Berwick","created_at":"2026-04-13T22:41:30.684211+00:00"}

-- Drop dependent objects
DROP TABLE IF EXISTS public.crm_activities CASCADE;
DROP TABLE IF EXISTS public.crm_tasks CASCADE;
DROP TABLE IF EXISTS public.crm_leads CASCADE;

-- Recreate crm_leads as Contact + lead-specific metadata
CREATE TABLE public.crm_leads (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  contact_id uuid NOT NULL REFERENCES public.contacts(id) ON DELETE CASCADE,
  agent_id uuid NOT NULL,

  -- Lead-specific metadata
  source_property_id uuid,
  enquiry_source text NOT NULL DEFAULT 'manual',
  lead_temperature text NOT NULL DEFAULT 'warm' CHECK (lead_temperature IN ('hot','warm','cold')),
  first_seen_at timestamptz NOT NULL DEFAULT now(),

  -- Pipeline state
  stage text NOT NULL DEFAULT 'new',
  priority text NOT NULL DEFAULT 'medium',
  notes text,
  tags text[] NOT NULL DEFAULT '{}',
  lost_reason text,
  expected_close date,
  last_contacted timestamptz,

  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_crm_leads_contact_id ON public.crm_leads(contact_id);
CREATE INDEX idx_crm_leads_agent_id ON public.crm_leads(agent_id);
CREATE INDEX idx_crm_leads_source_property ON public.crm_leads(source_property_id);
CREATE INDEX idx_crm_leads_stage ON public.crm_leads(stage);

-- Lookup indexes on contacts for find-or-create by email/phone
CREATE INDEX IF NOT EXISTS idx_contacts_lookup_email ON public.contacts(created_by, lower(email));
CREATE INDEX IF NOT EXISTS idx_contacts_lookup_phone ON public.contacts(created_by, phone);

-- Recreate activities + tasks tied to leads
CREATE TABLE public.crm_activities (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  lead_id uuid NOT NULL REFERENCES public.crm_leads(id) ON DELETE CASCADE,
  agent_id uuid NOT NULL,
  type text NOT NULL,
  subject text,
  body text NOT NULL,
  completed boolean NOT NULL DEFAULT false,
  due_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX idx_crm_activities_lead ON public.crm_activities(lead_id);

CREATE TABLE public.crm_tasks (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  lead_id uuid NOT NULL REFERENCES public.crm_leads(id) ON DELETE CASCADE,
  agent_id uuid NOT NULL,
  title text NOT NULL,
  due_at timestamptz NOT NULL,
  completed boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX idx_crm_tasks_lead ON public.crm_tasks(lead_id);

-- Updated-at trigger
CREATE TRIGGER trg_crm_leads_updated_at
BEFORE UPDATE ON public.crm_leads
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Enable RLS
ALTER TABLE public.crm_leads ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.crm_activities ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.crm_tasks ENABLE ROW LEVEL SECURITY;

-- Helper: link agent_id (agents.id) to auth.uid via agents.user_id
-- Policies: an authenticated user who owns the agents row can manage their leads
CREATE POLICY "Agents manage their own leads"
ON public.crm_leads FOR ALL
USING (agent_id IN (SELECT id FROM public.agents WHERE user_id = auth.uid()))
WITH CHECK (agent_id IN (SELECT id FROM public.agents WHERE user_id = auth.uid()));

CREATE POLICY "Agents manage their own lead activities"
ON public.crm_activities FOR ALL
USING (agent_id IN (SELECT id FROM public.agents WHERE user_id = auth.uid()))
WITH CHECK (agent_id IN (SELECT id FROM public.agents WHERE user_id = auth.uid()));

CREATE POLICY "Agents manage their own lead tasks"
ON public.crm_tasks FOR ALL
USING (agent_id IN (SELECT id FROM public.agents WHERE user_id = auth.uid()))
WITH CHECK (agent_id IN (SELECT id FROM public.agents WHERE user_id = auth.uid()));
