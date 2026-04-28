CREATE TABLE public.tica_checks (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  application_id uuid NOT NULL REFERENCES public.rental_applications(id) ON DELETE CASCADE,
  applicant_name text NOT NULL,
  checked_by_agent_id uuid REFERENCES public.agents(id),
  check_date date NOT NULL DEFAULT current_date,
  result text NOT NULL DEFAULT 'not_checked',
  listing_types text[],
  tica_reference text,
  notes text,
  created_at timestamptz DEFAULT now()
);

CREATE INDEX idx_tica_checks_application ON public.tica_checks(application_id);
CREATE INDEX idx_tica_checks_agent ON public.tica_checks(checked_by_agent_id);

ALTER TABLE public.tica_checks ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Agents view their TICA checks"
ON public.tica_checks FOR SELECT
USING (EXISTS (
  SELECT 1 FROM public.agents a
  WHERE a.id = tica_checks.checked_by_agent_id AND a.user_id = auth.uid()
));

CREATE POLICY "Agents insert TICA checks"
ON public.tica_checks FOR INSERT
WITH CHECK (EXISTS (
  SELECT 1 FROM public.agents a
  WHERE a.id = tica_checks.checked_by_agent_id AND a.user_id = auth.uid()
));

CREATE POLICY "Agents update their TICA checks"
ON public.tica_checks FOR UPDATE
USING (EXISTS (
  SELECT 1 FROM public.agents a
  WHERE a.id = tica_checks.checked_by_agent_id AND a.user_id = auth.uid()
));

CREATE POLICY "Agents delete their TICA checks"
ON public.tica_checks FOR DELETE
USING (EXISTS (
  SELECT 1 FROM public.agents a
  WHERE a.id = tica_checks.checked_by_agent_id AND a.user_id = auth.uid()
));