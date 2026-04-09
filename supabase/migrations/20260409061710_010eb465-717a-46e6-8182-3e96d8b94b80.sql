
-- ============================================================
-- 1. AGENTS: Column-level security to hide sensitive fields
-- ============================================================

-- Drop the overly broad public SELECT policy
DROP POLICY IF EXISTS "Public view agent profiles safe" ON public.agents;

-- Revoke table-level SELECT from anon and authenticated
REVOKE SELECT ON public.agents FROM anon, authenticated;

-- Grant SELECT only on safe columns
GRANT SELECT (
  id, name, slug, agency, agency_id, avatar_url, bio, headline,
  company_logo_url, email, phone, founding_member,
  instagram_url, linkedin_url, website_url,
  investment_niche, is_approved, is_demo, is_public_profile, is_subscribed,
  languages_spoken, license_number, office_address,
  onboarding_complete, profile_banner_url, profile_photo_url,
  profile_views, rating, review_count, service_areas,
  specialization, title_position, years_experience,
  avg_rating, created_at, updated_at, user_id,
  verification_badge_level
) ON public.agents TO anon, authenticated;

-- Re-create a safe public profile policy (only safe columns are now grantable)
CREATE POLICY "Public view agent profiles safe"
ON public.agents FOR SELECT TO anon, authenticated
USING (
  auth.uid() = user_id
  OR has_role(auth.uid(), 'admin'::app_role)
  OR (is_subscribed = true AND COALESCE(is_public_profile, true) = true)
);

-- Ensure admins and owners can still read ALL columns
GRANT SELECT ON public.agents TO service_role;

-- ============================================================
-- 2. CONVERSATION PARTICIPANTS: Restrict INSERT
-- ============================================================

DROP POLICY IF EXISTS "authenticated_can_insert_participants" ON public.conversation_participants;

CREATE POLICY "authenticated_can_insert_participants"
ON public.conversation_participants FOR INSERT TO authenticated
WITH CHECK (
  -- User can only add participants to conversations they are part of
  EXISTS (
    SELECT 1 FROM public.conversations c
    WHERE c.id = conversation_id
      AND (c.participant_1 = auth.uid() OR c.participant_2 = auth.uid())
  )
);

-- ============================================================
-- 3. AUCTION BIDS: Restrict public access
-- ============================================================

DROP POLICY IF EXISTS "public_view_bids" ON public.auction_bids;

-- Only the managing agent and admins can view bids
CREATE POLICY "agent_view_bids"
ON public.auction_bids FOR SELECT TO authenticated
USING (
  auction_id IN (
    SELECT a.id FROM auctions a
    JOIN agents ag ON ag.id = a.agent_id
    WHERE ag.user_id = auth.uid()
  )
  OR has_role(auth.uid(), 'admin'::app_role)
);
