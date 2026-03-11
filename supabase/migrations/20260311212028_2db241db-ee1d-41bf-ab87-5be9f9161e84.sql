
-- Trust accounts table (trust vs operating separation)
CREATE TABLE public.trust_accounts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  agency_id uuid REFERENCES public.agencies(id) ON DELETE CASCADE,
  agent_id uuid REFERENCES public.agents(id) ON DELETE CASCADE,
  account_name text NOT NULL,
  account_type text NOT NULL DEFAULT 'trust', -- 'trust' or 'operating'
  bsb text,
  account_number text,
  bank_name text,
  balance numeric NOT NULL DEFAULT 0,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- Trust transactions table
CREATE TABLE public.trust_transactions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  trust_account_id uuid REFERENCES public.trust_accounts(id) ON DELETE CASCADE NOT NULL,
  property_id uuid REFERENCES public.properties(id),
  contact_id uuid REFERENCES public.contacts(id),
  created_by uuid NOT NULL,
  transaction_type text NOT NULL DEFAULT 'deposit', -- deposit, withdrawal, transfer, invoice
  category text NOT NULL DEFAULT 'general', -- deposit, rent, commission, disbursement, refund, fees, general
  amount numeric NOT NULL DEFAULT 0,
  gst_amount numeric NOT NULL DEFAULT 0,
  description text,
  reference text,
  payee_name text,
  status text NOT NULL DEFAULT 'pending', -- pending, completed, reconciled, voided
  transaction_date date NOT NULL DEFAULT CURRENT_DATE,
  due_date date,
  invoice_number text,
  receipt_number text,
  reconciled_at timestamptz,
  reconciled_by uuid,
  aba_exported boolean NOT NULL DEFAULT false,
  aba_exported_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.trust_accounts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.trust_transactions ENABLE ROW LEVEL SECURITY;

-- RLS for trust_accounts
CREATE POLICY "Agents can view own trust accounts"
  ON public.trust_accounts FOR SELECT TO authenticated
  USING (agent_id IN (SELECT id FROM agents WHERE user_id = auth.uid()));

CREATE POLICY "Agency members can view trust accounts"
  ON public.trust_accounts FOR SELECT TO authenticated
  USING (is_agency_member(auth.uid(), agency_id));

CREATE POLICY "Agents can insert own trust accounts"
  ON public.trust_accounts FOR INSERT TO authenticated
  WITH CHECK (agent_id IN (SELECT id FROM agents WHERE user_id = auth.uid()));

CREATE POLICY "Agents can update own trust accounts"
  ON public.trust_accounts FOR UPDATE TO authenticated
  USING (agent_id IN (SELECT id FROM agents WHERE user_id = auth.uid()));

-- RLS for trust_transactions
CREATE POLICY "Can view trust transactions for own accounts"
  ON public.trust_transactions FOR SELECT TO authenticated
  USING (trust_account_id IN (
    SELECT id FROM trust_accounts WHERE agent_id IN (SELECT id FROM agents WHERE user_id = auth.uid())
  ));

CREATE POLICY "Principal can view office trust transactions"
  ON public.trust_transactions FOR SELECT TO authenticated
  USING (trust_account_id IN (
    SELECT ta.id FROM trust_accounts ta
    WHERE is_agency_owner_or_admin(auth.uid(), ta.agency_id)
  ));

CREATE POLICY "Agents can insert trust transactions"
  ON public.trust_transactions FOR INSERT TO authenticated
  WITH CHECK (created_by = auth.uid());

CREATE POLICY "Agents can update own trust transactions"
  ON public.trust_transactions FOR UPDATE TO authenticated
  USING (created_by = auth.uid());

-- Updated_at triggers
CREATE TRIGGER update_trust_accounts_updated_at
  BEFORE UPDATE ON public.trust_accounts
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_trust_transactions_updated_at
  BEFORE UPDATE ON public.trust_transactions
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
