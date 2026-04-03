
-- Create security definer function to check agency membership without recursion
CREATE OR REPLACE FUNCTION public.is_agency_member(_user_id uuid, _agency_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.agency_members
    WHERE user_id = _user_id AND agency_id = _agency_id
  )
$$;

-- Create function to check agency role
CREATE OR REPLACE FUNCTION public.is_agency_owner_or_admin(_user_id uuid, _agency_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.agency_members
    WHERE user_id = _user_id AND agency_id = _agency_id AND role IN ('owner', 'admin')
  )
$$;

-- Drop existing problematic policies
DROP POLICY IF EXISTS "Members can view agency members" ON public.agency_members;
DROP POLICY IF EXISTS "Public can view agency members" ON public.agency_members;
DROP POLICY IF EXISTS "Owner or admin can add members" ON public.agency_members;
DROP POLICY IF EXISTS "Owner can update member roles" ON public.agency_members;
DROP POLICY IF EXISTS "Owner or admin can remove members" ON public.agency_members;

-- Recreate policies using security definer functions
CREATE POLICY "Members can view agency members" ON public.agency_members
FOR SELECT USING (public.is_agency_member(auth.uid(), agency_id));

CREATE POLICY "Public can view agency members" ON public.agency_members
FOR SELECT USING (true);

CREATE POLICY "Owner or admin can add members" ON public.agency_members
FOR INSERT WITH CHECK (
  public.is_agency_owner_or_admin(auth.uid(), agency_id)
  OR (auth.uid() = user_id)
);

CREATE POLICY "Owner can update member roles" ON public.agency_members
FOR UPDATE USING (
  public.is_agency_owner_or_admin(auth.uid(), agency_id)
);

CREATE POLICY "Owner or admin can remove members" ON public.agency_members
FOR DELETE USING (
  public.is_agency_owner_or_admin(auth.uid(), agency_id)
);

-- Also fix agency_invite_codes policies that reference agency_members
DROP POLICY IF EXISTS "Agency members can view invite codes" ON public.agency_invite_codes;
DROP POLICY IF EXISTS "Owner or admin can create invite codes" ON public.agency_invite_codes;
DROP POLICY IF EXISTS "Owner or admin can update invite codes" ON public.agency_invite_codes;

CREATE POLICY "Agency members can view invite codes" ON public.agency_invite_codes
FOR SELECT USING (public.is_agency_owner_or_admin(auth.uid(), agency_id));

CREATE POLICY "Owner or admin can create invite codes" ON public.agency_invite_codes
FOR INSERT WITH CHECK (public.is_agency_owner_or_admin(auth.uid(), agency_id));

CREATE POLICY "Owner or admin can update invite codes" ON public.agency_invite_codes
FOR UPDATE USING (public.is_agency_owner_or_admin(auth.uid(), agency_id));
