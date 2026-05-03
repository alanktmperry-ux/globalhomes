
-- Fix 3: Atomic Halo credit spend
CREATE OR REPLACE FUNCTION public.spend_halo_credit(p_agent_id UUID, p_halo_id UUID)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_updated INTEGER;
BEGIN
  IF EXISTS (SELECT 1 FROM halo_responses WHERE agent_id = p_agent_id AND halo_id = p_halo_id) THEN
    RETURN FALSE;
  END IF;
  UPDATE halo_credits
     SET balance = balance - 1,
         updated_at = now()
   WHERE agent_id = p_agent_id AND balance >= 1;
  GET DIAGNOSTICS v_updated = ROW_COUNT;
  IF v_updated = 0 THEN
    RAISE EXCEPTION 'Insufficient credits';
  END IF;
  RETURN TRUE;
END;
$$;

-- Fix 9: audit_logs INSERT restriction
DROP POLICY IF EXISTS "audit_logs_insert" ON public.audit_logs;
CREATE POLICY "audit_logs_insert_allowed" ON public.audit_logs
  FOR INSERT
  WITH CHECK (
    event_type IN (
      'portal_access', 'maintenance_submitted', 'owner_decision',
      'supplier_action', 'document_viewed', 'lease_signed'
    )
  );

-- Fix 11: per-trust-account close
ALTER TABLE public.trust_receipts
  ADD COLUMN IF NOT EXISTS trust_account_id UUID REFERENCES public.trust_accounts(id);
ALTER TABLE public.trust_payments
  ADD COLUMN IF NOT EXISTS trust_account_id UUID REFERENCES public.trust_accounts(id);
CREATE INDEX IF NOT EXISTS idx_trust_receipts_trust_account_id ON public.trust_receipts(trust_account_id);
CREATE INDEX IF NOT EXISTS idx_trust_payments_trust_account_id ON public.trust_payments(trust_account_id);

CREATE OR REPLACE FUNCTION public.close_trust_period(
  p_agent_id UUID,
  p_period_start DATE,
  p_period_end DATE
)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  ta RECORD;
  v_receipts NUMERIC;
  v_payments NUMERIC;
  v_legacy_receipts NUMERIC;
  v_legacy_payments NUMERIC;
  v_account_count INTEGER;
BEGIN
  SELECT COUNT(*) INTO v_account_count FROM trust_accounts WHERE agent_id = p_agent_id;

  -- Per-account aggregation for rows with trust_account_id populated
  FOR ta IN SELECT id FROM trust_accounts WHERE agent_id = p_agent_id LOOP
    SELECT COALESCE(SUM(amount), 0) INTO v_receipts
      FROM trust_receipts
     WHERE trust_account_id = ta.id
       AND receipt_date BETWEEN p_period_start AND p_period_end;

    SELECT COALESCE(SUM(amount), 0) INTO v_payments
      FROM trust_payments
     WHERE trust_account_id = ta.id
       AND payment_date BETWEEN p_period_start AND p_period_end;

    UPDATE trust_accounts
       SET current_balance = COALESCE(current_balance, 0) + v_receipts - v_payments,
           last_reconciled_at = now()
     WHERE id = ta.id;
  END LOOP;

  -- Legacy fallback: rows still missing trust_account_id apply to the single account
  -- (only valid when the agent has exactly one trust account)
  IF v_account_count = 1 THEN
    SELECT COALESCE(SUM(amount), 0) INTO v_legacy_receipts
      FROM trust_receipts
     WHERE agent_id = p_agent_id
       AND trust_account_id IS NULL
       AND receipt_date BETWEEN p_period_start AND p_period_end;

    SELECT COALESCE(SUM(amount), 0) INTO v_legacy_payments
      FROM trust_payments
     WHERE agent_id = p_agent_id
       AND trust_account_id IS NULL
       AND payment_date BETWEEN p_period_start AND p_period_end;

    IF v_legacy_receipts <> 0 OR v_legacy_payments <> 0 THEN
      UPDATE trust_accounts
         SET current_balance = COALESCE(current_balance, 0) + v_legacy_receipts - v_legacy_payments,
             last_reconciled_at = now()
       WHERE agent_id = p_agent_id;
    END IF;
  END IF;
END;
$$;
