
ALTER TABLE public.leads
  ADD COLUMN IF NOT EXISTS archived_at TIMESTAMPTZ DEFAULT NULL;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'leads'
      AND policyname = 'Agents can update their own leads'
  ) THEN
    CREATE POLICY "Agents can update their own leads"
      ON public.leads
      FOR UPDATE
      USING (
        agent_id IN (
          SELECT id FROM public.agents WHERE user_id = auth.uid()
        )
      )
      WITH CHECK (
        agent_id IN (
          SELECT id FROM public.agents WHERE user_id = auth.uid()
        )
      );
  END IF;
END $$;
