
-- Add vendor fields to properties FIRST (before any policies reference them)
ALTER TABLE properties
  ADD COLUMN IF NOT EXISTS vendor_id     UUID,
  ADD COLUMN IF NOT EXISTS vendor_name   TEXT,
  ADD COLUMN IF NOT EXISTS vendor_email  TEXT,
  ADD COLUMN IF NOT EXISTS vendor_phone  TEXT,
  ADD COLUMN IF NOT EXISTS listed_at     TIMESTAMPTZ DEFAULT now();

-- property_view_events
CREATE TABLE IF NOT EXISTS property_view_events (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  property_id  UUID NOT NULL REFERENCES properties(id) ON DELETE CASCADE,
  viewer_id    UUID,
  session_id   TEXT,
  source       TEXT DEFAULT 'direct',
  device_type  TEXT,
  referrer     TEXT,
  duration_sec INT,
  viewed_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE property_view_events ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Agents read own property events" ON property_view_events
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM properties p
      JOIN agents a ON a.id = p.agent_id
      WHERE p.id = property_view_events.property_id
        AND a.user_id = auth.uid()
    )
  );
CREATE POLICY "Vendors read own property events" ON property_view_events
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM properties p
      WHERE p.id = property_view_events.property_id
        AND p.vendor_id = auth.uid()
    )
  );
CREATE POLICY "Anyone can log a view" ON property_view_events
  FOR INSERT WITH CHECK (true);

CREATE INDEX idx_view_events_property_date ON property_view_events (property_id, viewed_at DESC);
CREATE INDEX idx_view_events_session       ON property_view_events (session_id, property_id);

-- property_daily_stats
CREATE TABLE IF NOT EXISTS property_daily_stats (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  property_id  UUID NOT NULL REFERENCES properties(id) ON DELETE CASCADE,
  stat_date    DATE NOT NULL,
  views        INT DEFAULT 0,
  unique_views INT DEFAULT 0,
  saves        INT DEFAULT 0,
  enquiries    INT DEFAULT 0,
  UNIQUE (property_id, stat_date)
);

ALTER TABLE property_daily_stats ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Agents read own property stats" ON property_daily_stats
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM properties p
      JOIN agents a ON a.id = p.agent_id
      WHERE p.id = property_daily_stats.property_id
        AND a.user_id = auth.uid()
    )
  );
CREATE POLICY "Vendors read own property stats" ON property_daily_stats
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM properties p
      WHERE p.id = property_daily_stats.property_id
        AND p.vendor_id = auth.uid()
    )
  );

CREATE INDEX idx_daily_stats_property_date ON property_daily_stats (property_id, stat_date DESC);

-- vendor_report_tokens
CREATE TABLE IF NOT EXISTS vendor_report_tokens (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  property_id  UUID NOT NULL REFERENCES properties(id) ON DELETE CASCADE,
  agent_id     UUID NOT NULL,
  token        TEXT NOT NULL UNIQUE DEFAULT encode(gen_random_bytes(24), 'hex'),
  vendor_name  TEXT,
  vendor_email TEXT,
  expires_at   TIMESTAMPTZ DEFAULT now() + interval '90 days',
  last_viewed  TIMESTAMPTZ,
  view_count   INT DEFAULT 0,
  created_at   TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE vendor_report_tokens ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Agents manage own vendor tokens" ON vendor_report_tokens
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM agents a WHERE a.id = vendor_report_tokens.agent_id
        AND a.user_id = auth.uid()
    )
  );
CREATE POLICY "Token-based public read" ON vendor_report_tokens
  FOR SELECT USING (expires_at > now());

-- RPC: get_property_performance
CREATE OR REPLACE FUNCTION get_property_performance(
  p_property_id UUID,
  p_days        INT DEFAULT 30
)
RETURNS JSON LANGUAGE plpgsql STABLE SECURITY DEFINER
SET search_path TO 'public' AS $$
DECLARE
  result JSON;
  v_listed_at TIMESTAMPTZ;
BEGIN
  SELECT COALESCE(listed_at, created_at) INTO v_listed_at FROM properties WHERE id = p_property_id;

  SELECT json_build_object(
    'total_views',          (SELECT COUNT(*) FROM property_view_events WHERE property_id = p_property_id),
    'total_unique_views',   (SELECT COUNT(DISTINCT COALESCE(viewer_id::text, session_id)) FROM property_view_events WHERE property_id = p_property_id),
    'views_last_n_days',    (SELECT COUNT(*) FROM property_view_events WHERE property_id = p_property_id AND viewed_at >= now() - (p_days || ' days')::interval),
    'total_saves',          (SELECT COUNT(*) FROM saved_properties WHERE property_id = p_property_id),
    'total_enquiries',      (SELECT COUNT(*) FROM leads WHERE property_id = p_property_id),
    'open_home_attendees',  (SELECT COUNT(*) FROM open_home_registrations ohr JOIN open_homes oh ON oh.id = ohr.open_home_id WHERE oh.property_id = p_property_id AND ohr.attended = true),
    'days_on_market',       EXTRACT(DAY FROM now() - COALESCE(v_listed_at, now()))::INT,
    'daily_views',         (
      SELECT COALESCE(json_agg(d ORDER BY d->>'date'), '[]'::json)
      FROM (
        SELECT json_build_object(
          'date',        to_char(gs.d, 'YYYY-MM-DD'),
          'views',       COUNT(pve.id),
          'unique_views', COUNT(DISTINCT COALESCE(pve.viewer_id::text, pve.session_id))
        ) AS d
        FROM generate_series(
          (now() - (p_days || ' days')::interval)::date,
          now()::date,
          '1 day'
        ) AS gs(d)
        LEFT JOIN property_view_events pve
          ON pve.property_id = p_property_id
          AND pve.viewed_at::date = gs.d
        GROUP BY gs.d
      ) sub
    ),
    'view_sources',        (
      SELECT COALESCE(json_object_agg(COALESCE(source, 'direct'), cnt), '{}'::json)
      FROM (
        SELECT source, COUNT(*) AS cnt
        FROM property_view_events
        WHERE property_id = p_property_id
        GROUP BY source
      ) s
    ),
    'device_split',        (
      SELECT COALESCE(json_object_agg(COALESCE(device_type, 'unknown'), cnt), '{}'::json)
      FROM (
        SELECT device_type, COUNT(*) AS cnt
        FROM property_view_events
        WHERE property_id = p_property_id
        GROUP BY device_type
      ) d
    ),
    'enquiry_rate',        CASE
                             WHEN (SELECT COUNT(*) FROM property_view_events WHERE property_id = p_property_id) > 0
                             THEN ROUND(
                               (SELECT COUNT(*)::numeric FROM leads WHERE property_id = p_property_id)
                               / (SELECT COUNT(*)::numeric FROM property_view_events WHERE property_id = p_property_id)
                               * 100, 1
                             )
                             ELSE 0
                           END,
    'save_rate',           CASE
                             WHEN (SELECT COUNT(*) FROM property_view_events WHERE property_id = p_property_id) > 0
                             THEN ROUND(
                               (SELECT COUNT(*)::numeric FROM saved_properties WHERE property_id = p_property_id)
                               / (SELECT COUNT(*)::numeric FROM property_view_events WHERE property_id = p_property_id)
                               * 100, 1
                             )
                             ELSE 0
                           END
  ) INTO result;

  RETURN result;
END;
$$;

-- RPC: get_suburb_benchmarks
CREATE OR REPLACE FUNCTION get_suburb_benchmarks(
  p_property_id UUID
)
RETURNS JSON LANGUAGE plpgsql STABLE SECURITY DEFINER
SET search_path TO 'public' AS $$
DECLARE
  v_suburb     TEXT;
  v_state      TEXT;
  v_prop_type  TEXT;
  result       JSON;
BEGIN
  SELECT suburb, state, property_type
  INTO v_suburb, v_state, v_prop_type
  FROM properties WHERE id = p_property_id;

  SELECT json_build_object(
    'suburb',            v_suburb,
    'state',             v_state,
    'avg_days_on_market', (
      SELECT ROUND(AVG(EXTRACT(DAY FROM COALESCE(sold_at, now()) - COALESCE(listed_at, created_at))))
      FROM properties
      WHERE suburb = v_suburb AND state = v_state
        AND property_type = v_prop_type
        AND COALESCE(listed_at, created_at) > now() - interval '6 months'
        AND id <> p_property_id
    ),
    'avg_views_first_7_days', (
      SELECT ROUND(AVG(cnt))
      FROM (
        SELECT p2.id, COUNT(pve.id) AS cnt
        FROM properties p2
        LEFT JOIN property_view_events pve
          ON pve.property_id = p2.id
          AND pve.viewed_at <= COALESCE(p2.listed_at, p2.created_at) + interval '7 days'
        WHERE p2.suburb = v_suburb AND p2.state = v_state
          AND p2.property_type = v_prop_type
          AND COALESCE(p2.listed_at, p2.created_at) > now() - interval '6 months'
          AND p2.id <> p_property_id
        GROUP BY p2.id
      ) x
    ),
    'median_sale_price', (
      SELECT PERCENTILE_CONT(0.5) WITHIN GROUP (ORDER BY sold_price)
      FROM properties
      WHERE suburb = v_suburb AND state = v_state
        AND property_type = v_prop_type
        AND sold_at > now() - interval '12 months'
    ),
    'total_similar_active', (
      SELECT COUNT(*)
      FROM properties
      WHERE suburb = v_suburb AND state = v_state
        AND property_type = v_prop_type
        AND is_active = true
        AND id <> p_property_id
    )
  ) INTO result;

  RETURN result;
END;
$$;

-- RPC: log_property_view
CREATE OR REPLACE FUNCTION log_property_view(
  p_property_id UUID,
  p_session_id  TEXT DEFAULT NULL,
  p_source      TEXT DEFAULT 'direct',
  p_device_type TEXT DEFAULT NULL
)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER
SET search_path TO 'public' AS $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM property_view_events
    WHERE property_id = p_property_id
      AND (
        (p_session_id IS NOT NULL AND session_id = p_session_id)
        OR (p_session_id IS NULL AND viewer_id = auth.uid())
      )
      AND viewed_at >= now() - interval '1 hour'
  ) THEN
    RETURN;
  END IF;

  INSERT INTO property_view_events (property_id, viewer_id, session_id, source, device_type)
  VALUES (p_property_id, auth.uid(), p_session_id, p_source, p_device_type);
END;
$$;
