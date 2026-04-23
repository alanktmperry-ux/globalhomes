ALTER TABLE public.properties ADD COLUMN IF NOT EXISTS tags text[] DEFAULT '{}'::text[];
CREATE INDEX IF NOT EXISTS idx_properties_tags ON public.properties USING GIN(tags);