
ALTER TABLE properties
  ADD COLUMN IF NOT EXISTS virtual_tour_url text,
  ADD COLUMN IF NOT EXISTS video_url text,
  ADD COLUMN IF NOT EXISTS floor_plan_url text;

ALTER TABLE properties
  ADD COLUMN IF NOT EXISTS has_virtual_tour boolean
    GENERATED ALWAYS AS (virtual_tour_url IS NOT NULL) STORED;

CREATE INDEX IF NOT EXISTS idx_properties_has_tour
  ON properties(has_virtual_tour)
  WHERE has_virtual_tour = true;
