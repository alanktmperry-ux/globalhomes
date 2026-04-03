-- Error log table for production monitoring
CREATE TABLE public.error_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  function_name TEXT NOT NULL,
  error_message TEXT NOT NULL,
  error_stack TEXT,
  context JSONB,
  severity TEXT NOT NULL DEFAULT 'error',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Index for querying recent errors
CREATE INDEX idx_error_log_created_at ON public.error_log (created_at DESC);
CREATE INDEX idx_error_log_function ON public.error_log (function_name, created_at DESC);

-- Enable RLS
ALTER TABLE public.error_log ENABLE ROW LEVEL SECURITY;

-- Only service role can insert (from edge functions)
-- Admins can read
CREATE POLICY "Admins can read error logs"
ON public.error_log FOR SELECT TO authenticated
USING (public.has_role(auth.uid(), 'admin'));
