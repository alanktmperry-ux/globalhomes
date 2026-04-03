
-- Add columns to existing saved_properties table
ALTER TABLE saved_properties
  ADD COLUMN IF NOT EXISTS notes text,
  ADD COLUMN IF NOT EXISTS saved_price numeric,
  ADD COLUMN IF NOT EXISTS saved_at timestamptz NOT NULL DEFAULT now();

-- Saved searches table
CREATE TABLE IF NOT EXISTS saved_searches (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id         uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name            text NOT NULL DEFAULT 'My Search',
  suburbs         text[] DEFAULT '{}',
  states          text[] DEFAULT '{}',
  min_price       numeric,
  max_price       numeric,
  min_bedrooms    int,
  max_bedrooms    int,
  min_bathrooms   int,
  property_types  text[] DEFAULT '{}',
  listing_status  text DEFAULT 'active',
  has_virtual_tour boolean,
  min_land_sqm    int,
  max_land_sqm    int,
  listing_mode    text,
  keywords        text,
  alert_frequency text NOT NULL DEFAULT 'instant',
  last_alerted_at timestamptz,
  new_match_count int NOT NULL DEFAULT 0,
  created_at      timestamptz NOT NULL DEFAULT now(),
  updated_at      timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE saved_searches ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users manage own saved searches"
  ON saved_searches FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE INDEX IF NOT EXISTS idx_saved_searches_user ON saved_searches (user_id);

-- Price change log
CREATE TABLE IF NOT EXISTS property_price_changes (
  id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  property_id  uuid NOT NULL REFERENCES properties(id) ON DELETE CASCADE,
  old_price    numeric,
  new_price    numeric,
  change_pct   numeric GENERATED ALWAYS AS (
                 CASE WHEN old_price > 0
                   THEN ROUND(((new_price - old_price) / old_price * 100)::numeric, 1)
                   ELSE 0
                 END
               ) STORED,
  changed_at   timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE property_price_changes ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Price changes are public" ON property_price_changes FOR SELECT USING (true);

CREATE INDEX IF NOT EXISTS idx_price_changes_property
  ON property_price_changes (property_id, changed_at DESC);

-- Trigger: log price changes automatically
CREATE OR REPLACE FUNCTION log_property_price_change()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  IF NEW.price IS DISTINCT FROM OLD.price
     AND OLD.price IS NOT NULL
     AND NEW.price IS NOT NULL THEN
    INSERT INTO property_price_changes (property_id, old_price, new_price)
    VALUES (NEW.id, OLD.price, NEW.price);
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_log_price_change ON properties;
CREATE TRIGGER trg_log_price_change
  AFTER UPDATE OF price ON properties
  FOR EACH ROW EXECUTE FUNCTION log_property_price_change();

-- Alert sends (dedup table)
CREATE TABLE IF NOT EXISTS alert_sends (
  id               uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  saved_search_id  uuid REFERENCES saved_searches(id) ON DELETE CASCADE,
  property_id      uuid NOT NULL REFERENCES properties(id) ON DELETE CASCADE,
  alert_type       text NOT NULL,
  sent_at          timestamptz NOT NULL DEFAULT now(),
  UNIQUE (saved_search_id, property_id, alert_type)
);

ALTER TABLE alert_sends ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Alert sends are internal" ON alert_sends FOR ALL USING (false);

-- Validation triggers
CREATE OR REPLACE FUNCTION validate_saved_search_frequency()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  IF NEW.alert_frequency NOT IN ('instant','daily','weekly','off') THEN
    RAISE EXCEPTION 'Invalid alert_frequency: %', NEW.alert_frequency;
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_validate_saved_search
  BEFORE INSERT OR UPDATE ON saved_searches
  FOR EACH ROW EXECUTE FUNCTION validate_saved_search_frequency();

CREATE OR REPLACE FUNCTION validate_alert_type()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  IF NEW.alert_type NOT IN ('new_match','price_drop','auction_reminder') THEN
    RAISE EXCEPTION 'Invalid alert_type: %', NEW.alert_type;
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_validate_alert_type
  BEFORE INSERT OR UPDATE ON alert_sends
  FOR EACH ROW EXECUTE FUNCTION validate_alert_type();

-- updated_at trigger for saved_searches
CREATE TRIGGER trg_saved_searches_updated_at
  BEFORE UPDATE ON saved_searches
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- RPC: find saved searches matching a new property
CREATE OR REPLACE FUNCTION find_matching_saved_searches(p_property_id uuid)
RETURNS TABLE (
  saved_search_id uuid,
  buyer_id        uuid,
  buyer_email     text,
  buyer_name      text,
  search_name     text,
  alert_frequency text
)
LANGUAGE sql STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT
    ss.id,
    ss.user_id,
    au.email::text,
    pr.full_name,
    ss.name,
    ss.alert_frequency
  FROM saved_searches ss
  JOIN profiles pr ON pr.user_id = ss.user_id
  JOIN auth.users au ON au.id = ss.user_id
  JOIN properties prop ON prop.id = p_property_id
  WHERE ss.alert_frequency <> 'off'
    AND (array_length(ss.suburbs, 1) IS NULL
         OR prop.suburb ILIKE ANY(ss.suburbs))
    AND (array_length(ss.states, 1) IS NULL
         OR prop.state = ANY(ss.states))
    AND (ss.min_price IS NULL OR prop.price >= ss.min_price)
    AND (ss.max_price IS NULL OR prop.price <= ss.max_price)
    AND (ss.min_bedrooms IS NULL OR prop.beds >= ss.min_bedrooms)
    AND (ss.max_bedrooms IS NULL OR prop.beds <= ss.max_bedrooms)
    AND (array_length(ss.property_types, 1) IS NULL
         OR prop.property_type = ANY(ss.property_types))
    AND (ss.has_virtual_tour IS NULL
         OR prop.has_virtual_tour = ss.has_virtual_tour)
    AND (ss.listing_mode IS NULL
         OR prop.listing_mode = ss.listing_mode)
    AND NOT EXISTS (
      SELECT 1 FROM alert_sends als
      WHERE als.saved_search_id = ss.id
        AND als.property_id = p_property_id
        AND als.alert_type = 'new_match'
    )
$$;

-- Enable realtime for saved_searches
ALTER PUBLICATION supabase_realtime ADD TABLE saved_searches;
