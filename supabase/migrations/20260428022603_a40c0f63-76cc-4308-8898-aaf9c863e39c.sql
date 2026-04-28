CREATE TABLE public.smoke_alarm_records (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  property_id uuid NOT NULL REFERENCES public.properties(id) ON DELETE CASCADE,
  agent_id uuid NOT NULL REFERENCES public.agents(id) ON DELETE CASCADE,
  service_date date NOT NULL,
  next_service_due date NOT NULL,
  alarm_type text,
  alarm_count integer NOT NULL DEFAULT 1,
  compliance_status text NOT NULL DEFAULT 'compliant',
  certificate_number text,
  technician_name text,
  technician_company text,
  notes text,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_smoke_alarm_records_property ON public.smoke_alarm_records(property_id);
CREATE INDEX idx_smoke_alarm_records_agent ON public.smoke_alarm_records(agent_id);
CREATE INDEX idx_smoke_alarm_records_next_due ON public.smoke_alarm_records(next_service_due);

ALTER TABLE public.smoke_alarm_records ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Agents view own smoke alarm records"
  ON public.smoke_alarm_records FOR SELECT TO authenticated
  USING (agent_id IN (SELECT id FROM public.agents WHERE user_id = auth.uid()));

CREATE POLICY "Agents insert own smoke alarm records"
  ON public.smoke_alarm_records FOR INSERT TO authenticated
  WITH CHECK (agent_id IN (SELECT id FROM public.agents WHERE user_id = auth.uid()));

CREATE POLICY "Agents update own smoke alarm records"
  ON public.smoke_alarm_records FOR UPDATE TO authenticated
  USING (agent_id IN (SELECT id FROM public.agents WHERE user_id = auth.uid()));

CREATE POLICY "Agents delete own smoke alarm records"
  ON public.smoke_alarm_records FOR DELETE TO authenticated
  USING (agent_id IN (SELECT id FROM public.agents WHERE user_id = auth.uid()));