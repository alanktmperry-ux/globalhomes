
-- Suburb master table
CREATE TABLE IF NOT EXISTS suburbs (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name            text NOT NULL,
  slug            text NOT NULL,
  state           text NOT NULL,
  postcode        text,
  lat             double precision,
  lng             double precision,
  lga             text,
  region          text,
  population      int,
  median_age      int,
  description     text,
  created_at      timestamptz NOT NULL DEFAULT now(),
  UNIQUE (slug, state)
);

ALTER TABLE suburbs ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Suburbs are public" ON suburbs FOR SELECT USING (true);

-- Suburb market stats
CREATE TABLE IF NOT EXISTS suburb_market_stats (
  id                    uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  suburb                text NOT NULL,
  state                 text NOT NULL,
  property_type         text NOT NULL DEFAULT 'house',
  period_months         int  NOT NULL DEFAULT 12,
  median_sale_price     numeric,
  median_sale_price_yoy numeric,
  total_sales           int,
  avg_days_on_market    numeric,
  clearance_rate        numeric,
  median_rent_pw        numeric,
  median_rent_yoy       numeric,
  gross_yield           numeric,
  vacancy_rate          numeric,
  active_listings       int,
  new_listings_30d      int,
  price_per_sqm         numeric,
  computed_at           timestamptz NOT NULL DEFAULT now(),
  UNIQUE (suburb, state, property_type, period_months)
);

ALTER TABLE suburb_market_stats ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Stats are public" ON suburb_market_stats FOR SELECT USING (true);

-- Suburb amenities
CREATE TABLE IF NOT EXISTS suburb_amenities (
  id                uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  suburb            text NOT NULL,
  state             text NOT NULL,
  schools_count     int  DEFAULT 0,
  primary_schools   int  DEFAULT 0,
  secondary_schools int  DEFAULT 0,
  private_schools   int  DEFAULT 0,
  train_stations    int  DEFAULT 0,
  tram_stops        int  DEFAULT 0,
  bus_stops         int  DEFAULT 0,
  supermarkets      int  DEFAULT 0,
  hospitals         int  DEFAULT 0,
  parks             int  DEFAULT 0,
  cafes_restaurants int  DEFAULT 0,
  walk_score        int,
  transit_score     int,
  updated_at        timestamptz NOT NULL DEFAULT now(),
  UNIQUE (suburb, state)
);

ALTER TABLE suburb_amenities ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Amenities are public" ON suburb_amenities FOR SELECT USING (true);

-- Price history for chart
CREATE TABLE IF NOT EXISTS suburb_price_history (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  suburb        text NOT NULL,
  state         text NOT NULL,
  property_type text NOT NULL DEFAULT 'house',
  month         date NOT NULL,
  median_price  numeric,
  sales_count   int,
  UNIQUE (suburb, state, property_type, month)
);

ALTER TABLE suburb_price_history ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Price history is public" ON suburb_price_history FOR SELECT USING (true);

-- Validation trigger for property_type
CREATE OR REPLACE FUNCTION validate_suburb_market_stats_type()
RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  IF NEW.property_type NOT IN ('house','unit','townhouse','land') THEN
    RAISE EXCEPTION 'Invalid property_type: %', NEW.property_type;
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER validate_suburb_market_stats_type_trigger
  BEFORE INSERT OR UPDATE ON suburb_market_stats
  FOR EACH ROW EXECUTE FUNCTION validate_suburb_market_stats_type();

-- Compute suburb stats function
CREATE OR REPLACE FUNCTION compute_suburb_stats(p_suburb text, p_state text)
RETURNS void LANGUAGE plpgsql AS $$
BEGIN
  INSERT INTO suburb_market_stats (
    suburb, state, property_type, period_months,
    median_sale_price, total_sales, avg_days_on_market,
    active_listings, new_listings_30d, price_per_sqm
  )
  SELECT
    p_suburb, p_state, COALESCE(property_type,'house'), 12,
    PERCENTILE_CONT(0.5) WITHIN GROUP (ORDER BY sold_price),
    COUNT(*) FILTER (WHERE sold_at >= now() - interval '12 months'),
    AVG(EXTRACT(EPOCH FROM (sold_at - created_at))/86400) FILTER (WHERE sold_at IS NOT NULL),
    COUNT(*) FILTER (WHERE listing_status = 'active'),
    COUNT(*) FILTER (WHERE listing_status = 'active' AND created_at >= now() - interval '30 days'),
    PERCENTILE_CONT(0.5) WITHIN GROUP (ORDER BY price_per_sqm) FILTER (WHERE price_per_sqm IS NOT NULL)
  FROM properties
  WHERE suburb = p_suburb AND state = p_state
  GROUP BY property_type
  ON CONFLICT (suburb, state, property_type, period_months)
  DO UPDATE SET
    median_sale_price  = EXCLUDED.median_sale_price,
    total_sales        = EXCLUDED.total_sales,
    avg_days_on_market = EXCLUDED.avg_days_on_market,
    active_listings    = EXCLUDED.active_listings,
    new_listings_30d   = EXCLUDED.new_listings_30d,
    price_per_sqm      = EXCLUDED.price_per_sqm,
    computed_at        = now();

  INSERT INTO suburb_price_history (suburb, state, property_type, month, median_price, sales_count)
  SELECT
    p_suburb, p_state,
    COALESCE(property_type,'house'),
    DATE_TRUNC('month', sold_at)::date,
    PERCENTILE_CONT(0.5) WITHIN GROUP (ORDER BY sold_price),
    COUNT(*)
  FROM properties
  WHERE suburb = p_suburb AND state = p_state
    AND sold_at IS NOT NULL
    AND sold_at >= now() - interval '5 years'
  GROUP BY property_type, DATE_TRUNC('month', sold_at)
  ON CONFLICT (suburb, state, property_type, month)
  DO UPDATE SET
    median_price = EXCLUDED.median_price,
    sales_count  = EXCLUDED.sales_count;
END;
$$;

-- Sitemap helper
CREATE OR REPLACE FUNCTION get_suburb_sitemap_entries()
RETURNS TABLE (slug text, state text, updated_at timestamptz)
LANGUAGE sql STABLE SECURITY DEFINER AS $$
  SELECT s.slug, s.state, COALESCE(m.computed_at, s.created_at) AS updated_at
  FROM suburbs s
  LEFT JOIN suburb_market_stats m
    ON m.suburb = s.name AND m.state = s.state AND m.property_type = 'house'
  ORDER BY s.state, s.name;
$$;

-- Indexes
CREATE INDEX IF NOT EXISTS idx_suburb_market_suburb_state ON suburb_market_stats (suburb, state);
CREATE INDEX IF NOT EXISTS idx_suburb_price_history_lookup ON suburb_price_history (suburb, state, property_type, month);
CREATE INDEX IF NOT EXISTS idx_suburbs_slug_state ON suburbs (slug, state);
