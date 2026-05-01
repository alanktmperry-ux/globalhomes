ALTER TABLE public.properties
  ADD COLUMN IF NOT EXISTS school_zone_top boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS school_zone_name text;