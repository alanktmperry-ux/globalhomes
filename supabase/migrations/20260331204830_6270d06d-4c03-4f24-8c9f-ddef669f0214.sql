
-- Add listing mode columns to properties
ALTER TABLE properties
  ADD COLUMN IF NOT EXISTS listing_mode text NOT NULL DEFAULT 'public',
  ADD COLUMN IF NOT EXISTS eoi_close_date timestamptz,
  ADD COLUMN IF NOT EXISTS eoi_guide_price numeric,
  ADD COLUMN IF NOT EXISTS off_market_reason text,
  ADD COLUMN IF NOT EXISTS address_hidden boolean NOT NULL DEFAULT false;

-- Add validation trigger for listing_mode
CREATE OR REPLACE FUNCTION validate_listing_mode()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  IF NEW.listing_mode NOT IN ('public', 'off_market', 'eoi') THEN
    RAISE EXCEPTION 'Invalid listing_mode: %', NEW.listing_mode;
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER validate_listing_mode_trigger
  BEFORE INSERT OR UPDATE ON properties
  FOR EACH ROW EXECUTE FUNCTION validate_listing_mode();

-- Suburb off-market subscriptions
CREATE TABLE IF NOT EXISTS offmarket_subscriptions (
  id             uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  buyer_id       uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  suburb         text NOT NULL,
  state          text NOT NULL,
  min_price      numeric,
  max_price      numeric,
  min_bedrooms   int,
  property_types text[] DEFAULT '{}',
  created_at     timestamptz NOT NULL DEFAULT now(),
  UNIQUE (buyer_id, suburb, state)
);

ALTER TABLE offmarket_subscriptions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Buyers manage own subscriptions"
  ON offmarket_subscriptions FOR ALL
  USING (auth.uid() = buyer_id)
  WITH CHECK (auth.uid() = buyer_id);

-- Expressions of Interest
CREATE TABLE IF NOT EXISTS expressions_of_interest (
  id                uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  property_id       uuid NOT NULL REFERENCES properties(id) ON DELETE CASCADE,
  buyer_id          uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  offered_price     numeric NOT NULL,
  finance_status    text NOT NULL,
  settlement_days   int,
  conditions        text,
  cover_letter      text,
  status            text NOT NULL DEFAULT 'submitted',
  agent_notes       text,
  submitted_at      timestamptz NOT NULL DEFAULT now(),
  updated_at        timestamptz NOT NULL DEFAULT now(),
  UNIQUE (property_id, buyer_id)
);

-- Validation trigger for EOI
CREATE OR REPLACE FUNCTION validate_eoi()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  IF NEW.finance_status NOT IN ('cash', 'pre_approved', 'conditional', 'not_arranged') THEN
    RAISE EXCEPTION 'Invalid finance_status: %', NEW.finance_status;
  END IF;
  IF NEW.status NOT IN ('submitted', 'under_review', 'shortlisted', 'accepted', 'declined', 'withdrawn') THEN
    RAISE EXCEPTION 'Invalid EOI status: %', NEW.status;
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER validate_eoi_trigger
  BEFORE INSERT OR UPDATE ON expressions_of_interest
  FOR EACH ROW EXECUTE FUNCTION validate_eoi();

ALTER TABLE expressions_of_interest ENABLE ROW LEVEL SECURITY;

-- Buyers: insert own EOI
CREATE POLICY "Buyers insert own EOI"
  ON expressions_of_interest FOR INSERT
  WITH CHECK (auth.uid() = buyer_id);

-- Buyers: read own EOI
CREATE POLICY "Buyers read own EOI"
  ON expressions_of_interest FOR SELECT
  USING (auth.uid() = buyer_id);

-- Buyers: withdraw own EOI
CREATE POLICY "Buyers update own EOI"
  ON expressions_of_interest FOR UPDATE
  USING (auth.uid() = buyer_id);

-- Agents: read EOIs for their listings (agent_id references agents.id, need join)
CREATE POLICY "Agents read EOIs for their listings"
  ON expressions_of_interest FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM properties p
      JOIN agents a ON a.id = p.agent_id
      WHERE p.id = expressions_of_interest.property_id
        AND a.user_id = auth.uid()
    )
  );

-- Agents: update EOIs for their listings
CREATE POLICY "Agents update EOIs for their listings"
  ON expressions_of_interest FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM properties p
      JOIN agents a ON a.id = p.agent_id
      WHERE p.id = expressions_of_interest.property_id
        AND a.user_id = auth.uid()
    )
  );

-- Updated_at trigger
CREATE OR REPLACE FUNCTION update_eoi_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END;
$$;

CREATE TRIGGER eoi_updated_at
  BEFORE UPDATE ON expressions_of_interest
  FOR EACH ROW EXECUTE FUNCTION update_eoi_updated_at();

-- Indexes
CREATE INDEX IF NOT EXISTS idx_properties_listing_mode ON properties (listing_mode);
CREATE INDEX IF NOT EXISTS idx_offmarket_subs_suburb_state ON offmarket_subscriptions (suburb, state);
CREATE INDEX IF NOT EXISTS idx_eoi_property ON expressions_of_interest (property_id);
CREATE INDEX IF NOT EXISTS idx_eoi_buyer ON expressions_of_interest (buyer_id);

-- Enable realtime for EOIs
ALTER PUBLICATION supabase_realtime ADD TABLE expressions_of_interest;
