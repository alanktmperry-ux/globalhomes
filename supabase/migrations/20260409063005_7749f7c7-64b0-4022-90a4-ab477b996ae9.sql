
-- Restore table-level SELECT on properties (was broken by earlier column-level revoke cascade)
GRANT SELECT ON public.properties TO anon, authenticated;

-- Restore table-level SELECT on agents (column-level grants from 061710 broke select(*) and joins)
GRANT SELECT ON public.agents TO anon, authenticated;
