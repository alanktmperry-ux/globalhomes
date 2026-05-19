
-- 1. pgvector
CREATE EXTENSION IF NOT EXISTS vector;

-- 2. embedding columns (1536 dims = text-embedding-3-small)
ALTER TABLE public.halos       ADD COLUMN IF NOT EXISTS embedding vector(1536);
ALTER TABLE public.halos       ADD COLUMN IF NOT EXISTS embedding_updated_at timestamptz;
ALTER TABLE public.properties  ADD COLUMN IF NOT EXISTS embedding vector(1536);
ALTER TABLE public.properties  ADD COLUMN IF NOT EXISTS embedding_updated_at timestamptz;

-- 3. HNSW indexes for cosine similarity
CREATE INDEX IF NOT EXISTS halos_embedding_idx
  ON public.halos USING hnsw (embedding vector_cosine_ops);
CREATE INDEX IF NOT EXISTS properties_embedding_idx
  ON public.properties USING hnsw (embedding vector_cosine_ops)
  WHERE is_active = true;

-- 4. Upgrade compute_halo_matches to include semantic score
CREATE OR REPLACE FUNCTION public.compute_halo_matches(p_halo_id uuid)
 RETURNS integer
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_halo halos%ROWTYPE;
  v_inserted integer := 0;
BEGIN
  SELECT * INTO v_halo FROM halos WHERE id = p_halo_id;
  IF NOT FOUND OR v_halo.status <> 'active' THEN
    RETURN 0;
  END IF;

  UPDATE halo_matches SET stale = true
    WHERE halo_id = p_halo_id AND match_kind = 'agent';

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
      ea.user_id, ea.agent_row_id,
      COALESCE((SELECT count(*)::int FROM properties p
                WHERE p.agent_id = ea.agent_row_id
                  AND lower(p.suburb) = ANY (SELECT lower(s) FROM unnest(v_halo.suburbs) s)
      ), 0) AS suburb_hits,
      COALESCE((SELECT count(*)::int FROM properties p
                WHERE p.agent_id = ea.agent_row_id AND p.is_active = true
      ), 0) AS active_listings,
      COALESCE((SELECT count(*)::int FROM properties p
                WHERE p.agent_id = ea.agent_row_id
                  AND p.price BETWEEN
                    COALESCE(v_halo.budget_min, v_halo.budget_max * 0.5) * 0.75
                    AND v_halo.budget_max * 1.25
      ), 0) AS price_hits,
      COALESCE((SELECT count(*)::int FROM properties p
                WHERE p.agent_id = ea.agent_row_id
                  AND (cardinality(v_halo.property_types) = 0
                       OR p.property_type = ANY (v_halo.property_types))
      ), 0) AS type_hits,
      EXISTS (SELECT 1 FROM agent_language_capabilities alc
              WHERE alc.agent_id = ea.agent_row_id
                AND lower(alc.language_code) = lower(v_halo.preferred_language)
      ) AS has_language,
      (SELECT response_rate FROM agent_performance_stats
        WHERE agent_id = ea.agent_row_id) AS response_rate,
      -- NEW: best semantic similarity of any active listing this agent has vs the halo
      CASE
        WHEN v_halo.embedding IS NULL THEN NULL
        ELSE (
          SELECT MAX(1 - (p.embedding <=> v_halo.embedding))
          FROM properties p
          WHERE p.agent_id = ea.agent_row_id
            AND p.is_active = true
            AND p.embedding IS NOT NULL
        )
      END AS semantic_sim
    FROM eligible_agents ea
  ),
  scored AS (
    SELECT
      user_id,
      LEAST(suburb_hits, 5) * 6.0 AS suburb_score,
      LEAST(price_hits, 5) * 4.0 AS price_score,
      LEAST(type_hits, 5) * 3.0 AS type_score,
      COALESCE(response_rate, 50) * 0.15 AS response_score,
      LEAST(ln(GREATEST(active_listings, 1) + 1) * 3.5, 10.0) AS volume_score,
      CASE WHEN has_language THEN 10.0 ELSE 0.0 END AS language_score,
      -- semantic_sim ranges 0-1; weight up to 25 points
      CASE WHEN semantic_sim IS NULL THEN 0.0
           ELSE GREATEST(0, semantic_sim) * 25.0
      END AS semantic_score_raw,
      semantic_sim,
      suburb_hits, price_hits, type_hits, has_language, active_listings, response_rate
    FROM agent_stats
  ),
  final AS (
    SELECT
      user_id,
      ROUND((suburb_score + price_score + type_score
             + response_score + volume_score + language_score)::numeric, 2) AS hard,
      ROUND(semantic_score_raw::numeric, 2) AS semantic,
      ROUND((suburb_score + price_score + type_score
             + response_score + volume_score + language_score
             + semantic_score_raw)::numeric, 2) AS combined,
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
        ) END,
        CASE WHEN semantic_sim IS NOT NULL AND semantic_sim >= 0.55 THEN to_jsonb(
          format('Portfolio semantically matches (%.0f%%)', semantic_sim * 100)
        ) END
      )) AS reasons
    FROM scored
  )
  INSERT INTO halo_matches (
    halo_id, match_kind, agent_id, hard_score, semantic_score, combined_score, reasons, stale, computed_at
  )
  SELECT p_halo_id, 'agent', user_id, hard, semantic, combined, reasons, false, now()
  FROM final
  WHERE combined > 0
  ON CONFLICT (halo_id, agent_id) WHERE match_kind = 'agent'
  DO UPDATE SET
    combined_score = EXCLUDED.combined_score,
    hard_score     = EXCLUDED.hard_score,
    semantic_score = EXCLUDED.semantic_score,
    reasons        = EXCLUDED.reasons,
    stale          = false,
    computed_at    = now();

  GET DIAGNOSTICS v_inserted = ROW_COUNT;

  UPDATE halos SET last_match_computed_at = now() WHERE id = p_halo_id;

  INSERT INTO halo_events (halo_id, actor_role, event_type, payload)
  VALUES (p_halo_id, 'system', 'matches_computed',
          jsonb_build_object('count', v_inserted, 'semantic', v_halo.embedding IS NOT NULL));

  RETURN v_inserted;
END;
$function$;
