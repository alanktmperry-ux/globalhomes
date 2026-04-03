
-- ============================================================
-- ENUMS
-- ============================================================
DO $$ BEGIN
  CREATE TYPE auction_status AS ENUM (
    'scheduled','open','live','sold','sold_prior','sold_after','passed_in','withdrawn','postponed'
  );
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE bid_type AS ENUM ('genuine','vendor','opening');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE offer_status AS ENUM ('pending','accepted','rejected','expired','withdrawn');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE id_type AS ENUM ('drivers_licence','passport','medicare_card','proof_of_age_card');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- ============================================================
-- AUCTIONS TABLE
-- ============================================================
CREATE TABLE IF NOT EXISTS auctions (
  id                    UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  property_id           UUID NOT NULL REFERENCES properties(id) ON DELETE CASCADE,
  agent_id              UUID NOT NULL REFERENCES agents(id),
  auction_date          DATE NOT NULL,
  auction_time          TIME NOT NULL DEFAULT '10:00:00',
  auction_timezone      TEXT NOT NULL DEFAULT 'Australia/Melbourne',
  auction_location      TEXT NOT NULL DEFAULT 'On-site',
  is_online             BOOLEAN NOT NULL DEFAULT false,
  online_platform_url   TEXT,
  auctioneer_name       TEXT,
  auctioneer_licence    TEXT,
  auctioneer_firm       TEXT,
  reserve_price         NUMERIC(12,2),
  reserve_met           BOOLEAN,
  vendor_bid_limit      NUMERIC(12,2),
  opening_bid           NUMERIC(12,2),
  status                auction_status NOT NULL DEFAULT 'scheduled',
  sold_price            NUMERIC(12,2),
  sold_at               TIMESTAMPTZ,
  last_bid_amount       NUMERIC(12,2),
  total_bids            INTEGER NOT NULL DEFAULT 0,
  total_registered      INTEGER NOT NULL DEFAULT 0,
  total_active_bidders  INTEGER NOT NULL DEFAULT 0,
  passed_in_price       NUMERIC(12,2),
  notes                 TEXT,
  cooling_off_waived    BOOLEAN NOT NULL DEFAULT true,
  created_at            TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at            TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE UNIQUE INDEX IF NOT EXISTS auctions_active_per_property
  ON auctions(property_id)
  WHERE status NOT IN ('sold','sold_prior','sold_after','passed_in','withdrawn','postponed');

CREATE INDEX IF NOT EXISTS idx_auctions_property ON auctions(property_id);
CREATE INDEX IF NOT EXISTS idx_auctions_agent ON auctions(agent_id);
CREATE INDEX IF NOT EXISTS idx_auctions_date ON auctions(auction_date);
CREATE INDEX IF NOT EXISTS idx_auctions_status ON auctions(status);

ALTER TABLE auctions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "agents_manage_own_auctions" ON auctions
  FOR ALL TO authenticated
  USING (agent_id IN (SELECT id FROM agents WHERE user_id = auth.uid()))
  WITH CHECK (agent_id IN (SELECT id FROM agents WHERE user_id = auth.uid()));

CREATE POLICY "public_view_auction_schedule" ON auctions
  FOR SELECT TO anon, authenticated
  USING (status NOT IN ('withdrawn'));

-- ============================================================
-- AUCTION BIDDER REGISTRATIONS (new table, keeps old auction_registrations intact)
-- ============================================================
CREATE TABLE IF NOT EXISTS auction_bidder_registrations (
  id                    UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  auction_id            UUID NOT NULL REFERENCES auctions(id) ON DELETE CASCADE,
  full_name             TEXT NOT NULL,
  email                 TEXT NOT NULL,
  phone                 TEXT NOT NULL,
  address               TEXT,
  id_type               id_type NOT NULL DEFAULT 'drivers_licence',
  id_number             TEXT NOT NULL DEFAULT '',
  id_expiry             DATE,
  id_verified           BOOLEAN NOT NULL DEFAULT false,
  id_verified_by        UUID REFERENCES agents(id),
  id_verified_at        TIMESTAMPTZ,
  paddle_number         SMALLINT NOT NULL DEFAULT 0,
  is_approved           BOOLEAN NOT NULL DEFAULT false,
  approved_by           UUID REFERENCES agents(id),
  approved_at           TIMESTAMPTZ,
  registration_notes    TEXT,
  is_buying_for_self    BOOLEAN NOT NULL DEFAULT true,
  company_name          TEXT,
  solicitor_name        TEXT,
  solicitor_firm        TEXT,
  solicitor_phone       TEXT,
  has_finance_approval  BOOLEAN NOT NULL DEFAULT false,
  deposit_ready         BOOLEAN NOT NULL DEFAULT false,
  attending_online      BOOLEAN NOT NULL DEFAULT false,
  attended              BOOLEAN,
  profile_id            UUID,
  created_at            TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at            TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(auction_id, email),
  UNIQUE(auction_id, paddle_number)
);

CREATE INDEX IF NOT EXISTS idx_abr_auction ON auction_bidder_registrations(auction_id);
CREATE INDEX IF NOT EXISTS idx_abr_approved ON auction_bidder_registrations(auction_id, is_approved);

ALTER TABLE auction_bidder_registrations ENABLE ROW LEVEL SECURITY;

CREATE POLICY "agent_manage_bidder_registrations" ON auction_bidder_registrations
  FOR ALL TO authenticated
  USING (
    auction_id IN (
      SELECT a.id FROM auctions a
      JOIN agents ag ON ag.id = a.agent_id
      WHERE ag.user_id = auth.uid()
    )
  )
  WITH CHECK (
    auction_id IN (
      SELECT a.id FROM auctions a
      JOIN agents ag ON ag.id = a.agent_id
      WHERE ag.user_id = auth.uid()
    )
  );

CREATE POLICY "bidder_view_own_registration" ON auction_bidder_registrations
  FOR SELECT TO authenticated
  USING (profile_id = (SELECT id FROM profiles WHERE user_id = auth.uid() LIMIT 1));

CREATE POLICY "anyone_can_register_to_bid" ON auction_bidder_registrations
  FOR INSERT TO authenticated
  WITH CHECK (true);

-- Auto-assign paddle number
CREATE OR REPLACE FUNCTION assign_paddle_number()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  IF NEW.paddle_number IS NULL OR NEW.paddle_number = 0 THEN
    NEW.paddle_number := COALESCE(
      (SELECT MAX(paddle_number) + 1 FROM auction_bidder_registrations WHERE auction_id = NEW.auction_id),
      1
    );
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_assign_paddle
  BEFORE INSERT ON auction_bidder_registrations
  FOR EACH ROW
  EXECUTE FUNCTION assign_paddle_number();

-- ============================================================
-- AUCTION BIDS
-- ============================================================
CREATE TABLE IF NOT EXISTS auction_bids (
  id                        UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  auction_id                UUID NOT NULL REFERENCES auctions(id) ON DELETE CASCADE,
  registration_id           UUID REFERENCES auction_bidder_registrations(id),
  bid_amount                NUMERIC(12,2) NOT NULL,
  bid_type                  bid_type NOT NULL DEFAULT 'genuine',
  bid_number                INTEGER NOT NULL,
  is_winning                BOOLEAN NOT NULL DEFAULT false,
  reserve_met_at_this_bid   BOOLEAN NOT NULL DEFAULT false,
  bid_source                TEXT NOT NULL DEFAULT 'floor',
  recorded_by               UUID REFERENCES agents(id),
  bid_time                  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  notes                     TEXT,
  created_at                TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_auction_bids_auction ON auction_bids(auction_id);
CREATE INDEX IF NOT EXISTS idx_auction_bids_amount ON auction_bids(auction_id, bid_amount DESC);

ALTER TABLE auction_bids ENABLE ROW LEVEL SECURITY;

CREATE POLICY "agent_manage_bids" ON auction_bids
  FOR ALL TO authenticated
  USING (
    auction_id IN (
      SELECT a.id FROM auctions a
      JOIN agents ag ON ag.id = a.agent_id
      WHERE ag.user_id = auth.uid()
    )
  );

CREATE POLICY "public_view_bids" ON auction_bids
  FOR SELECT TO anon, authenticated
  USING (true);

-- Update auction stats after each bid
CREATE OR REPLACE FUNCTION update_auction_bid_stats()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER
SET search_path TO 'public' AS $$
BEGIN
  UPDATE auction_bids SET is_winning = false
    WHERE auction_id = NEW.auction_id AND id != NEW.id AND is_winning = true;

  UPDATE auction_bids SET is_winning = true WHERE id = NEW.id;

  UPDATE auctions SET
    last_bid_amount = NEW.bid_amount,
    total_bids = (SELECT COUNT(*) FROM auction_bids WHERE auction_id = NEW.auction_id),
    total_active_bidders = (
      SELECT COUNT(DISTINCT registration_id)
      FROM auction_bids
      WHERE auction_id = NEW.auction_id AND bid_type = 'genuine' AND registration_id IS NOT NULL
    ),
    reserve_met = (NEW.bid_amount >= COALESCE(
      (SELECT reserve_price FROM auctions WHERE id = NEW.auction_id), 0
    )),
    updated_at = NOW()
  WHERE id = NEW.auction_id;

  UPDATE auction_bids
    SET reserve_met_at_this_bid = (
      NEW.bid_amount >= COALESCE((SELECT reserve_price FROM auctions WHERE id = NEW.auction_id), 0)
    )
  WHERE id = NEW.id;

  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_update_auction_bid_stats
  AFTER INSERT ON auction_bids
  FOR EACH ROW
  EXECUTE FUNCTION update_auction_bid_stats();

-- ============================================================
-- PRE-AUCTION OFFERS
-- ============================================================
CREATE TABLE IF NOT EXISTS pre_auction_offers (
  id                    UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  property_id           UUID NOT NULL REFERENCES properties(id) ON DELETE CASCADE,
  auction_id            UUID NOT NULL REFERENCES auctions(id) ON DELETE CASCADE,
  buyer_profile_id      UUID,
  buyer_name            TEXT NOT NULL,
  buyer_email           TEXT NOT NULL,
  buyer_phone           TEXT,
  buyer_solicitor       TEXT,
  offer_amount          NUMERIC(12,2) NOT NULL,
  deposit_amount        NUMERIC(12,2),
  settlement_days       INTEGER NOT NULL DEFAULT 60,
  settlement_date       DATE,
  subject_to_finance    BOOLEAN NOT NULL DEFAULT false,
  subject_to_building   BOOLEAN NOT NULL DEFAULT false,
  conditions            TEXT,
  status                offer_status NOT NULL DEFAULT 'pending',
  expires_at            TIMESTAMPTZ NOT NULL DEFAULT (NOW() + INTERVAL '48 hours'),
  submitted_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  reviewed_at           TIMESTAMPTZ,
  reviewed_by           UUID REFERENCES agents(id),
  response_notes        TEXT,
  accepted_at           TIMESTAMPTZ,
  created_at            TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at            TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_pao_property ON pre_auction_offers(property_id);
CREATE INDEX IF NOT EXISTS idx_pao_auction ON pre_auction_offers(auction_id);
CREATE INDEX IF NOT EXISTS idx_pao_status ON pre_auction_offers(status, expires_at);

ALTER TABLE pre_auction_offers ENABLE ROW LEVEL SECURITY;

CREATE POLICY "agent_manage_offers" ON pre_auction_offers
  FOR ALL TO authenticated
  USING (
    property_id IN (
      SELECT p.id FROM properties p
      JOIN agents ag ON ag.id = p.agent_id
      WHERE ag.user_id = auth.uid()
    )
  );

CREATE POLICY "buyer_view_own_offers" ON pre_auction_offers
  FOR SELECT TO authenticated
  USING (buyer_profile_id = (SELECT id FROM profiles WHERE user_id = auth.uid() LIMIT 1));

CREATE POLICY "buyer_insert_offers" ON pre_auction_offers
  FOR INSERT TO authenticated
  WITH CHECK (true);

-- ============================================================
-- AUCTION RESULT RECORDS (new, separate from existing auction_results)
-- ============================================================
CREATE TABLE IF NOT EXISTS auction_result_records (
  id                        UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  auction_id                UUID NOT NULL UNIQUE REFERENCES auctions(id) ON DELETE CASCADE,
  property_id               UUID NOT NULL REFERENCES properties(id),
  outcome                   auction_status NOT NULL,
  sold_price                NUMERIC(12,2),
  passed_in_price           NUMERIC(12,2),
  sold_under_hammer         BOOLEAN,
  cooling_off_waived        BOOLEAN NOT NULL DEFAULT true,
  deposit_paid              BOOLEAN,
  settlement_date           DATE,
  registered_bidders        INTEGER NOT NULL DEFAULT 0,
  active_bidders            INTEGER NOT NULL DEFAULT 0,
  total_bids                INTEGER NOT NULL DEFAULT 0,
  opening_bid               NUMERIC(12,2),
  reserve_price             NUMERIC(12,2),
  winning_registration_id   UUID REFERENCES auction_bidder_registrations(id),
  vendor_first_right_buyer_id UUID REFERENCES auction_bidder_registrations(id),
  auctioneer_notes          TEXT,
  published_to_portal       BOOLEAN NOT NULL DEFAULT false,
  recorded_at               TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  recorded_by               UUID REFERENCES agents(id)
);

CREATE INDEX IF NOT EXISTS idx_arr_property ON auction_result_records(property_id);

ALTER TABLE auction_result_records ENABLE ROW LEVEL SECURITY;

CREATE POLICY "public_view_published_results" ON auction_result_records
  FOR SELECT TO anon, authenticated
  USING (published_to_portal = true);

CREATE POLICY "agent_manage_results" ON auction_result_records
  FOR ALL TO authenticated
  USING (
    property_id IN (
      SELECT p.id FROM properties p
      JOIN agents ag ON ag.id = p.agent_id
      WHERE ag.user_id = auth.uid()
    )
  );

-- ============================================================
-- AUCTION UPDATES (realtime feed)
-- ============================================================
CREATE TABLE IF NOT EXISTS auction_updates (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  auction_id      UUID NOT NULL REFERENCES auctions(id) ON DELETE CASCADE,
  update_type     TEXT NOT NULL,
  message         TEXT NOT NULL,
  bid_amount      NUMERIC(12,2),
  paddle_number   SMALLINT,
  recorded_by     UUID REFERENCES agents(id),
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_auction_updates_auction ON auction_updates(auction_id, created_at DESC);

ALTER TABLE auction_updates ENABLE ROW LEVEL SECURITY;

CREATE POLICY "public_view_updates" ON auction_updates
  FOR SELECT TO anon, authenticated
  USING (true);

CREATE POLICY "agent_insert_updates" ON auction_updates
  FOR INSERT TO authenticated
  WITH CHECK (
    auction_id IN (
      SELECT a.id FROM auctions a
      JOIN agents ag ON ag.id = a.agent_id
      WHERE ag.user_id = auth.uid()
    )
  );

-- ============================================================
-- RPCs
-- ============================================================
CREATE OR REPLACE FUNCTION get_auction_public(p_property_id UUID)
RETURNS JSON LANGUAGE plpgsql SECURITY DEFINER
SET search_path TO 'public' AS $$
DECLARE
  v_result JSON;
BEGIN
  SELECT json_build_object(
    'id', a.id,
    'property_id', a.property_id,
    'auction_date', a.auction_date,
    'auction_time', a.auction_time,
    'auction_timezone', a.auction_timezone,
    'auction_location', a.auction_location,
    'is_online', a.is_online,
    'online_platform_url', a.online_platform_url,
    'auctioneer_name', a.auctioneer_name,
    'auctioneer_firm', a.auctioneer_firm,
    'status', a.status,
    'total_registered', a.total_registered,
    'last_bid_amount', CASE WHEN a.status::text IN ('live','sold','passed_in') THEN a.last_bid_amount ELSE NULL END,
    'total_bids', CASE WHEN a.status::text IN ('live','sold','passed_in') THEN a.total_bids ELSE NULL END,
    'sold_price', CASE WHEN a.status::text IN ('sold','sold_prior','sold_after') THEN a.sold_price ELSE NULL END,
    'result', (SELECT json_build_object(
                'outcome', ar.outcome,
                'sold_price', ar.sold_price,
                'registered_bidders', ar.registered_bidders,
                'active_bidders', ar.active_bidders,
                'total_bids', ar.total_bids
              ) FROM auction_result_records ar WHERE ar.auction_id = a.id AND ar.published_to_portal = true)
  ) INTO v_result
  FROM auctions a
  WHERE a.property_id = p_property_id
    AND a.status::text NOT IN ('withdrawn')
  ORDER BY a.created_at DESC
  LIMIT 1;

  RETURN v_result;
END;
$$;

CREATE OR REPLACE FUNCTION get_live_bids(p_auction_id UUID, p_limit INTEGER DEFAULT 20)
RETURNS JSON LANGUAGE plpgsql SECURITY DEFINER
SET search_path TO 'public' AS $$
BEGIN
  RETURN (
    SELECT COALESCE(json_agg(row_to_json(b) ORDER BY b.bid_number DESC), '[]'::json)
    FROM (
      SELECT
        ab.bid_number,
        ab.bid_amount,
        ab.bid_type,
        ab.bid_source,
        ab.bid_time,
        ab.is_winning,
        ab.reserve_met_at_this_bid,
        CASE WHEN ab.bid_type::text = 'vendor' THEN 'Vendor Bid' ELSE 'Registered Bidder' END AS bidder_label
      FROM auction_bids ab
      WHERE ab.auction_id = p_auction_id
      ORDER BY ab.bid_number DESC
      LIMIT p_limit
    ) b
  );
END;
$$;

CREATE OR REPLACE FUNCTION record_auction_bid(
  p_auction_id      UUID,
  p_bid_amount      NUMERIC,
  p_bid_type        bid_type DEFAULT 'genuine',
  p_registration_id UUID DEFAULT NULL,
  p_bid_source      TEXT DEFAULT 'floor',
  p_notes           TEXT DEFAULT NULL
)
RETURNS JSON LANGUAGE plpgsql SECURITY DEFINER
SET search_path TO 'public' AS $$
DECLARE
  v_auction         auctions%ROWTYPE;
  v_bid_number      INTEGER;
  v_bid_id          UUID;
  v_agent_id        UUID;
BEGIN
  SELECT * INTO v_auction FROM auctions WHERE id = p_auction_id;

  IF v_auction.status::text != 'live' THEN
    RETURN json_build_object('success', false, 'error', 'Auction is not live');
  END IF;

  IF p_bid_amount <= COALESCE(v_auction.last_bid_amount, 0) THEN
    RETURN json_build_object('success', false, 'error', 'Bid must exceed current highest bid of ' || COALESCE(v_auction.last_bid_amount, 0));
  END IF;

  IF p_bid_type = 'genuine' AND p_registration_id IS NOT NULL THEN
    IF NOT EXISTS (
      SELECT 1 FROM auction_bidder_registrations
      WHERE id = p_registration_id AND auction_id = p_auction_id AND is_approved = true
    ) THEN
      RETURN json_build_object('success', false, 'error', 'Bidder is not approved for this auction');
    END IF;
  END IF;

  SELECT id INTO v_agent_id FROM agents WHERE user_id = auth.uid() LIMIT 1;

  v_bid_number := COALESCE((SELECT MAX(bid_number) FROM auction_bids WHERE auction_id = p_auction_id), 0) + 1;

  INSERT INTO auction_bids (
    auction_id, registration_id, bid_amount, bid_type, bid_number, bid_source, recorded_by, notes
  ) VALUES (
    p_auction_id, p_registration_id, p_bid_amount, p_bid_type, v_bid_number,
    p_bid_source, v_agent_id, p_notes
  ) RETURNING id INTO v_bid_id;

  INSERT INTO auction_updates (auction_id, update_type, message, bid_amount, recorded_by)
  VALUES (
    p_auction_id,
    CASE p_bid_type::text WHEN 'vendor' THEN 'vendor_bid' ELSE 'bid' END,
    CASE p_bid_type::text
      WHEN 'vendor' THEN 'Vendor bid of $' || TO_CHAR(p_bid_amount, 'FM999,999,999')
      ELSE 'Bid $' || TO_CHAR(p_bid_amount, 'FM999,999,999')
    END,
    p_bid_amount,
    v_agent_id
  );

  RETURN json_build_object('success', true, 'bid_id', v_bid_id, 'bid_number', v_bid_number);
END;
$$;

CREATE OR REPLACE FUNCTION conclude_auction(
  p_auction_id        UUID,
  p_outcome           auction_status,
  p_sold_price        NUMERIC DEFAULT NULL,
  p_winning_reg_id    UUID DEFAULT NULL,
  p_notes             TEXT DEFAULT NULL
)
RETURNS JSON LANGUAGE plpgsql SECURITY DEFINER
SET search_path TO 'public' AS $$
DECLARE
  v_auction   auctions%ROWTYPE;
  v_agent_id  UUID;
BEGIN
  SELECT * INTO v_auction FROM auctions WHERE id = p_auction_id;

  IF v_auction.status::text != 'live' THEN
    RETURN json_build_object('success', false, 'error', 'Auction is not live');
  END IF;

  SELECT id INTO v_agent_id FROM agents WHERE user_id = auth.uid() LIMIT 1;

  UPDATE auctions SET
    status          = p_outcome,
    sold_price      = CASE WHEN p_outcome::text = 'sold' THEN p_sold_price ELSE NULL END,
    passed_in_price = CASE WHEN p_outcome::text = 'passed_in' THEN v_auction.last_bid_amount ELSE NULL END,
    sold_at         = CASE WHEN p_outcome::text = 'sold' THEN NOW() ELSE NULL END,
    notes           = p_notes,
    updated_at      = NOW()
  WHERE id = p_auction_id;

  INSERT INTO auction_result_records (
    auction_id, property_id, outcome, sold_price, passed_in_price,
    sold_under_hammer, registered_bidders, active_bidders, total_bids,
    opening_bid, reserve_price, winning_registration_id,
    vendor_first_right_buyer_id, auctioneer_notes, recorded_by
  ) VALUES (
    p_auction_id,
    v_auction.property_id,
    p_outcome,
    CASE WHEN p_outcome::text = 'sold' THEN p_sold_price ELSE NULL END,
    CASE WHEN p_outcome::text = 'passed_in' THEN v_auction.last_bid_amount ELSE NULL END,
    p_outcome::text = 'sold',
    v_auction.total_registered,
    v_auction.total_active_bidders,
    v_auction.total_bids,
    (SELECT MIN(bid_amount) FROM auction_bids WHERE auction_id = p_auction_id),
    v_auction.reserve_price,
    p_winning_reg_id,
    CASE WHEN p_outcome::text = 'passed_in' THEN
      (SELECT registration_id FROM auction_bids WHERE auction_id = p_auction_id AND bid_type = 'genuine' ORDER BY bid_amount DESC LIMIT 1)
    ELSE NULL END,
    p_notes,
    v_agent_id
  );

  UPDATE properties SET
    status = CASE WHEN p_outcome::text = 'sold' THEN 'sold' ELSE status END,
    sold_price = CASE WHEN p_outcome::text = 'sold' THEN p_sold_price ELSE sold_price END,
    sold_at = CASE WHEN p_outcome::text = 'sold' THEN NOW() ELSE sold_at END
  WHERE id = v_auction.property_id;

  INSERT INTO auction_updates (auction_id, update_type, message, bid_amount, recorded_by)
  VALUES (
    p_auction_id,
    CASE p_outcome::text WHEN 'sold' THEN 'sold' ELSE 'passed_in' END,
    CASE p_outcome::text
      WHEN 'sold' THEN 'SOLD! $' || TO_CHAR(p_sold_price, 'FM999,999,999') || ' — Under the hammer'
      ELSE 'Passed in at $' || TO_CHAR(v_auction.last_bid_amount, 'FM999,999,999')
    END,
    CASE p_outcome::text WHEN 'sold' THEN p_sold_price ELSE v_auction.last_bid_amount END,
    v_agent_id
  );

  RETURN json_build_object('success', true, 'outcome', p_outcome);
END;
$$;

-- Registration count trigger
CREATE OR REPLACE FUNCTION update_auction_registration_count()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER
SET search_path TO 'public' AS $$
BEGIN
  UPDATE auctions SET
    total_registered = (SELECT COUNT(*) FROM auction_bidder_registrations WHERE auction_id = NEW.auction_id AND is_approved = true),
    updated_at = NOW()
  WHERE id = NEW.auction_id;
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_update_reg_count
  AFTER INSERT OR UPDATE ON auction_bidder_registrations
  FOR EACH ROW
  EXECUTE FUNCTION update_auction_registration_count();

-- Enable Realtime
ALTER PUBLICATION supabase_realtime ADD TABLE auction_bids;
ALTER PUBLICATION supabase_realtime ADD TABLE auction_updates;
ALTER PUBLICATION supabase_realtime ADD TABLE auctions;
