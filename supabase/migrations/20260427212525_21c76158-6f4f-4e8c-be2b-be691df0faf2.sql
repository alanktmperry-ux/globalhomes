-- Track API usage events for cost monitoring
CREATE TABLE public.api_usage_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  service TEXT NOT NULL,
  action TEXT NOT NULL,
  units NUMERIC NOT NULL DEFAULT 1,
  cost_estimate NUMERIC NOT NULL DEFAULT 0,
  user_id UUID,
  metadata JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_usage_service_date ON public.api_usage_events(service, created_at DESC);
CREATE INDEX idx_usage_created_at ON public.api_usage_events(created_at DESC);
CREATE INDEX idx_usage_user_id ON public.api_usage_events(user_id) WHERE user_id IS NOT NULL;

-- Enable RLS
ALTER TABLE public.api_usage_events ENABLE ROW LEVEL SECURITY;

-- Helper to detect platform admin without cross-table recursion concerns
CREATE OR REPLACE FUNCTION public.is_platform_admin(_user_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = _user_id AND role = 'admin'
  );
$$;

-- Only admins can read cost data
CREATE POLICY "Admins can view all usage events"
ON public.api_usage_events
FOR SELECT
TO authenticated
USING (public.is_platform_admin(auth.uid()));

-- Authenticated users (including edge functions w/ user JWT) can insert their own events
CREATE POLICY "Authenticated users can log own usage"
ON public.api_usage_events
FOR INSERT
TO authenticated
WITH CHECK (user_id IS NULL OR user_id = auth.uid());

-- Service role / edge functions using anon key can also insert (no user)
CREATE POLICY "Anon can log anonymous usage"
ON public.api_usage_events
FOR INSERT
TO anon
WITH CHECK (user_id IS NULL);