
-- agents.user_id → auth.users(id) ON DELETE CASCADE
DO $$
BEGIN
  -- Drop existing FK if any
  IF EXISTS (
    SELECT 1 FROM information_schema.table_constraints
    WHERE table_schema = 'public' AND table_name = 'agents'
      AND constraint_type = 'FOREIGN KEY'
      AND constraint_name IN (
        SELECT constraint_name FROM information_schema.key_column_usage
        WHERE table_schema = 'public' AND table_name = 'agents' AND column_name = 'user_id'
      )
  ) THEN
    EXECUTE (
      SELECT 'ALTER TABLE public.agents DROP CONSTRAINT ' || constraint_name
      FROM information_schema.key_column_usage
      WHERE table_schema = 'public' AND table_name = 'agents' AND column_name = 'user_id'
      LIMIT 1
    );
  END IF;
END $$;

ALTER TABLE public.agents
  ADD CONSTRAINT agents_user_id_fkey
  FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;

-- profiles.user_id → auth.users(id) ON DELETE CASCADE
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.table_constraints
    WHERE table_schema = 'public' AND table_name = 'profiles'
      AND constraint_type = 'FOREIGN KEY'
      AND constraint_name IN (
        SELECT constraint_name FROM information_schema.key_column_usage
        WHERE table_schema = 'public' AND table_name = 'profiles' AND column_name = 'user_id'
      )
  ) THEN
    EXECUTE (
      SELECT 'ALTER TABLE public.profiles DROP CONSTRAINT ' || constraint_name
      FROM information_schema.key_column_usage
      WHERE table_schema = 'public' AND table_name = 'profiles' AND column_name = 'user_id'
      LIMIT 1
    );
  END IF;
END $$;

ALTER TABLE public.profiles
  ADD CONSTRAINT profiles_user_id_fkey
  FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;
