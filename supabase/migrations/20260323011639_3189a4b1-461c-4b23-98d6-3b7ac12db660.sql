-- Trust journal adjustment entries
-- Used by Tam and agents to correct
-- balance discrepancies with a full
-- audit trail

CREATE TABLE IF NOT EXISTS
  public.trust_journal_entries (
  id uuid PRIMARY KEY
    DEFAULT gen_random_uuid(),
  trust_account_id uuid
    REFERENCES public.trust_accounts(id)
    ON DELETE CASCADE NOT NULL,
  agent_id uuid
    REFERENCES public.agents(id)
    ON DELETE CASCADE NOT NULL,
  entry_date date NOT NULL
    DEFAULT CURRENT_DATE,
  debit_ledger text NOT NULL,
  credit_ledger text NOT NULL,
  amount numeric NOT NULL
    CHECK (amount > 0),
  reason_code text NOT NULL,
  reason_detail text NOT NULL,
  reference text,
  created_by uuid NOT NULL,
  created_at timestamptz NOT NULL
    DEFAULT now(),
  voided boolean NOT NULL
    DEFAULT false,
  voided_at timestamptz,
  voided_by uuid,
  void_reason text
);

ALTER TABLE public.trust_journal_entries
  ENABLE ROW LEVEL SECURITY;

CREATE POLICY
  "Agents can manage own journal entries"
  ON public.trust_journal_entries
  FOR ALL TO authenticated
  USING (
    agent_id IN (
      SELECT id FROM public.agents
      WHERE user_id = auth.uid()
    )
  );

CREATE POLICY
  "Admins can read all journal entries"
  ON public.trust_journal_entries
  FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(),
    'admin'));

-- Trust suspense account entries
-- For unidentified receipts that
-- need to be matched later

CREATE TABLE IF NOT EXISTS
  public.trust_suspense (
  id uuid PRIMARY KEY
    DEFAULT gen_random_uuid(),
  trust_account_id uuid
    REFERENCES public.trust_accounts(id)
    ON DELETE CASCADE NOT NULL,
  agent_id uuid
    REFERENCES public.agents(id)
    ON DELETE CASCADE NOT NULL,
  received_date date NOT NULL
    DEFAULT CURRENT_DATE,
  amount numeric NOT NULL
    CHECK (amount > 0),
  bank_reference text,
  notes text,
  status text NOT NULL
    DEFAULT 'unidentified'
    CHECK (status IN (
      'unidentified', 'matched',
      'returned'
    )),
  matched_transaction_id uuid
    REFERENCES public.trust_transactions(id),
  matched_at timestamptz,
  matched_by uuid,
  created_by uuid NOT NULL,
  created_at timestamptz NOT NULL
    DEFAULT now()
);

ALTER TABLE public.trust_suspense
  ENABLE ROW LEVEL SECURITY;

CREATE POLICY
  "Agents can manage own suspense"
  ON public.trust_suspense
  FOR ALL TO authenticated
  USING (
    agent_id IN (
      SELECT id FROM public.agents
      WHERE user_id = auth.uid()
    )
  );

-- Add columns to trust_transactions
-- for correction tracking

ALTER TABLE public.trust_transactions
  ADD COLUMN IF NOT EXISTS
    is_dishonoured boolean
    NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS
    dishonoured_at timestamptz,
  ADD COLUMN IF NOT EXISTS
    original_transaction_id uuid
    REFERENCES public.trust_transactions(id),
  ADD COLUMN IF NOT EXISTS
    correction_reason text,
  ADD COLUMN IF NOT EXISTS
    overdrawn_notified boolean
    NOT NULL DEFAULT false;