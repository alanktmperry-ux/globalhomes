DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables
    WHERE pubname = 'supabase_realtime'
      AND schemaname = 'public'
      AND tablename = 'agent_subscriptions'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.agent_subscriptions;
  END IF;
END $$;

ALTER TABLE public.agent_subscriptions REPLICA IDENTITY FULL;