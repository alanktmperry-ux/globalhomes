
-- Create a function to find properties near a given point within a radius (km)
-- Uses the Haversine formula since PostGIS extension may not be available
CREATE OR REPLACE FUNCTION public.nearby_properties(
  _lat double precision,
  _lng double precision,
  _radius_km double precision DEFAULT 10,
  _limit integer DEFAULT 50
)
RETURNS SETOF properties
LANGUAGE sql
STABLE
SECURITY INVOKER
SET search_path = public
AS $$
  SELECT *
  FROM public.properties
  WHERE lat IS NOT NULL
    AND lng IS NOT NULL
    AND is_active = true
    AND status = 'public'
    AND (
      6371 * acos(
        LEAST(1.0, GREATEST(-1.0,
          cos(radians(_lat)) * cos(radians(lat)) *
          cos(radians(lng) - radians(_lng)) +
          sin(radians(_lat)) * sin(radians(lat))
        ))
      )
    ) <= _radius_km
  ORDER BY (
    6371 * acos(
      LEAST(1.0, GREATEST(-1.0,
        cos(radians(_lat)) * cos(radians(lat)) *
        cos(radians(lng) - radians(_lng)) +
        sin(radians(_lat)) * sin(radians(lat))
      ))
    )
  ) ASC
  LIMIT _limit;
$$;
