
-- 1. agents_public
CREATE OR REPLACE VIEW public.agents_public
WITH (security_invoker = true) AS
SELECT id, name, slug, agency, agency_id, avatar_url, bio, headline,
  company_logo_url, email, phone, founding_member, instagram_url,
  investment_niche, is_approved, is_demo, is_public_profile, is_subscribed,
  languages_spoken, linkedin_url, office_address, onboarding_complete,
  profile_banner_url, profile_photo_url, profile_views, rating, review_count,
  service_areas, social_links, specialization, title_position, user_id,
  verification_badge_level, website_url, years_experience, created_at, updated_at,
  avg_rating, licence_expiry_date, license_number, lead_source, lifecycle_stage,
  handles_trust_accounting, last_compliance_check_at, aml_ctf_acknowledged
FROM agents;

-- 2. agents_public_safe
CREATE OR REPLACE VIEW public.agents_public_safe
WITH (security_invoker = true) AS
SELECT id, name, agency, agency_id, avatar_url, bio, headline, email, phone,
  company_logo_url, founding_member, instagram_url, investment_niche,
  is_approved, is_demo, is_public_profile, is_subscribed, languages_spoken,
  license_number, linkedin_url, office_address, onboarding_complete,
  profile_banner_url, profile_photo_url, profile_views, rating, review_count,
  service_areas, slug, social_links, specialization, title_position,
  verification_badge_level, website_url, years_experience, created_at, updated_at, user_id
FROM agents;

-- 3. profiles_public
CREATE OR REPLACE VIEW public.profiles_public
WITH (security_invoker = true) AS
SELECT user_id, display_name, avatar_url, full_name
FROM profiles;

-- 4. properties_public_safe
CREATE OR REPLACE VIEW public.properties_public_safe
WITH (security_invoker = true) AS
SELECT id, title, slug, description, address, suburb, state, postcode, country,
  property_type, listing_type, listing_category, listing_mode, status,
  price, price_formatted, price_guide_low, price_guide_high, rental_weekly,
  bond_amount, beds, baths, parking, land_size_sqm, floor_area_sqm,
  price_per_sqm, lat, lng, features, images, floor_plan_url, video_url,
  virtual_tour_url, year_built, council_rates_annual, strata_fees_quarterly,
  zoning, is_active, is_featured, boost_tier, featured_until, views,
  contact_clicks, agent_id, listed_at, sold_at, sold_price, created_at,
  updated_at, auction_date, auction_time, eoi_close_date, eoi_guide_price,
  ensuites, study_rooms, has_pool, has_solar, air_con_type,
  estimated_weekly_rent, is_new_build
FROM properties;

-- 5. consumer_profiles_browse
CREATE OR REPLACE VIEW public.consumer_profiles_browse
WITH (security_invoker = true) AS
SELECT id, buying_situation, budget_min, budget_max, preferred_suburbs,
  preferred_type, min_bedrooms, lead_score, is_purchasable, created_at
FROM consumer_profiles
WHERE is_purchasable = true;

-- 6. consumer_profiles_marketplace
CREATE OR REPLACE VIEW public.consumer_profiles_marketplace
WITH (security_invoker = true) AS
SELECT id,
  CASE WHEN EXISTS (
    SELECT 1 FROM lead_purchases lp JOIN agents a ON a.id = lp.agent_id
    WHERE lp.lead_id = cp.id AND a.user_id = auth.uid()
  ) THEN name ELSE 'Verified Buyer' END AS name,
  CASE WHEN EXISTS (
    SELECT 1 FROM lead_purchases lp JOIN agents a ON a.id = lp.agent_id
    WHERE lp.lead_id = cp.id AND a.user_id = auth.uid()
  ) THEN email ELSE NULL END AS email,
  buying_situation, budget_min, budget_max, preferred_suburbs, preferred_type,
  min_bedrooms, lead_score, is_purchasable, created_at
FROM consumer_profiles cp
WHERE is_purchasable = true
  OR user_id = auth.uid()
  OR EXISTS (
    SELECT 1 FROM lead_purchases lp JOIN agents a ON a.id = lp.agent_id
    WHERE lp.lead_id = cp.id AND a.user_id = auth.uid()
  );

-- 7. cma_reports_shared
CREATE OR REPLACE VIEW public.cma_reports_shared
WITH (security_invoker = true) AS
SELECT id, report_title, subject_address, subject_suburb, subject_state,
  subject_postcode, subject_bedrooms, subject_bathrooms, subject_car_spaces,
  subject_land_sqm, subject_property_type, radius_km, months_back,
  selected_comparable_ids, estimated_price_low, estimated_price_mid,
  estimated_price_high, agent_recommended_price, agent_recommended_method,
  agent_commentary, share_token, is_shared, view_count, viewed_at,
  created_at, updated_at
FROM cma_reports
WHERE is_shared = true;

-- 8. broker_leads_view
CREATE OR REPLACE VIEW public.broker_leads_view
WITH (security_invoker = true) AS
SELECT bl.id, bl.created_at, bl.buyer_name, bl.buyer_email, bl.buyer_phone,
  bl.buyer_message, bl.property_address, bl.property_price, bl.is_duplicate,
  bl.is_qualified, bl.invoice_month, bl.invoiced_at, bl.broker_id,
  b.lead_fee_aud,
  (b.cap_expires_at IS NULL OR bl.created_at <= b.cap_expires_at) AS within_cap_window
FROM broker_leads bl
JOIN brokers b ON b.id = bl.broker_id;

-- 9. listings_translation_summary
CREATE OR REPLACE VIEW public.listings_translation_summary
WITH (security_invoker = true) AS
SELECT id, address, translation_status, translations_generated_at,
  (translations IS NOT NULL AND translations <> '{}'::jsonb) AS has_translations,
  (translations ? 'zh-CN') AS has_mandarin,
  (translations ? 'zh-HK') AS has_cantonese,
  (translations ? 'vi') AS has_vietnamese
FROM properties;

-- 10. trust_account_balances
CREATE OR REPLACE VIEW public.trust_account_balances
WITH (security_invoker = true) AS
SELECT id AS agent_id,
  (COALESCE((SELECT sum(amount) FROM trust_receipts WHERE trust_receipts.agent_id = a.id), 0::numeric)
   - COALESCE((SELECT sum(amount) FROM trust_payments WHERE trust_payments.agent_id = a.id), 0::numeric)
  ) AS current_balance
FROM agents a;
