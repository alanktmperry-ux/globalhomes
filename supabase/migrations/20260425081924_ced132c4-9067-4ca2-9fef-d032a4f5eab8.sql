ALTER TABLE public.suburb_language_stats FORCE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "seed_insert" ON public.suburb_language_stats;
CREATE POLICY "seed_insert" ON public.suburb_language_stats
  FOR INSERT TO sandbox_exec WITH CHECK (true);
DROP POLICY IF EXISTS "seed_update" ON public.suburb_language_stats;
CREATE POLICY "seed_update" ON public.suburb_language_stats
  FOR UPDATE TO sandbox_exec USING (true) WITH CHECK (true);