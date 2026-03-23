-- Enable RLS on trust_journal_entries

ALTER TABLE public.trust_journal_entries
  ENABLE ROW LEVEL SECURITY;

-- Agents can only see and manage
-- their own journal entries
CREATE POLICY
  "Agents manage own journal entries"
  ON public.trust_journal_entries
  FOR ALL
  TO authenticated
  USING (
    agent_id IN (
      SELECT id FROM public.agents
      WHERE user_id = auth.uid()
    )
  )
  WITH CHECK (
    agent_id IN (
      SELECT id FROM public.agents
      WHERE user_id = auth.uid()
    )
  );

-- Partners can read journal entries
-- for agencies they are authorised on
CREATE POLICY
  "Partners read authorised journals"
  ON public.trust_journal_entries
  FOR SELECT
  TO authenticated
  USING (
    trust_account_id IN (
      SELECT ta.id
      FROM public.trust_accounts ta
      JOIN public.partner_agencies pa
        ON pa.agency_id = ta.agency_id
      JOIN public.partner_members pm
        ON pm.partner_id = pa.partner_id
      WHERE pm.user_id = auth.uid()
      AND pa.status = 'active'
    )
  );

-- Admins can read all journal entries
CREATE POLICY
  "Admins read all journal entries"
  ON public.trust_journal_entries
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.user_roles
      WHERE user_id = auth.uid()
      AND role = 'admin'
    )
  );

-- Enable RLS on trust_suspense
ALTER TABLE public.trust_suspense
  ENABLE ROW LEVEL SECURITY;

-- Agents can only see and manage
-- their own suspense entries
CREATE POLICY
  "Agents manage own suspense"
  ON public.trust_suspense
  FOR ALL
  TO authenticated
  USING (
    agent_id IN (
      SELECT id FROM public.agents
      WHERE user_id = auth.uid()
    )
  )
  WITH CHECK (
    agent_id IN (
      SELECT id FROM public.agents
      WHERE user_id = auth.uid()
    )
  );

-- Partners can read suspense entries
-- for agencies they are authorised on
CREATE POLICY
  "Partners read authorised suspense"
  ON public.trust_suspense
  FOR SELECT
  TO authenticated
  USING (
    trust_account_id IN (
      SELECT ta.id
      FROM public.trust_accounts ta
      JOIN public.partner_agencies pa
        ON pa.agency_id = ta.agency_id
      JOIN public.partner_members pm
        ON pm.partner_id = pa.partner_id
      WHERE pm.user_id = auth.uid()
      AND pa.status = 'active'
    )
  );

-- Admins can read all suspense entries
CREATE POLICY
  "Admins read all suspense"
  ON public.trust_suspense
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.user_roles
      WHERE user_id = auth.uid()
      AND role = 'admin'
    )
  );