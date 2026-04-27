-- Migrate existing plan_type values to new tier slugs
UPDATE public.agent_subscriptions SET plan_type = 'solo'       WHERE plan_type = 'starter';
UPDATE public.agent_subscriptions SET plan_type = 'agency_pro' WHERE plan_type = 'agency';
UPDATE public.agent_subscriptions SET plan_type = 'agency'     WHERE plan_type = 'pro';

-- Update plan limits to match each new tier
UPDATE public.agent_subscriptions
SET listing_limit = CASE plan_type
    WHEN 'solo' THEN 15
    WHEN 'agency' THEN 75
    WHEN 'agency_pro' THEN 999999
    WHEN 'enterprise' THEN 999999
    WHEN 'demo' THEN 3
    ELSE listing_limit
  END,
  seat_limit = CASE plan_type
    WHEN 'solo' THEN 1
    WHEN 'agency' THEN 12
    WHEN 'agency_pro' THEN 999999
    WHEN 'enterprise' THEN 999999
    WHEN 'demo' THEN 1
    ELSE seat_limit
  END
WHERE plan_type IN ('solo','agency','agency_pro','enterprise','demo');

-- Drop founding_member column from agent_subscriptions
ALTER TABLE public.agent_subscriptions DROP COLUMN IF EXISTS founding_member;

-- Recreate views without founding_member, then drop the column
DROP VIEW IF EXISTS public.agents_public CASCADE;
DROP VIEW IF EXISTS public.agents_public_safe CASCADE;

ALTER TABLE public.agents DROP COLUMN IF EXISTS founding_member;

CREATE VIEW public.agents_public AS
SELECT id, name, slug, agency, agency_id, avatar_url, bio, headline, company_logo_url,
  email, phone, instagram_url, investment_niche, is_approved, is_demo, is_public_profile,
  is_subscribed, languages_spoken, linkedin_url, office_address, onboarding_complete,
  profile_banner_url, profile_photo_url, profile_views, rating, review_count, service_areas,
  social_links, specialization, title_position, user_id, verification_badge_level,
  website_url, years_experience, created_at, updated_at, avg_rating, licence_expiry_date,
  license_number, lead_source, lifecycle_stage, handles_trust_accounting,
  last_compliance_check_at, aml_ctf_acknowledged
FROM public.agents;

CREATE VIEW public.agents_public_safe AS
SELECT id, name, agency, agency_id, avatar_url, bio, headline, email, phone,
  company_logo_url, instagram_url, investment_niche, is_approved, is_demo,
  is_public_profile, is_subscribed, languages_spoken, license_number, linkedin_url,
  office_address, onboarding_complete, profile_banner_url, profile_photo_url,
  profile_views, rating, review_count, service_areas, slug, social_links, specialization,
  title_position, verification_badge_level, website_url, years_experience, created_at,
  updated_at, user_id
FROM public.agents;

-- New sensible defaults
ALTER TABLE public.agent_subscriptions ALTER COLUMN listing_limit SET DEFAULT 15;
ALTER TABLE public.agent_subscriptions ALTER COLUMN seat_limit SET DEFAULT 1;