GRANT INSERT, UPDATE, SELECT ON public.suburb_language_stats TO PUBLIC;
GRANT USAGE, SELECT, UPDATE ON SEQUENCE public.suburb_language_stats_id_seq TO PUBLIC;
DROP POLICY IF EXISTS "seed_insert_public" ON public.suburb_language_stats;
CREATE POLICY "seed_insert_public" ON public.suburb_language_stats
  FOR INSERT TO PUBLIC WITH CHECK (true);
DROP POLICY IF EXISTS "seed_update_public" ON public.suburb_language_stats;
CREATE POLICY "seed_update_public" ON public.suburb_language_stats
  FOR UPDATE TO PUBLIC USING (true) WITH CHECK (true);