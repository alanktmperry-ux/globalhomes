ALTER TABLE public.properties
  ADD COLUMN IF NOT EXISTS letting_fee_weeks numeric,
  ADD COLUMN IF NOT EXISTS screening_level text NOT NULL DEFAULT 'standard';