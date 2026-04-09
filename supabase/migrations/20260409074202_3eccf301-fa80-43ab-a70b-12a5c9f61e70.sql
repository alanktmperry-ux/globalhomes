ALTER TABLE rent_payments
  ADD COLUMN IF NOT EXISTS application_id uuid REFERENCES rental_applications(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS property_id uuid REFERENCES properties(id) ON DELETE CASCADE,
  ADD COLUMN IF NOT EXISTS reference text,
  ADD COLUMN IF NOT EXISTS is_arrears boolean DEFAULT false;

CREATE INDEX IF NOT EXISTS rent_payments_property_id_idx ON rent_payments(property_id);
CREATE INDEX IF NOT EXISTS rent_payments_application_id_idx ON rent_payments(application_id);

ALTER TABLE rent_payments ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'rent_payments' AND policyname = 'Agents can view rent payments for their properties') THEN
    CREATE POLICY "Agents can view rent payments for their properties"
      ON rent_payments FOR SELECT TO authenticated
      USING (agent_id IN (SELECT id FROM agents WHERE user_id = auth.uid()));
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'rent_payments' AND policyname = 'Agents can insert rent payments for their properties') THEN
    CREATE POLICY "Agents can insert rent payments for their properties"
      ON rent_payments FOR INSERT TO authenticated
      WITH CHECK (agent_id IN (SELECT id FROM agents WHERE user_id = auth.uid()));
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'rent_payments' AND policyname = 'Agents can update their rent payments') THEN
    CREATE POLICY "Agents can update their rent payments"
      ON rent_payments FOR UPDATE TO authenticated
      USING (agent_id IN (SELECT id FROM agents WHERE user_id = auth.uid()));
  END IF;
END $$;

CREATE OR REPLACE FUNCTION validate_rent_payment()
RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  IF NEW.amount <= 0 THEN
    RAISE EXCEPTION 'amount must be greater than 0';
  END IF;
  IF NEW.payment_method IS NOT NULL AND NEW.payment_method NOT IN ('direct_debit','bpay','eft','cash','card') THEN
    RAISE EXCEPTION 'invalid payment_method: %s', NEW.payment_method;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_validate_rent_payment ON rent_payments;
CREATE TRIGGER trg_validate_rent_payment
  BEFORE INSERT OR UPDATE ON rent_payments
  FOR EACH ROW EXECUTE FUNCTION validate_rent_payment();