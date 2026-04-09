-- Revoke table-level SELECT so we can use column-level grants
REVOKE SELECT ON public.agents FROM anon, authenticated;

-- Re-grant SELECT on all safe columns
GRANT SELECT (
  id, user_id, name, agency, phone, email, avatar_url,
  is_subscribed, subscription_expires_at,
  created_at, updated_at, agency_id, license_number, office_address,
  years_experience, specialization, bio, website_url, social_links,
  languages_spoken, service_areas, profile_photo_url, title_position,
  verification_badge_level, is_approved, company_logo_url, rating,
  review_count, investment_niche, handles_trust_accounting, is_demo,
  onboarding_complete, avg_rating, founding_member, slug, headline,
  profile_banner_url, is_public_profile, profile_views,
  linkedin_url, instagram_url, licence_expiry_date
) ON public.agents TO anon, authenticated;
