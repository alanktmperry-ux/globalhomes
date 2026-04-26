-- Seller leads from valuation tool — distinct from buyer 'leads' table which requires property_id/agent_id
CREATE TABLE public.seller_leads (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  -- Property info
  address text NOT NULL,
  suburb text NOT NULL,
  state text NOT NULL,
  postcode text,
  lat numeric,
  lng numeric,
  property_type text NOT NULL,
  beds integer,
  baths integer,
  cars integer,
  land_size_sqm integer,
  renovations text,
  -- Estimate snapshot
  estimated_value_min numeric,
  estimated_value_max numeric,
  estimate_method text,
  -- Contact
  user_name text NOT NULL,
  user_email text NOT NULL,
  user_phone text,
  preferred_contact text DEFAULT 'email',
  preferred_language text DEFAULT 'en',
  -- Routing/state
  status text NOT NULL DEFAULT 'new',
  matched_agent_ids uuid[] DEFAULT '{}',
  source text DEFAULT 'valuation_tool',
  user_id uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_seller_leads_suburb_state ON public.seller_leads (suburb, state);
CREATE INDEX idx_seller_leads_status ON public.seller_leads (status);
CREATE INDEX idx_seller_leads_created_at ON public.seller_leads (created_at DESC);

ALTER TABLE public.seller_leads ENABLE ROW LEVEL SECURITY;

-- Anyone (incl. anonymous) can submit a seller lead via the edge function (which uses service role).
-- Direct inserts from clients are also allowed for resilience but constrained.
CREATE POLICY "Anyone can submit seller leads"
  ON public.seller_leads FOR INSERT
  TO anon, authenticated
  WITH CHECK (true);

-- Admins can view/manage all
CREATE POLICY "Admins can view all seller leads"
  ON public.seller_leads FOR SELECT
  TO authenticated
  USING (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admins can update seller leads"
  ON public.seller_leads FOR UPDATE
  TO authenticated
  USING (has_role(auth.uid(), 'admin'::app_role));

-- Matched agents can view leads they were routed to
CREATE POLICY "Matched agents can view their seller leads"
  ON public.seller_leads FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM agents a
      WHERE a.user_id = auth.uid()
        AND a.id = ANY(seller_leads.matched_agent_ids)
    )
  );

-- Lead submitters can view their own
CREATE POLICY "Users can view their own seller leads"
  ON public.seller_leads FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE TRIGGER update_seller_leads_updated_at
  BEFORE UPDATE ON public.seller_leads
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Lightweight estimate audit table (public for transparency analytics)
CREATE TABLE public.valuation_estimates (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  address text,
  suburb text NOT NULL,
  state text NOT NULL,
  postcode text,
  property_type text NOT NULL,
  beds integer,
  baths integer,
  cars integer,
  land_size_sqm integer,
  renovations text,
  estimated_value_min numeric NOT NULL,
  estimated_value_max numeric NOT NULL,
  base_value numeric,
  method text,
  calculation_metadata jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_valuation_estimates_suburb ON public.valuation_estimates (suburb, state);
CREATE INDEX idx_valuation_estimates_created_at ON public.valuation_estimates (created_at DESC);

ALTER TABLE public.valuation_estimates ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can insert valuation estimates"
  ON public.valuation_estimates FOR INSERT
  TO anon, authenticated
  WITH CHECK (true);

CREATE POLICY "Estimates are publicly readable"
  ON public.valuation_estimates FOR SELECT
  TO anon, authenticated
  USING (true);

-- Hybrid estimate RPC: tries existing market data, falls back to state median.
-- Returns a JSON object with min, max, base, method, sample_size.
CREATE OR REPLACE FUNCTION public.estimate_property_value(
  p_suburb text,
  p_state text,
  p_property_type text DEFAULT 'house',
  p_beds integer DEFAULT NULL,
  p_baths integer DEFAULT NULL,
  p_land_size_sqm integer DEFAULT NULL,
  p_renovations text DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_base numeric;
  v_method text;
  v_sample integer := 0;
  v_type_mult numeric := 1.0;
  v_adjusted numeric;
  v_state_medians jsonb := jsonb_build_object(
    'NSW', 1100000,
    'VIC',  900000,
    'QLD',  780000,
    'WA',   680000,
    'SA',   720000,
    'TAS',  600000,
    'ACT', 1000000,
    'NT',   550000
  );
BEGIN
  -- 1. Try existing market data: median of recent comparable sales in the suburb
  BEGIN
    SELECT
      percentile_cont(0.5) WITHIN GROUP (ORDER BY ps.sale_price)::numeric,
      COUNT(*)
      INTO v_base, v_sample
    FROM property_sales ps
    JOIN properties p ON p.id = ps.property_id
    WHERE LOWER(p.suburb) = LOWER(p_suburb)
      AND UPPER(p.state) = UPPER(p_state)
      AND ps.sale_price IS NOT NULL
      AND ps.sale_date >= (now() - interval '12 months');
  EXCEPTION WHEN undefined_table OR undefined_column THEN
    v_base := NULL;
    v_sample := 0;
  END;

  IF v_base IS NOT NULL AND v_sample >= 3 THEN
    v_method := 'suburb_median_12m';
  ELSE
    -- 2. Fallback: state median
    v_base := COALESCE((v_state_medians ->> UPPER(p_state))::numeric, 800000);
    v_method := 'state_median_fallback';
    v_sample := 0;
  END IF;

  -- Property type multiplier (house baseline)
  v_type_mult := CASE LOWER(p_property_type)
    WHEN 'house' THEN 1.00
    WHEN 'townhouse' THEN 0.85
    WHEN 'unit' THEN 0.70
    WHEN 'apartment' THEN 0.70
    WHEN 'villa' THEN 0.90
    ELSE 1.00
  END;

  v_adjusted := v_base * v_type_mult;

  -- Bedroom adjustment (assume base of 3 beds for the median)
  IF p_beds IS NOT NULL THEN
    v_adjusted := v_adjusted + ((p_beds - 3) * 120000);
  END IF;

  -- Bathroom adjustment (assume base of 2)
  IF p_baths IS NOT NULL THEN
    v_adjusted := v_adjusted + ((p_baths - 2) * 60000);
  END IF;

  -- Land size adjustment for houses (only if base value pre-includes ~600sqm baseline)
  IF p_land_size_sqm IS NOT NULL AND LOWER(p_property_type) = 'house' THEN
    v_adjusted := v_adjusted + ((p_land_size_sqm - 600) * 1500);
  END IF;

  -- Renovations
  IF LOWER(COALESCE(p_renovations, '')) = 'yes' THEN
    v_adjusted := v_adjusted * 1.10;
  ELSIF LOWER(COALESCE(p_renovations, '')) = 'partial' THEN
    v_adjusted := v_adjusted * 1.05;
  END IF;

  -- Floor at 100k
  IF v_adjusted < 100000 THEN
    v_adjusted := 100000;
  END IF;

  RETURN jsonb_build_object(
    'min', round(v_adjusted * 0.85),
    'max', round(v_adjusted * 1.15),
    'mid', round(v_adjusted),
    'base', round(v_base),
    'method', v_method,
    'sample_size', v_sample
  );
END;
$$;

GRANT EXECUTE ON FUNCTION public.estimate_property_value(text, text, text, integer, integer, integer, text) TO anon, authenticated;