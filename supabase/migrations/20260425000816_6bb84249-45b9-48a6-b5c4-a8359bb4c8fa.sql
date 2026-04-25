-- Proficiency enum
DO $$ BEGIN
  CREATE TYPE public.language_proficiency AS ENUM ('native', 'fluent', 'conversational');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- agent_language_capabilities table
CREATE TABLE IF NOT EXISTS public.agent_language_capabilities (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  agent_id UUID NOT NULL REFERENCES public.agents(id) ON DELETE CASCADE,
  language_code TEXT NOT NULL,
  proficiency public.language_proficiency NOT NULL DEFAULT 'fluent',
  is_primary BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (agent_id, language_code)
);

CREATE INDEX IF NOT EXISTS idx_alc_agent ON public.agent_language_capabilities(agent_id);
CREATE INDEX IF NOT EXISTS idx_alc_language ON public.agent_language_capabilities(language_code);

-- Only one primary per agent
CREATE UNIQUE INDEX IF NOT EXISTS uq_alc_one_primary_per_agent
  ON public.agent_language_capabilities(agent_id)
  WHERE is_primary = true;

-- updated_at trigger
DROP TRIGGER IF EXISTS trg_alc_updated_at ON public.agent_language_capabilities;
CREATE TRIGGER trg_alc_updated_at
  BEFORE UPDATE ON public.agent_language_capabilities
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- RLS
ALTER TABLE public.agent_language_capabilities ENABLE ROW LEVEL SECURITY;

-- Public read (for agent profile pages and routing UIs)
CREATE POLICY "Anyone can view agent language capabilities"
  ON public.agent_language_capabilities
  FOR SELECT
  USING (true);

-- Agent self-manage
CREATE POLICY "Agents manage their own language capabilities (insert)"
  ON public.agent_language_capabilities
  FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (SELECT 1 FROM public.agents a WHERE a.id = agent_id AND a.user_id = auth.uid())
  );

CREATE POLICY "Agents manage their own language capabilities (update)"
  ON public.agent_language_capabilities
  FOR UPDATE
  TO authenticated
  USING (
    EXISTS (SELECT 1 FROM public.agents a WHERE a.id = agent_id AND a.user_id = auth.uid())
  );

CREATE POLICY "Agents manage their own language capabilities (delete)"
  ON public.agent_language_capabilities
  FOR DELETE
  TO authenticated
  USING (
    EXISTS (SELECT 1 FROM public.agents a WHERE a.id = agent_id AND a.user_id = auth.uid())
  );

-- Backfill from agents.languages_spoken
INSERT INTO public.agent_language_capabilities (agent_id, language_code, proficiency, is_primary)
SELECT
  a.id,
  lower(trim(lang)) AS language_code,
  'fluent'::public.language_proficiency,
  (idx = 1) AS is_primary
FROM public.agents a
CROSS JOIN LATERAL unnest(a.languages_spoken) WITH ORDINALITY AS t(lang, idx)
WHERE a.languages_spoken IS NOT NULL
  AND array_length(a.languages_spoken, 1) > 0
  AND trim(lang) <> ''
ON CONFLICT (agent_id, language_code) DO NOTHING;

-- crm_leads: language routing status
DO $$ BEGIN
  ALTER TABLE public.crm_leads
    ADD COLUMN language_routing_status TEXT
      CHECK (language_routing_status IN ('matched','unmatched_language','not_required'));
EXCEPTION WHEN duplicate_column THEN NULL; END $$;

CREATE INDEX IF NOT EXISTS idx_crm_leads_language_routing_status
  ON public.crm_leads(language_routing_status)
  WHERE language_routing_status IS NOT NULL;