CREATE TABLE IF NOT EXISTS public.concierge_usage (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  agent_id uuid NOT NULL REFERENCES public.agents(id) ON DELETE CASCADE,
  action text NOT NULL CHECK (action IN ('match_viewed', 'intro_sent')),
  entity_id uuid,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_concierge_usage_agent_month
  ON public.concierge_usage (agent_id, created_at);

ALTER TABLE public.concierge_usage ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Agents can read own concierge usage"
  ON public.concierge_usage FOR SELECT
  USING (agent_id IN (
    SELECT id FROM public.agents WHERE user_id = auth.uid()
  ));

CREATE POLICY "Agents can insert own concierge usage"
  ON public.concierge_usage FOR INSERT
  WITH CHECK (agent_id IN (
    SELECT id FROM public.agents WHERE user_id = auth.uid()
  ));