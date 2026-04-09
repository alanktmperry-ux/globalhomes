-- Ensure current_balance and opening_balance exist before dropping balance
ALTER TABLE public.trust_accounts ADD COLUMN IF NOT EXISTS current_balance numeric NOT NULL DEFAULT 0;
ALTER TABLE public.trust_accounts ADD COLUMN IF NOT EXISTS opening_balance numeric NOT NULL DEFAULT 0;

-- Copy balance data to current_balance where current_balance is still default
UPDATE public.trust_accounts
SET current_balance = balance, opening_balance = balance
WHERE current_balance = 0 AND balance IS NOT NULL AND balance != 0;

-- Drop the deprecated column
ALTER TABLE public.trust_accounts DROP COLUMN IF EXISTS balance;