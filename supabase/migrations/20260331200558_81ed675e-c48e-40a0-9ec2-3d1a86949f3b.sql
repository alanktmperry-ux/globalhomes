
-- Agent performance stats (materialised daily)
CREATE TABLE IF NOT EXISTS public.agent_performance_stats (
  agent_id              uuid PRIMARY KEY REFERENCES public.agents(id) ON DELETE CASCADE,
  active_listings       integer DEFAULT 0,
  total_listings        integer DEFAULT 0,
  sold_listings         integer DEFAULT 0,
  avg_days_to_sale      numeric(6,1),
  avg_sale_vs_guide     numeric(6,3),
  total_enquiries       integer DEFAULT 0,
  responded_count       integer DEFAULT 0,
  response_rate         numeric(5,2),
  avg_response_hours    numeric(6,1),
  enquiry_to_inspection numeric(5,2),
  inspection_to_offer   numeric(5,2),
  review_count          integer DEFAULT 0,
  avg_rating            numeric(3,2),
  calculated_at         timestamptz DEFAULT now()
);

ALTER TABLE public.agent_performance_stats ENABLE ROW LEVEL SECURITY;

-- Agent can read their own stats
CREATE POLICY "perf_stats_owner_read" ON public.agent_performance_stats
  FOR SELECT USING (
    agent_id IN (SELECT id FROM public.agents WHERE user_id = auth.uid())
  );

-- Admin can read all
CREATE POLICY "perf_stats_admin_all" ON public.agent_performance_stats
  FOR ALL USING (public.has_role(auth.uid(), 'admin'));

-- Function: compute_agent_stats for one agent
CREATE OR REPLACE FUNCTION public.compute_agent_stats(p_agent_id uuid)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public' AS $$
DECLARE
  v_active   integer;
  v_total    integer;
  v_sold     integer;
  v_avg_dom  numeric;
  v_avg_svg  numeric;
  v_enq      integer;
  v_resp     integer;
  v_rate     numeric;
  v_avg_hrs  numeric;
  v_rev_cnt  integer;
  v_avg_rat  numeric;
  v_user_id  uuid;
BEGIN
  SELECT user_id INTO v_user_id FROM agents WHERE id = p_agent_id;
  IF v_user_id IS NULL THEN RETURN; END IF;

  -- Listings
  SELECT
    COUNT(*) FILTER (WHERE status IN ('public','auction','eoi','under_offer','coming_soon') AND is_active = true),
    COUNT(*),
    COUNT(*) FILTER (WHERE status = 'sold')
  INTO v_active, v_total, v_sold
  FROM properties WHERE agent_id = p_agent_id;

  -- Avg days to sale (last 24 months)
  SELECT AVG(sold_at - created_at::date)
  INTO v_avg_dom
  FROM properties
  WHERE agent_id = p_agent_id
    AND status = 'sold'
    AND sold_at IS NOT NULL
    AND sold_at >= now() - interval '24 months';

  -- Avg sale vs price guide
  SELECT AVG(sold_price / NULLIF((price_guide_low + price_guide_high) / 2.0, 0))
  INTO v_avg_svg
  FROM properties
  WHERE agent_id = p_agent_id
    AND status = 'sold'
    AND sold_price IS NOT NULL
    AND price_guide_low IS NOT NULL
    AND price_guide_high IS NOT NULL;

  -- Enquiry response metrics
  WITH agent_convos AS (
    SELECT DISTINCT c.id AS conv_id,
           MIN(m.created_at) FILTER (WHERE m.sender_id != v_user_id) AS first_buyer_msg,
           MIN(m.created_at) FILTER (WHERE m.sender_id = v_user_id) AS first_agent_reply
    FROM conversations c
    JOIN conversation_participants cp ON cp.conversation_id = c.id AND cp.user_id = v_user_id
    JOIN messages m ON m.conversation_id = c.id
    WHERE c.created_at >= now() - interval '6 months'
    GROUP BY c.id
  )
  SELECT
    COUNT(*) FILTER (WHERE first_buyer_msg IS NOT NULL),
    COUNT(*) FILTER (
      WHERE first_agent_reply IS NOT NULL
        AND first_agent_reply - first_buyer_msg <= interval '24 hours'
    ),
    CASE WHEN COUNT(*) FILTER (WHERE first_buyer_msg IS NOT NULL) > 0
         THEN (COUNT(*) FILTER (
           WHERE first_agent_reply IS NOT NULL
             AND first_agent_reply - first_buyer_msg <= interval '24 hours'
         )::numeric / COUNT(*) FILTER (WHERE first_buyer_msg IS NOT NULL)) * 100
         ELSE NULL END,
    AVG(EXTRACT(EPOCH FROM (first_agent_reply - first_buyer_msg)) / 3600)
      FILTER (WHERE first_agent_reply IS NOT NULL)
  INTO v_enq, v_resp, v_rate, v_avg_hrs
  FROM agent_convos;

  -- Reviews (from existing agent_reviews table)
  SELECT COUNT(*), AVG(rating)
  INTO v_rev_cnt, v_avg_rat
  FROM agent_reviews
  WHERE agent_id = p_agent_id AND status = 'approved';

  -- Upsert
  INSERT INTO agent_performance_stats (
    agent_id, active_listings, total_listings, sold_listings,
    avg_days_to_sale, avg_sale_vs_guide,
    total_enquiries, responded_count, response_rate, avg_response_hours,
    review_count, avg_rating, calculated_at
  ) VALUES (
    p_agent_id, v_active, v_total, v_sold,
    v_avg_dom, v_avg_svg,
    v_enq, v_resp, v_rate, v_avg_hrs,
    v_rev_cnt, v_avg_rat, now()
  )
  ON CONFLICT (agent_id) DO UPDATE SET
    active_listings    = EXCLUDED.active_listings,
    total_listings     = EXCLUDED.total_listings,
    sold_listings      = EXCLUDED.sold_listings,
    avg_days_to_sale   = EXCLUDED.avg_days_to_sale,
    avg_sale_vs_guide  = EXCLUDED.avg_sale_vs_guide,
    total_enquiries    = EXCLUDED.total_enquiries,
    responded_count    = EXCLUDED.responded_count,
    response_rate      = EXCLUDED.response_rate,
    avg_response_hours = EXCLUDED.avg_response_hours,
    review_count       = EXCLUDED.review_count,
    avg_rating         = EXCLUDED.avg_rating,
    calculated_at      = now();
END;
$$;

-- Index for response time queries
CREATE INDEX IF NOT EXISTS idx_messages_conv_sender_time
  ON messages(conversation_id, sender_id, created_at ASC);

-- Index for sold properties by agent
CREATE INDEX IF NOT EXISTS idx_properties_agent_sold_perf
  ON properties(agent_id, status, sold_at)
  WHERE status = 'sold';
