-- Audit log for portal access (Australian Privacy Act compliance)
CREATE TABLE IF NOT EXISTS public.audit_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  event_type text NOT NULL,
  portal_type text,
  entity_id uuid,
  user_id uuid,
  metadata jsonb DEFAULT '{}'::jsonb,
  ip_address text,
  user_agent text,
  accessed_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_audit_logs_event_type ON public.audit_logs(event_type);
CREATE INDEX IF NOT EXISTS idx_audit_logs_entity_id ON public.audit_logs(entity_id);
CREATE INDEX IF NOT EXISTS idx_audit_logs_accessed_at ON public.audit_logs(accessed_at DESC);

ALTER TABLE public.audit_logs ENABLE ROW LEVEL SECURITY;

-- Allow anyone (including anon portal users via token) to insert their own access events
CREATE POLICY "Anyone can insert audit logs"
  ON public.audit_logs FOR INSERT
  WITH CHECK (true);

-- Only admins can read audit logs
CREATE POLICY "Admins can view audit logs"
  ON public.audit_logs FOR SELECT
  USING (public.has_role(auth.uid(), 'admin'));

-- Owner portal preferences (per tenancy / property)
CREATE TABLE IF NOT EXISTS public.owner_portal_preferences (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  property_id uuid NOT NULL REFERENCES public.properties(id) ON DELETE CASCADE,
  agent_id uuid NOT NULL REFERENCES public.agents(id) ON DELETE CASCADE,
  auto_approve_threshold_aud numeric NOT NULL DEFAULT 500,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (property_id)
);

ALTER TABLE public.owner_portal_preferences ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Agents manage own owner portal prefs"
  ON public.owner_portal_preferences FOR ALL
  USING (agent_id IN (SELECT id FROM public.agents WHERE user_id = auth.uid()))
  WITH CHECK (agent_id IN (SELECT id FROM public.agents WHERE user_id = auth.uid()));

-- Allow public read via property_id (the owner portal accesses anonymously via token-based RPC; it'll read this directly)
CREATE POLICY "Public can read owner portal prefs"
  ON public.owner_portal_preferences FOR SELECT
  USING (true);

CREATE TRIGGER trg_owner_portal_prefs_updated_at
  BEFORE UPDATE ON public.owner_portal_preferences
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();