CREATE TABLE public.water_bills (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenancy_id uuid NOT NULL REFERENCES public.tenancies(id) ON DELETE CASCADE,
  period_start date NOT NULL,
  period_end date NOT NULL,
  start_reading numeric NOT NULL,
  end_reading numeric NOT NULL,
  usage_kl numeric GENERATED ALWAYS AS (end_reading - start_reading) STORED,
  rate_per_kl numeric NOT NULL DEFAULT 3.00,
  supply_charge numeric DEFAULT 0,
  usage_charge numeric GENERATED ALWAYS AS ((end_reading - start_reading) * rate_per_kl) STORED,
  total_amount numeric GENERATED ALWAYS AS ((end_reading - start_reading) * rate_per_kl + COALESCE(supply_charge, 0)) STORED,
  status text DEFAULT 'draft',
  invoice_date date,
  paid_date date,
  notes text,
  created_at timestamptz DEFAULT now()
);

CREATE INDEX idx_water_bills_tenancy ON public.water_bills(tenancy_id);

ALTER TABLE public.water_bills ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Agents can view water bills for their tenancies"
ON public.water_bills FOR SELECT
USING (EXISTS (
  SELECT 1 FROM public.tenancies t
  JOIN public.agents a ON a.id = t.agent_id
  WHERE t.id = water_bills.tenancy_id AND a.user_id = auth.uid()
));

CREATE POLICY "Agents can insert water bills for their tenancies"
ON public.water_bills FOR INSERT
WITH CHECK (EXISTS (
  SELECT 1 FROM public.tenancies t
  JOIN public.agents a ON a.id = t.agent_id
  WHERE t.id = water_bills.tenancy_id AND a.user_id = auth.uid()
));

CREATE POLICY "Agents can update water bills for their tenancies"
ON public.water_bills FOR UPDATE
USING (EXISTS (
  SELECT 1 FROM public.tenancies t
  JOIN public.agents a ON a.id = t.agent_id
  WHERE t.id = water_bills.tenancy_id AND a.user_id = auth.uid()
));

CREATE POLICY "Agents can delete water bills for their tenancies"
ON public.water_bills FOR DELETE
USING (EXISTS (
  SELECT 1 FROM public.tenancies t
  JOIN public.agents a ON a.id = t.agent_id
  WHERE t.id = water_bills.tenancy_id AND a.user_id = auth.uid()
));