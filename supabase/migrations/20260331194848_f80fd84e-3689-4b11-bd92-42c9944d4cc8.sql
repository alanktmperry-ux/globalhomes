
ALTER TABLE public.properties
  ADD COLUMN IF NOT EXISTS estimated_weekly_rent integer,
  ADD COLUMN IF NOT EXISTS property_age_years integer,
  ADD COLUMN IF NOT EXISTS is_new_build boolean DEFAULT false,
  ADD COLUMN IF NOT EXISTS land_value numeric(12,0);

CREATE TABLE IF NOT EXISTS public.suburb_growth_stats (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  suburb text NOT NULL,
  state text NOT NULL,
  median_price numeric(12,0),
  growth_1yr numeric(6,3),
  growth_5yr numeric(6,3),
  growth_10yr numeric(6,3),
  median_rent_pw integer,
  rental_yield numeric(5,2),
  vacancy_rate numeric(5,2),
  period_end date,
  created_at timestamptz DEFAULT now(),
  UNIQUE(suburb, state, period_end)
);

CREATE INDEX IF NOT EXISTS idx_growth_stats_location ON public.suburb_growth_stats(suburb, state);

CREATE TABLE IF NOT EXISTS public.suburb_rent_stats (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  suburb text NOT NULL,
  state text NOT NULL,
  bedrooms integer,
  property_type text,
  median_rent_pw integer,
  sample_size integer,
  period_end date,
  UNIQUE(suburb, state, bedrooms, property_type, period_end)
);

CREATE INDEX IF NOT EXISTS idx_rent_stats_lookup ON public.suburb_rent_stats(suburb, state, bedrooms, property_type);

ALTER TABLE public.suburb_growth_stats ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.suburb_rent_stats ENABLE ROW LEVEL SECURITY;
CREATE POLICY "growth_stats_public" ON public.suburb_growth_stats FOR SELECT USING (true);
CREATE POLICY "rent_stats_public" ON public.suburb_rent_stats FOR SELECT USING (true);

INSERT INTO public.suburb_growth_stats
  (suburb, state, median_price, growth_1yr, growth_5yr, growth_10yr, median_rent_pw, rental_yield, vacancy_rate, period_end)
VALUES
  ('Surry Hills', 'NSW', 1250000, 4.2, 6.8, 7.1, 750, 3.1, 1.8, '2024-03-31'),
  ('Fitzroy', 'VIC', 1100000, 3.8, 5.9, 6.7, 680, 3.2, 2.1, '2024-03-31'),
  ('Fortitude Valley', 'QLD', 680000, 8.1, 7.2, 5.9, 580, 4.4, 1.5, '2024-03-31'),
  ('Fremantle', 'WA', 920000, 11.3, 8.4, 4.2, 620, 3.5, 1.2, '2024-03-31')
ON CONFLICT DO NOTHING;
