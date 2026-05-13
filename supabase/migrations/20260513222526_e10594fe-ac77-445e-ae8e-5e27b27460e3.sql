CREATE TABLE IF NOT EXISTS public.pocket_listing_drafts (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  agent_id    UUID NOT NULL REFERENCES public.agents(id) ON DELETE CASCADE,
  draft_data  JSONB NOT NULL DEFAULT '{}'::jsonb,
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (agent_id)
);
ALTER TABLE public.pocket_listing_drafts ENABLE ROW LEVEL SECURITY;
CREATE POLICY "agents_own_pocket_drafts" ON public.pocket_listing_drafts
  FOR ALL USING (
    agent_id IN (SELECT id FROM public.agents WHERE user_id = auth.uid())
  ) WITH CHECK (
    agent_id IN (SELECT id FROM public.agents WHERE user_id = auth.uid())
  );