
ALTER TABLE properties
  ADD COLUMN IF NOT EXISTS sold_price     numeric(12,0),
  ADD COLUMN IF NOT EXISTS sold_at        date,
  ADD COLUMN IF NOT EXISTS floor_area_sqm numeric(8,1),
  ADD COLUMN IF NOT EXISTS land_size_sqm  numeric(10,1);

ALTER TABLE properties
  ADD COLUMN IF NOT EXISTS price_per_sqm numeric(10,2)
  GENERATED ALWAYS AS (
    CASE
      WHEN sold_price > 0 AND floor_area_sqm > 0 THEN sold_price / floor_area_sqm
      WHEN sold_price > 0 AND land_size_sqm > 0  THEN sold_price / land_size_sqm
      WHEN price > 0 AND floor_area_sqm > 0 THEN price / floor_area_sqm
      WHEN price > 0 AND land_size_sqm > 0  THEN price / land_size_sqm
      ELSE NULL
    END
  ) STORED;

CREATE INDEX IF NOT EXISTS idx_properties_sold
  ON properties(status, sold_at DESC)
  WHERE status = 'sold';
