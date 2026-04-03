
-- Schools table
CREATE TABLE IF NOT EXISTS public.schools (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  acara_id      text UNIQUE NOT NULL,
  name          text NOT NULL,
  type          text NOT NULL,
  sector        text NOT NULL,
  suburb        text NOT NULL,
  state         text NOT NULL,
  postcode      text,
  lat           numeric(10,7),
  lng           numeric(10,7),
  icsea         integer,
  enrolment     integer,
  website_url   text,
  phone         text,
  created_at    timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_schools_state ON public.schools(state);
CREATE INDEX IF NOT EXISTS idx_schools_type ON public.schools(type);
CREATE INDEX IF NOT EXISTS idx_schools_suburb ON public.schools(suburb);

-- Catchment polygons table
CREATE TABLE IF NOT EXISTS public.school_catchments (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  school_id     uuid REFERENCES public.schools(id) ON DELETE CASCADE,
  geojson       jsonb NOT NULL,
  year          integer DEFAULT 2024,
  source_url    text,
  updated_at    timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_catchments_school_id ON public.school_catchments(school_id);

-- Property-school junction
CREATE TABLE IF NOT EXISTS public.property_schools (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  property_id   uuid REFERENCES public.properties(id) ON DELETE CASCADE,
  school_id     uuid REFERENCES public.schools(id) ON DELETE CASCADE,
  distance_km   numeric(5,2),
  in_catchment  boolean DEFAULT false,
  UNIQUE(property_id, school_id)
);

CREATE INDEX IF NOT EXISTS idx_property_schools_property ON public.property_schools(property_id);
CREATE INDEX IF NOT EXISTS idx_property_schools_school ON public.property_schools(school_id);
CREATE INDEX IF NOT EXISTS idx_property_schools_catchment ON public.property_schools(in_catchment) WHERE in_catchment = true;

-- RLS
ALTER TABLE public.schools ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.school_catchments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.property_schools ENABLE ROW LEVEL SECURITY;

CREATE POLICY "schools_public_read" ON public.schools FOR SELECT USING (true);
CREATE POLICY "catchments_public_read" ON public.school_catchments FOR SELECT USING (true);
CREATE POLICY "prop_schools_public_read" ON public.property_schools FOR SELECT USING (true);

-- Schools within km RPC function using earthdistance
CREATE OR REPLACE FUNCTION public.schools_within_km(p_lat float8, p_lng float8, p_km float8)
RETURNS TABLE(id uuid, name text, distance_km float8)
LANGUAGE sql STABLE AS $$
  SELECT
    s.id,
    s.name,
    (6371 * acos(
      LEAST(1.0, GREATEST(-1.0,
        cos(radians(p_lat)) * cos(radians(s.lat::float8)) *
        cos(radians(s.lng::float8) - radians(p_lng)) +
        sin(radians(p_lat)) * sin(radians(s.lat::float8))
      ))
    )) AS distance_km
  FROM public.schools s
  WHERE s.lat IS NOT NULL AND s.lng IS NOT NULL
    AND (6371 * acos(
      LEAST(1.0, GREATEST(-1.0,
        cos(radians(p_lat)) * cos(radians(s.lat::float8)) *
        cos(radians(s.lng::float8) - radians(p_lng)) +
        sin(radians(p_lat)) * sin(radians(s.lat::float8))
      ))
    )) <= p_km
  ORDER BY distance_km ASC;
$$;
