
-- Suburb market statistics for rental intelligence
CREATE TABLE public.suburb_stats (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  suburb text NOT NULL,
  state text NOT NULL,
  property_type text NOT NULL DEFAULT 'House',
  beds integer NOT NULL DEFAULT 0,
  median_rent_weekly integer,
  median_sale_price integer,
  rent_trend_pct numeric DEFAULT 0,
  sale_trend_pct numeric DEFAULT 0,
  sample_size integer DEFAULT 0,
  period text NOT NULL DEFAULT 'current',
  recorded_at timestamp with time zone NOT NULL DEFAULT now(),
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now(),
  UNIQUE (suburb, state, property_type, beds, period)
);

-- Public read, admin write
ALTER TABLE public.suburb_stats ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view suburb stats"
  ON public.suburb_stats FOR SELECT
  TO public
  USING (true);

CREATE POLICY "Admins can manage suburb stats"
  ON public.suburb_stats FOR ALL
  TO authenticated
  USING (has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

-- Historical price data for sparklines
CREATE TABLE public.suburb_price_history (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  suburb text NOT NULL,
  state text NOT NULL,
  property_type text NOT NULL DEFAULT 'House',
  beds integer NOT NULL DEFAULT 0,
  month date NOT NULL,
  median_rent_weekly integer,
  median_sale_price integer,
  sample_size integer DEFAULT 0,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  UNIQUE (suburb, state, property_type, beds, month)
);

ALTER TABLE public.suburb_price_history ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view price history"
  ON public.suburb_price_history FOR SELECT
  TO public
  USING (true);

CREATE POLICY "Admins can manage price history"
  ON public.suburb_price_history FOR ALL
  TO authenticated
  USING (has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

-- RPC to calculate live median from properties table as fallback
CREATE OR REPLACE FUNCTION public.get_suburb_rental_stats(
  _suburb text,
  _state text,
  _beds integer DEFAULT NULL,
  _property_type text DEFAULT NULL
)
RETURNS json
LANGUAGE plpgsql
STABLE
SET search_path TO 'public'
AS $$
DECLARE
  result json;
  _median integer;
  _count integer;
  _avg integer;
BEGIN
  SELECT
    COUNT(*)::integer,
    PERCENTILE_CONT(0.5) WITHIN GROUP (ORDER BY rental_weekly)::integer,
    AVG(rental_weekly)::integer
  INTO _count, _median, _avg
  FROM public.properties
  WHERE LOWER(suburb) = LOWER(_suburb)
    AND LOWER(state) = LOWER(_state)
    AND listing_type IN ('rent', 'rental')
    AND is_active = true
    AND rental_weekly IS NOT NULL
    AND rental_weekly > 0
    AND (_beds IS NULL OR beds = _beds)
    AND (_property_type IS NULL OR LOWER(property_type) = LOWER(_property_type));

  SELECT json_build_object(
    'median_rent_weekly', _median,
    'avg_rent_weekly', _avg,
    'sample_size', _count,
    'suburb', _suburb,
    'state', _state
  ) INTO result;

  RETURN result;
END;
$$;
