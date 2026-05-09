ALTER TABLE properties ADD COLUMN IF NOT EXISTS description_search_vector tsvector;

CREATE OR REPLACE FUNCTION properties_update_search_vector() RETURNS trigger AS $$
BEGIN
  NEW.description_search_vector :=
    setweight(to_tsvector('english', coalesce(NEW.title, '')), 'A') ||
    setweight(to_tsvector('english', coalesce(NEW.description, '')), 'B') ||
    setweight(to_tsvector('english', coalesce(NEW.features::text, '')), 'C') ||
    setweight(to_tsvector('english', coalesce(NEW.suburb, '')), 'A');
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

DROP TRIGGER IF EXISTS properties_search_vector_trigger ON properties;
CREATE TRIGGER properties_search_vector_trigger
BEFORE INSERT OR UPDATE OF title, description, features, suburb ON properties
FOR EACH ROW EXECUTE FUNCTION properties_update_search_vector();

UPDATE properties SET description_search_vector =
  setweight(to_tsvector('english', coalesce(title, '')), 'A') ||
  setweight(to_tsvector('english', coalesce(description, '')), 'B') ||
  setweight(to_tsvector('english', coalesce(features::text, '')), 'C') ||
  setweight(to_tsvector('english', coalesce(suburb, '')), 'A')
WHERE description_search_vector IS NULL;

CREATE INDEX IF NOT EXISTS idx_properties_search_vector
ON properties USING gin(description_search_vector);

COMMENT ON COLUMN properties.description_search_vector IS
  'Phase 0 multilingual foundation. Trigger-maintained tsvector for full-text search.';