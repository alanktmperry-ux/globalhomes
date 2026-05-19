
-- =========================================================================
-- PHASE B: HALO MATCH ENGINE
-- =========================================================================

-- -------------------------------------------------------------------------
-- 1. MATCH ENGINE: compute_halo_matches(halo_id)
-- -------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.compute_halo_matches(p_halo_id uuid)
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_halo halos%ROWTYPE;
  v_inserted integer := 0;
BEGIN
  SELECT * INTO v_halo FROM halos WHERE id = p_halo_id;
  IF NOT FOUND OR v_halo.status <> 'active' THEN
    RETURN 0;
  END IF;

  -- Mark existing matches stale; we'll upsert fresh rows
  UPDATE halo_matches SET stale = true
    WHERE halo_id = p_halo_id AND match_kind = 'agent';

  -- Compute new matches
  WITH eligible_agents AS (
    SELECT a.user_id, a.id AS agent_row_id
    FROM agents a
    WHERE a.approval_status = 'approved'
      AND a.is_subscribed = true
      AND a.user_id <> v_halo.seeker_id
      AND NOT EXISTS (
        SELECT 1 FROM halo_responses hr
        WHERE hr.halo_id = p_halo_id AND hr.agent_id = a.user_id
      )
      AND EXISTS (
        SELECT 1 FROM properties p
        WHERE p.agent_id = a.id
          AND p.created_at > now() - interval '24 months'
      )
  ),
  agent_stats AS (
    SELECT
      ea.user_id,
      ea.agent_row_id,
      -- Suburb match: count of listings in halo suburbs (lowercased)
      COALESCE((
        SELECT count(*)::int FROM properties p
        WHERE p.agent_id = ea.agent_row_id
          AND lower(p.suburb) = ANY (
            SELECT lower(s) FROM unnest(v_halo.suburbs) s
          )
      ), 0) AS suburb_hits,
      -- Total active listings
      COALESCE((
        SELECT count(*)::int FROM properties p
        WHERE p.agent_id = ea.agent_row_id AND p.is_active = true
      ), 0) AS active_listings,
      -- Price-band match (within ±25%)
      COALESCE((
        SELECT count(*)::int FROM properties p
        WHERE p.agent_id = ea.agent_row_id
          AND p.price BETWEEN
            COALESCE(v_halo.budget_min, v_halo.budget_max * 0.5) * 0.75
            AND v_halo.budget_max * 1.25
      ), 0) AS price_hits,
      -- Property type match
      COALESCE((
        SELECT count(*)::int FROM properties p
        WHERE p.agent_id = ea.agent_row_id
          AND (cardinality(v_halo.property_types) = 0
               OR p.property_type = ANY (v_halo.property_types))
      ), 0) AS type_hits,
      -- Language match
      EXISTS (
        SELECT 1 FROM agent_language_capabilities alc
        WHERE alc.agent_id = ea.agent_row_id
          AND lower(alc.language_code) = lower(v_halo.preferred_language)
      ) AS has_language,
      -- Performance stats
      (SELECT response_rate FROM agent_performance_stats
        WHERE agent_id = ea.agent_row_id) AS response_rate
    FROM eligible_agents ea
  ),
  scored AS (
    SELECT
      user_id,
      -- 0..30 suburb (saturates at 5 hits)
      LEAST(suburb_hits, 5) * 6.0 AS suburb_score,
      -- 0..20 price (saturates at 5 hits)
      LEAST(price_hits, 5) * 4.0 AS price_score,
      -- 0..15 type (saturates at 5 hits)
      LEAST(type_hits, 5) * 3.0 AS type_score,
      -- 0..15 response quality
      COALESCE(response_rate, 50) * 0.15 AS response_score,
      -- 0..10 volume (log scale)
      LEAST(ln(GREATEST(active_listings, 1) + 1) * 3.5, 10.0) AS volume_score,
      -- 0..10 language
      CASE WHEN has_language THEN 10.0 ELSE 0.0 END AS language_score,
      suburb_hits, price_hits, type_hits, has_language, active_listings, response_rate
    FROM agent_stats
  ),
  final AS (
    SELECT
      user_id,
      ROUND((suburb_score + price_score + type_score
             + response_score + volume_score + language_score)::numeric, 2) AS combined,
      jsonb_strip_nulls(jsonb_build_array(
        CASE WHEN suburb_hits > 0 THEN to_jsonb(
          format('%s listing%s in your wish-list suburbs',
                 suburb_hits, CASE WHEN suburb_hits = 1 THEN '' ELSE 's' END)
        ) END,
        CASE WHEN price_hits > 0 THEN to_jsonb(
          format('%s deal%s in this price band', price_hits,
                 CASE WHEN price_hits = 1 THEN '' ELSE 's' END)
        ) END,
        CASE WHEN type_hits > 0 AND cardinality(v_halo.property_types) > 0 THEN to_jsonb(
          format('Specialises in %s', array_to_string(v_halo.property_types, ', '))
        ) END,
        CASE WHEN has_language AND v_halo.preferred_language <> 'english' THEN to_jsonb(
          format('Speaks %s', v_halo.preferred_language)
        ) END,
        CASE WHEN response_rate >= 80 THEN to_jsonb(
          format('%s%% response rate', ROUND(response_rate))
        ) END
      )) AS reasons
    FROM scored
  )
  INSERT INTO halo_matches (
    halo_id, match_kind, agent_id, hard_score, combined_score, reasons, stale, computed_at
  )
  SELECT p_halo_id, 'agent', user_id, combined, combined, reasons, false, now()
  FROM final
  WHERE combined > 0
  ON CONFLICT (halo_id, agent_id) WHERE match_kind = 'agent'
  DO UPDATE SET
    combined_score = EXCLUDED.combined_score,
    hard_score = EXCLUDED.hard_score,
    reasons = EXCLUDED.reasons,
    stale = false,
    computed_at = now();

  GET DIAGNOSTICS v_inserted = ROW_COUNT;

  -- Update halo timestamp
  UPDATE halos SET last_match_computed_at = now() WHERE id = p_halo_id;

  -- Log
  INSERT INTO halo_events (halo_id, event_type, payload)
  VALUES (p_halo_id, 'matches_computed',
          jsonb_build_object('count', v_inserted, 'at', now()));

  RETURN v_inserted;
END;
$$;

-- -------------------------------------------------------------------------
-- 2. TRIGGER: recompute on halo create / material change
-- -------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.trg_halos_recompute_matches()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    PERFORM compute_halo_matches(NEW.id);
  ELSIF TG_OP = 'UPDATE' AND (
       NEW.status <> OLD.status
    OR NEW.budget_min IS DISTINCT FROM OLD.budget_min
    OR NEW.budget_max IS DISTINCT FROM OLD.budget_max
    OR NEW.suburbs IS DISTINCT FROM OLD.suburbs
    OR NEW.property_types IS DISTINCT FROM OLD.property_types
    OR NEW.intent IS DISTINCT FROM OLD.intent
    OR NEW.preferred_language IS DISTINCT FROM OLD.preferred_language
  ) THEN
    PERFORM compute_halo_matches(NEW.id);
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_halos_recompute_matches ON public.halos;
CREATE TRIGGER trg_halos_recompute_matches
AFTER INSERT OR UPDATE ON public.halos
FOR EACH ROW EXECUTE FUNCTION public.trg_halos_recompute_matches();

-- -------------------------------------------------------------------------
-- 3. HEAT SCORE: predictive unlock probability (agent-facing only)
--    Formula: clamp(unlocks*10 + bookings*25 + views*1, 0, 100)
-- -------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.recompute_halo_heat(p_halo_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_unlocks int;
  v_bookings int;
  v_views int;
  v_heat numeric;
BEGIN
  SELECT count(*)::int,
         count(*) FILTER (WHERE outcome = 'meeting_booked')::int
    INTO v_unlocks, v_bookings
  FROM halo_responses WHERE halo_id = p_halo_id;

  SELECT COALESCE(count(*), 0)::int INTO v_views
  FROM halo_events
  WHERE halo_id = p_halo_id AND event_type = 'agent_viewed';

  v_heat := LEAST(v_unlocks * 10 + v_bookings * 25 + v_views, 100)::numeric;

  UPDATE halos SET heat_score = v_heat WHERE id = p_halo_id;
END;
$$;

CREATE OR REPLACE FUNCTION public.trg_halo_responses_heat()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  PERFORM recompute_halo_heat(COALESCE(NEW.halo_id, OLD.halo_id));
  RETURN COALESCE(NEW, OLD);
END;
$$;

DROP TRIGGER IF EXISTS trg_halo_responses_heat ON public.halo_responses;
CREATE TRIGGER trg_halo_responses_heat
AFTER INSERT OR UPDATE OR DELETE ON public.halo_responses
FOR EACH ROW EXECUTE FUNCTION public.trg_halo_responses_heat();

-- -------------------------------------------------------------------------
-- 4. AUTO-REFUND: 48h unresponsive seekers
-- -------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.auto_refund_unresponsive_halo_unlocks()
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_count int := 0;
  r record;
BEGIN
  FOR r IN
    SELECT hr.id, hr.halo_id, hr.agent_id
    FROM halo_responses hr
    WHERE hr.unlocked_at < now() - interval '48 hours'
      AND hr.viewed_by_seeker = false
      AND (hr.outcome IS NULL OR hr.outcome = 'unresponsive')
      AND NOT EXISTS (
        SELECT 1 FROM halo_credit_transactions hct
        WHERE hct.halo_id = hr.halo_id
          AND hct.user_id = hr.agent_id
          AND hct.transaction_type = 'refund'
          AND hct.metadata->>'reason' = 'auto_unresponsive_48h'
      )
  LOOP
    -- Mark response as unresponsive
    UPDATE halo_responses
      SET outcome = 'unresponsive'
      WHERE id = r.id AND outcome IS NULL;

    -- Issue refund transaction (positive credits back)
    INSERT INTO halo_credit_transactions (
      user_id, halo_id, transaction_type, credits_delta, metadata
    )
    SELECT r.agent_id, r.halo_id, 'refund',
           ABS(credits_delta),
           jsonb_build_object('reason', 'auto_unresponsive_48h',
                              'original_tx_id', id)
    FROM halo_credit_transactions
    WHERE halo_id = r.halo_id
      AND user_id = r.agent_id
      AND transaction_type = 'unlock'
    ORDER BY created_at ASC
    LIMIT 1;

    -- Audit log
    INSERT INTO halo_events (halo_id, actor_id, event_type, payload)
    VALUES (r.halo_id, r.agent_id, 'unlock_refunded',
            jsonb_build_object('reason', 'auto_unresponsive_48h',
                               'response_id', r.id));

    v_count := v_count + 1;
  END LOOP;

  RETURN v_count;
END;
$$;

-- -------------------------------------------------------------------------
-- 5. NIGHTLY REFRESH: recompute stale halos
-- -------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.refresh_stale_halo_matches()
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_count int := 0;
  r record;
BEGIN
  FOR r IN
    SELECT id FROM halos
    WHERE status = 'active'
      AND (last_match_computed_at IS NULL
           OR last_match_computed_at < now() - interval '24 hours')
    LIMIT 200
  LOOP
    PERFORM compute_halo_matches(r.id);
    v_count := v_count + 1;
  END LOOP;
  RETURN v_count;
END;
$$;

-- -------------------------------------------------------------------------
-- 6. CRON JOBS (pg_cron)
-- -------------------------------------------------------------------------
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_extension WHERE extname = 'pg_cron') THEN
    -- Drop existing jobs if present
    PERFORM cron.unschedule(jobid)
      FROM cron.job
      WHERE jobname IN ('halo-auto-refund-hourly', 'halo-refresh-stale-nightly');

    PERFORM cron.schedule(
      'halo-auto-refund-hourly',
      '0 * * * *',
      $cron$ SELECT public.auto_refund_unresponsive_halo_unlocks(); $cron$
    );

    PERFORM cron.schedule(
      'halo-refresh-stale-nightly',
      '0 2 * * *',
      $cron$ SELECT public.refresh_stale_halo_matches(); $cron$
    );
  END IF;
END $$;
