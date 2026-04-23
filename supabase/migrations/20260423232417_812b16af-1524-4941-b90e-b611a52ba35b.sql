-- Grant SELECT on agents and agencies to anon and authenticated roles so PostgREST can serve public reads.
-- RLS policies already restrict which rows are visible (agents: only approved/subscribed; agencies: viewable by everyone).
-- Without the table-level GRANT, anon visitors hit "permission denied for table agents" before RLS is evaluated.

GRANT SELECT ON public.agents TO anon, authenticated;
GRANT SELECT ON public.agencies TO anon, authenticated;

-- Add a clearly-named public read policy on agents for documentation/clarity (existing policy already permits this set).
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policy
    WHERE polrelid = 'public.agents'::regclass
      AND polname = 'Public can read agent public profiles'
  ) THEN
    CREATE POLICY "Public can read agent public profiles"
      ON public.agents
      FOR SELECT
      TO anon, authenticated
      USING (is_approved = true OR is_subscribed = true OR approval_status = 'approved');
  END IF;
END $$;

-- Ensure agencies has an explicit anon-readable policy (existing one targets PUBLIC role)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policy
    WHERE polrelid = 'public.agencies'::regclass
      AND polname = 'Public can read agencies'
  ) THEN
    CREATE POLICY "Public can read agencies"
      ON public.agencies
      FOR SELECT
      TO anon, authenticated
      USING (true);
  END IF;
END $$;
