
-- Add price guide columns to properties
ALTER TABLE public.properties
  ADD COLUMN IF NOT EXISTS price_guide_low numeric(12,0),
  ADD COLUMN IF NOT EXISTS price_guide_high numeric(12,0),
  ADD COLUMN IF NOT EXISTS listing_status text DEFAULT 'active';

-- Suburb auction stats (materialised weekly)
CREATE TABLE IF NOT EXISTS public.suburb_auction_stats (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  suburb          text NOT NULL,
  state           text NOT NULL,
  postcode        text,
  period_end      date NOT NULL,
  total_auctions  integer DEFAULT 0,
  cleared         integer DEFAULT 0,
  withdrawn       integer DEFAULT 0,
  passed_in       integer DEFAULT 0,
  clearance_rate  numeric(5,2),
  median_price    numeric(12,0),
  sample_size     integer DEFAULT 0,
  created_at      timestamptz DEFAULT now(),
  UNIQUE(suburb, state, period_end)
);

CREATE INDEX IF NOT EXISTS idx_suburb_stats_location ON public.suburb_auction_stats(suburb, state);
CREATE INDEX IF NOT EXISTS idx_suburb_stats_period   ON public.suburb_auction_stats(period_end DESC);

-- Price guide revision history
CREATE TABLE IF NOT EXISTS public.price_guide_history (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  property_id     uuid REFERENCES public.properties(id) ON DELETE CASCADE,
  price_low       numeric(12,0),
  price_high      numeric(12,0),
  changed_at      timestamptz DEFAULT now(),
  changed_by      uuid,
  note            text
);

CREATE INDEX IF NOT EXISTS idx_price_history_property ON public.price_guide_history(property_id, changed_at DESC);

-- Auction registrations
CREATE TABLE IF NOT EXISTS public.auction_registrations (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  property_id     uuid REFERENCES public.properties(id) ON DELETE CASCADE,
  user_id         uuid,
  name            text NOT NULL,
  email           text NOT NULL,
  phone           text,
  registered_at   timestamptz DEFAULT now(),
  attended        boolean DEFAULT false,
  bid_amount      numeric(12,0),
  UNIQUE(property_id, email)
);

CREATE INDEX IF NOT EXISTS idx_auction_regs_property ON public.auction_registrations(property_id);

-- Auction results
CREATE TABLE IF NOT EXISTS public.auction_results (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  property_id     uuid REFERENCES public.properties(id) ON DELETE CASCADE,
  result          text NOT NULL,
  sold_price      numeric(12,0),
  reserve_met     boolean,
  num_bidders     integer,
  auction_date    timestamptz,
  recorded_at     timestamptz DEFAULT now(),
  recorded_by     uuid
);

CREATE INDEX IF NOT EXISTS idx_auction_results_property ON public.auction_results(property_id);
CREATE INDEX IF NOT EXISTS idx_auction_results_date     ON public.auction_results(auction_date DESC);

-- RLS
ALTER TABLE public.suburb_auction_stats   ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.price_guide_history    ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.auction_registrations  ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.auction_results        ENABLE ROW LEVEL SECURITY;

-- Public reads
CREATE POLICY "suburb_stats_public"     ON public.suburb_auction_stats  FOR SELECT USING (true);
CREATE POLICY "price_history_public"    ON public.price_guide_history   FOR SELECT USING (true);
CREATE POLICY "auction_results_public"  ON public.auction_results       FOR SELECT USING (true);

-- Auction registrations: owner reads own, agent reads for their listings
CREATE POLICY "auction_reg_owner_read"  ON public.auction_registrations FOR SELECT USING (
  auth.uid() = user_id OR
  EXISTS (SELECT 1 FROM public.agents a JOIN public.properties p ON p.agent_id = a.id WHERE p.id = property_id AND a.user_id = auth.uid())
);
CREATE POLICY "auction_reg_insert"      ON public.auction_registrations FOR INSERT WITH CHECK (true);
CREATE POLICY "auction_reg_agent_update" ON public.auction_registrations FOR UPDATE USING (
  EXISTS (SELECT 1 FROM public.agents a JOIN public.properties p ON p.agent_id = a.id WHERE p.id = property_id AND a.user_id = auth.uid())
);

-- Price guide: agent inserts for their listing
CREATE POLICY "price_history_agent_insert" ON public.price_guide_history FOR INSERT WITH CHECK (
  EXISTS (SELECT 1 FROM public.agents a JOIN public.properties p ON p.agent_id = a.id WHERE p.id = property_id AND a.user_id = auth.uid())
);

-- Auction results: agent inserts for their listing
CREATE POLICY "auction_result_agent_insert" ON public.auction_results FOR INSERT WITH CHECK (
  EXISTS (SELECT 1 FROM public.agents a JOIN public.properties p ON p.agent_id = a.id WHERE p.id = property_id AND a.user_id = auth.uid())
);

-- Trigger: log price guide changes
CREATE OR REPLACE FUNCTION public.log_price_guide_change()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public' AS $$
BEGIN
  IF (OLD.price_guide_low IS DISTINCT FROM NEW.price_guide_low)
  OR (OLD.price_guide_high IS DISTINCT FROM NEW.price_guide_high) THEN
    INSERT INTO public.price_guide_history (property_id, price_low, price_high, changed_by)
    VALUES (NEW.id, NEW.price_guide_low, NEW.price_guide_high, auth.uid());
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER on_price_guide_update
  AFTER UPDATE OF price_guide_low, price_guide_high ON public.properties
  FOR EACH ROW EXECUTE FUNCTION public.log_price_guide_change();

-- Validation trigger for auction_results.result
CREATE OR REPLACE FUNCTION public.validate_auction_result()
RETURNS trigger LANGUAGE plpgsql SET search_path TO 'public' AS $$
BEGIN
  IF NEW.result NOT IN ('sold_at_auction','sold_prior','passed_in','withdrawn') THEN
    RAISE EXCEPTION 'Invalid auction result: %', NEW.result;
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_validate_auction_result
  BEFORE INSERT OR UPDATE ON public.auction_results
  FOR EACH ROW EXECUTE FUNCTION public.validate_auction_result();
