
ALTER TABLE public.properties
  ADD COLUMN IF NOT EXISTS is_featured BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS featured_until TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS boost_tier TEXT CHECK (boost_tier IN ('featured', 'premier')),
  ADD COLUMN IF NOT EXISTS boost_requested_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS boost_requested_tier TEXT CHECK (boost_requested_tier IN ('featured', 'premier'));

CREATE INDEX IF NOT EXISTS idx_properties_featured
  ON public.properties (is_featured, featured_until)
  WHERE is_featured = true;

CREATE OR REPLACE FUNCTION public.expire_featured_listings()
RETURNS void LANGUAGE sql SECURITY DEFINER
SET search_path TO 'public'
AS $$
  UPDATE public.properties
  SET is_featured = false, boost_tier = null
  WHERE is_featured = true AND featured_until < now();
$$;
