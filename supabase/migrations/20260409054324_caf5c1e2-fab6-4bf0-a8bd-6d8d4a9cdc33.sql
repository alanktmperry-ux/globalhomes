-- ============================================================
-- 1. AGENCIES: Hide email from public reads
-- ============================================================
REVOKE SELECT ON public.agencies FROM anon, authenticated;
GRANT SELECT (
  id, name, slug, description, logo_url, banner_url, website, phone,
  address, suburb, state, postcode, abn, license_number, founded_year,
  social_facebook, social_instagram, social_linkedin,
  verified, created_at, updated_at, owner_user_id
) ON public.agencies TO anon, authenticated;

-- ============================================================
-- 2. AGENTS: Hide sensitive columns from public reads
-- ============================================================
REVOKE SELECT ON public.agents FROM anon, authenticated;
GRANT SELECT (
  id, user_id, name, agency, phone, email, avatar_url, bio, headline,
  agency_id, license_number, office_address, years_experience,
  specialization, website_url, languages_spoken, service_areas,
  profile_photo_url, profile_banner_url, title_position,
  verification_badge_level, is_approved, company_logo_url,
  rating, review_count, avg_rating, investment_niche,
  handles_trust_accounting, is_demo, onboarding_complete,
  founding_member, slug, is_public_profile, profile_views,
  linkedin_url, instagram_url, social_links,
  is_subscribed, created_at, updated_at
) ON public.agents TO anon, authenticated;

-- ============================================================
-- 3. PROPERTIES: Hide vendor PII and financial internals
-- ============================================================
-- First get column list without sensitive ones
REVOKE SELECT ON public.properties FROM anon, authenticated;
-- Grant only safe columns (exclude vendor_name, vendor_email, vendor_phone, 
-- commission_rate, agent_split_percent, marketing_budget, agent_insights)
DO $$
DECLARE
  safe_cols text;
  sensitive text[] := ARRAY[
    'vendor_name', 'vendor_email', 'vendor_phone',
    'commission_rate', 'agent_split_percent', 'marketing_budget', 'agent_insights'
  ];
  col record;
  cols text[] := '{}';
BEGIN
  FOR col IN
    SELECT column_name FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'properties'
    AND column_name != ALL(sensitive)
    ORDER BY ordinal_position
  LOOP
    cols := cols || col.column_name;
  END LOOP;
  safe_cols := array_to_string(cols, ', ');
  EXECUTE format('GRANT SELECT (%s) ON public.properties TO anon, authenticated', safe_cols);
END $$;

-- ============================================================
-- 4. CONSUMER PROFILES: Restrict pre-purchase visibility
-- ============================================================
DROP POLICY IF EXISTS "Agents can view purchasable profiles" ON public.consumer_profiles;

-- Own profile or purchased
CREATE POLICY "Users view own consumer profile"
  ON public.consumer_profiles FOR SELECT TO authenticated
  USING (user_id = auth.uid());

CREATE POLICY "Agents view purchased profiles"
  ON public.consumer_profiles FOR SELECT TO authenticated
  USING (purchased_by IN (
    SELECT id FROM public.agents WHERE user_id = auth.uid()
  ));

-- Safe marketplace view for browsing (no PII)
CREATE OR REPLACE VIEW public.consumer_profiles_browse
WITH (security_invoker = on) AS
SELECT
  id, buying_situation, budget_min, budget_max,
  preferred_suburbs, preferred_type, min_bedrooms,
  lead_score, is_purchasable, created_at
FROM public.consumer_profiles
WHERE is_purchasable = true;

GRANT SELECT ON public.consumer_profiles_browse TO authenticated;

-- ============================================================
-- 5. OPEN HOME REGISTRATIONS: Restrict INSERT to authenticated
-- ============================================================
DROP POLICY IF EXISTS "oh_reg_insert" ON public.open_home_registrations;
CREATE POLICY "oh_reg_insert"
  ON public.open_home_registrations FOR INSERT TO authenticated
  WITH CHECK (true);

-- Fix SELECT to authenticated only
DROP POLICY IF EXISTS "oh_reg_read" ON public.open_home_registrations;
CREATE POLICY "oh_reg_read"
  ON public.open_home_registrations FOR SELECT TO authenticated
  USING (
    user_id = auth.uid()
    OR EXISTS (
      SELECT 1 FROM open_homes oh
      WHERE oh.id = open_home_registrations.open_home_id
      AND oh.agent_id IN (SELECT a.id FROM agents a WHERE a.user_id = auth.uid())
    )
  );

-- ============================================================
-- 6. AUCTION REGISTRATIONS: Restrict INSERT to authenticated
-- ============================================================
DROP POLICY IF EXISTS "auction_reg_insert" ON public.auction_registrations;
CREATE POLICY "auction_reg_insert"
  ON public.auction_registrations FOR INSERT TO authenticated
  WITH CHECK (user_id = auth.uid());

-- ============================================================
-- 7. AUCTION BIDDER REGISTRATIONS: Add ownership check on INSERT
-- ============================================================
DROP POLICY IF EXISTS "anyone_can_register_to_bid" ON public.auction_bidder_registrations;
CREATE POLICY "authenticated_register_to_bid"
  ON public.auction_bidder_registrations FOR INSERT TO authenticated
  WITH CHECK (
    profile_id = (SELECT p.id FROM profiles p WHERE p.user_id = auth.uid() LIMIT 1)
  );

-- ============================================================
-- 8. VOICE SEARCHES: Remove user_id IS NULL leak
-- ============================================================
DROP POLICY IF EXISTS "Users can view own voice searches" ON public.voice_searches;
CREATE POLICY "Users can view own voice searches"
  ON public.voice_searches FOR SELECT TO authenticated
  USING (auth.uid() = user_id);

-- ============================================================
-- 9. RENTAL APPLICATIONS: Restrict INSERT to authenticated with ownership
-- ============================================================
DROP POLICY IF EXISTS "Anyone can submit rental applications" ON public.rental_applications;
CREATE POLICY "Authenticated users can submit rental applications"
  ON public.rental_applications FOR INSERT TO authenticated
  WITH CHECK (user_id = auth.uid());

-- ============================================================
-- 10. SELLER LIKELIHOOD SCORES: Restrict to listing agent / admin
-- ============================================================
DROP POLICY IF EXISTS "Authenticated users can view seller likelihood scores" ON public.seller_likelihood_scores;
CREATE POLICY "Agents view own property scores"
  ON public.seller_likelihood_scores FOR SELECT TO authenticated
  USING (
    property_id IN (
      SELECT p.id FROM properties p
      WHERE p.agent_id IN (SELECT a.id FROM agents a WHERE a.user_id = auth.uid())
    )
    OR has_role(auth.uid(), 'admin'::app_role)
  );

-- ============================================================
-- 11. BUYER BRIEFS: Restrict active briefs to own agent
-- ============================================================
DROP POLICY IF EXISTS "Authenticated can view active briefs" ON public.buyer_briefs;
CREATE POLICY "Agents view own briefs"
  ON public.buyer_briefs FOR SELECT TO authenticated
  USING (
    agent_id IN (SELECT a.id FROM agents a WHERE a.user_id = auth.uid())
    OR has_role(auth.uid(), 'admin'::app_role)
  );

-- ============================================================
-- 12. FEATURE REQUESTS: Hide admin_response and agent_id from non-admins
-- ============================================================
DROP POLICY IF EXISTS "Feature requests readable" ON public.feature_requests;
CREATE POLICY "Feature requests readable by own agent"
  ON public.feature_requests FOR SELECT TO authenticated
  USING (
    agent_id IN (SELECT a.id FROM agents a WHERE a.user_id = auth.uid())
    OR has_role(auth.uid(), 'admin'::app_role)
  );

-- ============================================================
-- 13. CMA REPORTS: Create safe shared view excluding PII
-- ============================================================
DROP POLICY IF EXISTS "public_view_shared_cma" ON public.cma_reports;

CREATE OR REPLACE VIEW public.cma_reports_shared
WITH (security_invoker = on) AS
SELECT
  id, report_title, subject_address, subject_suburb, subject_state,
  subject_postcode, subject_bedrooms, subject_bathrooms, subject_car_spaces,
  subject_land_sqm, subject_property_type, radius_km, months_back,
  selected_comparable_ids, estimated_price_low, estimated_price_mid,
  estimated_price_high, agent_recommended_price, agent_recommended_method,
  agent_commentary, share_token, is_shared, view_count, viewed_at,
  created_at, updated_at
FROM public.cma_reports
WHERE is_shared = true;

GRANT SELECT ON public.cma_reports_shared TO anon, authenticated;