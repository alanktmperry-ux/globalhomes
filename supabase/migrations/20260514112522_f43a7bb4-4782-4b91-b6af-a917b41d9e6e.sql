-- Agent dunning state
ALTER TABLE public.agents
  ADD COLUMN IF NOT EXISTS dunning_stage TEXT
    CHECK (dunning_stage IN ('none','day1','day3','day7','day14_suspended'))
    DEFAULT 'none',
  ADD COLUMN IF NOT EXISTS dunning_last_email_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS suspended_at TIMESTAMPTZ;

CREATE INDEX IF NOT EXISTS idx_agents_dunning_stage
  ON public.agents(dunning_stage)
  WHERE dunning_stage IS NOT NULL AND dunning_stage <> 'none';

-- Dunning event audit log
CREATE TABLE IF NOT EXISTS public.dunning_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  agent_id UUID NOT NULL REFERENCES public.agents(id) ON DELETE CASCADE,
  event_type TEXT NOT NULL CHECK (event_type IN (
    'payment_failed','email_sent','retry_succeeded','suspended','manual_action','restored'
  )),
  stage TEXT,
  details JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_dunning_events_agent
  ON public.dunning_events(agent_id, created_at DESC);

ALTER TABLE public.dunning_events ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Admins read dunning events" ON public.dunning_events;
CREATE POLICY "Admins read dunning events"
  ON public.dunning_events
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.user_roles
      WHERE user_id = auth.uid()
        AND role IN ('admin','support')
    )
  );