-- Lead urgency thresholds per agency (with agent fallback for solo agents)
CREATE TABLE public.crm_urgency_settings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  agency_id uuid REFERENCES public.agencies(id) ON DELETE CASCADE,
  agent_id uuid REFERENCES public.agents(id) ON DELETE CASCADE,
  warm_max_hours integer NOT NULL DEFAULT 24 CHECK (warm_max_hours > 0),
  cool_max_days integer NOT NULL DEFAULT 7 CHECK (cool_max_days > 0),
  going_cold_warn_days integer NOT NULL DEFAULT 6 CHECK (going_cold_warn_days > 0),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CHECK ((agency_id IS NOT NULL) OR (agent_id IS NOT NULL))
);

CREATE UNIQUE INDEX crm_urgency_settings_agency_uniq
  ON public.crm_urgency_settings(agency_id) WHERE agency_id IS NOT NULL;
CREATE UNIQUE INDEX crm_urgency_settings_agent_uniq
  ON public.crm_urgency_settings(agent_id) WHERE agent_id IS NOT NULL AND agency_id IS NULL;

ALTER TABLE public.crm_urgency_settings ENABLE ROW LEVEL SECURITY;

-- Read: any authenticated agent in the same agency, or owning solo agent
CREATE POLICY "Agency members can read urgency settings"
ON public.crm_urgency_settings FOR SELECT TO authenticated
USING (
  (agency_id IS NOT NULL AND agency_id IN (
    SELECT a.agency_id FROM public.agents a WHERE a.user_id = auth.uid() AND a.agency_id IS NOT NULL
  ))
  OR
  (agent_id IS NOT NULL AND agent_id IN (
    SELECT a.id FROM public.agents a WHERE a.user_id = auth.uid()
  ))
);

-- Write: principals/admins for agency, owner for solo
CREATE POLICY "Principals/admins or owner can insert urgency settings"
ON public.crm_urgency_settings FOR INSERT TO authenticated
WITH CHECK (
  (agency_id IS NOT NULL AND agency_id IN (
    SELECT a.agency_id FROM public.agents a
    WHERE a.user_id = auth.uid() AND a.agency_role IN ('principal','admin')
  ))
  OR
  (agent_id IS NOT NULL AND agent_id IN (
    SELECT a.id FROM public.agents a WHERE a.user_id = auth.uid()
  ))
);

CREATE POLICY "Principals/admins or owner can update urgency settings"
ON public.crm_urgency_settings FOR UPDATE TO authenticated
USING (
  (agency_id IS NOT NULL AND agency_id IN (
    SELECT a.agency_id FROM public.agents a
    WHERE a.user_id = auth.uid() AND a.agency_role IN ('principal','admin')
  ))
  OR
  (agent_id IS NOT NULL AND agent_id IN (
    SELECT a.id FROM public.agents a WHERE a.user_id = auth.uid()
  ))
);

-- Trigger: keep updated_at fresh
CREATE TRIGGER trg_crm_urgency_settings_updated_at
BEFORE UPDATE ON public.crm_urgency_settings
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Lead urgency function (sticky Hot): never contacted = hot.
CREATE OR REPLACE FUNCTION public.crm_lead_urgency(
  p_last_contacted timestamptz,
  p_warm_max_hours integer DEFAULT 24,
  p_cool_max_days integer DEFAULT 7
) RETURNS text
LANGUAGE sql IMMUTABLE
SET search_path = public
AS $$
  SELECT CASE
    WHEN p_last_contacted IS NULL THEN 'hot'
    WHEN now() - p_last_contacted < make_interval(hours => p_warm_max_hours) THEN 'warm'
    WHEN now() - p_last_contacted < make_interval(days => p_cool_max_days) THEN 'cool'
    ELSE 'cold'
  END;
$$;

-- Notification dedup: prevent re-firing same lead-tier notif
CREATE UNIQUE INDEX IF NOT EXISTS notifications_lead_type_uniq
  ON public.notifications(agent_id, lead_id, type)
  WHERE lead_id IS NOT NULL AND type IN ('lead_hot','lead_going_cold');

-- Scheduled job: insert notifications for newly-hot leads and 6-day cold warnings.
-- Runs every 5 minutes. Hot leads = created in the last 5 min and uncontacted.
-- Going cold = last_contacted between (cool_max_days - 1) and (cool_max_days - 1 + 5min) ago.
CREATE OR REPLACE FUNCTION public.crm_emit_urgency_notifications()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- New Hot leads: created in last 5 min, never contacted, not lost/settled
  INSERT INTO public.notifications (agent_id, type, title, message, lead_id)
  SELECT
    l.agent_id,
    'lead_hot',
    'New hot lead',
    COALESCE(c.first_name,'Lead') || COALESCE(' ' || c.last_name,'') || ' — needs first contact',
    l.id
  FROM public.crm_leads l
  LEFT JOIN public.contacts c ON c.id = l.contact_id
  WHERE l.last_contacted IS NULL
    AND l.created_at > now() - interval '5 minutes'
    AND l.stage NOT IN ('settled','lost')
  ON CONFLICT (agent_id, lead_id, type) WHERE lead_id IS NOT NULL AND type IN ('lead_hot','lead_going_cold')
  DO NOTHING;

  -- Going cold: last_contacted between 6d and 6d5min ago
  INSERT INTO public.notifications (agent_id, type, title, message, lead_id)
  SELECT
    l.agent_id,
    'lead_going_cold',
    'Lead going cold',
    COALESCE(c.first_name,'Lead') || COALESCE(' ' || c.last_name,'') || ' — no contact in 6 days',
    l.id
  FROM public.crm_leads l
  LEFT JOIN public.contacts c ON c.id = l.contact_id
  WHERE l.last_contacted IS NOT NULL
    AND l.last_contacted < now() - interval '6 days'
    AND l.last_contacted >= now() - interval '6 days 5 minutes'
    AND l.stage NOT IN ('settled','lost')
  ON CONFLICT (agent_id, lead_id, type) WHERE lead_id IS NOT NULL AND type IN ('lead_hot','lead_going_cold')
  DO NOTHING;
END;
$$;