
-- Saved search alerts table: persists each saved search for email matching
CREATE TABLE public.saved_search_alerts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  label text NOT NULL DEFAULT 'All properties',
  search_query text NOT NULL DEFAULT '',
  filters jsonb NOT NULL DEFAULT '{}'::jsonb,
  radius double precision,
  center_lat double precision,
  center_lng double precision,
  is_active boolean NOT NULL DEFAULT true,
  last_alerted_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- Unique constraint: one alert per user per saved search label+query combo
CREATE UNIQUE INDEX idx_saved_search_alerts_user_query ON public.saved_search_alerts (user_id, label, search_query);

-- RLS
ALTER TABLE public.saved_search_alerts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own alerts"
  ON public.saved_search_alerts FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());

CREATE POLICY "Users can insert own alerts"
  ON public.saved_search_alerts FOR INSERT
  TO authenticated
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can update own alerts"
  ON public.saved_search_alerts FOR UPDATE
  TO authenticated
  USING (user_id = auth.uid());

CREATE POLICY "Users can delete own alerts"
  ON public.saved_search_alerts FOR DELETE
  TO authenticated
  USING (user_id = auth.uid());

-- Service role needs full access for the edge function
CREATE POLICY "Service role full access"
  ON public.saved_search_alerts FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);
