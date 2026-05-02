
-- 1. Rename existing summary view so we can reuse the table name
ALTER VIEW IF EXISTS public.trust_account_balances RENAME TO trust_account_balances_view;

-- 2. Create the period-locking table
CREATE TABLE public.trust_account_balances (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  trust_account_id UUID NOT NULL REFERENCES public.trust_accounts(id) ON DELETE CASCADE,
  period_year INTEGER NOT NULL,
  period_month INTEGER NOT NULL CHECK (period_month BETWEEN 1 AND 12),
  opening_balance NUMERIC NOT NULL DEFAULT 0,
  closing_balance NUMERIC NOT NULL DEFAULT 0,
  is_closed BOOLEAN NOT NULL DEFAULT false,
  closed_at TIMESTAMPTZ,
  closed_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (trust_account_id, period_year, period_month)
);

CREATE INDEX idx_trust_account_balances_account ON public.trust_account_balances(trust_account_id);
CREATE INDEX idx_trust_account_balances_period ON public.trust_account_balances(period_year, period_month);

ALTER TABLE public.trust_account_balances ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Agents view their own period balances"
  ON public.trust_account_balances FOR SELECT
  TO authenticated
  USING (
    trust_account_id IN (
      SELECT ta.id FROM public.trust_accounts ta
      JOIN public.agents a ON a.id = ta.agent_id
      WHERE a.user_id = auth.uid()
    )
  );

CREATE POLICY "Agents manage their own period balances"
  ON public.trust_account_balances FOR ALL
  TO authenticated
  USING (
    trust_account_id IN (
      SELECT ta.id FROM public.trust_accounts ta
      JOIN public.agents a ON a.id = ta.agent_id
      WHERE a.user_id = auth.uid()
    )
  )
  WITH CHECK (
    trust_account_id IN (
      SELECT ta.id FROM public.trust_accounts ta
      JOIN public.agents a ON a.id = ta.agent_id
      WHERE a.user_id = auth.uid()
    )
  );

-- 3. Trigger to block edits in closed periods
CREATE OR REPLACE FUNCTION public.prevent_closed_period_changes()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_year INTEGER;
  v_month INTEGER;
  v_closed BOOLEAN;
BEGIN
  v_year := EXTRACT(YEAR FROM NEW.transaction_date)::INTEGER;
  v_month := EXTRACT(MONTH FROM NEW.transaction_date)::INTEGER;

  SELECT is_closed INTO v_closed
  FROM public.trust_account_balances
  WHERE trust_account_id = NEW.trust_account_id
    AND period_year = v_year
    AND period_month = v_month;

  IF v_closed IS TRUE THEN
    RAISE EXCEPTION 'Cannot modify transactions in a closed period';
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trust_transactions_period_lock ON public.trust_transactions;
CREATE TRIGGER trust_transactions_period_lock
  BEFORE INSERT OR UPDATE ON public.trust_transactions
  FOR EACH ROW
  EXECUTE FUNCTION public.prevent_closed_period_changes();

-- 4. close_trust_period RPC
CREATE OR REPLACE FUNCTION public.close_trust_period(
  p_agent_id UUID,
  p_year INTEGER,
  p_month INTEGER
)
RETURNS NUMERIC
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_closing NUMERIC := 0;
  v_account RECORD;
  v_next_year INTEGER;
  v_next_month INTEGER;
  v_period_start DATE;
  v_period_end DATE;
BEGIN
  v_period_start := make_date(p_year, p_month, 1);
  v_period_end := (v_period_start + INTERVAL '1 month')::DATE;

  IF p_month = 12 THEN
    v_next_year := p_year + 1;
    v_next_month := 1;
  ELSE
    v_next_year := p_year;
    v_next_month := p_month + 1;
  END IF;

  -- Loop each trust account for the agent
  FOR v_account IN
    SELECT id FROM public.trust_accounts WHERE agent_id = p_agent_id
  LOOP
    -- Sum completed/cleared/reconciled transactions for this account in the period
    SELECT COALESCE(SUM(
      CASE WHEN transaction_type = 'deposit' THEN amount ELSE -amount END
    ), 0) INTO v_closing
    FROM public.trust_transactions
    WHERE trust_account_id = v_account.id
      AND transaction_date >= v_period_start
      AND transaction_date < v_period_end
      AND status IN ('completed', 'cleared', 'reconciled', 'deposited');

    -- Add opening balance from prior period row if exists
    v_closing := v_closing + COALESCE(
      (SELECT opening_balance FROM public.trust_account_balances
        WHERE trust_account_id = v_account.id
          AND period_year = p_year AND period_month = p_month),
      0
    );

    -- Upsert the closed period
    INSERT INTO public.trust_account_balances
      (trust_account_id, period_year, period_month, closing_balance, is_closed, closed_at, closed_by, opening_balance)
    VALUES (v_account.id, p_year, p_month, v_closing, true, now(), auth.uid(),
      COALESCE((SELECT opening_balance FROM public.trust_account_balances
        WHERE trust_account_id = v_account.id AND period_year = p_year AND period_month = p_month), 0))
    ON CONFLICT (trust_account_id, period_year, period_month)
    DO UPDATE SET
      closing_balance = EXCLUDED.closing_balance,
      is_closed = true,
      closed_at = now(),
      closed_by = auth.uid(),
      updated_at = now();

    -- Open the next period with carried-over opening balance
    INSERT INTO public.trust_account_balances
      (trust_account_id, period_year, period_month, opening_balance, is_closed)
    VALUES (v_account.id, v_next_year, v_next_month, v_closing, false)
    ON CONFLICT (trust_account_id, period_year, period_month)
    DO UPDATE SET opening_balance = EXCLUDED.opening_balance, updated_at = now()
    WHERE public.trust_account_balances.is_closed = false;
  END LOOP;

  -- Return aggregate closing across all the agent's accounts for that period
  SELECT COALESCE(SUM(closing_balance), 0) INTO v_closing
  FROM public.trust_account_balances tab
  JOIN public.trust_accounts ta ON ta.id = tab.trust_account_id
  WHERE ta.agent_id = p_agent_id
    AND tab.period_year = p_year
    AND tab.period_month = p_month;

  RETURN v_closing;
END;
$$;

GRANT EXECUTE ON FUNCTION public.close_trust_period(UUID, INTEGER, INTEGER) TO authenticated;

-- 5. Storage bucket for owner statement PDFs
INSERT INTO storage.buckets (id, name, public)
VALUES ('owner-statements', 'owner-statements', true)
ON CONFLICT (id) DO NOTHING;

CREATE POLICY "Public read owner statements"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'owner-statements');

CREATE POLICY "Authenticated upload owner statements"
  ON storage.objects FOR INSERT
  TO authenticated
  WITH CHECK (bucket_id = 'owner-statements');

CREATE POLICY "Authenticated update owner statements"
  ON storage.objects FOR UPDATE
  TO authenticated
  USING (bucket_id = 'owner-statements');
