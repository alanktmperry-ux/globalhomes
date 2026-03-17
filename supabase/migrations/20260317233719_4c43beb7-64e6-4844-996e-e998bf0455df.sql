CREATE TABLE public.exchange_rate_cache (
  id text PRIMARY KEY DEFAULT 'latest',
  base_currency text NOT NULL DEFAULT 'AUD',
  rates jsonb NOT NULL DEFAULT '{}',
  fetched_at timestamptz NOT NULL DEFAULT now(),
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.exchange_rate_cache ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can read exchange rates"
  ON public.exchange_rate_cache FOR SELECT
  TO anon, authenticated
  USING (true);