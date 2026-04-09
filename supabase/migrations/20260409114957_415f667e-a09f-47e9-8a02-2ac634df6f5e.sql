
-- Trust receipts
ALTER TABLE trust_receipts ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Agent trust receipts" ON trust_receipts;
CREATE POLICY "Agent trust receipts" ON trust_receipts FOR ALL
  USING (agent_id = (SELECT id FROM agents WHERE user_id = auth.uid()));

-- Trust payments
ALTER TABLE trust_payments ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Agent trust payments" ON trust_payments;
CREATE POLICY "Agent trust payments" ON trust_payments FOR ALL
  USING (agent_id = (SELECT id FROM agents WHERE user_id = auth.uid()));

-- Trust transactions
ALTER TABLE trust_transactions ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Agent trust transactions" ON trust_transactions;
CREATE POLICY "Agent trust transactions" ON trust_transactions FOR ALL
  USING (trust_account_id IN (
    SELECT id FROM trust_accounts
    WHERE agent_id = (SELECT id FROM agents WHERE user_id = auth.uid())
  ));

-- Tenancies
ALTER TABLE tenancies ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Agent tenancies" ON tenancies;
CREATE POLICY "Agent tenancies" ON tenancies FOR ALL
  USING (agent_id = (SELECT id FROM agents WHERE user_id = auth.uid()));

-- Rent payments
ALTER TABLE rent_payments ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Agent rent payments" ON rent_payments;
CREATE POLICY "Agent rent payments" ON rent_payments FOR ALL
  USING (agent_id = (SELECT id FROM agents WHERE user_id = auth.uid()));

-- Rental applications
ALTER TABLE rental_applications ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Applicant own" ON rental_applications;
DROP POLICY IF EXISTS "Agent sees applications" ON rental_applications;
CREATE POLICY "Applicant own" ON rental_applications FOR SELECT
  USING (auth.uid() = user_id);
CREATE POLICY "Agent sees applications" ON rental_applications FOR ALL
  USING (EXISTS (
    SELECT 1 FROM properties p JOIN agents a ON a.id = p.agent_id
    WHERE p.id = property_id AND a.user_id = auth.uid()
  ));
