CREATE OR REPLACE FUNCTION public.prevent_trust_entry_update()
RETURNS TRIGGER AS $$
BEGIN
  RAISE EXCEPTION 'Trust entries cannot be edited. Raise a correction entry.';
END;
$$ LANGUAGE plpgsql SET search_path = public;

DROP TRIGGER IF EXISTS trust_receipts_no_edit ON trust_receipts;
CREATE TRIGGER trust_receipts_no_edit
  BEFORE UPDATE ON trust_receipts
  FOR EACH ROW EXECUTE FUNCTION public.prevent_trust_entry_update();

DROP TRIGGER IF EXISTS trust_payments_no_edit ON trust_payments;
CREATE TRIGGER trust_payments_no_edit
  BEFORE UPDATE ON trust_payments
  FOR EACH ROW EXECUTE FUNCTION public.prevent_trust_entry_update();