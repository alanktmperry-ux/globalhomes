
-- Create agencies table
CREATE TABLE public.agencies (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  slug text UNIQUE NOT NULL,
  logo_url text,
  description text,
  website text,
  phone text,
  email text,
  address text,
  owner_user_id uuid NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- Create agency member roles enum
CREATE TYPE public.agency_member_role AS ENUM ('owner', 'admin', 'agent');

-- Create agency_members join table
CREATE TABLE public.agency_members (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  agency_id uuid NOT NULL REFERENCES public.agencies(id) ON DELETE CASCADE,
  user_id uuid NOT NULL,
  role agency_member_role NOT NULL DEFAULT 'agent',
  joined_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(agency_id, user_id)
);

-- Create invite_codes table
CREATE TABLE public.agency_invite_codes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  agency_id uuid NOT NULL REFERENCES public.agencies(id) ON DELETE CASCADE,
  code text NOT NULL UNIQUE,
  created_by uuid NOT NULL,
  role agency_member_role NOT NULL DEFAULT 'agent',
  max_uses integer DEFAULT 1,
  uses integer NOT NULL DEFAULT 0,
  expires_at timestamptz,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.agencies ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.agency_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.agency_invite_codes ENABLE ROW LEVEL SECURITY;

-- Agencies: viewable by everyone (public profile)
CREATE POLICY "Agencies viewable by everyone" ON public.agencies
  FOR SELECT USING (true);

-- Agencies: owner can update
CREATE POLICY "Owner can update agency" ON public.agencies
  FOR UPDATE USING (auth.uid() = owner_user_id);

-- Agencies: authenticated users can create
CREATE POLICY "Authenticated users can create agencies" ON public.agencies
  FOR INSERT WITH CHECK (auth.uid() IS NOT NULL AND auth.uid() = owner_user_id);

-- Agency members: members can view their agency's members
CREATE POLICY "Members can view agency members" ON public.agency_members
  FOR SELECT USING (
    auth.uid() IN (
      SELECT am.user_id FROM public.agency_members am WHERE am.agency_id = agency_members.agency_id
    )
  );

-- Agency members: public can also view (for public agency page)
CREATE POLICY "Public can view agency members" ON public.agency_members
  FOR SELECT USING (true);

-- Agency members: owner/admin can insert members
CREATE POLICY "Owner or admin can add members" ON public.agency_members
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.agency_members am
      WHERE am.agency_id = agency_members.agency_id
        AND am.user_id = auth.uid()
        AND am.role IN ('owner', 'admin')
    )
    OR
    -- Allow self-insert when using invite code (handled by app logic)
    auth.uid() = user_id
  );

-- Agency members: owner/admin can delete members
CREATE POLICY "Owner or admin can remove members" ON public.agency_members
  FOR DELETE USING (
    EXISTS (
      SELECT 1 FROM public.agency_members am
      WHERE am.agency_id = agency_members.agency_id
        AND am.user_id = auth.uid()
        AND am.role IN ('owner', 'admin')
    )
  );

-- Agency members: owner can update roles
CREATE POLICY "Owner can update member roles" ON public.agency_members
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM public.agency_members am
      WHERE am.agency_id = agency_members.agency_id
        AND am.user_id = auth.uid()
        AND am.role = 'owner'
    )
  );

-- Invite codes: members of agency can view
CREATE POLICY "Agency members can view invite codes" ON public.agency_invite_codes
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.agency_members am
      WHERE am.agency_id = agency_invite_codes.agency_id
        AND am.user_id = auth.uid()
        AND am.role IN ('owner', 'admin')
    )
  );

-- Invite codes: owner/admin can create
CREATE POLICY "Owner or admin can create invite codes" ON public.agency_invite_codes
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.agency_members am
      WHERE am.agency_id = agency_invite_codes.agency_id
        AND am.user_id = auth.uid()
        AND am.role IN ('owner', 'admin')
    )
  );

-- Invite codes: owner/admin can deactivate
CREATE POLICY "Owner or admin can update invite codes" ON public.agency_invite_codes
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM public.agency_members am
      WHERE am.agency_id = agency_invite_codes.agency_id
        AND am.user_id = auth.uid()
        AND am.role IN ('owner', 'admin')
    )
  );

-- Anyone can read invite codes by code (for joining)
CREATE POLICY "Anyone can lookup invite code" ON public.agency_invite_codes
  FOR SELECT USING (is_active = true);

-- Add agency_id to agents table
ALTER TABLE public.agents ADD COLUMN agency_id uuid REFERENCES public.agencies(id);

-- Updated_at trigger for agencies
CREATE TRIGGER update_agencies_updated_at
  BEFORE UPDATE ON public.agencies
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();
