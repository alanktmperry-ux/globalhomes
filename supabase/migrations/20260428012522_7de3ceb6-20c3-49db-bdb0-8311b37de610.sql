ALTER TABLE public.tenancies
  ADD COLUMN IF NOT EXISTS arrears_action_status text NOT NULL DEFAULT 'none',
  ADD COLUMN IF NOT EXISTS last_arrears_notice_date date;