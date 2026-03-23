ALTER TABLE public.agents
  ADD COLUMN IF NOT EXISTS licence_expiry_date date,
  ADD COLUMN IF NOT EXISTS aml_ctf_acknowledged boolean DEFAULT false,
  ADD COLUMN IF NOT EXISTS last_compliance_check_at timestamptz;