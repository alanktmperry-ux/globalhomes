
CREATE OR REPLACE VIEW public.trust_account_balances
WITH (security_invoker = true) AS
SELECT
  a.id AS agent_id,
  COALESCE((SELECT SUM(amount) FROM trust_receipts WHERE agent_id = a.id), 0) -
  COALESCE((SELECT SUM(amount) FROM trust_payments WHERE agent_id = a.id), 0)
  AS current_balance
FROM agents a;
