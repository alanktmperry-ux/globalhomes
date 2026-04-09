-- ================================================
-- COMPLETE FINAL RLS BLOCK
-- ================================================

-- TENANCIES
ALTER TABLE tenancies ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "tenancies_select" ON tenancies;
DROP POLICY IF EXISTS "tenancies_insert" ON tenancies;
DROP POLICY IF EXISTS "tenancies_update" ON tenancies;
DROP POLICY IF EXISTS "tenancies_no_delete" ON tenancies;
DROP POLICY IF EXISTS "Agent tenancies" ON tenancies;

CREATE POLICY "tenancies_select" ON tenancies FOR SELECT
  USING (agent_id = (SELECT id FROM agents WHERE user_id = auth.uid()));
CREATE POLICY "tenancies_insert" ON tenancies FOR INSERT
  WITH CHECK (agent_id = (SELECT id FROM agents WHERE user_id = auth.uid()));
CREATE POLICY "tenancies_update" ON tenancies FOR UPDATE
  USING (agent_id = (SELECT id FROM agents WHERE user_id = auth.uid()))
  WITH CHECK (agent_id = (SELECT id FROM agents WHERE user_id = auth.uid()));
CREATE POLICY "tenancies_no_delete" ON tenancies FOR DELETE USING (false);

-- RENT_PAYMENTS
ALTER TABLE rent_payments ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "rent_payments_select" ON rent_payments;
DROP POLICY IF EXISTS "rent_payments_insert" ON rent_payments;
DROP POLICY IF EXISTS "rent_payments_update" ON rent_payments;
DROP POLICY IF EXISTS "rent_payments_no_delete" ON rent_payments;
DROP POLICY IF EXISTS "Agent rent payments" ON rent_payments;

CREATE POLICY "rent_payments_select" ON rent_payments FOR SELECT
  USING (agent_id = (SELECT id FROM agents WHERE user_id = auth.uid()));
CREATE POLICY "rent_payments_insert" ON rent_payments FOR INSERT
  WITH CHECK (agent_id = (SELECT id FROM agents WHERE user_id = auth.uid()));
CREATE POLICY "rent_payments_update" ON rent_payments FOR UPDATE
  USING (agent_id = (SELECT id FROM agents WHERE user_id = auth.uid()));
CREATE POLICY "rent_payments_no_delete" ON rent_payments FOR DELETE USING (false);

-- TRUST_RECEIPTS
ALTER TABLE trust_receipts ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Agent receipts" ON trust_receipts;
DROP POLICY IF EXISTS "trust_receipts_select" ON trust_receipts;
DROP POLICY IF EXISTS "trust_receipts_insert" ON trust_receipts;
DROP POLICY IF EXISTS "trust_receipts_no_update" ON trust_receipts;
DROP POLICY IF EXISTS "trust_receipts_no_delete" ON trust_receipts;

CREATE POLICY "trust_receipts_select" ON trust_receipts FOR SELECT
  USING (agent_id = (SELECT id FROM agents WHERE user_id = auth.uid()));
CREATE POLICY "trust_receipts_insert" ON trust_receipts FOR INSERT
  WITH CHECK (agent_id = (SELECT id FROM agents WHERE user_id = auth.uid()));
CREATE POLICY "trust_receipts_no_update" ON trust_receipts FOR UPDATE USING (false);
CREATE POLICY "trust_receipts_no_delete" ON trust_receipts FOR DELETE USING (false);

-- TRUST_PAYMENTS
ALTER TABLE trust_payments ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Agent payments" ON trust_payments;
DROP POLICY IF EXISTS "trust_payments_select" ON trust_payments;
DROP POLICY IF EXISTS "trust_payments_insert" ON trust_payments;
DROP POLICY IF EXISTS "trust_payments_no_update" ON trust_payments;
DROP POLICY IF EXISTS "trust_payments_no_delete" ON trust_payments;

CREATE POLICY "trust_payments_select" ON trust_payments FOR SELECT
  USING (agent_id = (SELECT id FROM agents WHERE user_id = auth.uid()));
CREATE POLICY "trust_payments_insert" ON trust_payments FOR INSERT
  WITH CHECK (agent_id = (SELECT id FROM agents WHERE user_id = auth.uid()));
CREATE POLICY "trust_payments_no_update" ON trust_payments FOR UPDATE USING (false);
CREATE POLICY "trust_payments_no_delete" ON trust_payments FOR DELETE USING (false);

-- TRUST_ACCOUNTS
ALTER TABLE trust_accounts ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "trust_accounts_select" ON trust_accounts;
DROP POLICY IF EXISTS "trust_accounts_insert" ON trust_accounts;
DROP POLICY IF EXISTS "trust_accounts_update" ON trust_accounts;
DROP POLICY IF EXISTS "trust_accounts_no_delete" ON trust_accounts;

CREATE POLICY "trust_accounts_select" ON trust_accounts FOR SELECT
  USING (agent_id = (SELECT id FROM agents WHERE user_id = auth.uid()));
CREATE POLICY "trust_accounts_insert" ON trust_accounts FOR INSERT
  WITH CHECK (agent_id = (SELECT id FROM agents WHERE user_id = auth.uid()));
CREATE POLICY "trust_accounts_update" ON trust_accounts FOR UPDATE
  USING (agent_id = (SELECT id FROM agents WHERE user_id = auth.uid()));
CREATE POLICY "trust_accounts_no_delete" ON trust_accounts FOR DELETE USING (false);

-- TRUST_RECONCILIATIONS
ALTER TABLE trust_reconciliations ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "trust_reconciliations_select" ON trust_reconciliations;
DROP POLICY IF EXISTS "trust_reconciliations_insert" ON trust_reconciliations;
DROP POLICY IF EXISTS "trust_reconciliations_no_delete" ON trust_reconciliations;

CREATE POLICY "trust_reconciliations_select" ON trust_reconciliations FOR SELECT
  USING (agent_id = (SELECT id FROM agents WHERE user_id = auth.uid()));
CREATE POLICY "trust_reconciliations_insert" ON trust_reconciliations FOR INSERT
  WITH CHECK (agent_id = (SELECT id FROM agents WHERE user_id = auth.uid()));
CREATE POLICY "trust_reconciliations_no_delete" ON trust_reconciliations FOR DELETE USING (false);

-- TRUST_TRANSACTIONS
ALTER TABLE trust_transactions ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Agent transactions" ON trust_transactions;
DROP POLICY IF EXISTS "trust_transactions_select" ON trust_transactions;
DROP POLICY IF EXISTS "trust_transactions_insert" ON trust_transactions;
DROP POLICY IF EXISTS "trust_transactions_no_delete" ON trust_transactions;

CREATE POLICY "trust_transactions_select" ON trust_transactions FOR SELECT
  USING (trust_account_id IN (
    SELECT id FROM trust_accounts
    WHERE agent_id = (SELECT id FROM agents WHERE user_id = auth.uid())
  ));
CREATE POLICY "trust_transactions_insert" ON trust_transactions FOR INSERT
  WITH CHECK (trust_account_id IN (
    SELECT id FROM trust_accounts
    WHERE agent_id = (SELECT id FROM agents WHERE user_id = auth.uid())
  ));
CREATE POLICY "trust_transactions_no_delete" ON trust_transactions FOR DELETE USING (false);

-- RENTAL_APPLICATIONS
ALTER TABLE rental_applications ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Applicant own" ON rental_applications;
DROP POLICY IF EXISTS "Agent applications" ON rental_applications;
DROP POLICY IF EXISTS "Applicant sees own application" ON rental_applications;
DROP POLICY IF EXISTS "Agent sees property applications" ON rental_applications;
DROP POLICY IF EXISTS "rental_applications_applicant" ON rental_applications;
DROP POLICY IF EXISTS "rental_applications_agent" ON rental_applications;
DROP POLICY IF EXISTS "rental_applications_no_delete" ON rental_applications;
DROP POLICY IF EXISTS "rental_applications_insert" ON rental_applications;

CREATE POLICY "rental_applications_applicant" ON rental_applications FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "rental_applications_agent" ON rental_applications FOR ALL
  USING (EXISTS (
    SELECT 1 FROM properties p JOIN agents a ON a.id = p.agent_id
    WHERE p.id = property_id AND a.user_id = auth.uid()
  ));

CREATE POLICY "rental_applications_insert" ON rental_applications FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "rental_applications_no_delete" ON rental_applications FOR DELETE USING (false);

-- TRUST ENTRY IMMUTABILITY
CREATE OR REPLACE FUNCTION public.prevent_trust_entry_update()
RETURNS TRIGGER AS $$
BEGIN
  RAISE EXCEPTION 'Trust entries are immutable under the Agents Financial Administration Act 2014. Raise a correction entry instead.';
END;
$$ LANGUAGE plpgsql SET search_path = public;

DROP TRIGGER IF EXISTS trust_receipts_immutable ON trust_receipts;
CREATE TRIGGER trust_receipts_immutable
  BEFORE UPDATE ON trust_receipts FOR EACH ROW
  EXECUTE FUNCTION public.prevent_trust_entry_update();

DROP TRIGGER IF EXISTS trust_payments_immutable ON trust_payments;
CREATE TRIGGER trust_payments_immutable
  BEFORE UPDATE ON trust_payments FOR EACH ROW
  EXECUTE FUNCTION public.prevent_trust_entry_update();

-- FIX TRUST BALANCE VIEW (compute from trust_receipts/trust_payments)
CREATE OR REPLACE VIEW public.trust_account_balances
WITH (security_invoker = true) AS
SELECT
  a.id AS agent_id,
  COALESCE((SELECT SUM(amount) FROM trust_receipts WHERE agent_id = a.id), 0) -
  COALESCE((SELECT SUM(amount) FROM trust_payments WHERE agent_id = a.id), 0)
  AS current_balance
FROM agents a;