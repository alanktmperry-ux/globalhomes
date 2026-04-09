
ALTER TABLE tenancies ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "tenancies_select" ON tenancies;
DROP POLICY IF EXISTS "tenancies_insert" ON tenancies;
DROP POLICY IF EXISTS "tenancies_update" ON tenancies;
DROP POLICY IF EXISTS "tenancies_no_delete" ON tenancies;

CREATE POLICY "tenancies_select" ON tenancies FOR SELECT
  USING (agent_id = (SELECT id FROM agents WHERE user_id = auth.uid()));

CREATE POLICY "tenancies_insert" ON tenancies FOR INSERT
  WITH CHECK (agent_id = (SELECT id FROM agents WHERE user_id = auth.uid()));

CREATE POLICY "tenancies_update" ON tenancies FOR UPDATE
  USING (agent_id = (SELECT id FROM agents WHERE user_id = auth.uid()))
  WITH CHECK (agent_id = (SELECT id FROM agents WHERE user_id = auth.uid()));

CREATE POLICY "tenancies_no_delete" ON tenancies FOR DELETE USING (false);

ALTER TABLE rent_payments ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "rent_payments_select" ON rent_payments;
DROP POLICY IF EXISTS "rent_payments_insert" ON rent_payments;
DROP POLICY IF EXISTS "rent_payments_update" ON rent_payments;
DROP POLICY IF EXISTS "rent_payments_no_delete" ON rent_payments;

CREATE POLICY "rent_payments_select" ON rent_payments FOR SELECT
  USING (agent_id = (SELECT id FROM agents WHERE user_id = auth.uid()));

CREATE POLICY "rent_payments_insert" ON rent_payments FOR INSERT
  WITH CHECK (agent_id = (SELECT id FROM agents WHERE user_id = auth.uid()));

CREATE POLICY "rent_payments_update" ON rent_payments FOR UPDATE
  USING (agent_id = (SELECT id FROM agents WHERE user_id = auth.uid()));

CREATE POLICY "rent_payments_no_delete" ON rent_payments FOR DELETE USING (false);
