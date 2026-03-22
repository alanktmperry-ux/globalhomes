-- Add support PIN column to agents
ALTER TABLE public.agents
  ADD COLUMN IF NOT EXISTS
  support_pin TEXT DEFAULT NULL;

-- Generate a unique 6-digit PIN for every existing agent
UPDATE public.agents
SET support_pin = LPAD(
  FLOOR(RANDOM() * 900000 + 100000)
  ::INTEGER::TEXT, 6, '0'
)
WHERE support_pin IS NULL;

-- Add unique constraint
CREATE UNIQUE INDEX IF NOT EXISTS
  agents_support_pin_unique
  ON public.agents (support_pin);