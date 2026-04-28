CREATE TABLE public.bond_claims (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenancy_id uuid REFERENCES public.tenancies(id) ON DELETE SET NULL,
  agent_id uuid NOT NULL REFERENCES public.agents(id) ON DELETE CASCADE,
  exit_inspection_id uuid REFERENCES public.property_inspections(id) ON DELETE SET NULL,
  bond_amount_held numeric NOT NULL DEFAULT 0,
  total_deductions numeric NOT NULL DEFAULT 0,
  claimed_amount numeric,
  status text NOT NULL DEFAULT 'draft',
  authority_name text,
  authority_reference text,
  lodged_date date,
  outcome_date date,
  outcome_amount numeric,
  notes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE public.bond_claim_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  claim_id uuid NOT NULL REFERENCES public.bond_claims(id) ON DELETE CASCADE,
  room_name text,
  description text NOT NULL,
  category text NOT NULL,
  amount numeric NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_bond_claims_agent ON public.bond_claims(agent_id);
CREATE INDEX idx_bond_claims_tenancy ON public.bond_claims(tenancy_id);
CREATE INDEX idx_bond_claim_items_claim ON public.bond_claim_items(claim_id);

ALTER TABLE public.bond_claims ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.bond_claim_items ENABLE ROW LEVEL SECURITY;

-- bond_claims policies (agent owns the row)
CREATE POLICY "Agents view own bond claims"
  ON public.bond_claims FOR SELECT TO authenticated
  USING (agent_id IN (SELECT id FROM public.agents WHERE user_id = auth.uid()));

CREATE POLICY "Agents insert own bond claims"
  ON public.bond_claims FOR INSERT TO authenticated
  WITH CHECK (agent_id IN (SELECT id FROM public.agents WHERE user_id = auth.uid()));

CREATE POLICY "Agents update own bond claims"
  ON public.bond_claims FOR UPDATE TO authenticated
  USING (agent_id IN (SELECT id FROM public.agents WHERE user_id = auth.uid()));

CREATE POLICY "Agents delete own bond claims"
  ON public.bond_claims FOR DELETE TO authenticated
  USING (agent_id IN (SELECT id FROM public.agents WHERE user_id = auth.uid()));

-- bond_claim_items policies (via parent claim)
CREATE POLICY "Agents view own bond claim items"
  ON public.bond_claim_items FOR SELECT TO authenticated
  USING (claim_id IN (
    SELECT id FROM public.bond_claims
    WHERE agent_id IN (SELECT id FROM public.agents WHERE user_id = auth.uid())
  ));

CREATE POLICY "Agents insert own bond claim items"
  ON public.bond_claim_items FOR INSERT TO authenticated
  WITH CHECK (claim_id IN (
    SELECT id FROM public.bond_claims
    WHERE agent_id IN (SELECT id FROM public.agents WHERE user_id = auth.uid())
  ));

CREATE POLICY "Agents update own bond claim items"
  ON public.bond_claim_items FOR UPDATE TO authenticated
  USING (claim_id IN (
    SELECT id FROM public.bond_claims
    WHERE agent_id IN (SELECT id FROM public.agents WHERE user_id = auth.uid())
  ));

CREATE POLICY "Agents delete own bond claim items"
  ON public.bond_claim_items FOR DELETE TO authenticated
  USING (claim_id IN (
    SELECT id FROM public.bond_claims
    WHERE agent_id IN (SELECT id FROM public.agents WHERE user_id = auth.uid())
  ));

CREATE TRIGGER update_bond_claims_updated_at
  BEFORE UPDATE ON public.bond_claims
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();