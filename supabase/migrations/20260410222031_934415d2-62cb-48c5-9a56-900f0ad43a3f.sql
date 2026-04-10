-- agents.user_id → auth.users (add CASCADE)
-- First check the existing constraint name and recreate with CASCADE

-- 1. agents.user_id
DO $$
BEGIN
  -- Drop existing FK if it exists
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
      AND constraint_name IN (
        SELECT constraint_name FROM information_schema.table_constraints 
        WHERE table_schema = 'public' AND table_name = 'agents' AND constraint_type = 'FOREIGN KEY'
      )
      LIMIT 1
    );
  END IF;
END $$;

ALTER TABLE public.agents
  ADD CONSTRAINT agents_user_id_fkey
  FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;

-- 2. agency_members.user_id
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.table_constraints 
    WHERE table_schema = 'public' AND table_name = 'agency_members' 
    AND constraint_type = 'FOREIGN KEY'
    AND constraint_name IN (
      SELECT constraint_name FROM information_schema.key_column_usage 
      WHERE table_schema = 'public' AND table_name = 'agency_members' AND column_name = 'user_id'
    )
  ) THEN
    EXECUTE (
      SELECT 'ALTER TABLE public.agency_members DROP CONSTRAINT ' || constraint_name
      FROM information_schema.key_column_usage 
      WHERE table_schema = 'public' AND table_name = 'agency_members' AND column_name = 'user_id'
      AND constraint_name IN (
        SELECT constraint_name FROM information_schema.table_constraints 
        WHERE table_schema = 'public' AND table_name = 'agency_members' AND constraint_type = 'FOREIGN KEY'
      )
      LIMIT 1
    );
  END IF;
END $$;

ALTER TABLE public.agency_members
  ADD CONSTRAINT agency_members_user_id_fkey
  FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;

-- 3. user_roles.user_id
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.table_constraints 
    WHERE table_schema = 'public' AND table_name = 'user_roles' 
    AND constraint_type = 'FOREIGN KEY'
    AND constraint_name IN (
      SELECT constraint_name FROM information_schema.key_column_usage 
      WHERE table_schema = 'public' AND table_name = 'user_roles' AND column_name = 'user_id'
    )
  ) THEN
    EXECUTE (
      SELECT 'ALTER TABLE public.user_roles DROP CONSTRAINT ' || constraint_name
      FROM information_schema.key_column_usage 
      WHERE table_schema = 'public' AND table_name = 'user_roles' AND column_name = 'user_id'
      AND constraint_name IN (
        SELECT constraint_name FROM information_schema.table_constraints 
        WHERE table_schema = 'public' AND table_name = 'user_roles' AND constraint_type = 'FOREIGN KEY'
      )
      LIMIT 1
    );
  END IF;
END $$;

ALTER TABLE public.user_roles
  ADD CONSTRAINT user_roles_user_id_fkey
  FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;