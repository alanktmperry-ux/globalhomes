-- ABS Census 2021 language data — SA2 level
CREATE TABLE IF NOT EXISTS public.suburb_language_stats (
  id BIGSERIAL PRIMARY KEY,
  sa2_code TEXT NOT NULL UNIQUE,
  suburb_name TEXT NOT NULL,
  state TEXT NOT NULL,
  postcode TEXT,
  total_population INT NOT NULL,
  english_only_count INT NOT NULL,
  non_english_count INT NOT NULL,
  non_english_pct NUMERIC(5,2) NOT NULL,
  top_languages JSONB NOT NULL,
  poor_english_count INT,
  poor_english_pct NUMERIC(5,2),
  data_year INT NOT NULL DEFAULT 2021,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_suburb_lang_name
  ON public.suburb_language_stats (LOWER(suburb_name));
CREATE INDEX IF NOT EXISTS idx_suburb_lang_postcode
  ON public.suburb_language_stats (postcode);
CREATE INDEX IF NOT EXISTS idx_suburb_lang_pct
  ON public.suburb_language_stats (non_english_pct DESC);

ALTER TABLE public.suburb_language_stats ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Public can read suburb language stats"
  ON public.suburb_language_stats
  FOR SELECT
  TO anon, authenticated
  USING (true);

-- Calculator usage tracking
CREATE TABLE IF NOT EXISTS public.buyer_pool_lookups (
  id BIGSERIAL PRIMARY KEY,
  suburb_searched TEXT NOT NULL,
  sa2_code_matched TEXT,
  agent_id UUID REFERENCES public.agents(id) ON DELETE SET NULL,
  shared_via TEXT,
  referrer TEXT,
  user_agent TEXT,
  ip_country TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_pool_lookups_suburb
  ON public.buyer_pool_lookups (suburb_searched);
CREATE INDEX IF NOT EXISTS idx_pool_lookups_agent
  ON public.buyer_pool_lookups (agent_id);
CREATE INDEX IF NOT EXISTS idx_pool_lookups_created
  ON public.buyer_pool_lookups (created_at DESC);

ALTER TABLE public.buyer_pool_lookups ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can log a lookup"
  ON public.buyer_pool_lookups
  FOR INSERT
  TO anon, authenticated
  WITH CHECK (true);

-- Note: agents.user_id is the auth user FK in this schema (not auth_user_id)
CREATE POLICY "Agents can read own lookups"
  ON public.buyer_pool_lookups
  FOR SELECT
  TO authenticated
  USING (agent_id = (SELECT id FROM public.agents WHERE user_id = auth.uid()));