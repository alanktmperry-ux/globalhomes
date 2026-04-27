ALTER TABLE public.partners
  ADD COLUMN IF NOT EXISTS partner_type text
  CHECK (partner_type IN ('trust_accountant', 'mortgage_broker'))
  DEFAULT 'trust_accountant';

UPDATE public.partners SET partner_type = 'trust_accountant' WHERE partner_type IS NULL;

ALTER TABLE public.partners ALTER COLUMN partner_type SET NOT NULL;