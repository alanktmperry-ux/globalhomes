
-- Mark trust_transactions as deprecated
COMMENT ON TABLE public.trust_transactions IS 'DEPRECATED: Legacy table. Use trust_receipts (money in) and trust_payments (money out) instead.';

-- Block new inserts to trust_transactions
CREATE OR REPLACE FUNCTION public.block_trust_transactions_insert()
RETURNS TRIGGER AS $$
BEGIN
  RAISE EXCEPTION 'trust_transactions is deprecated. Use trust_receipts for money in and trust_payments for money out.';
  RETURN NULL;
END;
$$ LANGUAGE plpgsql SET search_path = public;

CREATE TRIGGER prevent_trust_transactions_insert
  BEFORE INSERT ON public.trust_transactions
  FOR EACH ROW EXECUTE FUNCTION public.block_trust_transactions_insert();
