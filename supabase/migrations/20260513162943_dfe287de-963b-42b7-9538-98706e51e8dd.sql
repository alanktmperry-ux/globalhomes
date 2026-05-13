CREATE TABLE IF NOT EXISTS public.rent_increase_notices (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  tenancy_id uuid NOT NULL,
  agent_id uuid NOT NULL,
  old_rent_amount numeric NOT NULL,
  new_rent_amount numeric NOT NULL,
  effective_date date NOT NULL,
  notice_sent_date date NOT NULL,
  notes text,
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_rent_increase_notices_tenancy ON public.rent_increase_notices (tenancy_id);
CREATE INDEX IF NOT EXISTS idx_rent_increase_notices_agent ON public.rent_increase_notices (agent_id);

ALTER TABLE public.rent_increase_notices ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Agents can view own rent increase notices"
  ON public.rent_increase_notices
  FOR SELECT
  USING (agent_id = public.get_my_agent_id());

CREATE POLICY "Agents can insert own rent increase notices"
  ON public.rent_increase_notices
  FOR INSERT
  WITH CHECK (agent_id = public.get_my_agent_id());

CREATE POLICY "Agents can update own rent increase notices"
  ON public.rent_increase_notices
  FOR UPDATE
  USING (agent_id = public.get_my_agent_id());