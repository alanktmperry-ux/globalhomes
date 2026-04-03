
-- ── Add missing columns to agents ──────────────────────────────────
ALTER TABLE agents
  ADD COLUMN IF NOT EXISTS slug               TEXT UNIQUE,
  ADD COLUMN IF NOT EXISTS headline            TEXT,
  ADD COLUMN IF NOT EXISTS profile_banner_url  TEXT,
  ADD COLUMN IF NOT EXISTS is_public_profile   BOOLEAN DEFAULT true,
  ADD COLUMN IF NOT EXISTS profile_views       INT DEFAULT 0,
  ADD COLUMN IF NOT EXISTS linkedin_url        TEXT,
  ADD COLUMN IF NOT EXISTS instagram_url       TEXT;

-- Auto-generate slug from name
CREATE OR REPLACE FUNCTION generate_agent_slug()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
DECLARE
  base_slug TEXT;
  final_slug TEXT;
  counter   INT := 0;
BEGIN
  IF NEW.slug IS NULL OR NEW.slug = '' THEN
    base_slug := lower(regexp_replace(
      coalesce(NEW.name, 'agent'),
      '[^a-z0-9]+', '-', 'g'
    ));
    base_slug := trim(both '-' from base_slug);
    final_slug := base_slug;
    LOOP
      EXIT WHEN NOT EXISTS (
        SELECT 1 FROM agents WHERE slug = final_slug AND id <> NEW.id
      );
      counter := counter + 1;
      final_slug := base_slug || '-' || counter;
    END LOOP;
    NEW.slug := final_slug;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_agent_slug ON agents;
CREATE TRIGGER trg_agent_slug
  BEFORE INSERT OR UPDATE ON agents
  FOR EACH ROW EXECUTE FUNCTION generate_agent_slug();

-- Backfill existing agents with slugs
UPDATE agents SET slug = NULL WHERE slug IS NULL;

-- ── Add missing columns to agencies ────────────────────────────────
ALTER TABLE agencies
  ADD COLUMN IF NOT EXISTS banner_url        TEXT,
  ADD COLUMN IF NOT EXISTS suburb            TEXT,
  ADD COLUMN IF NOT EXISTS state             TEXT,
  ADD COLUMN IF NOT EXISTS postcode          TEXT,
  ADD COLUMN IF NOT EXISTS abn              TEXT,
  ADD COLUMN IF NOT EXISTS license_number    TEXT,
  ADD COLUMN IF NOT EXISTS founded_year      INT,
  ADD COLUMN IF NOT EXISTS social_facebook   TEXT,
  ADD COLUMN IF NOT EXISTS social_instagram  TEXT,
  ADD COLUMN IF NOT EXISTS social_linkedin   TEXT,
  ADD COLUMN IF NOT EXISTS verified          BOOLEAN DEFAULT false;

-- ── Add missing columns to agent_reviews ───────────────────────────
ALTER TABLE agent_reviews
  ADD COLUMN IF NOT EXISTS review_type       TEXT DEFAULT 'buyer',
  ADD COLUMN IF NOT EXISTS title             TEXT,
  ADD COLUMN IF NOT EXISTS suburb            TEXT,
  ADD COLUMN IF NOT EXISTS year_of_service   INT,
  ADD COLUMN IF NOT EXISTS verified          BOOLEAN DEFAULT false,
  ADD COLUMN IF NOT EXISTS helpful_count     INT DEFAULT 0;

-- Add validation trigger for review_type
CREATE OR REPLACE FUNCTION validate_review_type()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  IF NEW.review_type NOT IN ('buyer','vendor','tenant','landlord') THEN
    RAISE EXCEPTION 'Invalid review_type: %', NEW.review_type;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_validate_review_type ON agent_reviews;
CREATE TRIGGER trg_validate_review_type
  BEFORE INSERT OR UPDATE ON agent_reviews
  FOR EACH ROW EXECUTE FUNCTION validate_review_type();

-- ── Review verification tokens ─────────────────────────────────────
CREATE TABLE IF NOT EXISTS review_verify_tokens (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  review_id   UUID NOT NULL REFERENCES agent_reviews(id) ON DELETE CASCADE,
  token       TEXT NOT NULL UNIQUE DEFAULT encode(gen_random_bytes(32), 'hex'),
  expires_at  TIMESTAMPTZ DEFAULT now() + interval '48 hours',
  used_at     TIMESTAMPTZ
);

ALTER TABLE review_verify_tokens ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Service role only tokens" ON review_verify_tokens
  FOR ALL USING (false);

-- ── Profile view counter ───────────────────────────────────────────
CREATE OR REPLACE FUNCTION increment_agent_profile_views(p_agent_id UUID)
RETURNS void LANGUAGE sql SECURITY DEFINER SET search_path TO 'public' AS $$
  UPDATE agents SET profile_views = COALESCE(profile_views, 0) + 1 WHERE id = p_agent_id;
$$;

-- ── Find agents RPC ────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION find_agents(
  p_suburb       TEXT    DEFAULT NULL,
  p_state        TEXT    DEFAULT NULL,
  p_specialty    TEXT    DEFAULT NULL,
  p_min_rating   NUMERIC DEFAULT NULL,
  p_agency_id    UUID    DEFAULT NULL,
  p_limit        INT     DEFAULT 24,
  p_offset       INT     DEFAULT 0
)
RETURNS TABLE (
  agent_id         UUID,
  slug             TEXT,
  display_name     TEXT,
  avatar_url       TEXT,
  headline         TEXT,
  years_experience INT,
  specialties      TEXT[],
  service_suburbs  TEXT[],
  agency_name      TEXT,
  agency_logo      TEXT,
  active_listings  BIGINT,
  sold_count       BIGINT,
  review_count     BIGINT,
  avg_rating       NUMERIC,
  total_count      BIGINT
) LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path TO 'public' AS $$
BEGIN
  RETURN QUERY
  WITH agent_data AS (
    SELECT
      a.id AS agent_id,
      a.slug,
      a.name AS display_name,
      a.avatar_url,
      a.headline,
      a.years_experience,
      a.service_areas AS service_suburbs,
      ag.name AS agency_name,
      ag.logo_url AS agency_logo,
      COALESCE(a.rating, 0)::numeric AS avg_rating,
      COALESCE(a.review_count, 0)::bigint AS review_count,
      (SELECT COUNT(*) FROM properties p WHERE p.agent_id = a.id AND p.is_active = true)::bigint AS active_listings,
      (SELECT COUNT(*) FROM properties p WHERE p.agent_id = a.id AND p.status = 'sold')::bigint AS sold_count
    FROM agents a
    LEFT JOIN agencies ag ON ag.id = a.agency_id
    WHERE a.is_subscribed = true
      AND COALESCE(a.is_public_profile, true) = true
  ),
  filtered AS (
    SELECT d.*,
           -- Parse specialization as array (comma-separated)
           string_to_array(COALESCE((SELECT specialization FROM agents WHERE id = d.agent_id), ''), ',') AS specialties_arr,
           COUNT(*) OVER() AS total_count
    FROM agent_data d
    WHERE (p_suburb IS NULL OR p_suburb = ANY(d.service_suburbs))
      AND (p_state IS NULL OR EXISTS (
        SELECT 1 FROM properties pp WHERE pp.agent_id = d.agent_id AND pp.state = p_state LIMIT 1
      ))
      AND (p_specialty IS NULL OR (SELECT specialization FROM agents WHERE id = d.agent_id) ILIKE '%' || p_specialty || '%')
      AND (p_min_rating IS NULL OR d.avg_rating >= p_min_rating)
      AND (p_agency_id IS NULL OR (SELECT agency_id FROM agents WHERE id = d.agent_id) = p_agency_id)
    ORDER BY d.avg_rating DESC NULLS LAST, d.sold_count DESC
    LIMIT p_limit OFFSET p_offset
  )
  SELECT
    f.agent_id, f.slug, f.display_name, f.avatar_url, f.headline,
    f.years_experience,
    f.specialties_arr AS specialties,
    f.service_suburbs,
    f.agency_name, f.agency_logo,
    f.active_listings, f.sold_count, f.review_count, f.avg_rating,
    f.total_count
  FROM filtered f;
END;
$$;

-- ── Storage bucket for profile banners ─────────────────────────────
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'profile-banners', 'profile-banners', true, 5242880,
  ARRAY['image/jpeg','image/png','image/webp']
)
ON CONFLICT (id) DO NOTHING;

CREATE POLICY "Public read banners" ON storage.objects FOR SELECT
  USING (bucket_id = 'profile-banners');

CREATE POLICY "Auth upload own banner" ON storage.objects FOR INSERT
  WITH CHECK (
    bucket_id = 'profile-banners'
    AND auth.role() = 'authenticated'
  );

CREATE POLICY "Auth update own banner" ON storage.objects FOR UPDATE
  USING (
    bucket_id = 'profile-banners'
    AND auth.role() = 'authenticated'
  );
