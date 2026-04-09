
-- 1. Fix agent self-approve: restrict UPDATE to safe profile columns only
-- Revoke general UPDATE, then grant only safe columns
REVOKE UPDATE ON public.agents FROM authenticated;

GRANT UPDATE (
  name, agency, bio, headline, email, phone, avatar_url, profile_photo_url,
  profile_banner_url, company_logo_url, office_address, license_number,
  licence_expiry_date, specialization, investment_niche, languages_spoken,
  service_areas, social_links, linkedin_url, instagram_url, website_url,
  title_position, years_experience, is_public_profile, slug,
  handles_trust_accounting, onboarding_complete, agency_id,
  updated_at
) ON public.agents TO authenticated;

-- 2. Fix collab_sessions: restrict SELECT to session creator or shared participant
DROP POLICY IF EXISTS "Anyone can view collab sessions" ON public.collab_sessions;

CREATE POLICY "Users can view own collab sessions"
  ON public.collab_sessions
  FOR SELECT
  USING (created_by = auth.uid());
