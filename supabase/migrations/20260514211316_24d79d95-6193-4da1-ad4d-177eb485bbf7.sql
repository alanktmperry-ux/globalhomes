-- Table 1: Audit log of every search query
CREATE TABLE public.search_queries (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  raw_query text NOT NULL,
  detected_language text,
  parsed_filters jsonb,
  confidence numeric,
  result_count integer,
  halo_offered boolean DEFAULT false,
  halo_clicked boolean DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_search_queries_user ON public.search_queries(user_id, created_at DESC);
CREATE INDEX idx_search_queries_created ON public.search_queries(created_at DESC);

-- Table 2: 24-hour cache of LLM parses
CREATE TABLE public.parsed_queries (
  query_hash text PRIMARY KEY,
  locale text NOT NULL,
  parsed_filters jsonb NOT NULL,
  expires_at timestamptz NOT NULL DEFAULT (now() + interval '24 hours')
);

CREATE INDEX idx_parsed_queries_expires ON public.parsed_queries(expires_at);

-- RLS: search_queries
ALTER TABLE public.search_queries ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users see their own searches"
  ON public.search_queries FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Admins see all searches"
  ON public.search_queries FOR SELECT
  USING (EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = auth.uid()
      AND role::text IN ('admin', 'super_admin', 'support')
  ));

CREATE POLICY "Authenticated users can insert their own searches"
  ON public.search_queries FOR INSERT
  WITH CHECK (auth.uid() = user_id OR user_id IS NULL);

-- RLS: parsed_queries
ALTER TABLE public.parsed_queries ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone authenticated can read the parse cache"
  ON public.parsed_queries FOR SELECT
  TO authenticated
  USING (true);
