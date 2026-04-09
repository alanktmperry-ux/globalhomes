CREATE OR REPLACE VIEW trust_account_balances AS
SELECT
  a.id AS agent_id,
  COALESCE(
    (SELECT SUM(amount) FROM trust_receipts WHERE agent_id = a.id), 0
  ) - COALESCE(
    (SELECT SUM(amount) FROM trust_payments WHERE agent_id = a.id), 0
  ) AS current_balance
FROM agents a;