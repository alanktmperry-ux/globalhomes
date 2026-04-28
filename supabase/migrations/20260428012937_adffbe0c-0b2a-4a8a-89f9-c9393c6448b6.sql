CREATE OR REPLACE FUNCTION public.is_tenancy_agent(_tenancy_id uuid, _user_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.tenancies t
    JOIN public.agents a ON a.id = t.agent_id
    WHERE t.id = _tenancy_id AND a.user_id = _user_id
  );
$$;