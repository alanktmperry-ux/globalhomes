
-- Add SEO slug column to properties
ALTER TABLE public.properties ADD COLUMN IF NOT EXISTS slug TEXT;
ALTER TABLE public.properties ADD COLUMN IF NOT EXISTS postcode TEXT;

-- Add SEO columns to profiles
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS slug TEXT;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS bio TEXT;

-- Unique indexes for slug lookups
CREATE UNIQUE INDEX IF NOT EXISTS idx_properties_slug ON public.properties(slug) WHERE slug IS NOT NULL;
CREATE UNIQUE INDEX IF NOT EXISTS idx_profiles_slug ON public.profiles(slug) WHERE slug IS NOT NULL;

-- Auto-generate slugs for existing properties
UPDATE public.properties
SET slug = LOWER(REGEXP_REPLACE(
  CONCAT(
    COALESCE(beds::text || '-bed-', ''),
    COALESCE(LOWER(REGEXP_REPLACE(property_type, '[^a-zA-Z0-9]', '-', 'g')), 'property'), '-',
    COALESCE(LOWER(REGEXP_REPLACE(suburb, '[^a-zA-Z0-9]', '-', 'g')), 'australia'), '-',
    COALESCE(LOWER(state), 'au'), '-',
    SUBSTRING(id::text, 1, 8)
  ),
  '[^a-z0-9-]+', '-', 'g'
))
WHERE slug IS NULL OR slug = '';

-- Slug generation function
CREATE OR REPLACE FUNCTION public.generate_property_slug(
  p_beds int, p_property_type text, p_suburb text, p_state text, p_id uuid
) RETURNS text LANGUAGE sql IMMUTABLE AS $$
  SELECT LOWER(REGEXP_REPLACE(
    CONCAT(
      COALESCE(p_beds::text || '-bed-', ''),
      COALESCE(LOWER(REGEXP_REPLACE(p_property_type, '[^a-zA-Z0-9]', '-', 'g')), 'property'), '-',
      COALESCE(LOWER(REGEXP_REPLACE(p_suburb, '[^a-zA-Z0-9]', '-', 'g')), 'australia'), '-',
      COALESCE(LOWER(p_state), 'au'), '-',
      SUBSTRING(p_id::text, 1, 8)
    ),
    '[^a-z0-9-]+', '-', 'g'
  ));
$$;

-- Auto-generate slug on insert if not provided
CREATE OR REPLACE FUNCTION public.auto_generate_property_slug()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  IF NEW.slug IS NULL OR NEW.slug = '' THEN
    NEW.slug := public.generate_property_slug(NEW.beds, NEW.property_type, NEW.suburb, NEW.state, NEW.id);
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_auto_slug_property ON public.properties;
CREATE TRIGGER trg_auto_slug_property
  BEFORE INSERT ON public.properties
  FOR EACH ROW EXECUTE FUNCTION public.auto_generate_property_slug();
