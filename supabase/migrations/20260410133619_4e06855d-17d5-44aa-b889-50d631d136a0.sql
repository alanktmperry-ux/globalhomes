-- Revoke blanket UPDATE on agents from authenticated (anon shouldn't have it either)
REVOKE UPDATE ON public.agents FROM authenticated, anon;

-- Grant UPDATE only on safe, agent-editable columns
GRANT UPDATE (
  name, bio, headline, phone, email, avatar_url, profile_photo_url, profile_banner_url,
  company_logo_url, agency, office_address, license_number, specialization,
  years_experience, languages_spoken, service_areas, website_url, linkedin_url,
  instagram_url, social_links, investment_niche, title_position, slug,
  is_public_profile, agency_role, agency_id,
  -- Compliance fields managed via setup-agent edge function but also allow direct update:
  onboarding_complete
) ON public.agents TO authenticated;