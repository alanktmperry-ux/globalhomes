
ALTER TABLE trust_accounts ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Agent trust accounts" ON trust_accounts;

CREATE POLICY "trust_accounts_select" ON trust_accounts
  FOR SELECT USING (
    agent_id = (SELECT id FROM agents WHERE user_id = auth.uid())
  );

CREATE POLICY "trust_accounts_insert" ON trust_accounts
  FOR INSERT WITH CHECK (
    agent_id = (SELECT id FROM agents WHERE user_id = auth.uid())
  );

CREATE POLICY "trust_accounts_update" ON trust_accounts
  FOR UPDATE USING (
    agent_id = (SELECT id FROM agents WHERE user_id = auth.uid())
  );

CREATE OR REPLACE FUNCTION public.prevent_direct_balance_update()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.current_balance <> OLD.current_balance AND 
     NEW.current_balance <> (
       SELECT COALESCE(SUM(amount),0) FROM trust_receipts WHERE agent_id = OLD.agent_id
     ) - (
       SELECT COALESCE(SUM(amount),0) FROM trust_payments WHERE agent_id = OLD.agent_id
     ) THEN
    RAISE EXCEPTION 'Trust account balance cannot be set directly. It is computed from trust receipts and payments.';
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

DROP TRIGGER IF EXISTS check_balance_update ON trust_accounts;
CREATE TRIGGER check_balance_update
  BEFORE UPDATE ON trust_accounts
  FOR EACH ROW
  EXECUTE FUNCTION public.prevent_direct_balance_update();
