ALTER TABLE public.search_queries
  ADD COLUMN IF NOT EXISTS halo_posted boolean NOT NULL DEFAULT false;

CREATE INDEX IF NOT EXISTS idx_search_queries_halo_posted
  ON public.search_queries(halo_posted) WHERE halo_posted = true;