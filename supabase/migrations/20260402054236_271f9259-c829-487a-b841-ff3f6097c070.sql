
-- Create agent_suppliers table
CREATE TABLE public.agent_suppliers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  agent_id uuid NOT NULL REFERENCES public.agents(id) ON DELETE CASCADE,
  supplier_name text NOT NULL,
  company_name text,
  email text NOT NULL,
  service_type text NOT NULL DEFAULT 'both',
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- Add marketing email columns to properties
ALTER TABLE public.properties
  ADD COLUMN IF NOT EXISTS marketing_email_sent boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS marketing_email_sent_at timestamptz;

-- RLS for agent_suppliers
ALTER TABLE public.agent_suppliers ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Agents can view own suppliers"
  ON public.agent_suppliers FOR SELECT
  TO authenticated
  USING (agent_id IN (SELECT id FROM public.agents WHERE user_id = auth.uid()));

CREATE POLICY "Agents can insert own suppliers"
  ON public.agent_suppliers FOR INSERT
  TO authenticated
  WITH CHECK (agent_id IN (SELECT id FROM public.agents WHERE user_id = auth.uid()));

CREATE POLICY "Agents can update own suppliers"
  ON public.agent_suppliers FOR UPDATE
  TO authenticated
  USING (agent_id IN (SELECT id FROM public.agents WHERE user_id = auth.uid()));

CREATE POLICY "Agents can delete own suppliers"
  ON public.agent_suppliers FOR DELETE
  TO authenticated
  USING (agent_id IN (SELECT id FROM public.agents WHERE user_id = auth.uid()));

-- Validate service_type
CREATE OR REPLACE FUNCTION public.validate_supplier_service_type()
  RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  IF NEW.service_type NOT IN ('signboard', 'photography', 'both') THEN
    RAISE EXCEPTION 'Invalid service_type: %', NEW.service_type;
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_validate_supplier_service_type
  BEFORE INSERT OR UPDATE ON public.agent_suppliers
  FOR EACH ROW EXECUTE FUNCTION public.validate_supplier_service_type();
