ALTER TABLE public.leads 
  ADD COLUMN IF NOT EXISTS timeframe text DEFAULT 'flexible',
  ADD COLUMN IF NOT EXISTS budget_range text,
  ADD COLUMN IF NOT EXISTS buying_purpose text DEFAULT 'home',
  ADD COLUMN IF NOT EXISTS interests text[] DEFAULT '{}'::text[];