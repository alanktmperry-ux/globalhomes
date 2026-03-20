
-- New columns on properties
ALTER TABLE public.properties
  ADD COLUMN IF NOT EXISTS available_from date,
  ADD COLUMN IF NOT EXISTS lease_term text,
  ADD COLUMN IF NOT EXISTS furnished boolean DEFAULT false,
  ADD COLUMN IF NOT EXISTS pets_allowed boolean DEFAULT false;

-- Tenancies
CREATE TABLE public.tenancies (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  property_id uuid NOT NULL REFERENCES public.properties(id) ON DELETE CASCADE,
  agent_id uuid NOT NULL REFERENCES public.agents(id) ON DELETE CASCADE,
  tenant_contact_id uuid REFERENCES public.contacts(id) ON DELETE SET NULL,
  tenant_name text NOT NULL,
  tenant_email text,
  tenant_phone text,
  lease_start date NOT NULL,
  lease_end date NOT NULL,
  rent_amount decimal(10,2) NOT NULL,
  rent_frequency text NOT NULL DEFAULT 'weekly',
  bond_amount decimal(10,2) NOT NULL,
  bond_lodgement_number text,
  bond_authority text DEFAULT 'RTBA',
  management_fee_percent decimal(5,2) NOT NULL DEFAULT 8.00,
  owner_name text,
  owner_email text,
  owner_bsb text,
  owner_account_number text,
  status text NOT NULL DEFAULT 'active',
  notes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE OR REPLACE FUNCTION public.validate_tenancy() RETURNS trigger LANGUAGE plpgsql SET search_path TO 'public' AS $$
BEGIN
  IF NEW.rent_frequency NOT IN ('weekly','fortnightly','monthly') THEN
    RAISE EXCEPTION 'Invalid rent_frequency: %', NEW.rent_frequency;
  END IF;
  IF NEW.status NOT IN ('active','vacating','ended','pending') THEN
    RAISE EXCEPTION 'Invalid tenancy status: %', NEW.status;
  END IF;
  RETURN NEW;
END;$$;

CREATE TRIGGER trg_validate_tenancy BEFORE INSERT OR UPDATE ON public.tenancies
  FOR EACH ROW EXECUTE FUNCTION public.validate_tenancy();

-- Rent payments
CREATE TABLE public.rent_payments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenancy_id uuid NOT NULL REFERENCES public.tenancies(id) ON DELETE CASCADE,
  agent_id uuid NOT NULL REFERENCES public.agents(id),
  amount decimal(10,2) NOT NULL,
  payment_date date NOT NULL,
  period_from date NOT NULL,
  period_to date NOT NULL,
  receipt_number text NOT NULL,
  payment_method text NOT NULL DEFAULT 'bank_transfer',
  status text NOT NULL DEFAULT 'paid',
  notes text,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE OR REPLACE FUNCTION public.validate_rent_payment() RETURNS trigger LANGUAGE plpgsql SET search_path TO 'public' AS $$
BEGIN
  IF NEW.payment_method NOT IN ('bank_transfer','cash','cheque','bpay') THEN
    RAISE EXCEPTION 'Invalid payment_method: %', NEW.payment_method;
  END IF;
  IF NEW.status NOT IN ('paid','pending','overdue','reversed') THEN
    RAISE EXCEPTION 'Invalid rent payment status: %', NEW.status;
  END IF;
  RETURN NEW;
END;$$;

CREATE TRIGGER trg_validate_rent_payment BEFORE INSERT OR UPDATE ON public.rent_payments
  FOR EACH ROW EXECUTE FUNCTION public.validate_rent_payment();

-- Maintenance jobs
CREATE TABLE public.maintenance_jobs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenancy_id uuid REFERENCES public.tenancies(id) ON DELETE CASCADE,
  property_id uuid NOT NULL REFERENCES public.properties(id),
  agent_id uuid NOT NULL REFERENCES public.agents(id),
  reported_by text NOT NULL DEFAULT 'tenant',
  title text NOT NULL,
  description text,
  priority text NOT NULL DEFAULT 'routine',
  status text NOT NULL DEFAULT 'new',
  assigned_to text,
  assigned_phone text,
  estimated_cost decimal(10,2),
  actual_cost decimal(10,2),
  completed_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE OR REPLACE FUNCTION public.validate_maintenance_job() RETURNS trigger LANGUAGE plpgsql SET search_path TO 'public' AS $$
BEGIN
  IF NEW.priority NOT IN ('urgent','routine','low') THEN
    RAISE EXCEPTION 'Invalid priority: %', NEW.priority;
  END IF;
  IF NEW.status NOT IN ('new','assigned','quoted','in_progress','completed','cancelled') THEN
    RAISE EXCEPTION 'Invalid maintenance status: %', NEW.status;
  END IF;
  RETURN NEW;
END;$$;

CREATE TRIGGER trg_validate_maintenance_job BEFORE INSERT OR UPDATE ON public.maintenance_jobs
  FOR EACH ROW EXECUTE FUNCTION public.validate_maintenance_job();

-- updated_at triggers
CREATE TRIGGER trg_tenancies_updated_at BEFORE UPDATE ON public.tenancies
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER trg_maintenance_jobs_updated_at BEFORE UPDATE ON public.maintenance_jobs
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- RLS
ALTER TABLE public.tenancies ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.rent_payments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.maintenance_jobs ENABLE ROW LEVEL SECURITY;

-- Tenancies policies
CREATE POLICY "Agents can view own tenancies" ON public.tenancies FOR SELECT TO authenticated
  USING (agent_id IN (SELECT id FROM public.agents WHERE user_id = auth.uid()));
CREATE POLICY "Agents can insert own tenancies" ON public.tenancies FOR INSERT TO authenticated
  WITH CHECK (agent_id IN (SELECT id FROM public.agents WHERE user_id = auth.uid()));
CREATE POLICY "Agents can update own tenancies" ON public.tenancies FOR UPDATE TO authenticated
  USING (agent_id IN (SELECT id FROM public.agents WHERE user_id = auth.uid()));
CREATE POLICY "Agents can delete own tenancies" ON public.tenancies FOR DELETE TO authenticated
  USING (agent_id IN (SELECT id FROM public.agents WHERE user_id = auth.uid()));

-- Rent payments policies
CREATE POLICY "Agents can view own rent payments" ON public.rent_payments FOR SELECT TO authenticated
  USING (agent_id IN (SELECT id FROM public.agents WHERE user_id = auth.uid()));
CREATE POLICY "Agents can insert own rent payments" ON public.rent_payments FOR INSERT TO authenticated
  WITH CHECK (agent_id IN (SELECT id FROM public.agents WHERE user_id = auth.uid()));
CREATE POLICY "Agents can update own rent payments" ON public.rent_payments FOR UPDATE TO authenticated
  USING (agent_id IN (SELECT id FROM public.agents WHERE user_id = auth.uid()));
CREATE POLICY "Agents can delete own rent payments" ON public.rent_payments FOR DELETE TO authenticated
  USING (agent_id IN (SELECT id FROM public.agents WHERE user_id = auth.uid()));

-- Maintenance jobs policies
CREATE POLICY "Agents can view own maintenance jobs" ON public.maintenance_jobs FOR SELECT TO authenticated
  USING (agent_id IN (SELECT id FROM public.agents WHERE user_id = auth.uid()));
CREATE POLICY "Agents can insert own maintenance jobs" ON public.maintenance_jobs FOR INSERT TO authenticated
  WITH CHECK (agent_id IN (SELECT id FROM public.agents WHERE user_id = auth.uid()));
CREATE POLICY "Agents can update own maintenance jobs" ON public.maintenance_jobs FOR UPDATE TO authenticated
  USING (agent_id IN (SELECT id FROM public.agents WHERE user_id = auth.uid()));
CREATE POLICY "Agents can delete own maintenance jobs" ON public.maintenance_jobs FOR DELETE TO authenticated
  USING (agent_id IN (SELECT id FROM public.agents WHERE user_id = auth.uid()));
