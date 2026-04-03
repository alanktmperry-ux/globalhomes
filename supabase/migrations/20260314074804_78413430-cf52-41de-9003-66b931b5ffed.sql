
-- Trust Receipts (money received into trust)
CREATE TABLE public.trust_receipts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  receipt_number text NOT NULL UNIQUE,
  agent_id uuid REFERENCES public.agents(id) NOT NULL,
  client_name text NOT NULL,
  property_address text NOT NULL,
  amount numeric NOT NULL DEFAULT 0,
  payment_method text NOT NULL DEFAULT 'eft',
  purpose text NOT NULL DEFAULT 'deposit',
  date_received date NOT NULL DEFAULT CURRENT_DATE,
  date_deposited date,
  ledger_account text DEFAULT 'general',
  status text NOT NULL DEFAULT 'received',
  created_at timestamptz NOT NULL DEFAULT now()
);

-- Trust Payments (money paid out of trust)
CREATE TABLE public.trust_payments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  payment_number text NOT NULL UNIQUE,
  agent_id uuid REFERENCES public.agents(id) NOT NULL,
  client_name text NOT NULL,
  property_address text NOT NULL,
  amount numeric NOT NULL DEFAULT 0,
  payment_method text NOT NULL DEFAULT 'eft',
  purpose text NOT NULL DEFAULT 'refund',
  bsb text,
  account_number text,
  payee_name text,
  reference text,
  date_paid date NOT NULL DEFAULT CURRENT_DATE,
  status text NOT NULL DEFAULT 'pending',
  created_at timestamptz NOT NULL DEFAULT now()
);

-- Trust Reconciliations (bank matching)
CREATE TABLE public.trust_reconciliations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  agent_id uuid REFERENCES public.agents(id) NOT NULL,
  bank_date date NOT NULL,
  description text,
  amount numeric NOT NULL DEFAULT 0,
  bank_balance numeric NOT NULL DEFAULT 0,
  matched_receipt_id uuid REFERENCES public.trust_receipts(id),
  matched_payment_id uuid REFERENCES public.trust_payments(id),
  status text NOT NULL DEFAULT 'unmatched',
  created_at timestamptz NOT NULL DEFAULT now()
);

-- Trust Account Balances
CREATE TABLE public.trust_account_balances (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  agent_id uuid REFERENCES public.agents(id) NOT NULL UNIQUE,
  opening_balance numeric NOT NULL DEFAULT 0,
  current_balance numeric NOT NULL DEFAULT 0,
  last_reconciled_date date,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- RLS
ALTER TABLE public.trust_receipts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.trust_payments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.trust_reconciliations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.trust_account_balances ENABLE ROW LEVEL SECURITY;

-- Receipts policies
CREATE POLICY "Agents can view own receipts" ON public.trust_receipts
  FOR SELECT TO authenticated
  USING (agent_id IN (SELECT id FROM agents WHERE user_id = auth.uid()));

CREATE POLICY "Agents can insert own receipts" ON public.trust_receipts
  FOR INSERT TO authenticated
  WITH CHECK (agent_id IN (SELECT id FROM agents WHERE user_id = auth.uid()));

CREATE POLICY "Agents can update own receipts" ON public.trust_receipts
  FOR UPDATE TO authenticated
  USING (agent_id IN (SELECT id FROM agents WHERE user_id = auth.uid()));

-- Payments policies
CREATE POLICY "Agents can view own payments" ON public.trust_payments
  FOR SELECT TO authenticated
  USING (agent_id IN (SELECT id FROM agents WHERE user_id = auth.uid()));

CREATE POLICY "Agents can insert own payments" ON public.trust_payments
  FOR INSERT TO authenticated
  WITH CHECK (agent_id IN (SELECT id FROM agents WHERE user_id = auth.uid()));

CREATE POLICY "Agents can update own payments" ON public.trust_payments
  FOR UPDATE TO authenticated
  USING (agent_id IN (SELECT id FROM agents WHERE user_id = auth.uid()));

-- Reconciliations policies
CREATE POLICY "Agents can view own reconciliations" ON public.trust_reconciliations
  FOR SELECT TO authenticated
  USING (agent_id IN (SELECT id FROM agents WHERE user_id = auth.uid()));

CREATE POLICY "Agents can insert own reconciliations" ON public.trust_reconciliations
  FOR INSERT TO authenticated
  WITH CHECK (agent_id IN (SELECT id FROM agents WHERE user_id = auth.uid()));

CREATE POLICY "Agents can update own reconciliations" ON public.trust_reconciliations
  FOR UPDATE TO authenticated
  USING (agent_id IN (SELECT id FROM agents WHERE user_id = auth.uid()));

-- Balances policies
CREATE POLICY "Agents can view own balances" ON public.trust_account_balances
  FOR SELECT TO authenticated
  USING (agent_id IN (SELECT id FROM agents WHERE user_id = auth.uid()));

CREATE POLICY "Agents can insert own balances" ON public.trust_account_balances
  FOR INSERT TO authenticated
  WITH CHECK (agent_id IN (SELECT id FROM agents WHERE user_id = auth.uid()));

CREATE POLICY "Agents can update own balances" ON public.trust_account_balances
  FOR UPDATE TO authenticated
  USING (agent_id IN (SELECT id FROM agents WHERE user_id = auth.uid()));

-- Principal/admin visibility
CREATE POLICY "Principal can view agency receipts" ON public.trust_receipts
  FOR SELECT TO authenticated
  USING (agent_id IN (SELECT a.id FROM agents a WHERE a.agency_id IN (
    SELECT agency_id FROM agency_members WHERE user_id = auth.uid() AND role IN ('owner','admin','principal')
  )));

CREATE POLICY "Principal can view agency payments" ON public.trust_payments
  FOR SELECT TO authenticated
  USING (agent_id IN (SELECT a.id FROM agents a WHERE a.agency_id IN (
    SELECT agency_id FROM agency_members WHERE user_id = auth.uid() AND role IN ('owner','admin','principal')
  )));

CREATE POLICY "Principal can view agency reconciliations" ON public.trust_reconciliations
  FOR SELECT TO authenticated
  USING (agent_id IN (SELECT a.id FROM agents a WHERE a.agency_id IN (
    SELECT agency_id FROM agency_members WHERE user_id = auth.uid() AND role IN ('owner','admin','principal')
  )));

CREATE POLICY "Principal can view agency balances" ON public.trust_account_balances
  FOR SELECT TO authenticated
  USING (agent_id IN (SELECT a.id FROM agents a WHERE a.agency_id IN (
    SELECT agency_id FROM agency_members WHERE user_id = auth.uid() AND role IN ('owner','admin','principal')
  )));
