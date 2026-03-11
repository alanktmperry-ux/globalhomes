
-- TRANSACTIONS table (financial records, trust account movements)
CREATE TABLE public.transactions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  office_id uuid REFERENCES public.agencies(id) ON DELETE CASCADE,
  agent_id uuid REFERENCES public.agents(id) ON DELETE SET NULL,
  property_id uuid REFERENCES public.properties(id) ON DELETE SET NULL,
  type text NOT NULL DEFAULT 'commission', -- commission, trust_deposit, trust_withdrawal, advertising, general
  description text,
  amount numeric(12,2) NOT NULL DEFAULT 0,
  gst_amount numeric(12,2) NOT NULL DEFAULT 0,
  status text NOT NULL DEFAULT 'pending', -- pending, paid, reconciled, cancelled
  transaction_date date NOT NULL DEFAULT CURRENT_DATE,
  due_date date,
  reference text,
  created_by uuid NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.transactions ENABLE ROW LEVEL SECURITY;

-- Principals/admins see all office transactions; agents see own
CREATE POLICY "Agents can view own transactions" ON public.transactions
  FOR SELECT TO authenticated
  USING (created_by = auth.uid() OR agent_id IN (SELECT id FROM agents WHERE user_id = auth.uid()));

CREATE POLICY "Principal can view office transactions" ON public.transactions
  FOR SELECT TO authenticated
  USING (office_id IN (SELECT agency_id FROM agency_members WHERE user_id = auth.uid() AND role IN ('owner','admin','principal')));

CREATE POLICY "Agents can insert own transactions" ON public.transactions
  FOR INSERT TO authenticated
  WITH CHECK (created_by = auth.uid());

CREATE POLICY "Agents can update own transactions" ON public.transactions
  FOR UPDATE TO authenticated
  USING (created_by = auth.uid());

-- ACTIVITIES table (audit log)
CREATE TABLE public.activities (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  office_id uuid REFERENCES public.agencies(id) ON DELETE CASCADE,
  entity_type text NOT NULL, -- contact, listing, transaction, task
  entity_id uuid,
  action text NOT NULL, -- created, updated, called, emailed, inspected, note_added
  description text,
  metadata jsonb DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.activities ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own activities" ON public.activities
  FOR SELECT TO authenticated
  USING (user_id = auth.uid());

CREATE POLICY "Principal can view office activities" ON public.activities
  FOR SELECT TO authenticated
  USING (office_id IN (SELECT agency_id FROM agency_members WHERE user_id = auth.uid() AND role IN ('owner','admin','principal')));

CREATE POLICY "Authenticated can insert activities" ON public.activities
  FOR INSERT TO authenticated
  WITH CHECK (user_id = auth.uid());

-- TASKS table (reminders, workflow steps)
CREATE TABLE public.tasks (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  office_id uuid REFERENCES public.agencies(id) ON DELETE CASCADE,
  assigned_to uuid,
  entity_type text, -- contact, listing, transaction
  entity_id uuid,
  title text NOT NULL,
  description text,
  status text NOT NULL DEFAULT 'pending', -- pending, in_progress, completed, overdue
  priority text NOT NULL DEFAULT 'medium', -- low, medium, high, urgent
  due_date date,
  completed_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.tasks ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own tasks" ON public.tasks
  FOR SELECT TO authenticated
  USING (user_id = auth.uid() OR assigned_to = auth.uid());

CREATE POLICY "Principal can view office tasks" ON public.tasks
  FOR SELECT TO authenticated
  USING (office_id IN (SELECT agency_id FROM agency_members WHERE user_id = auth.uid() AND role IN ('owner','admin','principal')));

CREATE POLICY "Users can insert tasks" ON public.tasks
  FOR INSERT TO authenticated
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can update own tasks" ON public.tasks
  FOR UPDATE TO authenticated
  USING (user_id = auth.uid() OR assigned_to = auth.uid());

CREATE POLICY "Users can delete own tasks" ON public.tasks
  FOR DELETE TO authenticated
  USING (user_id = auth.uid());

-- Updated_at triggers
CREATE TRIGGER update_transactions_updated_at BEFORE UPDATE ON public.transactions
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_tasks_updated_at BEFORE UPDATE ON public.tasks
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Enable realtime for activities and tasks
ALTER PUBLICATION supabase_realtime ADD TABLE public.activities;
ALTER PUBLICATION supabase_realtime ADD TABLE public.tasks;
