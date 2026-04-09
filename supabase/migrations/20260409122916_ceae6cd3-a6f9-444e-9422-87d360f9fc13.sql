
-- ===== TENANCIES RLS =====
ALTER TABLE tenancies ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Agent tenancies" ON tenancies;
DROP POLICY IF EXISTS "Agent manages own tenancies" ON tenancies;
DROP POLICY IF EXISTS "tenancies_select" ON tenancies;
DROP POLICY IF EXISTS "tenancies_insert" ON tenancies;
DROP POLICY IF EXISTS "tenancies_update" ON tenancies;
DROP POLICY IF EXISTS "tenancies_no_delete" ON tenancies;

CREATE POLICY "tenancies_select" ON tenancies
  FOR SELECT USING (
    agent_id = public.get_my_agent_id()
  );

CREATE POLICY "tenancies_insert" ON tenancies
  FOR INSERT WITH CHECK (
    agent_id = public.get_my_agent_id()
  );

CREATE POLICY "tenancies_update" ON tenancies
  FOR UPDATE USING (
    agent_id = public.get_my_agent_id()
  ) WITH CHECK (
    agent_id = public.get_my_agent_id()
  );

CREATE POLICY "tenancies_no_delete" ON tenancies
  FOR DELETE USING (false);

-- ===== RENT PAYMENTS RLS =====
ALTER TABLE rent_payments ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Agent rent payments" ON rent_payments;
DROP POLICY IF EXISTS "rent_payments_select" ON rent_payments;
DROP POLICY IF EXISTS "rent_payments_insert" ON rent_payments;
DROP POLICY IF EXISTS "rent_payments_update" ON rent_payments;
DROP POLICY IF EXISTS "rent_payments_no_delete" ON rent_payments;

CREATE POLICY "rent_payments_select" ON rent_payments
  FOR SELECT USING (
    agent_id = public.get_my_agent_id()
  );

CREATE POLICY "rent_payments_insert" ON rent_payments
  FOR INSERT WITH CHECK (
    agent_id = public.get_my_agent_id()
  );

CREATE POLICY "rent_payments_update" ON rent_payments
  FOR UPDATE USING (
    agent_id = public.get_my_agent_id()
  );

CREATE POLICY "rent_payments_no_delete" ON rent_payments
  FOR DELETE USING (false);

-- ===== TRUST IMMUTABILITY TRIGGERS =====
CREATE OR REPLACE FUNCTION public.prevent_trust_entry_update()
RETURNS TRIGGER AS $$
BEGIN
  RAISE EXCEPTION 'Trust entries are immutable under the Agents Financial Administration Act 2014. Create a correction entry instead.';
END;
$$ LANGUAGE plpgsql SET search_path = public;

DROP TRIGGER IF EXISTS trust_receipts_immutable ON trust_receipts;
CREATE TRIGGER trust_receipts_immutable
  BEFORE UPDATE ON trust_receipts
  FOR EACH ROW EXECUTE FUNCTION public.prevent_trust_entry_update();

DROP TRIGGER IF EXISTS trust_payments_immutable ON trust_payments;
CREATE TRIGGER trust_payments_immutable
  BEFORE UPDATE ON trust_payments
  FOR EACH ROW EXECUTE FUNCTION public.prevent_trust_entry_update();

-- ===== TENANCY CONSTRAINTS =====
ALTER TABLE tenancies DROP CONSTRAINT IF EXISTS lease_dates_valid;
ALTER TABLE tenancies ADD CONSTRAINT lease_dates_valid
  CHECK (lease_end > lease_start);

-- Using 'ended' to match existing validate_tenancy() trigger (not 'vacated')
ALTER TABLE tenancies DROP CONSTRAINT IF EXISTS tenancy_status_valid;
ALTER TABLE tenancies ADD CONSTRAINT tenancy_status_valid
  CHECK (status IN ('active', 'vacating', 'ended', 'pending'));
