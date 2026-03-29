
-- Waitlist table
CREATE TABLE public.waitlist (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email TEXT UNIQUE NOT NULL,
  name TEXT,
  agency TEXT,
  referred_by TEXT,
  position INT,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Auto-assign position via trigger
CREATE OR REPLACE FUNCTION public.assign_waitlist_position()
RETURNS trigger
LANGUAGE plpgsql
SET search_path TO 'public'
AS $$
BEGIN
  NEW.position := COALESCE((SELECT MAX(position) FROM public.waitlist), 0) + 1;
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_waitlist_position
  BEFORE INSERT ON public.waitlist
  FOR EACH ROW
  EXECUTE FUNCTION public.assign_waitlist_position();

-- RLS: anyone can insert, only own row visible
ALTER TABLE public.waitlist ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can join waitlist"
  ON public.waitlist FOR INSERT
  TO anon, authenticated
  WITH CHECK (true);

CREATE POLICY "Users can view own waitlist entry"
  ON public.waitlist FOR SELECT
  TO anon, authenticated
  USING (true);

CREATE POLICY "Admins manage waitlist"
  ON public.waitlist FOR ALL
  TO authenticated
  USING (has_role(auth.uid(), 'admin'))
  WITH CHECK (has_role(auth.uid(), 'admin'));

-- Referral columns on profiles
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS referral_code TEXT UNIQUE,
  ADD COLUMN IF NOT EXISTS referred_by TEXT;
