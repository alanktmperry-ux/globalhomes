
ALTER TABLE public.trust_receipts ADD COLUMN IF NOT EXISTS updated_at timestamptz DEFAULT now();
ALTER TABLE public.trust_payments ADD COLUMN IF NOT EXISTS updated_at timestamptz DEFAULT now();

CREATE OR REPLACE FUNCTION public.prevent_trust_entry_update()
RETURNS TRIGGER AS $$
BEGIN
  RAISE EXCEPTION 'Trust entries are immutable. Create a correction entry instead.';
END;
$$ LANGUAGE plpgsql SET search_path = public;

CREATE TRIGGER trust_receipts_immutable
  BEFORE UPDATE ON public.trust_receipts FOR EACH ROW
  EXECUTE FUNCTION public.prevent_trust_entry_update();

CREATE TRIGGER trust_payments_immutable
  BEFORE UPDATE ON public.trust_payments FOR EACH ROW
  EXECUTE FUNCTION public.prevent_trust_entry_update();
