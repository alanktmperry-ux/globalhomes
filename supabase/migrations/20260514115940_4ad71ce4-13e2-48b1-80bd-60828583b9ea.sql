CREATE TABLE public.privacy_requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  email TEXT NOT NULL,
  request_type TEXT NOT NULL CHECK (request_type IN ('export','deletion','correction','consent_withdraw')),
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','in_progress','completed','rejected')),
  verification_token TEXT NOT NULL,
  verified_at TIMESTAMPTZ,
  fulfilled_at TIMESTAMPTZ,
  fulfilled_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  notes TEXT,
  export_url TEXT
);
CREATE INDEX idx_privacy_requests_status ON public.privacy_requests(status, created_at DESC);

CREATE TABLE public.service_health_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  service TEXT NOT NULL CHECK (service IN ('supabase','resend','stripe','openai','google_maps','cloudflare')),
  status TEXT NOT NULL CHECK (status IN ('healthy','degraded','down','unknown')),
  latency_ms INTEGER,
  error_message TEXT,
  checked_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX idx_health_log_service_time ON public.service_health_log(service, checked_at DESC);

ALTER TABLE public.privacy_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.service_health_log ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Public submit privacy requests" ON public.privacy_requests
  FOR INSERT WITH CHECK (true);

CREATE POLICY "Admins read privacy requests" ON public.privacy_requests
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.user_roles
      WHERE user_id = auth.uid() AND role = 'admin'
    )
  );

CREATE POLICY "Admins update privacy requests" ON public.privacy_requests
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM public.user_roles
      WHERE user_id = auth.uid() AND role = 'admin'
    )
  );

CREATE POLICY "Admins read health log" ON public.service_health_log
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.user_roles
      WHERE user_id = auth.uid() AND role IN ('admin','support')
    )
  );