
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'leads'
      AND policyname = 'Agents can delete their own leads'
  ) THEN
    CREATE POLICY "Agents can delete their own leads"
      ON public.leads
      FOR DELETE
      USING (
        agent_id IN (
          SELECT id FROM public.agents WHERE user_id = auth.uid()
        )
      );
  END IF;
END $$;
