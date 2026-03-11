
-- Update the is_agency_owner_or_admin function to include principal role
CREATE OR REPLACE FUNCTION public.is_agency_owner_or_admin(_user_id uuid, _agency_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.agency_members
    WHERE user_id = _user_id AND agency_id = _agency_id AND role IN ('owner', 'admin', 'principal')
  )
$$;

-- Create a function to check if user is principal
CREATE OR REPLACE FUNCTION public.is_agency_principal(_user_id uuid, _agency_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.agency_members
    WHERE user_id = _user_id AND agency_id = _agency_id AND role = 'principal'
  )
$$;
