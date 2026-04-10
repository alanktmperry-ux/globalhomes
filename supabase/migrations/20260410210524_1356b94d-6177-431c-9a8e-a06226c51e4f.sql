
DO $$
DECLARE
  r RECORD;
BEGIN
  FOR r IN
    SELECT con.conname
    FROM pg_constraint con
    JOIN pg_class rel ON rel.oid = con.conrelid
    JOIN pg_namespace nsp ON nsp.oid = rel.relnamespace
    WHERE nsp.nspname = 'public'
      AND rel.relname = 'agencies'
      AND con.contype = 'c'
      AND pg_get_constraintdef(con.oid) ~ '(phone|license_number|licence_number)'
  LOOP
    EXECUTE format('ALTER TABLE public.agencies DROP CONSTRAINT %I', r.conname);
  END LOOP;
END $$;
