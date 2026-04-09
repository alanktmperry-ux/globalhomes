DROP TABLE IF EXISTS public.trust_account_balances CASCADE;

CREATE OR REPLACE VIEW public.trust_account_balances AS
SELECT
  agent_id,
  COALESCE(SUM(CASE WHEN entry_type = 'receipt' THEN amount ELSE -amount END), 0) AS current_balance
FROM (
  SELECT agent_id, amount, 'receipt' AS entry_type FROM public.trust_receipts
  UNION ALL
  SELECT agent_id, amount, 'payment' AS entry_type FROM public.trust_payments
) entries
GROUP BY agent_id;