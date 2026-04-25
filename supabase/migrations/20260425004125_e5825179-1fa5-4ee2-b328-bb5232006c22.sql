-- Batch 5 Item 2: Transparent reputation scoring

-- 1. History table for nightly snapshots + sparkline
CREATE TABLE public.agent_reputation_history (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  agent_id UUID NOT NULL REFERENCES public.agents(id) ON DELETE CASCADE,
  total_score INT NOT NULL CHECK (total_score >= 0 AND total_score <= 100),
  response_time_score INT NOT NULL DEFAULT 0,
  conversion_score INT NOT NULL DEFAULT 0,
  review_score INT NOT NULL DEFAULT 0,
  activity_score INT NOT NULL DEFAULT 0,
  components JSONB NOT NULL DEFAULT '{}'::jsonb,
  computed_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_agent_rep_history_agent_time ON public.agent_reputation_history(agent_id, computed_at DESC);

ALTER TABLE public.agent_reputation_history ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Agents can view their own reputation history"
ON public.agent_reputation_history FOR SELECT
USING (
  EXISTS (SELECT 1 FROM public.agents a WHERE a.id = agent_reputation_history.agent_id AND a.user_id = auth.uid())
);

CREATE POLICY "Service role manages reputation history"
ON public.agent_reputation_history FOR ALL
USING (auth.jwt() ->> 'role' = 'service_role')
WITH CHECK (auth.jwt() ->> 'role' = 'service_role');

-- 2. Compute function: returns components and writes a history row
CREATE OR REPLACE FUNCTION public.compute_agent_reputation(p_agent_id UUID)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_response_time_score INT := 0;
  v_conversion_score INT := 0;
  v_review_score INT := 0;
  v_activity_score INT := 0;
  v_total INT;
  v_avg_response_minutes NUMERIC;
  v_total_leads INT;
  v_qualified_leads INT;
  v_avg_rating NUMERIC;
  v_review_count INT;
  v_listings_30d INT;
  v_tasks_30d INT;
  v_activities_30d INT;
  v_response_reason TEXT;
  v_conversion_reason TEXT;
  v_review_reason TEXT;
  v_activity_reason TEXT;
  v_components JSONB;
BEGIN
  -- response_time_score: avg minutes from lead created → first_contacted_at, last 90 days
  SELECT
    AVG(EXTRACT(EPOCH FROM (first_contacted_at - created_at)) / 60.0),
    COUNT(*)
  INTO v_avg_response_minutes, v_total_leads
  FROM public.crm_leads
  WHERE agent_id = p_agent_id
    AND created_at >= now() - INTERVAL '90 days'
    AND first_contacted_at IS NOT NULL;

  IF v_avg_response_minutes IS NULL THEN
    v_response_time_score := 0;
    v_response_reason := 'No leads contacted in last 90 days yet.';
  ELSIF v_avg_response_minutes < 15 THEN
    v_response_time_score := 25;
    v_response_reason := format('Excellent — avg %s min to first contact.', ROUND(v_avg_response_minutes));
  ELSIF v_avg_response_minutes < 60 THEN
    v_response_time_score := 20;
    v_response_reason := format('Strong — avg %s min to first contact.', ROUND(v_avg_response_minutes));
  ELSIF v_avg_response_minutes < 240 THEN
    v_response_time_score := 14;
    v_response_reason := format('OK — avg %s min to first contact.', ROUND(v_avg_response_minutes));
  ELSIF v_avg_response_minutes < 1440 THEN
    v_response_time_score := 8;
    v_response_reason := format('Slow — avg %s hr to first contact.', ROUND(v_avg_response_minutes / 60.0, 1));
  ELSE
    v_response_time_score := 3;
    v_response_reason := format('Very slow — avg %s days to first contact.', ROUND(v_avg_response_minutes / 1440.0, 1));
  END IF;

  -- conversion_score: % of leads at qualified or higher, last 90 days
  SELECT
    COUNT(*) FILTER (WHERE conversion_status IN ('qualified','converted_to_listing','converted_to_inspection')),
    COUNT(*)
  INTO v_qualified_leads, v_total_leads
  FROM public.crm_leads
  WHERE agent_id = p_agent_id
    AND created_at >= now() - INTERVAL '90 days';

  IF v_total_leads = 0 OR v_total_leads IS NULL THEN
    v_conversion_score := 0;
    v_conversion_reason := 'No leads in last 90 days.';
  ELSE
    v_conversion_score := LEAST(25, ROUND((v_qualified_leads::NUMERIC / v_total_leads) * 25)::INT);
    v_conversion_reason := format('%s of %s leads qualified or better (%s%%).',
      v_qualified_leads, v_total_leads,
      ROUND((v_qualified_leads::NUMERIC / v_total_leads) * 100));
  END IF;

  -- review_score: avg star rating × 5, weighted by review count
  SELECT AVG(rating), COUNT(*)
  INTO v_avg_rating, v_review_count
  FROM public.agent_reviews
  WHERE agent_id = p_agent_id AND status = 'approved';

  IF v_avg_rating IS NULL OR v_review_count = 0 THEN
    v_review_score := 0;
    v_review_reason := 'No approved reviews yet.';
  ELSE
    v_review_score := LEAST(25, ROUND((v_avg_rating / 5.0) * 25 * LEAST(v_review_count::NUMERIC / 5, 1))::INT);
    v_review_reason := format('%s avg from %s review%s.',
      ROUND(v_avg_rating, 1), v_review_count, CASE WHEN v_review_count = 1 THEN '' ELSE 's' END);
  END IF;

  -- activity_score: listings (30d) + tasks completed (30d) + manual crm activities (30d)
  SELECT COUNT(*) INTO v_listings_30d
  FROM public.properties
  WHERE agent_id = p_agent_id AND created_at >= now() - INTERVAL '30 days';

  SELECT COUNT(*) INTO v_tasks_30d
  FROM public.tasks
  WHERE assigned_to = p_agent_id
    AND status = 'completed'
    AND completed_at >= now() - INTERVAL '30 days';

  SELECT COUNT(*) INTO v_activities_30d
  FROM public.crm_activities
  WHERE agent_id = p_agent_id
    AND COALESCE(auto_generated, false) = false
    AND created_at >= now() - INTERVAL '30 days';

  v_activity_score := LEAST(25,
    LEAST(v_listings_30d, 5) * 2     -- up to 10
    + LEAST(v_tasks_30d, 10)          -- up to 10
    + LEAST(v_activities_30d, 5)      -- up to 5
  );
  v_activity_reason := format('%s listings, %s tasks completed, %s logged actions in 30 days.',
    v_listings_30d, v_tasks_30d, v_activities_30d);

  v_total := v_response_time_score + v_conversion_score + v_review_score + v_activity_score;

  v_components := jsonb_build_object(
    'response_time', jsonb_build_object('score', v_response_time_score, 'max', 25, 'reason', v_response_reason),
    'conversion',    jsonb_build_object('score', v_conversion_score,    'max', 25, 'reason', v_conversion_reason),
    'reviews',       jsonb_build_object('score', v_review_score,        'max', 25, 'reason', v_review_reason),
    'activity',      jsonb_build_object('score', v_activity_score,      'max', 25, 'reason', v_activity_reason),
    'total', v_total,
    'computed_at', now()
  );

  -- Snapshot
  INSERT INTO public.agent_reputation_history
    (agent_id, total_score, response_time_score, conversion_score, review_score, activity_score, components)
  VALUES
    (p_agent_id, v_total, v_response_time_score, v_conversion_score, v_review_score, v_activity_score, v_components);

  RETURN v_components;
END;
$$;

GRANT EXECUTE ON FUNCTION public.compute_agent_reputation(UUID) TO authenticated, service_role;