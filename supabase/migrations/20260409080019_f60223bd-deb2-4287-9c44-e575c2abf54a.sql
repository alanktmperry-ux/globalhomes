
-- Create table only if it doesn't exist
CREATE TABLE IF NOT EXISTS trust_reconciliations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  agent_id uuid REFERENCES agents(id) ON DELETE CASCADE,
  trust_account_id uuid,
  amount numeric NOT NULL,
  transaction_date date NOT NULL,
  description text,
  bank_date date,
  status text DEFAULT 'unmatched',
  matched_payment_id uuid,
  created_at timestamptz DEFAULT now()
);

-- Validation trigger instead of CHECK constraint
CREATE OR REPLACE FUNCTION public.validate_trust_reconciliation_status()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  IF NEW.status NOT IN ('matched','unmatched','reconciled') THEN
    RAISE EXCEPTION 'Invalid reconciliation status: %', NEW.status;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_validate_trust_reconciliation ON trust_reconciliations;
CREATE TRIGGER trg_validate_trust_reconciliation
  BEFORE INSERT OR UPDATE ON trust_reconciliations
  FOR EACH ROW EXECUTE FUNCTION public.validate_trust_reconciliation_status();

-- RLS
ALTER TABLE trust_reconciliations ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Agent sees own reconciliations" ON trust_reconciliations;
CREATE POLICY "Agent sees own reconciliations"
  ON trust_reconciliations FOR ALL TO authenticated
  USING (
    agent_id IN (SELECT id FROM agents WHERE user_id = auth.uid())
    OR public.has_role(auth.uid(), 'admin')
  )
  WITH CHECK (
    agent_id IN (SELECT id FROM agents WHERE user_id = auth.uid())
    OR public.has_role(auth.uid(), 'admin')
  );

-- Index for performance
CREATE INDEX IF NOT EXISTS idx_trust_recon_agent ON trust_reconciliations(agent_id);
CREATE INDEX IF NOT EXISTS idx_trust_recon_status ON trust_reconciliations(status);
