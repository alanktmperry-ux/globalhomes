ALTER TABLE public.brokers
  ADD COLUMN IF NOT EXISTS suburb text,
  ADD COLUMN IF NOT EXISTS state text,
  ADD COLUMN IF NOT EXISTS specialties text[] DEFAULT '{}'::text[],
  ADD COLUMN IF NOT EXISTS approval_status text DEFAULT 'pending',
  ADD COLUMN IF NOT EXISTS rejection_reason text;

CREATE INDEX IF NOT EXISTS idx_brokers_approval_status ON public.brokers(approval_status);