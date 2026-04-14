ALTER TABLE public.user_preferences
  ADD COLUMN IF NOT EXISTS seeking_type text,
  ADD COLUMN IF NOT EXISTS weekly_budget numeric,
  ADD COLUMN IF NOT EXISTS pets_required boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS furnished_required boolean NOT NULL DEFAULT false;