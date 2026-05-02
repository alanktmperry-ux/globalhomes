-- 1. Tenancies
ALTER TABLE public.tenancies
  ADD COLUMN IF NOT EXISTS rent_paid_to_date date,
  ADD COLUMN IF NOT EXISTS arrears_weeks decimal(5,2) NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS lease_type text NOT NULL DEFAULT 'fixed',
  ADD COLUMN IF NOT EXISTS vacating_date date,
  ADD COLUMN IF NOT EXISTS letting_fee_weeks decimal(4,2) DEFAULT 1.0,
  ADD COLUMN IF NOT EXISTS lease_renewal_fee_weeks decimal(4,2) DEFAULT 0.5,
  ADD COLUMN IF NOT EXISTS migration_batch_id uuid;

ALTER TABLE public.tenancies DROP CONSTRAINT IF EXISTS tenancies_lease_type_check;
ALTER TABLE public.tenancies ADD CONSTRAINT tenancies_lease_type_check
  CHECK (lease_type IN ('fixed', 'periodic', 'boarding'));

-- 2. Contacts
ALTER TABLE public.contacts
  ADD COLUMN IF NOT EXISTS abn text,
  ADD COLUMN IF NOT EXISTS acn text,
  ADD COLUMN IF NOT EXISTS entity_type text NOT NULL DEFAULT 'individual',
  ADD COLUMN IF NOT EXISTS gst_registered boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS statement_frequency text NOT NULL DEFAULT 'monthly',
  ADD COLUMN IF NOT EXISTS owner_bsb text,
  ADD COLUMN IF NOT EXISTS owner_account_number text,
  ADD COLUMN IF NOT EXISTS owner_account_name text,
  ADD COLUMN IF NOT EXISTS tax_file_number_provided boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS date_of_birth date,
  ADD COLUMN IF NOT EXISTS drivers_licence_number text,
  ADD COLUMN IF NOT EXISTS drivers_licence_state text,
  ADD COLUMN IF NOT EXISTS employer_name text,
  ADD COLUMN IF NOT EXISTS employer_phone text,
  ADD COLUMN IF NOT EXISTS emergency_contact_name text,
  ADD COLUMN IF NOT EXISTS emergency_contact_phone text,
  ADD COLUMN IF NOT EXISTS emergency_contact_relationship text,
  ADD COLUMN IF NOT EXISTS migration_batch_id uuid;

ALTER TABLE public.contacts DROP CONSTRAINT IF EXISTS contacts_entity_type_check;
ALTER TABLE public.contacts ADD CONSTRAINT contacts_entity_type_check
  CHECK (entity_type IN ('individual', 'company', 'trust', 'smsf', 'partnership'));

ALTER TABLE public.contacts DROP CONSTRAINT IF EXISTS contacts_statement_frequency_check;
ALTER TABLE public.contacts ADD CONSTRAINT contacts_statement_frequency_check
  CHECK (statement_frequency IN ('monthly', 'quarterly', 'on_disbursement'));

-- 3. Properties
ALTER TABLE public.properties
  ADD COLUMN IF NOT EXISTS pm_management_fee_percent decimal(5,2),
  ADD COLUMN IF NOT EXISTS pm_letting_fee_weeks decimal(4,2) DEFAULT 1.0,
  ADD COLUMN IF NOT EXISTS pm_lease_renewal_fee_weeks decimal(4,2) DEFAULT 0.5,
  ADD COLUMN IF NOT EXISTS pm_status text DEFAULT 'active',
  ADD COLUMN IF NOT EXISTS pm_owner_contact_id uuid REFERENCES public.contacts(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS migration_batch_id uuid;

ALTER TABLE public.properties DROP CONSTRAINT IF EXISTS properties_pm_status_check;
ALTER TABLE public.properties ADD CONSTRAINT properties_pm_status_check
  CHECK (pm_status IN ('active', 'vacant', 'periodic', 'notice_given', 'end_of_lease', 'archived'));

-- 4. trust_ledger_accounts
CREATE TABLE IF NOT EXISTS public.trust_ledger_accounts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  agent_id uuid NOT NULL REFERENCES public.agents(id) ON DELETE CASCADE,
  property_id uuid REFERENCES public.properties(id) ON DELETE SET NULL,
  tenancy_id uuid REFERENCES public.tenancies(id) ON DELETE SET NULL,
  migration_batch_id uuid,
  ledger_name text NOT NULL,
  ledger_type text NOT NULL DEFAULT 'rental',
  opening_balance numeric(12,2) NOT NULL DEFAULT 0,
  current_balance numeric(12,2) NOT NULL DEFAULT 0,
  cutover_date date NOT NULL,
  notes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.trust_ledger_accounts DROP CONSTRAINT IF EXISTS trust_ledger_accounts_type_check;
ALTER TABLE public.trust_ledger_accounts ADD CONSTRAINT trust_ledger_accounts_type_check
  CHECK (ledger_type IN ('rental', 'bond_held', 'sales_deposit', 'float', 'general'));

ALTER TABLE public.trust_ledger_accounts ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Agents can manage own ledger accounts" ON public.trust_ledger_accounts;
CREATE POLICY "Agents can manage own ledger accounts"
  ON public.trust_ledger_accounts
  FOR ALL TO authenticated
  USING (agent_id IN (SELECT id FROM agents WHERE user_id = auth.uid()))
  WITH CHECK (agent_id IN (SELECT id FROM agents WHERE user_id = auth.uid()));

-- 5. migration_batches
CREATE TABLE IF NOT EXISTS public.migration_batches (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  agent_id uuid NOT NULL REFERENCES public.agents(id) ON DELETE CASCADE,
  source_system text NOT NULL DEFAULT 'generic',
  cutover_date date NOT NULL,
  trust_opening_balance numeric(12,2) NOT NULL DEFAULT 0,
  property_count integer NOT NULL DEFAULT 0,
  tenancy_count integer NOT NULL DEFAULT 0,
  owner_count integer NOT NULL DEFAULT 0,
  tenant_count integer NOT NULL DEFAULT 0,
  ledger_account_count integer NOT NULL DEFAULT 0,
  status text NOT NULL DEFAULT 'pending',
  notes text,
  completed_at timestamptz,
  rolled_back_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.migration_batches DROP CONSTRAINT IF EXISTS migration_batches_source_check;
ALTER TABLE public.migration_batches ADD CONSTRAINT migration_batches_source_check
  CHECK (source_system IN (
    'propertyme', 'console_cloud', 'rockend_rest',
    'propertytree', 'managed_arthur', 'reapit',
    'trustsoft', 'generic'
  ));

ALTER TABLE public.migration_batches DROP CONSTRAINT IF EXISTS migration_batches_status_check;
ALTER TABLE public.migration_batches ADD CONSTRAINT migration_batches_status_check
  CHECK (status IN ('pending', 'in_progress', 'completed', 'rolled_back', 'failed'));

ALTER TABLE public.migration_batches ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Agents can manage own migration batches" ON public.migration_batches;
CREATE POLICY "Agents can manage own migration batches"
  ON public.migration_batches
  FOR ALL TO authenticated
  USING (agent_id IN (SELECT id FROM agents WHERE user_id = auth.uid()))
  WITH CHECK (agent_id IN (SELECT id FROM agents WHERE user_id = auth.uid()));

-- 6. FK to migration_batches
ALTER TABLE public.tenancies DROP CONSTRAINT IF EXISTS fk_tenancies_migration_batch;
ALTER TABLE public.tenancies ADD CONSTRAINT fk_tenancies_migration_batch
  FOREIGN KEY (migration_batch_id) REFERENCES public.migration_batches(id) ON DELETE SET NULL;

ALTER TABLE public.contacts DROP CONSTRAINT IF EXISTS fk_contacts_migration_batch;
ALTER TABLE public.contacts ADD CONSTRAINT fk_contacts_migration_batch
  FOREIGN KEY (migration_batch_id) REFERENCES public.migration_batches(id) ON DELETE SET NULL;

ALTER TABLE public.properties DROP CONSTRAINT IF EXISTS fk_properties_migration_batch;
ALTER TABLE public.properties ADD CONSTRAINT fk_properties_migration_batch
  FOREIGN KEY (migration_batch_id) REFERENCES public.migration_batches(id) ON DELETE SET NULL;

ALTER TABLE public.trust_ledger_accounts DROP CONSTRAINT IF EXISTS fk_trust_ledger_migration_batch;
ALTER TABLE public.trust_ledger_accounts ADD CONSTRAINT fk_trust_ledger_migration_batch
  FOREIGN KEY (migration_batch_id) REFERENCES public.migration_batches(id) ON DELETE SET NULL;

-- 7. Rollback function
CREATE OR REPLACE FUNCTION public.rollback_migration_batch(p_batch_id uuid, p_agent_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_tenancy_count integer;
  v_property_count integer;
  v_contact_count integer;
  v_ledger_count integer;
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM migration_batches
    WHERE id = p_batch_id AND agent_id = p_agent_id AND status = 'completed'
  ) THEN
    RETURN jsonb_build_object('success', false, 'error', 'Batch not found or not owned by this agent');
  END IF;

  DELETE FROM trust_ledger_accounts
  WHERE migration_batch_id = p_batch_id AND agent_id = p_agent_id;
  GET DIAGNOSTICS v_ledger_count = ROW_COUNT;

  DELETE FROM rent_payments rp
  USING tenancies t
  WHERE rp.tenancy_id = t.id AND t.migration_batch_id = p_batch_id AND t.agent_id = p_agent_id;

  DELETE FROM tenancies
  WHERE migration_batch_id = p_batch_id AND agent_id = p_agent_id;
  GET DIAGNOSTICS v_tenancy_count = ROW_COUNT;

  DELETE FROM properties
  WHERE migration_batch_id = p_batch_id AND agent_id = p_agent_id;
  GET DIAGNOSTICS v_property_count = ROW_COUNT;

  DELETE FROM contacts
  WHERE migration_batch_id = p_batch_id AND created_by = p_agent_id;
  GET DIAGNOSTICS v_contact_count = ROW_COUNT;

  UPDATE migration_batches
  SET status = 'rolled_back', rolled_back_at = now()
  WHERE id = p_batch_id;

  RETURN jsonb_build_object(
    'success', true,
    'tenancies_deleted', v_tenancy_count,
    'properties_deleted', v_property_count,
    'contacts_deleted', v_contact_count,
    'ledger_accounts_deleted', v_ledger_count
  );
END;
$$;

-- 8. Validation function
CREATE OR REPLACE FUNCTION public.validate_migration_balances(p_batch_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_ledger_total numeric;
  v_trust_opening numeric;
  v_difference numeric;
BEGIN
  SELECT COALESCE(SUM(opening_balance), 0)
  INTO v_ledger_total
  FROM trust_ledger_accounts
  WHERE migration_batch_id = p_batch_id;

  SELECT trust_opening_balance
  INTO v_trust_opening
  FROM migration_batches
  WHERE id = p_batch_id;

  v_difference := v_trust_opening - v_ledger_total;

  RETURN jsonb_build_object(
    'trust_opening_balance', v_trust_opening,
    'ledger_total', v_ledger_total,
    'difference', v_difference,
    'balanced', (ABS(v_difference) < 0.01)
  );
END;
$$;