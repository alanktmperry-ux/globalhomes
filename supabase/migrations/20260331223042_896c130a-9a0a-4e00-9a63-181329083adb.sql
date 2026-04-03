
-- ============================================================
-- COMPARABLE SALES TABLE
-- ============================================================
CREATE TABLE IF NOT EXISTS comparable_sales (
  id                    UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  property_id           UUID REFERENCES properties(id) ON DELETE SET NULL,
  address               TEXT NOT NULL,
  suburb                TEXT NOT NULL,
  state                 TEXT NOT NULL,
  postcode              TEXT NOT NULL DEFAULT '',
  latitude              NUMERIC(10,7),
  longitude             NUMERIC(10,7),
  property_type         TEXT NOT NULL DEFAULT 'house',
  bedrooms              SMALLINT,
  bathrooms             SMALLINT,
  car_spaces            SMALLINT,
  land_size_sqm         NUMERIC(10,2),
  floor_area_sqm        NUMERIC(10,2),
  year_built            SMALLINT,
  is_corner_block       BOOLEAN DEFAULT false,
  pool                  BOOLEAN DEFAULT false,
  double_garage         BOOLEAN DEFAULT false,
  sold_price            NUMERIC(12,2) NOT NULL,
  price_per_sqm         NUMERIC(10,2) GENERATED ALWAYS AS (
                          CASE WHEN land_size_sqm > 0 THEN ROUND(sold_price / land_size_sqm, 2) ELSE NULL END
                        ) STORED,
  sold_date             DATE NOT NULL,
  days_on_market        INTEGER,
  sale_method           TEXT NOT NULL DEFAULT 'private_treaty',
  auction_clearance     BOOLEAN,
  prior_price           NUMERIC(12,2),
  discount_pct          NUMERIC(5,2) GENERATED ALWAYS AS (
                          CASE WHEN prior_price > 0 AND prior_price != sold_price
                          THEN ROUND(((prior_price - sold_price) / prior_price) * 100, 2)
                          ELSE 0 END
                        ) STORED,
  agent_id              UUID REFERENCES agents(id) ON DELETE SET NULL,
  agency_name           TEXT,
  source                TEXT NOT NULL DEFAULT 'listhq',
  is_verified           BOOLEAN NOT NULL DEFAULT false,
  is_public             BOOLEAN NOT NULL DEFAULT true,
  created_at            TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at            TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_cs_suburb ON comparable_sales(suburb, state);
CREATE INDEX IF NOT EXISTS idx_cs_postcode ON comparable_sales(postcode);
CREATE INDEX IF NOT EXISTS idx_cs_sold_date ON comparable_sales(sold_date DESC);
CREATE INDEX IF NOT EXISTS idx_cs_property_type ON comparable_sales(property_type);
CREATE INDEX IF NOT EXISTS idx_cs_bedrooms ON comparable_sales(bedrooms);
CREATE INDEX IF NOT EXISTS idx_cs_sold_price ON comparable_sales(sold_price);
CREATE INDEX IF NOT EXISTS idx_cs_agent ON comparable_sales(agent_id);
CREATE UNIQUE INDEX IF NOT EXISTS idx_cs_property_id ON comparable_sales(property_id) WHERE property_id IS NOT NULL;

ALTER TABLE comparable_sales ENABLE ROW LEVEL SECURITY;

CREATE POLICY "public_view_verified_sales" ON comparable_sales
  FOR SELECT TO anon, authenticated
  USING (is_public = true AND is_verified = true);

CREATE POLICY "agent_manage_own_sales" ON comparable_sales
  FOR ALL TO authenticated
  USING (agent_id IN (SELECT id FROM agents WHERE user_id = auth.uid()));

-- ============================================================
-- ADD period_month + extra columns to existing suburb_market_stats
-- ============================================================
ALTER TABLE suburb_market_stats
  ADD COLUMN IF NOT EXISTS postcode TEXT DEFAULT '',
  ADD COLUMN IF NOT EXISTS period_month DATE,
  ADD COLUMN IF NOT EXISTS mean_price NUMERIC(12,2),
  ADD COLUMN IF NOT EXISTS min_price NUMERIC(12,2),
  ADD COLUMN IF NOT EXISTS max_price NUMERIC(12,2),
  ADD COLUMN IF NOT EXISTS price_p25 NUMERIC(12,2),
  ADD COLUMN IF NOT EXISTS price_p75 NUMERIC(12,2),
  ADD COLUMN IF NOT EXISTS median_price_psqm NUMERIC(10,2),
  ADD COLUMN IF NOT EXISTS median_dom NUMERIC(6,1),
  ADD COLUMN IF NOT EXISTS mean_dom NUMERIC(6,1),
  ADD COLUMN IF NOT EXISTS auction_count INTEGER DEFAULT 0,
  ADD COLUMN IF NOT EXISTS auction_clearance_rate NUMERIC(5,2),
  ADD COLUMN IF NOT EXISTS yoy_median_change_pct NUMERIC(6,2),
  ADD COLUMN IF NOT EXISTS yoy_volume_change_pct NUMERIC(6,2),
  ADD COLUMN IF NOT EXISTS gross_rental_yield_pct NUMERIC(5,2);

-- ============================================================
-- CMA REPORTS TABLE
-- ============================================================
CREATE TABLE IF NOT EXISTS cma_reports (
  id                    UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  agent_id              UUID NOT NULL REFERENCES agents(id) ON DELETE CASCADE,
  property_id           UUID REFERENCES properties(id) ON DELETE SET NULL,
  subject_address       TEXT NOT NULL,
  subject_suburb        TEXT NOT NULL,
  subject_state         TEXT NOT NULL,
  subject_postcode      TEXT NOT NULL DEFAULT '',
  subject_bedrooms      SMALLINT,
  subject_bathrooms     SMALLINT,
  subject_car_spaces    SMALLINT,
  subject_land_sqm      NUMERIC(10,2),
  subject_property_type TEXT NOT NULL DEFAULT 'house',
  radius_km             NUMERIC(4,1) NOT NULL DEFAULT 2.0,
  months_back           SMALLINT NOT NULL DEFAULT 12,
  selected_comparable_ids UUID[] NOT NULL DEFAULT '{}',
  estimated_price_low   NUMERIC(12,2),
  estimated_price_mid   NUMERIC(12,2),
  estimated_price_high  NUMERIC(12,2),
  agent_recommended_price NUMERIC(12,2),
  agent_recommended_method TEXT DEFAULT 'private_treaty',
  agent_commentary      TEXT,
  report_title          TEXT NOT NULL DEFAULT 'Comparative Market Analysis',
  vendor_name           TEXT,
  prepared_for_email    TEXT,
  is_shared             BOOLEAN NOT NULL DEFAULT false,
  share_token           TEXT UNIQUE DEFAULT encode(gen_random_bytes(16), 'hex'),
  shared_at             TIMESTAMPTZ,
  viewed_at             TIMESTAMPTZ,
  view_count            INTEGER NOT NULL DEFAULT 0,
  created_at            TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at            TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_cma_agent ON cma_reports(agent_id);
CREATE INDEX IF NOT EXISTS idx_cma_property ON cma_reports(property_id);
CREATE INDEX IF NOT EXISTS idx_cma_token ON cma_reports(share_token) WHERE is_shared = true;

ALTER TABLE cma_reports ENABLE ROW LEVEL SECURITY;

CREATE POLICY "agent_manage_own_cmas" ON cma_reports
  FOR ALL TO authenticated
  USING (agent_id IN (SELECT id FROM agents WHERE user_id = auth.uid()))
  WITH CHECK (agent_id IN (SELECT id FROM agents WHERE user_id = auth.uid()));

CREATE POLICY "public_view_shared_cma" ON cma_reports
  FOR SELECT TO anon, authenticated
  USING (is_shared = true);

-- ============================================================
-- TRIGGER: auto-populate comparable_sales on property sold
-- ============================================================
CREATE OR REPLACE FUNCTION sync_comparable_sale()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public' AS $$
BEGIN
  IF NEW.status = 'sold' AND NEW.sold_price IS NOT NULL
     AND (OLD IS NULL OR OLD.status IS DISTINCT FROM 'sold' OR OLD.sold_price IS DISTINCT FROM NEW.sold_price)
  THEN
    INSERT INTO comparable_sales (
      property_id, address, suburb, state, postcode,
      latitude, longitude, property_type,
      bedrooms, bathrooms, car_spaces, land_size_sqm, floor_area_sqm,
      sold_price, sold_date, prior_price, agent_id, is_verified, source
    )
    VALUES (
      NEW.id, NEW.address, NEW.suburb, NEW.state, COALESCE(NEW.postcode, ''),
      NEW.lat, NEW.lng, COALESCE(NEW.property_type, 'house'),
      NEW.beds, NEW.baths, NEW.parking, NEW.land_size_sqm, NEW.floor_area_sqm,
      NEW.sold_price,
      COALESCE(NEW.sold_at, CURRENT_DATE),
      NEW.price,
      NEW.agent_id, true, 'listhq'
    )
    ON CONFLICT (property_id) WHERE property_id IS NOT NULL DO UPDATE SET
      sold_price = EXCLUDED.sold_price,
      sold_date  = EXCLUDED.sold_date,
      updated_at = NOW();
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_sync_comparable_sale ON properties;
CREATE TRIGGER trg_sync_comparable_sale
  AFTER INSERT OR UPDATE ON properties
  FOR EACH ROW
  EXECUTE FUNCTION sync_comparable_sale();

-- ============================================================
-- RPCs
-- ============================================================

CREATE OR REPLACE FUNCTION get_comparable_sales(
  p_suburb TEXT, p_state TEXT,
  p_property_type TEXT DEFAULT NULL, p_bedrooms SMALLINT DEFAULT NULL,
  p_months_back INTEGER DEFAULT 12, p_limit INTEGER DEFAULT 12, p_offset INTEGER DEFAULT 0
)
RETURNS JSON LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path TO 'public' AS $$
DECLARE
  v_cutoff DATE := CURRENT_DATE - (p_months_back || ' months')::INTERVAL;
  v_sales JSON;
  v_total BIGINT;
  v_median NUMERIC;
BEGIN
  SELECT COUNT(*), PERCENTILE_CONT(0.5) WITHIN GROUP (ORDER BY sold_price)
  INTO v_total, v_median
  FROM comparable_sales
  WHERE LOWER(suburb) = LOWER(p_suburb) AND LOWER(state) = LOWER(p_state)
    AND sold_date >= v_cutoff AND is_public = true
    AND (p_property_type IS NULL OR property_type = p_property_type)
    AND (p_bedrooms IS NULL OR bedrooms = p_bedrooms OR (p_bedrooms >= 4 AND bedrooms >= 4));

  SELECT COALESCE(json_agg(row_to_json(s)), '[]'::json) INTO v_sales
  FROM (
    SELECT id, address, suburb, state, postcode, property_type, bedrooms, bathrooms, car_spaces,
      land_size_sqm, floor_area_sqm, sold_price, price_per_sqm, sold_date, days_on_market,
      sale_method, auction_clearance, discount_pct, agency_name, is_verified, latitude, longitude
    FROM comparable_sales
    WHERE LOWER(suburb) = LOWER(p_suburb) AND LOWER(state) = LOWER(p_state)
      AND sold_date >= v_cutoff AND is_public = true
      AND (p_property_type IS NULL OR property_type = p_property_type)
      AND (p_bedrooms IS NULL OR bedrooms = p_bedrooms OR (p_bedrooms >= 4 AND bedrooms >= 4))
    ORDER BY sold_date DESC
    LIMIT p_limit OFFSET p_offset
  ) s;

  RETURN json_build_object('sales', v_sales, 'total_count', v_total, 'median_price', v_median);
END;
$$;

CREATE OR REPLACE FUNCTION get_suburb_price_trend(
  p_suburb TEXT, p_state TEXT, p_property_type TEXT DEFAULT 'house', p_months INTEGER DEFAULT 24
)
RETURNS JSON LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path TO 'public' AS $$
BEGIN
  RETURN (
    SELECT COALESCE(json_agg(row_to_json(m) ORDER BY m.period_month), '[]'::json)
    FROM (
      SELECT
        gs.month_start::DATE AS period_month,
        PERCENTILE_CONT(0.5) WITHIN GROUP (ORDER BY cs.sold_price) AS median_price,
        COUNT(cs.id)::INTEGER AS total_sales,
        ROUND(AVG(cs.days_on_market)::NUMERIC, 1) AS median_dom
      FROM generate_series(
        DATE_TRUNC('month', CURRENT_DATE - (p_months || ' months')::INTERVAL),
        DATE_TRUNC('month', CURRENT_DATE), '1 month'::INTERVAL
      ) gs(month_start)
      LEFT JOIN comparable_sales cs ON
        LOWER(cs.suburb) = LOWER(p_suburb) AND LOWER(cs.state) = LOWER(p_state)
        AND (p_property_type = 'all' OR cs.property_type = p_property_type)
        AND DATE_TRUNC('month', cs.sold_date) = gs.month_start
        AND cs.is_public = true
      GROUP BY gs.month_start
    ) m
  );
END;
$$;

CREATE OR REPLACE FUNCTION get_suburb_summary(
  p_suburb TEXT, p_state TEXT, p_property_type TEXT DEFAULT 'house'
)
RETURNS JSON LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path TO 'public' AS $$
DECLARE
  v_90d DATE := CURRENT_DATE - INTERVAL '90 days';
  v_12m DATE := CURRENT_DATE - INTERVAL '12 months';
  v_24m DATE := CURRENT_DATE - INTERVAL '24 months';
BEGIN
  RETURN (
    SELECT json_build_object(
      'suburb', p_suburb, 'state', p_state, 'property_type', p_property_type,
      'median_price_90d',
        (SELECT PERCENTILE_CONT(0.5) WITHIN GROUP (ORDER BY sold_price)
         FROM comparable_sales WHERE LOWER(suburb)=LOWER(p_suburb) AND LOWER(state)=LOWER(p_state)
           AND property_type=p_property_type AND sold_date>=v_90d AND is_public=true),
      'sales_volume_90d',
        (SELECT COUNT(*) FROM comparable_sales WHERE LOWER(suburb)=LOWER(p_suburb) AND LOWER(state)=LOWER(p_state)
           AND property_type=p_property_type AND sold_date>=v_90d AND is_public=true),
      'median_dom_90d',
        (SELECT PERCENTILE_CONT(0.5) WITHIN GROUP (ORDER BY days_on_market)
         FROM comparable_sales WHERE LOWER(suburb)=LOWER(p_suburb) AND LOWER(state)=LOWER(p_state)
           AND property_type=p_property_type AND sold_date>=v_90d AND is_public=true AND days_on_market IS NOT NULL),
      'median_price_12m',
        (SELECT PERCENTILE_CONT(0.5) WITHIN GROUP (ORDER BY sold_price)
         FROM comparable_sales WHERE LOWER(suburb)=LOWER(p_suburb) AND LOWER(state)=LOWER(p_state)
           AND property_type=p_property_type AND sold_date>=v_12m AND is_public=true),
      'sales_volume_12m',
        (SELECT COUNT(*) FROM comparable_sales WHERE LOWER(suburb)=LOWER(p_suburb) AND LOWER(state)=LOWER(p_state)
           AND property_type=p_property_type AND sold_date>=v_12m AND is_public=true),
      'auction_clearance_12m',
        (SELECT ROUND(COUNT(*) FILTER (WHERE auction_clearance=true) * 100.0
           / NULLIF(COUNT(*) FILTER (WHERE sale_method='auction'), 0), 1)
         FROM comparable_sales WHERE LOWER(suburb)=LOWER(p_suburb) AND LOWER(state)=LOWER(p_state)
           AND property_type=p_property_type AND sold_date>=v_12m AND is_public=true),
      'active_listings',
        (SELECT COUNT(*) FROM properties WHERE LOWER(suburb)=LOWER(p_suburb) AND LOWER(state)=LOWER(p_state)
           AND LOWER(COALESCE(property_type,'house'))=LOWER(p_property_type) AND is_active=true),
      'yoy_change_pct',
        (SELECT ROUND(
          (PERCENTILE_CONT(0.5) WITHIN GROUP (ORDER BY sold_price) FILTER (WHERE sold_date>=v_12m)
           - PERCENTILE_CONT(0.5) WITHIN GROUP (ORDER BY sold_price) FILTER (WHERE sold_date>=v_24m AND sold_date<v_12m)
          ) * 100.0 /
          NULLIF(PERCENTILE_CONT(0.5) WITHIN GROUP (ORDER BY sold_price)
            FILTER (WHERE sold_date>=v_24m AND sold_date<v_12m), 0), 1)
        FROM comparable_sales WHERE LOWER(suburb)=LOWER(p_suburb) AND LOWER(state)=LOWER(p_state)
          AND property_type=p_property_type AND is_public=true AND sold_date>=v_24m)
    )
  );
END;
$$;

CREATE OR REPLACE FUNCTION get_property_comparables(
  p_property_id UUID, p_months_back INTEGER DEFAULT 12, p_limit INTEGER DEFAULT 6
)
RETURNS JSON LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path TO 'public' AS $$
DECLARE
  v_suburb TEXT; v_state TEXT; v_beds INT; v_baths INT; v_type TEXT;
BEGIN
  SELECT suburb, state, beds, baths, COALESCE(property_type,'house')
  INTO v_suburb, v_state, v_beds, v_baths, v_type
  FROM properties WHERE id = p_property_id;

  IF v_suburb IS NULL THEN RETURN '[]'::json; END IF;

  RETURN (
    SELECT COALESCE(json_agg(row_to_json(s) ORDER BY s.similarity_score ASC, s.sold_date DESC), '[]'::json)
    FROM (
      SELECT cs.id, cs.address, cs.suburb, cs.state, cs.property_type,
        cs.bedrooms, cs.bathrooms, cs.car_spaces, cs.land_size_sqm, cs.floor_area_sqm,
        cs.sold_price, cs.price_per_sqm, cs.sold_date, cs.days_on_market, cs.sale_method,
        cs.discount_pct, cs.latitude, cs.longitude,
        (ABS(COALESCE(cs.bedrooms,0) - COALESCE(v_beds,0)) * 2
         + ABS(COALESCE(cs.bathrooms,0) - COALESCE(v_baths,0))
         + CASE WHEN cs.property_type = v_type THEN 0 ELSE 5 END
        ) AS similarity_score
      FROM comparable_sales cs
      WHERE LOWER(cs.suburb) = LOWER(v_suburb) AND LOWER(cs.state) = LOWER(v_state)
        AND cs.sold_date >= CURRENT_DATE - (p_months_back || ' months')::INTERVAL
        AND cs.is_public = true
        AND (cs.property_id IS NULL OR cs.property_id != p_property_id)
      ORDER BY similarity_score ASC, cs.sold_date DESC
      LIMIT p_limit
    ) s
  );
END;
$$;

CREATE OR REPLACE FUNCTION track_cma_view(p_share_token TEXT)
RETURNS JSON LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public' AS $$
BEGIN
  UPDATE cma_reports SET view_count = view_count + 1, viewed_at = NOW()
  WHERE share_token = p_share_token AND is_shared = true;
  RETURN (SELECT row_to_json(c) FROM cma_reports c WHERE share_token = p_share_token AND is_shared = true);
END;
$$;
