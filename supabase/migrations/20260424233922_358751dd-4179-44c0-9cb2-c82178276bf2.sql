-- 1. Track when an agent has responded to an enquiry
ALTER TABLE public.leads
  ADD COLUMN IF NOT EXISTS responded_at TIMESTAMPTZ;

CREATE INDEX IF NOT EXISTS idx_leads_unresponded
  ON public.leads (agent_id, created_at)
  WHERE responded_at IS NULL AND archived_at IS NULL;

COMMENT ON COLUMN public.leads.responded_at IS
  'Set when the agent first replies to or otherwise handles this enquiry. NULL = still needs a response.';

-- 2. Per-agent dismissal snoozes for the Today's Priorities panel
CREATE TABLE IF NOT EXISTS public.agent_priority_dismissals (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  agent_id UUID NOT NULL REFERENCES public.agents(id) ON DELETE CASCADE,
  source_key TEXT NOT NULL,         -- 'hot_lead' | 'going_cold' | 'overdue_action' | 'unresponded' | 'due_soon'
  source_id UUID NOT NULL,          -- crm_lead.id | contact.id | lead.id
  dismissed_until TIMESTAMPTZ NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (agent_id, source_key, source_id)
);

CREATE INDEX IF NOT EXISTS idx_priority_dismissals_active
  ON public.agent_priority_dismissals (agent_id, dismissed_until);

ALTER TABLE public.agent_priority_dismissals ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Agents manage their own priority dismissals"
  ON public.agent_priority_dismissals
  FOR ALL
  USING (
    agent_id IN (SELECT id FROM public.agents WHERE user_id = auth.uid())
  )
  WITH CHECK (
    agent_id IN (SELECT id FROM public.agents WHERE user_id = auth.uid())
  );

-- 3. Per-agent UI prefs (collapse state). Single-row JSON keeps future flags cheap.
CREATE TABLE IF NOT EXISTS public.agent_dashboard_prefs (
  agent_id UUID PRIMARY KEY REFERENCES public.agents(id) ON DELETE CASCADE,
  prefs JSONB NOT NULL DEFAULT '{}'::jsonb,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.agent_dashboard_prefs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Agents manage their own dashboard prefs"
  ON public.agent_dashboard_prefs
  FOR ALL
  USING (agent_id IN (SELECT id FROM public.agents WHERE user_id = auth.uid()))
  WITH CHECK (agent_id IN (SELECT id FROM public.agents WHERE user_id = auth.uid()));