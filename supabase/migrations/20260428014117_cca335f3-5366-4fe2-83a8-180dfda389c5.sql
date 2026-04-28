CREATE TABLE public.key_register (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  agent_id uuid NOT NULL REFERENCES public.agents(id) ON DELETE CASCADE,
  property_id uuid NOT NULL REFERENCES public.properties(id) ON DELETE CASCADE,
  tenancy_id uuid REFERENCES public.tenancies(id) ON DELETE SET NULL,
  key_type text NOT NULL CHECK (key_type IN ('front_door','back_door','garage','letterbox','pool','common_area','side_gate','storage','other')),
  description text,
  tag_number text,
  total_sets integer NOT NULL DEFAULT 1,
  status text NOT NULL DEFAULT 'available' CHECK (status IN ('available','issued','lost','cut')),
  issued_to_name text,
  issued_to_type text CHECK (issued_to_type IS NULL OR issued_to_type IN ('tenant','owner','agent','tradesperson','contractor','other')),
  issued_date date,
  expected_return_date date,
  returned_date date,
  notes text,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_key_register_agent_id ON public.key_register(agent_id);
CREATE INDEX idx_key_register_property_id ON public.key_register(property_id);
CREATE INDEX idx_key_register_tenancy_id ON public.key_register(tenancy_id);

ALTER TABLE public.key_register ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Agents can view their own keys"
ON public.key_register FOR SELECT
USING (agent_id = public.get_agent_id_for_user(auth.uid()));

CREATE POLICY "Agents can insert their own keys"
ON public.key_register FOR INSERT
WITH CHECK (agent_id = public.get_agent_id_for_user(auth.uid()));

CREATE POLICY "Agents can update their own keys"
ON public.key_register FOR UPDATE
USING (agent_id = public.get_agent_id_for_user(auth.uid()));

CREATE POLICY "Agents can delete their own keys"
ON public.key_register FOR DELETE
USING (agent_id = public.get_agent_id_for_user(auth.uid()));