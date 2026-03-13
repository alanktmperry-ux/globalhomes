
-- Agents: add rating, review_count
ALTER TABLE public.agents
  ADD COLUMN IF NOT EXISTS rating numeric DEFAULT 0,
  ADD COLUMN IF NOT EXISTS review_count integer DEFAULT 0;

-- Properties: add investor-ready fields
ALTER TABLE public.properties
  ADD COLUMN IF NOT EXISTS currency_code text DEFAULT 'AUD',
  ADD COLUMN IF NOT EXISTS listing_type text DEFAULT 'sale',
  ADD COLUMN IF NOT EXISTS rental_yield_pct numeric,
  ADD COLUMN IF NOT EXISTS rental_weekly integer,
  ADD COLUMN IF NOT EXISTS str_permitted boolean,
  ADD COLUMN IF NOT EXISTS zoning text,
  ADD COLUMN IF NOT EXISTS year_built integer,
  ADD COLUMN IF NOT EXISTS strata_fees_quarterly integer,
  ADD COLUMN IF NOT EXISTS council_rates_annual integer,
  ADD COLUMN IF NOT EXISTS flood_zone boolean DEFAULT false,
  ADD COLUMN IF NOT EXISTS bushfire_zone boolean DEFAULT false;
