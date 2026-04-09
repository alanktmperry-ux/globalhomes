-- 1. Revoke column-level access to sensitive agent fields from anon and authenticated roles
-- This prevents direct queries to agents table from returning these columns
REVOKE SELECT (support_pin, stripe_customer_id, stripe_subscription_id) ON public.agents FROM anon;
REVOKE SELECT (support_pin, stripe_customer_id, stripe_subscription_id) ON public.agents FROM authenticated;

-- Grant SELECT on all OTHER columns explicitly to authenticated + anon
-- (RLS still controls row-level access)
GRANT SELECT (
  id, name, slug, agency, agency_id, avatar_url, bio, headline,
  company_logo_url, email, phone, founding_member, instagram_url,
  investment_niche, is_approved, is_demo, is_public_profile, is_subscribed,
  languages_spoken, linkedin_url, office_address, onboarding_complete,
  profile_banner_url, profile_photo_url, profile_views, rating,
  review_count, service_areas, social_links, specialization,
  title_position, user_id, verification_badge_level, website_url,
  years_experience, created_at, updated_at, avg_rating,
  licence_expiry_date, license_number, lead_source, lifecycle_stage,
  handles_trust_accounting, last_compliance_check_at, aml_ctf_acknowledged,
  subscription_expires_at, support_pin, stripe_customer_id, stripe_subscription_id
) ON public.agents TO service_role;

-- 2. Drop overly-permissive and redundant rental-applications storage policies
DROP POLICY IF EXISTS "Authenticated users can upload application docs" ON storage.objects;
DROP POLICY IF EXISTS "Uploaders can access own files" ON storage.objects;
DROP POLICY IF EXISTS "Users can view own application docs" ON storage.objects;