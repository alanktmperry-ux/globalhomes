
-- 1. Create partner_member_role enum
CREATE TYPE public.partner_member_role AS ENUM ('owner', 'member');

-- 2. Create partner_members table
CREATE TABLE public.partner_members (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  partner_id UUID NOT NULL REFERENCES public.partners(id) ON DELETE CASCADE,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  role partner_member_role NOT NULL DEFAULT 'member',
  invited_by UUID REFERENCES auth.users(id),
  invite_token TEXT UNIQUE,
  invite_expires_at TIMESTAMPTZ,
  joined_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(partner_id, user_id)
);

ALTER TABLE public.partner_members ENABLE ROW LEVEL SECURITY;

-- 3. RLS policies on partner_members
CREATE POLICY "Partner members can view team"
  ON public.partner_members
  FOR SELECT TO authenticated
  USING (
    partner_id IN (
      SELECT partner_id FROM public.partner_members WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Partner owners can invite"
  ON public.partner_members
  FOR INSERT TO authenticated
  WITH CHECK (
    partner_id IN (
      SELECT partner_id FROM public.partner_members WHERE user_id = auth.uid() AND role = 'owner'
    )
  );

CREATE POLICY "Partner owners can remove"
  ON public.partner_members
  FOR DELETE TO authenticated
  USING (
    partner_id IN (
      SELECT partner_id FROM public.partner_members WHERE user_id = auth.uid() AND role = 'owner'
    )
  );

-- 4. Update is_active_partner_for_agent to use partner_members
CREATE OR REPLACE FUNCTION public.is_active_partner_for_agent(_agent_id UUID)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = 'public'
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.partner_agencies pa
    JOIN public.partner_members pm ON pm.partner_id = pa.partner_id
    WHERE pm.user_id = auth.uid()
      AND pa.agency_id IN (
        SELECT agency_id FROM public.agents WHERE id = _agent_id
      )
      AND pa.status = 'active'
  );
$$;

-- 5. Also update is_partner_for_agency to use partner_members
CREATE OR REPLACE FUNCTION public.is_partner_for_agency(_user_id uuid, _agency_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.partner_agencies pa
    JOIN public.partner_members pm ON pm.partner_id = pa.partner_id
    WHERE pm.user_id = _user_id
      AND pa.agency_id = _agency_id
      AND pa.status = 'active'
  )
$$;

-- 6. Migrate existing partner owners into partner_members
INSERT INTO public.partner_members (partner_id, user_id, role, joined_at)
SELECT id, user_id, 'owner', created_at
FROM public.partners
ON CONFLICT DO NOTHING;
