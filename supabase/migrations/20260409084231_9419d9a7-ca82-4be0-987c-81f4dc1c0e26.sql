-- Fix validation to include bank_transfer
CREATE OR REPLACE FUNCTION public.validate_rent_payment()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  IF NEW.amount <= 0 THEN
    RAISE EXCEPTION 'amount must be greater than 0';
  END IF;
  IF NEW.payment_method IS NOT NULL AND NEW.payment_method NOT IN ('direct_debit','bpay','eft','cash','card','bank_transfer') THEN
    RAISE EXCEPTION 'invalid payment_method: %s', NEW.payment_method;
  END IF;
  RETURN NEW;
END;
$$;

-- Auto-populate property_id from tenancy
CREATE OR REPLACE FUNCTION public.auto_populate_rent_payment_property()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  IF NEW.property_id IS NULL AND NEW.tenancy_id IS NOT NULL THEN
    SELECT property_id INTO NEW.property_id
    FROM tenancies WHERE id = NEW.tenancy_id;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS rent_payment_auto_property ON rent_payments;
CREATE TRIGGER rent_payment_auto_property
  BEFORE INSERT ON rent_payments
  FOR EACH ROW EXECUTE FUNCTION auto_populate_rent_payment_property();