-- ============================================================
-- Batch 6 Item 4 — Granular notification preferences
-- ============================================================

CREATE TYPE public.notification_frequency AS ENUM ('realtime', 'hourly_digest', 'daily_digest', 'off');

-- Per-user, per-event preferences
CREATE TABLE public.notification_preferences (
  user_id uuid NOT NULL,
  event_key text NOT NULL,
  channels jsonb NOT NULL DEFAULT '{"in_app": true, "email": false, "push": false}'::jsonb,
  frequency public.notification_frequency NOT NULL DEFAULT 'realtime',
  updated_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (user_id, event_key)
);

-- Agent-level global controls (one row per user)
CREATE TABLE public.notification_settings (
  user_id uuid PRIMARY KEY,
  quiet_hours_start time,
  quiet_hours_end time,
  quiet_hours_timezone text DEFAULT 'Australia/Sydney',
  mute_until timestamptz,
  push_enabled boolean NOT NULL DEFAULT false,
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- Append-only delivery log
CREATE TABLE public.notification_log (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  event_key text NOT NULL,
  channel text NOT NULL,
  delivered_at timestamptz,
  suppressed_reason text,
  notification_id uuid,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX idx_notification_log_user ON public.notification_log(user_id, created_at DESC);

-- Digest queue
CREATE TABLE public.notification_queue (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  event_key text NOT NULL,
  channel text NOT NULL,
  frequency public.notification_frequency NOT NULL,
  title text NOT NULL,
  message text,
  payload jsonb DEFAULT '{}'::jsonb,
  enqueued_at timestamptz NOT NULL DEFAULT now(),
  delivered_at timestamptz
);
CREATE INDEX idx_notification_queue_pending ON public.notification_queue(user_id, frequency, channel) WHERE delivered_at IS NULL;

-- RLS
ALTER TABLE public.notification_preferences ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.notification_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.notification_log ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.notification_queue ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users manage own prefs" ON public.notification_preferences
  FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users manage own settings" ON public.notification_settings
  FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users read own log" ON public.notification_log
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users read own queue" ON public.notification_queue
  FOR SELECT USING (auth.uid() = user_id);

-- updated_at triggers
CREATE TRIGGER trg_notif_prefs_updated BEFORE UPDATE ON public.notification_preferences
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER trg_notif_settings_updated BEFORE UPDATE ON public.notification_settings
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Seed defaults function (idempotent)
CREATE OR REPLACE FUNCTION public.seed_notification_defaults(_user_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  events text[] := ARRAY[
    'new_hot_lead','lead_going_cold','buyer_match','co_broke_request',
    'listing_approved','listing_rejected',
    'inbound_message','template_suggested','mention',
    'agent_approved','cross_agent_dup_match',
    'reports_weekly_digest','reputation_change',
    'automation_hot_lead_new','automation_lead_going_cold',
    'automation_under_offer_stale','automation_inspection_followup'
  ];
  email_critical text[] := ARRAY[
    'new_hot_lead','co_broke_request','listing_rejected','inbound_message','mention'
  ];
  ev text;
  ch jsonb;
BEGIN
  FOREACH ev IN ARRAY events LOOP
    ch := CASE WHEN ev = ANY(email_critical)
      THEN '{"in_app": true, "email": true, "push": false}'::jsonb
      ELSE '{"in_app": true, "email": false, "push": false}'::jsonb
    END;
    INSERT INTO public.notification_preferences (user_id, event_key, channels, frequency)
    VALUES (
      _user_id, ev, ch,
      CASE WHEN ev = 'reports_weekly_digest' THEN 'daily_digest'::notification_frequency ELSE 'realtime'::notification_frequency END
    )
    ON CONFLICT (user_id, event_key) DO NOTHING;
  END LOOP;

  INSERT INTO public.notification_settings (user_id)
  VALUES (_user_id)
  ON CONFLICT (user_id) DO NOTHING;
END;
$$;

-- Auto-seed on agent insert
CREATE OR REPLACE FUNCTION public.trigger_seed_notification_defaults()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  PERFORM public.seed_notification_defaults(NEW.user_id);
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_seed_notif_defaults_on_agent
AFTER INSERT ON public.agents
FOR EACH ROW EXECUTE FUNCTION public.trigger_seed_notification_defaults();

-- Backfill existing agents
DO $$
DECLARE u uuid;
BEGIN
  FOR u IN SELECT DISTINCT user_id FROM public.agents WHERE user_id IS NOT NULL LOOP
    PERFORM public.seed_notification_defaults(u);
  END LOOP;
END $$;