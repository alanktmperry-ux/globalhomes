CREATE TABLE IF NOT EXISTS public.rent_increases (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenancy_id uuid NOT NULL REFERENCES public.tenancies(id) ON DELETE CASCADE,
  old_amount numeric NOT NULL,
  new_amount numeric NOT NULL,
  rent_frequency text NOT NULL,
  effective_date date NOT NULL,
  notice_sent_date date,
  status text NOT NULL DEFAULT 'scheduled',
  notes text,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_rent_increases_tenancy ON public.rent_increases(tenancy_id);
CREATE INDEX IF NOT EXISTS idx_rent_increases_effective ON public.rent_increases(effective_date DESC);

ALTER TABLE public.rent_increases ENABLE ROW LEVEL SECURITY;

-- Security definer helper to avoid cross-table RLS recursion
CREATE OR REPLACE FUNCTION public.is_tenancy_agent(_tenancy_id uuid, _user_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.tenancies t
    WHERE t.id = _tenancy_id AND t.agent_id = _user_id
  );
$$;

CREATE POLICY "Agents can view their tenancies' rent increases"
  ON public.rent_increases FOR SELECT
  USING (public.is_tenancy_agent(tenancy_id, auth.uid()));

CREATE POLICY "Agents can insert rent increases for their tenancies"
  ON public.rent_increases FOR INSERT
  WITH CHECK (public.is_tenancy_agent(tenancy_id, auth.uid()));

CREATE POLICY "Agents can update rent increases for their tenancies"
  ON public.rent_increases FOR UPDATE
  USING (public.is_tenancy_agent(tenancy_id, auth.uid()));

CREATE POLICY "Agents can delete rent increases for their tenancies"
  ON public.rent_increases FOR DELETE
  USING (public.is_tenancy_agent(tenancy_id, auth.uid()));