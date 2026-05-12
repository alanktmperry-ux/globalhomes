CREATE TABLE IF NOT EXISTS public.csp_violations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  document_uri text,
  blocked_uri text,
  violated_directive text,
  effective_directive text,
  source_file text,
  line_number integer,
  column_number integer,
  user_agent text,
  raw_report jsonb,
  reported_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_csp_violations_reported_at ON public.csp_violations(reported_at DESC);
CREATE INDEX IF NOT EXISTS idx_csp_violations_directive ON public.csp_violations(violated_directive);

ALTER TABLE public.csp_violations ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "service_role_only_csp" ON public.csp_violations;
CREATE POLICY "service_role_only_csp"
  ON public.csp_violations
  FOR ALL TO service_role
  USING (true) WITH CHECK (true);