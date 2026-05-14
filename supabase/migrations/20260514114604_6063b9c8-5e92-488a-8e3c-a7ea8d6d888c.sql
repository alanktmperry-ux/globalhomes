CREATE TABLE public.admin_audit_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  actor_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  actor_email TEXT NOT NULL,
  action TEXT NOT NULL,
  target_type TEXT,
  target_id TEXT,
  target_summary TEXT,
  ip_address TEXT,
  user_agent TEXT,
  before_state JSONB,
  after_state JSONB,
  notes TEXT,
  request_id TEXT
);

CREATE INDEX idx_audit_actor ON public.admin_audit_log(actor_id, created_at DESC);
CREATE INDEX idx_audit_target ON public.admin_audit_log(target_type, target_id, created_at DESC);
CREATE INDEX idx_audit_action ON public.admin_audit_log(action, created_at DESC);
CREATE INDEX idx_audit_created_at ON public.admin_audit_log(created_at DESC);

ALTER TABLE public.admin_audit_log ENABLE ROW LEVEL SECURITY;

CREATE POLICY "No updates allowed" ON public.admin_audit_log FOR UPDATE USING (false);
CREATE POLICY "No deletes allowed" ON public.admin_audit_log FOR DELETE USING (false);

CREATE POLICY "Admins read audit log" ON public.admin_audit_log
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.user_roles
      WHERE user_id = auth.uid() AND role IN ('admin','support')
    )
  );

CREATE POLICY "Service writes audit log" ON public.admin_audit_log
  FOR INSERT WITH CHECK (true);