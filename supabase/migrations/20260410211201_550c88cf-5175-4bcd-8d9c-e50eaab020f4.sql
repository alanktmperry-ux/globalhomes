DO $$
DECLARE
  r RECORD;
BEGIN
  FOR r IN
    SELECT tc.table_name, tc.constraint_name
    FROM information_schema.table_constraints tc
    WHERE tc.table_name IN ('agencies', 'agents')
    AND tc.constraint_type = 'CHECK'
    AND tc.constraint_schema = 'public'
  LOOP
    EXECUTE format('ALTER TABLE public.%I DROP CONSTRAINT IF EXISTS %I',
      r.table_name, r.constraint_name);
  END LOOP;
END $$;