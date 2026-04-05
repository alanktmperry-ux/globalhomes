
-- Fix 1: Remove overly permissive agents SELECT policy that exposes support_pin, stripe IDs
DROP POLICY IF EXISTS "Agents viewable by everyone" ON agents;

-- Create a restricted public view that hides sensitive columns
CREATE OR REPLACE VIEW public.agents_public
WITH (security_invoker = on) AS
SELECT
  id, name, slug, agency, agency_id, avatar_url, bio, headline,
  company_logo_url, email, phone, founding_member,
  instagram_url, investment_niche, is_approved, is_demo,
  is_public_profile, is_subscribed, languages_spoken,
  linkedin_url, office_address, onboarding_complete,
  profile_banner_url, profile_photo_url, profile_views,
  rating, review_count, service_areas, social_links,
  specialization, title_position, user_id,
  verification_badge_level, website_url, years_experience,
  created_at, updated_at, avg_rating, licence_expiry_date,
  license_number, lead_source, lifecycle_stage,
  handles_trust_accounting, last_compliance_check_at,
  aml_ctf_acknowledged
FROM public.agents;
-- Excludes: support_pin, stripe_customer_id, stripe_subscription_id, subscription_expires_at

-- Add policy: agents can view their own full row (including sensitive fields)
CREATE POLICY "Agents can view own profile" ON agents
FOR SELECT USING (auth.uid() = user_id);

-- Add policy: admins can view all full rows
-- (already exists: "Admins can read all agents")

-- Add policy: public can view via the view (agents_public uses security_invoker)
-- We need a SELECT policy for the view's invoker context - allow reading non-sensitive data
CREATE POLICY "Public can view agent profiles" ON agents
FOR SELECT TO authenticated, anon
USING (
  is_subscribed = true AND COALESCE(is_public_profile, true) = true
);
