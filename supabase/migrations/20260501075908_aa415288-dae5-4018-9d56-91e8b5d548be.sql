CREATE OR REPLACE FUNCTION public.nearby_properties(
  _lat double precision,
  _lng double precision,
  _radius_km double precision DEFAULT 10,
  _limit integer DEFAULT 50,
  _listing_type text DEFAULT NULL
)
RETURNS SETOF properties
LANGUAGE sql
STABLE
SECURITY INVOKER
SET search_path = public
AS $$
  SELECT p.*
  FROM public.properties p
  WHERE p.lat IS NOT NULL
    AND p.lng IS NOT NULL
    AND p.is_active = true
    AND p.status = 'public'
    AND p.agent_id IS NOT NULL
    AND (
      _listing_type IS NULL
      OR (
        CASE
          WHEN _listing_type = 'rent' THEN p.listing_type = 'rent'
          WHEN _listing_type = 'sale' THEN (p.listing_type = 'sale' OR p.listing_type IS NULL)
          ELSE true
        END
      )
    )
    AND (
      6371 * acos(
        LEAST(1.0, GREATEST(-1.0,
          cos(radians(_lat)) * cos(radians(p.lat)) *
          cos(radians(p.lng) - radians(_lng)) +
          sin(radians(_lat)) * sin(radians(p.lat))
        ))
      )
    ) <= _radius_km
  ORDER BY (
    6371 * acos(
      LEAST(1.0, GREATEST(-1.0,
        cos(radians(_lat)) * cos(radians(p.lat)) *
        cos(radians(p.lng) - radians(_lng)) +
        sin(radians(_lat)) * sin(radians(p.lat))
      ))
    )
  ) ASC
  LIMIT _limit;
$$;