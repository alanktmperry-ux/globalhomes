
-- =============================================
-- 1. AGENTS: Remove public SELECT, create safe view
-- =============================================
DROP POLICY IF EXISTS "Public can view agent profiles" ON public.agents;

-- New public policy excludes sensitive columns via a view
CREATE OR REPLACE VIEW public.agents_public_safe
WITH (security_invoker = on)
AS SELECT
  id, name, agency, agency_id, avatar_url, bio, headline, email, phone,
  company_logo_url, founding_member, instagram_url, investment_niche,
  is_approved, is_demo, is_public_profile, is_subscribed, languages_spoken,
  license_number, linkedin_url, office_address, onboarding_complete,
  profile_banner_url, profile_photo_url, profile_views, rating, review_count,
  service_areas, slug, social_links, specialization, title_position,
  verification_badge_level, website_url, years_experience, created_at, updated_at, user_id
FROM public.agents;

-- Re-add public policy but only for subscribed+public agents
CREATE POLICY "Public can view agent profiles"
ON public.agents
FOR SELECT
TO anon, authenticated
USING (
  is_subscribed = true
  AND COALESCE(is_public_profile, true) = true
);

-- Create a security definer function to get own agent's sensitive fields
CREATE OR REPLACE FUNCTION public.get_own_agent_sensitive(p_user_id uuid)
RETURNS TABLE(support_pin text, stripe_customer_id text, stripe_subscription_id text)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = 'public'
AS $$
  SELECT support_pin, stripe_customer_id, stripe_subscription_id
  FROM public.agents
  WHERE user_id = p_user_id;
$$;

-- =============================================
-- 2. PROFILES: Replace blanket public SELECT
-- =============================================
DROP POLICY IF EXISTS "Profiles viewable by everyone" ON public.profiles;

-- Users can view their own full profile
CREATE POLICY "Users can view own profile"
ON public.profiles
FOR SELECT
TO authenticated
USING (auth.uid() = user_id);

-- Admins can view all profiles
CREATE POLICY "Admins can view all profiles"
ON public.profiles
FOR SELECT
TO authenticated
USING (public.has_role(auth.uid(), 'admin'));

-- Public-safe view for display names/avatars (used in listings, reviews, etc.)
CREATE OR REPLACE VIEW public.profiles_public
WITH (security_invoker = on)
AS SELECT
  user_id,
  display_name,
  avatar_url,
  full_name
FROM public.profiles;

-- =============================================
-- 3. CONVERSATION PARTICIPANTS: Fix broken self-join
-- =============================================
DROP POLICY IF EXISTS "participants_see_own_and_coparticipants" ON public.conversation_participants;

CREATE POLICY "participants_see_own_and_coparticipants"
ON public.conversation_participants
FOR SELECT
TO authenticated
USING (
  user_id = auth.uid()
  OR EXISTS (
    SELECT 1 FROM public.conversation_participants cp2
    WHERE cp2.conversation_id = conversation_participants.conversation_id
      AND cp2.user_id = auth.uid()
  )
);

-- =============================================
-- 4. PROPERTY-DOCUMENTS: Scope to listing agent or admin
-- =============================================
DROP POLICY IF EXISTS "Agent read property-documents" ON storage.objects;
DROP POLICY IF EXISTS "Agent upload to property-documents" ON storage.objects;

-- Only the listing agent or admin can read property documents
CREATE POLICY "Agent read own property-documents"
ON storage.objects
FOR SELECT
TO authenticated
USING (
  bucket_id = 'property-documents'
  AND (
    public.has_role(auth.uid(), 'admin')
    OR EXISTS (
      SELECT 1 FROM public.properties p
      JOIN public.agents a ON a.id = p.agent_id
      WHERE a.user_id = auth.uid()
        AND p.id::text = (storage.foldername(name))[1]
    )
  )
);

-- Only the listing agent can upload property documents
CREATE POLICY "Agent upload own property-documents"
ON storage.objects
FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'property-documents'
  AND EXISTS (
    SELECT 1 FROM public.properties p
    JOIN public.agents a ON a.id = p.agent_id
    WHERE a.user_id = auth.uid()
      AND p.id::text = (storage.foldername(name))[1]
  )
);

-- =============================================
-- 5. LISTING-DOCUMENTS: Scope to listing agent or admin
-- =============================================
DROP POLICY IF EXISTS "Authenticated users can read listing docs" ON storage.objects;

CREATE POLICY "Listing agent or admin can read listing docs"
ON storage.objects
FOR SELECT
TO authenticated
USING (
  bucket_id = 'listing-documents'
  AND (
    public.has_role(auth.uid(), 'admin')
    OR (storage.foldername(name))[1] = auth.uid()::text
  )
);

-- =============================================
-- 6. RENTAL-APPS: Fix agent access to own properties only
-- =============================================
DROP POLICY IF EXISTS "rental_apps_select_own" ON storage.objects;
DROP POLICY IF EXISTS "Agents can read application files for their properties" ON storage.objects;

-- Applicants see own files
CREATE POLICY "rental_apps_select_own_files"
ON storage.objects
FOR SELECT
TO authenticated
USING (
  bucket_id = 'rental-applications'
  AND (
    auth.uid()::text = (storage.foldername(name))[1]
    OR public.has_role(auth.uid(), 'admin')
    OR EXISTS (
      SELECT 1 FROM public.rental_applications ra
      JOIN public.properties p ON p.id = ra.property_id
      JOIN public.agents a ON a.id = p.agent_id
      WHERE a.user_id = auth.uid()
        AND ra.id::text = (storage.foldername(name))[2]
    )
  )
);

-- =============================================
-- 7. INVITE CODES: Restrict anonymous lookup
-- =============================================
DROP POLICY IF EXISTS "Anyone can lookup invite code" ON public.agency_invite_codes;

-- Create RPC for exact-code lookup instead of exposing all active codes
CREATE OR REPLACE FUNCTION public.lookup_invite_code(p_code text)
RETURNS TABLE(agency_id uuid, role text, agency_name text)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = 'public'
AS $$
  SELECT ic.agency_id, ic.role::text, a.name
  FROM public.agency_invite_codes ic
  JOIN public.agencies a ON a.id = ic.agency_id
  WHERE ic.code = UPPER(TRIM(p_code))
    AND ic.is_active = true
    AND (ic.max_uses IS NULL OR ic.uses < ic.max_uses)
    AND (ic.expires_at IS NULL OR ic.expires_at > now());
$$;

-- =============================================
-- 8. VENDOR REPORT TOKENS: Restrict to exact token match
-- =============================================
DROP POLICY IF EXISTS "Token-based public read" ON public.vendor_report_tokens;

-- Create RPC for exact-token lookup
CREATE OR REPLACE FUNCTION public.lookup_vendor_report_token(p_token text)
RETURNS TABLE(
  id uuid, property_id uuid, agent_id uuid, vendor_name text,
  vendor_email text, token text, expires_at timestamptz
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = 'public'
AS $$
  SELECT id, property_id, agent_id, vendor_name, vendor_email, token, expires_at
  FROM public.vendor_report_tokens
  WHERE token = p_token
    AND expires_at > now();
$$;
