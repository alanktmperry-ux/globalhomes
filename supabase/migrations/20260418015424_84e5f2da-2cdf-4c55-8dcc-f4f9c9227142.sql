-- Properties: exclusive pre-market window fields
ALTER TABLE public.properties ADD COLUMN IF NOT EXISTS is_exclusive boolean NOT NULL DEFAULT false;
ALTER TABLE public.properties ADD COLUMN IF NOT EXISTS exclusive_start_date timestamptz;
ALTER TABLE public.properties ADD COLUMN IF NOT EXISTS exclusive_end_date timestamptz;
ALTER TABLE public.properties ADD COLUMN IF NOT EXISTS exclusive_views integer NOT NULL DEFAULT 0;
ALTER TABLE public.properties ADD COLUMN IF NOT EXISTS exclusive_enquiries integer NOT NULL DEFAULT 0;

CREATE INDEX IF NOT EXISTS idx_properties_exclusive_active
  ON public.properties (is_exclusive, exclusive_end_date)
  WHERE is_exclusive = true;

-- Exclusive members
CREATE TABLE IF NOT EXISTS public.exclusive_members (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  email text NOT NULL,
  name text,
  phone text,
  search_suburbs text[],
  search_min_price numeric,
  search_max_price numeric,
  search_min_beds integer,
  search_property_types text[],
  status text NOT NULL DEFAULT 'active',
  joined_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_exclusive_members_email ON public.exclusive_members (lower(email));
CREATE INDEX IF NOT EXISTS idx_exclusive_members_user_id ON public.exclusive_members (user_id);

ALTER TABLE public.exclusive_members ENABLE ROW LEVEL SECURITY;

-- Anyone (logged-in or anon) can sign up
CREATE POLICY "Anyone can join exclusive program"
  ON public.exclusive_members
  FOR INSERT
  WITH CHECK (true);

-- Members can view their own row by user_id match, by email match for the logged-in user, or admins can see all
CREATE POLICY "Members view own record"
  ON public.exclusive_members
  FOR SELECT
  USING (
    auth.uid() = user_id
    OR lower(email) = lower(COALESCE((auth.jwt() ->> 'email'), ''))
  );

CREATE POLICY "Members update own record"
  ON public.exclusive_members
  FOR UPDATE
  USING (
    auth.uid() = user_id
    OR lower(email) = lower(COALESCE((auth.jwt() ->> 'email'), ''))
  );

-- Helper: is the current user an active exclusive member?
CREATE OR REPLACE FUNCTION public.is_exclusive_member()
RETURNS boolean
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.exclusive_members
    WHERE status = 'active'
      AND (
        user_id = auth.uid()
        OR lower(email) = lower(COALESCE((auth.jwt() ->> 'email'), ''))
      )
  );
$$;

-- Allow exclusive members to view active exclusive listings
-- (additive policy — does not affect existing public listing policies)
CREATE POLICY "Exclusive members can view exclusive listings"
  ON public.properties
  FOR SELECT
  USING (
    is_exclusive = true
    AND exclusive_end_date IS NOT NULL
    AND exclusive_end_date > now()
    AND public.is_exclusive_member()
  );