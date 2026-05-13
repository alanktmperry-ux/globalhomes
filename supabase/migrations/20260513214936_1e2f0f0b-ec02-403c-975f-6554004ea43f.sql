CREATE TABLE IF NOT EXISTS public.halo_drafts (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  seeker_id   UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  draft_data  JSONB NOT NULL DEFAULT '{}'::jsonb,
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (seeker_id)
);

ALTER TABLE public.halo_drafts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "seekers_own_halo_drafts" ON public.halo_drafts
  FOR ALL USING (auth.uid() = seeker_id) WITH CHECK (auth.uid() = seeker_id);