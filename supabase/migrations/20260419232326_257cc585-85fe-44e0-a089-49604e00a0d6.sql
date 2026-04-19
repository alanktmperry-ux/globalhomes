-- Buyer intent: structured intent extracted from buyer search sessions
CREATE TABLE public.buyer_intent (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  buyer_id uuid REFERENCES auth.users(id) ON DELETE CASCADE,
  session_id text,
  raw_query text,
  suburbs text[],
  min_price integer,
  max_price integer,
  bedrooms integer,
  bathrooms integer,
  property_types text[],
  features text[],
  lifestyle_keywords text[],
  intent_summary text,
  search_count integer DEFAULT 1,
  calculator_used boolean DEFAULT false,
  listings_saved integer DEFAULT 0,
  suburb_narrowing boolean DEFAULT false,
  readiness_score integer DEFAULT 0,
  last_searched_at timestamptz DEFAULT now(),
  created_at timestamptz DEFAULT now()
);

CREATE INDEX buyer_intent_suburbs_idx ON public.buyer_intent USING GIN (suburbs);
CREATE INDEX buyer_intent_readiness_idx ON public.buyer_intent (readiness_score DESC);
CREATE INDEX buyer_intent_buyer_id_idx ON public.buyer_intent (buyer_id);
CREATE INDEX buyer_intent_session_idx ON public.buyer_intent (session_id);

ALTER TABLE public.buyer_intent ENABLE ROW LEVEL SECURITY;

-- Buyers manage their own rows
CREATE POLICY "Buyers can view their own intent"
  ON public.buyer_intent FOR SELECT
  USING (auth.uid() = buyer_id);

CREATE POLICY "Buyers can insert their own intent"
  ON public.buyer_intent FOR INSERT
  WITH CHECK (auth.uid() = buyer_id OR buyer_id IS NULL);

CREATE POLICY "Buyers can update their own intent"
  ON public.buyer_intent FOR UPDATE
  USING (auth.uid() = buyer_id);

CREATE POLICY "Buyers can delete their own intent"
  ON public.buyer_intent FOR DELETE
  USING (auth.uid() = buyer_id);

-- Agents can read all rows for matching (uses existing agents table)
CREATE POLICY "Agents can view all buyer intent"
  ON public.buyer_intent FOR SELECT
  USING (EXISTS (SELECT 1 FROM public.agents WHERE user_id = auth.uid()));


-- Listing-buyer matches: Claude's match scores
CREATE TABLE public.listing_buyer_matches (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  listing_id uuid REFERENCES public.properties(id) ON DELETE CASCADE,
  buyer_intent_id uuid REFERENCES public.buyer_intent(id) ON DELETE CASCADE,
  buyer_id uuid REFERENCES auth.users(id) ON DELETE CASCADE,
  agent_id uuid REFERENCES public.agents(id) ON DELETE CASCADE,
  match_score integer,
  match_reasoning text,
  readiness_score integer,
  status text DEFAULT 'new',
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

CREATE INDEX matches_listing_idx ON public.listing_buyer_matches (listing_id);
CREATE INDEX matches_agent_idx ON public.listing_buyer_matches (agent_id);
CREATE INDEX matches_score_idx ON public.listing_buyer_matches (match_score DESC);
CREATE INDEX matches_buyer_idx ON public.listing_buyer_matches (buyer_id);

ALTER TABLE public.listing_buyer_matches ENABLE ROW LEVEL SECURITY;

-- Only the owning agent can read; buyers cannot
CREATE POLICY "Agents can view their own matches"
  ON public.listing_buyer_matches FOR SELECT
  USING (EXISTS (SELECT 1 FROM public.agents WHERE id = listing_buyer_matches.agent_id AND user_id = auth.uid()));

CREATE POLICY "Agents can update their own matches"
  ON public.listing_buyer_matches FOR UPDATE
  USING (EXISTS (SELECT 1 FROM public.agents WHERE id = listing_buyer_matches.agent_id AND user_id = auth.uid()));

-- Trigger to keep updated_at fresh
CREATE TRIGGER update_listing_buyer_matches_updated_at
  BEFORE UPDATE ON public.listing_buyer_matches
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();


-- Buyer activity events: tracks behaviour for readiness scoring
CREATE TABLE public.buyer_activity_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  buyer_id uuid REFERENCES auth.users(id) ON DELETE CASCADE,
  event_type text,
  listing_id uuid,
  metadata jsonb,
  created_at timestamptz DEFAULT now()
);

CREATE INDEX activity_buyer_idx ON public.buyer_activity_events (buyer_id, created_at DESC);
CREATE INDEX activity_event_type_idx ON public.buyer_activity_events (event_type);

ALTER TABLE public.buyer_activity_events ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Buyers can insert their own events"
  ON public.buyer_activity_events FOR INSERT
  WITH CHECK (auth.uid() = buyer_id OR buyer_id IS NULL);

CREATE POLICY "Buyers can view their own events"
  ON public.buyer_activity_events FOR SELECT
  USING (auth.uid() = buyer_id);

CREATE POLICY "Agents can view all activity events"
  ON public.buyer_activity_events FOR SELECT
  USING (EXISTS (SELECT 1 FROM public.agents WHERE user_id = auth.uid()));