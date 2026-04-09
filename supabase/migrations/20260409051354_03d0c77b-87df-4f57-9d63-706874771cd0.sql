-- ============================================================
-- 1. AGENTS: Column-level SELECT restriction
-- ============================================================
REVOKE SELECT ON public.agents FROM anon, authenticated;

-- Grant SELECT on all safe columns (excludes support_pin, stripe_customer_id, stripe_subscription_id)
GRANT SELECT (
  id, user_id, name, agency, phone, email, avatar_url, is_subscribed,
  subscription_expires_at, created_at, updated_at, agency_id, license_number,
  office_address, years_experience, specialization, bio, website_url,
  social_links, languages_spoken, service_areas, profile_photo_url,
  title_position, verification_badge_level, is_approved, company_logo_url,
  rating, review_count, investment_niche, handles_trust_accounting, is_demo,
  onboarding_complete, avg_rating, lead_source, lifecycle_stage,
  licence_expiry_date, aml_ctf_acknowledged, last_compliance_check_at,
  founding_member, slug, headline, profile_banner_url, is_public_profile,
  profile_views, linkedin_url, instagram_url
) ON public.agents TO anon, authenticated;

-- ============================================================
-- 2. PROPERTIES: Column-level SELECT restriction for anon
-- ============================================================
REVOKE SELECT ON public.properties FROM anon;

-- Grant SELECT on all safe columns for anon (excludes vendor PII + commercial terms)
GRANT SELECT (
  id, title, address, suburb, state, country, price, price_formatted, beds, baths,
  parking, sqm, image_url, images, description, estimated_value, property_type,
  features, agent_id, listed_date, views, contact_clicks, is_active, created_at,
  updated_at, status, lat, lng, agency_authority, land_size, currency_code,
  listing_type, rental_yield_pct, rental_weekly, str_permitted, zoning, year_built,
  strata_fees_quarterly, council_rates_annual, flood_zone, bushfire_zone,
  inspection_times, available_from, lease_term, furnished, pets_allowed,
  is_featured, featured_until, boost_tier, boost_requested_at, boost_requested_tier,
  boost_expiry_warned, ensuites, study_rooms, garage_type, has_pool, has_outdoor_ent,
  has_alfresco, has_solar, air_con_type, heating_type, auction_date, auction_time,
  water_included, electricity_included, internet_included, has_internal_laundry,
  has_dishwasher, has_washing_machine, has_air_con, has_balcony, has_pool_access,
  has_gym_access, smoking_allowed, max_occupants, rental_parking_type, cover_index,
  slug, postcode, price_guide_low, price_guide_high, listing_status,
  estimated_weekly_rent, property_age_years, is_new_build, land_value, sold_price,
  sold_at, floor_area_sqm, land_size_sqm, price_per_sqm, virtual_tour_url,
  video_url, floor_plan_url, has_virtual_tour, listing_mode, eoi_close_date,
  eoi_guide_price, off_market_reason, address_hidden, listing_category, bond_amount,
  min_lease_months, parking_notes, utilities_included, vendor_id, listed_at,
  marketing_email_sent, marketing_email_sent_at, translations, agent_insights,
  translations_generated_at, translation_status
) ON public.properties TO anon;

-- ============================================================
-- 3. STORAGE: Replace permissive policies with ownership-scoped
-- ============================================================
-- Drop overly-permissive policies
DROP POLICY IF EXISTS "Authenticated users can upload property photos" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated users can upload property images" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated users can update property photos" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated users can upload listing docs" ON storage.objects;

-- Create ownership-scoped replacements
CREATE POLICY "upload_property_photos_own_folder" ON storage.objects
  FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'property-photos' AND (storage.foldername(name))[1] = (auth.uid())::text);

CREATE POLICY "upload_property_images_own_folder" ON storage.objects
  FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'property-images' AND (storage.foldername(name))[1] = (auth.uid())::text);

CREATE POLICY "update_property_photos_own_folder" ON storage.objects
  FOR UPDATE TO authenticated
  USING (bucket_id = 'property-photos' AND (storage.foldername(name))[1] = (auth.uid())::text);

CREATE POLICY "upload_listing_docs_own_folder" ON storage.objects
  FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'listing-documents' AND (storage.foldername(name))[1] = (auth.uid())::text);