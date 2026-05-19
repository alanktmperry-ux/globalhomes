-- =========================================================================
-- HALO THREE-STAGE ENGINE — PHASE A (FOUNDATION)
-- =========================================================================

-- Enable pgvector for Stage 3 semantic matching (used later)
CREATE EXTENSION IF NOT EXISTS vector;

-- -------------------------------------------------------------------------
-- 1. Column additions to existing tables
-- -------------------------------------------------------------------------
ALTER TABLE public.halos
  ADD COLUMN IF NOT EXISTS last_match_computed_at timestamptz,
  ADD COLUMN IF NOT EXISTS heat_score numeric(5,2);

ALTER TABLE public.halo_responses
  ADD COLUMN IF NOT EXISTS outcome text
    CHECK (outcome IS NULL OR outcome IN ('meeting_booked','not_interested','offer_made','unresponsive'));

-- -------------------------------------------------------------------------
-- 2. halo_matches — materialized match records
-- -------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.halo_matches (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  halo_id         uuid NOT NULL REFERENCES public.halos(id) ON DELETE CASCADE,
  match_kind      text NOT NULL CHECK (match_kind IN ('listing','agent')),
  listing_id      uuid REFERENCES public.properties(id) ON DELETE CASCADE,
  agent_id        uuid REFERENCES auth.users(id) ON DELETE CASCADE,
  hard_score      numeric(5,2) NOT NULL DEFAULT 0,
  semantic_score  numeric(5,2),
  combined_score  numeric(5,2) NOT NULL DEFAULT 0,
  reasons         jsonb NOT NULL DEFAULT '[]'::jsonb,
  stale           boolean NOT NULL DEFAULT false,
  computed_at     timestamptz NOT NULL DEFAULT now(),
  created_at      timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT halo_matches_kind_target_check CHECK (
    (match_kind = 'listing' AND listing_id IS NOT NULL AND agent_id IS NULL) OR
    (match_kind = 'agent'   AND agent_id   IS NOT NULL AND listing_id IS NULL)
  )
);

CREATE INDEX IF NOT EXISTS idx_halo_matches_halo_score
  ON public.halo_matches (halo_id, combined_score DESC);
CREATE INDEX IF NOT EXISTS idx_halo_matches_agent_score
  ON public.halo_matches (agent_id, combined_score DESC)
  WHERE match_kind = 'agent';
CREATE INDEX IF NOT EXISTS idx_halo_matches_stale
  ON public.halo_matches (halo_id) WHERE stale = true;
CREATE UNIQUE INDEX IF NOT EXISTS uniq_halo_match_listing
  ON public.halo_matches (halo_id, listing_id) WHERE match_kind = 'listing';
CREATE UNIQUE INDEX IF NOT EXISTS uniq_halo_match_agent
  ON public.halo_matches (halo_id, agent_id) WHERE match_kind = 'agent';

ALTER TABLE public.halo_matches ENABLE ROW LEVEL SECURITY;

-- -------------------------------------------------------------------------
-- 3. halo_events — append-only audit log
-- -------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.halo_events (
  id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  halo_id      uuid NOT NULL REFERENCES public.halos(id) ON DELETE CASCADE,
  actor_id     uuid,
  actor_role   text NOT NULL CHECK (actor_role IN ('seeker','agent','system','admin')),
  event_type   text NOT NULL,
  payload      jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at   timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_halo_events_halo_created
  ON public.halo_events (halo_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_halo_events_actor
  ON public.halo_events (actor_id) WHERE actor_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_halo_events_type
  ON public.halo_events (event_type);

ALTER TABLE public.halo_events ENABLE ROW LEVEL SECURITY;

-- Block direct mutations from clients; all writes go through log_halo_event()
CREATE POLICY "halo_events_admin_read"
  ON public.halo_events FOR SELECT
  USING (has_role(auth.uid(), 'admin'::app_role));

-- -------------------------------------------------------------------------
-- 4. halo_embeddings — pgvector store
-- -------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.halo_embeddings (
  halo_id        uuid PRIMARY KEY REFERENCES public.halos(id) ON DELETE CASCADE,
  embedding      vector(1536) NOT NULL,
  source_hash    text NOT NULL,
  model_version  text NOT NULL DEFAULT 'openai/text-embedding-3-small',
  updated_at     timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_halo_embeddings_vec
  ON public.halo_embeddings USING hnsw (embedding vector_cosine_ops);

ALTER TABLE public.halo_embeddings ENABLE ROW LEVEL SECURITY;
-- No policies = service-role only

-- -------------------------------------------------------------------------
-- 5. Security-definer helper: log_halo_event
-- -------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.log_halo_event(
  _halo_id     uuid,
  _actor_id    uuid,
  _actor_role  text,
  _event_type  text,
  _payload     jsonb DEFAULT '{}'::jsonb
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _event_id uuid;
BEGIN
  INSERT INTO public.halo_events (halo_id, actor_id, actor_role, event_type, payload)
  VALUES (_halo_id, _actor_id, _actor_role, _event_type, COALESCE(_payload, '{}'::jsonb))
  RETURNING id INTO _event_id;
  RETURN _event_id;
END;
$$;

-- -------------------------------------------------------------------------
-- 6. RLS helper RPCs for halo_matches (avoid cross-table policies)
-- -------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.agent_can_see_halo_match(_halo_id uuid, _agent_id uuid)
RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.halo_responses
    WHERE halo_id = _halo_id AND agent_id = _agent_id
  );
$$;

CREATE OR REPLACE FUNCTION public.seeker_owns_halo(_halo_id uuid, _user_id uuid)
RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.halos WHERE id = _halo_id AND seeker_id = _user_id
  );
$$;

CREATE POLICY "halo_matches_admin_all"
  ON public.halo_matches FOR ALL
  USING (has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "halo_matches_seeker_read_own"
  ON public.halo_matches FOR SELECT
  USING (public.seeker_owns_halo(halo_id, auth.uid()));

CREATE POLICY "halo_matches_agent_read_targeted"
  ON public.halo_matches FOR SELECT
  USING (
    match_kind = 'agent' AND agent_id = auth.uid()
    OR public.agent_can_see_halo_match(halo_id, auth.uid())
  );

-- -------------------------------------------------------------------------
-- 7. Transactional unlock_halo RPC
-- -------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.unlock_halo(_halo_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _agent_id    uuid := auth.uid();
  _balance     integer;
  _halo_status text;
  _existing    uuid;
  _response_id uuid;
BEGIN
  IF _agent_id IS NULL THEN
    RAISE EXCEPTION 'Not authenticated' USING ERRCODE = '42501';
  END IF;

  -- Halo must exist and be active
  SELECT status INTO _halo_status FROM public.halos WHERE id = _halo_id;
  IF _halo_status IS NULL THEN
    RAISE EXCEPTION 'Halo not found' USING ERRCODE = 'P0002';
  END IF;
  IF _halo_status <> 'active' THEN
    RAISE EXCEPTION 'Halo is not active (status=%)', _halo_status USING ERRCODE = 'P0001';
  END IF;

  -- Idempotency: if already unlocked, return the existing response
  SELECT id INTO _existing
  FROM public.halo_responses
  WHERE halo_id = _halo_id AND agent_id = _agent_id;
  IF _existing IS NOT NULL THEN
    RETURN jsonb_build_object('response_id', _existing, 'already_unlocked', true);
  END IF;

  -- Lock the credit row and check balance
  SELECT balance INTO _balance
  FROM public.halo_credits
  WHERE agent_id = _agent_id
  FOR UPDATE;

  IF _balance IS NULL OR _balance < 1 THEN
    RAISE EXCEPTION 'Insufficient credits' USING ERRCODE = 'P0001';
  END IF;

  -- Deduct credit
  UPDATE public.halo_credits
  SET balance = balance - 1, updated_at = now()
  WHERE agent_id = _agent_id;

  -- Record transaction
  INSERT INTO public.halo_credit_transactions (agent_id, amount, type, halo_id, note)
  VALUES (_agent_id, -1, 'spend', _halo_id, 'Halo unlock');

  -- Create response
  INSERT INTO public.halo_responses (halo_id, agent_id)
  VALUES (_halo_id, _agent_id)
  RETURNING id INTO _response_id;

  -- Audit event
  PERFORM public.log_halo_event(
    _halo_id, _agent_id, 'agent', 'unlocked',
    jsonb_build_object('response_id', _response_id, 'credits_spent', 1)
  );

  RETURN jsonb_build_object('response_id', _response_id, 'already_unlocked', false);
END;
$$;

-- -------------------------------------------------------------------------
-- 8. Admin-only refund RPC
-- -------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.refund_halo_unlock(_response_id uuid, _reason text)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _admin_id uuid := auth.uid();
  _halo_id  uuid;
  _agent_id uuid;
BEGIN
  IF NOT has_role(_admin_id, 'admin'::app_role) THEN
    RAISE EXCEPTION 'Admin only' USING ERRCODE = '42501';
  END IF;

  SELECT halo_id, agent_id INTO _halo_id, _agent_id
  FROM public.halo_responses WHERE id = _response_id;

  IF _halo_id IS NULL THEN
    RAISE EXCEPTION 'Response not found' USING ERRCODE = 'P0002';
  END IF;

  -- Compensating credit
  UPDATE public.halo_credits
  SET balance = balance + 1, updated_at = now()
  WHERE agent_id = _agent_id;

  INSERT INTO public.halo_credit_transactions (agent_id, amount, type, halo_id, note)
  VALUES (_agent_id, 1, 'refund', _halo_id, COALESCE(_reason, 'Admin refund'));

  -- Remove the response so the agent can re-unlock cleanly if needed
  DELETE FROM public.halo_responses WHERE id = _response_id;

  PERFORM public.log_halo_event(
    _halo_id, _admin_id, 'admin', 'refunded',
    jsonb_build_object('response_id', _response_id, 'agent_id', _agent_id, 'reason', _reason)
  );

  RETURN jsonb_build_object('ok', true);
END;
$$;

-- -------------------------------------------------------------------------
-- 9. Auto-emit lifecycle events from halos table
-- -------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.halos_emit_lifecycle_event()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    PERFORM public.log_halo_event(NEW.id, NEW.seeker_id, 'seeker', 'created', '{}'::jsonb);
  ELSIF TG_OP = 'UPDATE' THEN
    IF NEW.status IS DISTINCT FROM OLD.status THEN
      PERFORM public.log_halo_event(
        NEW.id, COALESCE(auth.uid(), NEW.seeker_id), 'seeker',
        'status_changed',
        jsonb_build_object('from', OLD.status, 'to', NEW.status)
      );
    END IF;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_halos_lifecycle ON public.halos;
CREATE TRIGGER trg_halos_lifecycle
  AFTER INSERT OR UPDATE ON public.halos
  FOR EACH ROW EXECUTE FUNCTION public.halos_emit_lifecycle_event();