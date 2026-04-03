
CREATE OR REPLACE FUNCTION find_comparable_sales(
  p_lat         float8,
  p_lng         float8,
  p_bedrooms    integer,
  p_property_id uuid,
  p_radius_km   float8 DEFAULT 1.0,
  p_limit       integer DEFAULT 6
)
RETURNS TABLE(
  id            uuid,
  address       text,
  suburb        text,
  price         numeric,
  sold_price    numeric,
  sold_at       date,
  beds          integer,
  baths         integer,
  parking       integer,
  floor_area_sqm numeric,
  land_size_sqm  numeric,
  price_per_sqm  numeric,
  images        text[],
  slug          text,
  lat           numeric,
  lng           numeric,
  distance_km   float8,
  property_type text
)
LANGUAGE sql STABLE
SET search_path TO 'public'
AS $$
  SELECT
    p.id,
    p.address,
    p.suburb,
    p.price,
    p.sold_price,
    p.sold_at,
    p.beds,
    p.baths,
    p.parking,
    p.floor_area_sqm,
    p.land_size_sqm,
    p.price_per_sqm,
    p.images,
    p.slug,
    p.lat,
    p.lng,
    (6371 * acos(
      LEAST(1.0, GREATEST(-1.0,
        cos(radians(p_lat)) * cos(radians(p.lat::float8)) *
        cos(radians(p.lng::float8) - radians(p_lng)) +
        sin(radians(p_lat)) * sin(radians(p.lat::float8))
      ))
    )) AS distance_km,
    p.property_type
  FROM properties p
  WHERE
    p.status = 'sold'
    AND p.id != p_property_id
    AND p.lat IS NOT NULL
    AND p.lng IS NOT NULL
    AND p.sold_at >= (now() - interval '24 months')
    AND p.beds BETWEEN (p_bedrooms - 1) AND (p_bedrooms + 1)
    AND (6371 * acos(
      LEAST(1.0, GREATEST(-1.0,
        cos(radians(p_lat)) * cos(radians(p.lat::float8)) *
        cos(radians(p.lng::float8) - radians(p_lng)) +
        sin(radians(p_lat)) * sin(radians(p.lat::float8))
      ))
    )) <= p_radius_km
  ORDER BY
    ABS(p.beds - p_bedrooms) ASC,
    p.sold_at DESC,
    distance_km ASC
  LIMIT p_limit;
$$;

CREATE OR REPLACE FUNCTION suburb_sold_stats(
  p_suburb   text,
  p_state    text,
  p_bedrooms integer,
  p_months   integer DEFAULT 12
)
RETURNS TABLE(
  count         bigint,
  median_price  numeric,
  avg_days_on_market numeric,
  min_price     numeric,
  max_price     numeric,
  avg_price_sqm numeric
)
LANGUAGE sql STABLE
SET search_path TO 'public'
AS $$
  SELECT
    COUNT(*),
    PERCENTILE_CONT(0.5) WITHIN GROUP (ORDER BY p2.sold_price),
    AVG((p2.sold_at - p2.created_at::date)::numeric),
    MIN(p2.sold_price),
    MAX(p2.sold_price),
    AVG(p2.price_per_sqm)
  FROM properties p2
  WHERE
    p2.status = 'sold'
    AND LOWER(p2.suburb) = LOWER(p_suburb)
    AND LOWER(p2.state)  = LOWER(p_state)
    AND p2.beds BETWEEN (p_bedrooms - 1) AND (p_bedrooms + 1)
    AND p2.sold_at >= (now() - (p_months || ' months')::interval)
    AND p2.sold_price IS NOT NULL;
$$;
