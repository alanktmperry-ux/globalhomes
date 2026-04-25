CREATE TABLE IF NOT EXISTS public.suburb_language_stats (
  id BIGSERIAL PRIMARY KEY,
  sal_code TEXT NOT NULL UNIQUE,
  suburb_name TEXT NOT NULL,
  suburb_slug TEXT NOT NULL,
  state TEXT NOT NULL,
  total_population INT NOT NULL,
  english_only_count INT NOT NULL,
  non_english_count INT NOT NULL,
  not_stated_count INT NOT NULL,
  responded_count INT NOT NULL,
  non_english_pct NUMERIC(5,2) NOT NULL,
  top_languages JSONB NOT NULL,
  data_year INT NOT NULL DEFAULT 2021,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_sls_name ON public.suburb_language_stats (LOWER(suburb_name));
CREATE INDEX IF NOT EXISTS idx_sls_slug ON public.suburb_language_stats (suburb_slug);
CREATE INDEX IF NOT EXISTS idx_sls_state ON public.suburb_language_stats (state);
CREATE INDEX IF NOT EXISTS idx_sls_pct ON public.suburb_language_stats (non_english_pct DESC);
CREATE INDEX IF NOT EXISTS idx_sls_state_name ON public.suburb_language_stats (state, LOWER(suburb_name));

ALTER TABLE public.suburb_language_stats ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Public read suburb stats" ON public.suburb_language_stats;
CREATE POLICY "Public read suburb stats"
  ON public.suburb_language_stats FOR SELECT TO anon, authenticated USING (true);

CREATE TABLE IF NOT EXISTS public.buyer_pool_lookups (
  id BIGSERIAL PRIMARY KEY,
  suburb_searched TEXT NOT NULL,
  sal_code_matched TEXT,
  agent_id UUID REFERENCES public.agents(id) ON DELETE SET NULL,
  shared_via TEXT,
  referrer TEXT,
  user_agent TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_bpl_suburb ON public.buyer_pool_lookups (suburb_searched);
CREATE INDEX IF NOT EXISTS idx_bpl_agent ON public.buyer_pool_lookups (agent_id);
CREATE INDEX IF NOT EXISTS idx_bpl_created ON public.buyer_pool_lookups (created_at DESC);

ALTER TABLE public.buyer_pool_lookups ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Anyone can log lookup" ON public.buyer_pool_lookups;
CREATE POLICY "Anyone can log lookup" ON public.buyer_pool_lookups
  FOR INSERT TO anon, authenticated WITH CHECK (true);
DROP POLICY IF EXISTS "Agents read own lookups" ON public.buyer_pool_lookups;
CREATE POLICY "Agents read own lookups" ON public.buyer_pool_lookups
  FOR SELECT TO authenticated
  USING (agent_id IN (SELECT id FROM public.agents WHERE user_id = auth.uid()));