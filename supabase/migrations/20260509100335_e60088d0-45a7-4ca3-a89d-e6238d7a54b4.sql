
CREATE TABLE IF NOT EXISTS public.auth_audit_log (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  email text,
  event_type text NOT NULL CHECK (event_type IN (
    'signup_attempted','signup_blocked_disposable','signup_blocked_breached_password',
    'signup_blocked_captcha','signup_succeeded','signup_verified',
    'login_succeeded','login_failed','password_reset_requested','password_reset_completed',
    'password_changed','role_granted','email_changed',
    'email_bounced','email_complained','email_delivered','session_revoked'
  )),
  event_data jsonb DEFAULT '{}'::jsonb,
  ip inet,
  user_agent text,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.auth_audit_log ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "admins read audit" ON public.auth_audit_log;
CREATE POLICY "admins read audit" ON public.auth_audit_log
  FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

DROP POLICY IF EXISTS "service role writes audit" ON public.auth_audit_log;
CREATE POLICY "service role writes audit" ON public.auth_audit_log
  FOR INSERT TO service_role
  WITH CHECK (true);

CREATE INDEX IF NOT EXISTS idx_audit_user_time ON public.auth_audit_log(user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_audit_event_time ON public.auth_audit_log(event_type, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_audit_email_time ON public.auth_audit_log(email, created_at DESC);

ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS email_delivery_status text
    CHECK (email_delivery_status IN ('pending','delivered','bounced','complained'))
    DEFAULT 'pending',
  ADD COLUMN IF NOT EXISTS email_last_event_at timestamptz,
  ADD COLUMN IF NOT EXISTS email_bounce_reason text;
