CREATE TABLE IF NOT EXISTS public.bond_claims (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  inspection_id uuid,
  property_id uuid,
  tenancy_id uuid,
  agent_id uuid,
  deductions jsonb,
  total_claimed numeric,
  status text NOT NULL DEFAULT 'pending',
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.bond_claims ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Agents can view own bond claims" ON public.bond_claims;
CREATE POLICY "Agents can view own bond claims"
ON public.bond_claims FOR SELECT
USING (agent_id IN (SELECT id FROM public.agents WHERE user_id = auth.uid()));

DROP POLICY IF EXISTS "Agents can create own bond claims" ON public.bond_claims;
CREATE POLICY "Agents can create own bond claims"
ON public.bond_claims FOR INSERT
WITH CHECK (agent_id IN (SELECT id FROM public.agents WHERE user_id = auth.uid()));