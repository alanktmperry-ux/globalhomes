BEGIN;

DROP POLICY IF EXISTS "seed_insert_public" ON public.suburb_language_stats;
DROP POLICY IF EXISTS "seed_update_public" ON public.suburb_language_stats;
DROP POLICY IF EXISTS "seed_insert" ON public.suburb_language_stats;
DROP POLICY IF EXISTS "seed_update" ON public.suburb_language_stats;

REVOKE INSERT, UPDATE, SELECT ON public.suburb_language_stats FROM PUBLIC;
REVOKE USAGE, SELECT, UPDATE ON SEQUENCE public.suburb_language_stats_id_seq FROM PUBLIC;

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'sandbox_exec') THEN
    REVOKE INSERT, SELECT ON public.suburb_language_stats FROM sandbox_exec;
    REVOKE USAGE, SELECT ON SEQUENCE public.suburb_language_stats_id_seq FROM sandbox_exec;
    REVOKE INSERT, SELECT ON public.buyer_pool_lookups FROM sandbox_exec;
    REVOKE USAGE, SELECT ON SEQUENCE public.buyer_pool_lookups_id_seq FROM sandbox_exec;
  END IF;
END $$;

REVOKE INSERT, SELECT ON public.suburb_language_stats FROM postgres;
REVOKE USAGE, SELECT ON SEQUENCE public.suburb_language_stats_id_seq FROM postgres;

ALTER TABLE public.suburb_language_stats NO FORCE ROW LEVEL SECURITY;

COMMIT;