-- 1. PROPERTIES: Revoke sensitive vendor/commercial columns
REVOKE SELECT ON public.properties FROM anon, authenticated;

GRANT SELECT (
  id, created_at, updated_at, title, description, address, suburb, state, postcode,
  country, property_type, listing_type, listing_category, listing_mode,
  price, price_formatted, price_guide_low, price_guide_high,
  beds, baths, parking, sqm, land_size, land_size_sqm, floor_area_sqm, price_per_sqm,
  image_url, images, cover_index, video_url, virtual_tour_url, floor_plan_url, has_virtual_tour,
  features, lat, lng, status, is_active, is_featured, featured_until, boost_tier,
  agent_id, slug, listed_date, listed_at,
  views, contact_clicks,
  sold_at, sold_price,
  auction_date, auction_time, inspection_times,
  rental_weekly, bond_amount, available_from, min_lease_months,
  listing_status, currency_code, estimated_value,
  eoi_close_date, eoi_guide_price, off_market_reason, address_hidden,
  rental_yield_pct, str_permitted, zoning, year_built,
  strata_fees_quarterly, council_rates_annual, flood_zone, bushfire_zone,
  lease_term, furnished, pets_allowed,
  ensuites, study_rooms, garage_type, has_pool, has_outdoor_ent, has_alfresco, has_solar,
  air_con_type, heating_type,
  water_included, electricity_included, internet_included,
  has_internal_laundry, has_dishwasher, has_washing_machine, has_air_con,
  has_balcony, has_pool_access, has_gym_access,
  smoking_allowed, max_occupants, rental_parking_type, parking_notes, utilities_included,
  estimated_weekly_rent, property_age_years, is_new_build, land_value,
  boost_expiry_warned, boost_requested_at, boost_requested_tier,
  translation_status, translations_generated_at, translations,
  agency_authority, agent_insights,
  marketing_email_sent, marketing_email_sent_at
) ON public.properties TO anon, authenticated;

-- 2. REVIEW REQUESTS: Fix mass-invalidation vulnerability
DROP POLICY IF EXISTS "Anyone can mark request as used" ON public.review_requests;

CREATE OR REPLACE FUNCTION public.mark_review_request_used(p_token text)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_count integer;
BEGIN
  UPDATE public.review_requests
  SET used = true, used_at = now()
  WHERE token = p_token
    AND used = false
    AND expires_at > now();
  GET DIAGNOSTICS v_count = ROW_COUNT;
  RETURN v_count > 0;
END;
$$;

-- 3. AGENCY MEMBERS: Remove unconditional public read
DROP POLICY IF EXISTS "Public can view agency members" ON public.agency_members;

-- 4. AUCTION BIDS: Restrict sensitive columns from public
REVOKE SELECT ON public.auction_bids FROM anon, authenticated;

GRANT SELECT (
  id, auction_id, bid_amount, bid_number, bid_source, bid_time,
  bid_type, created_at, is_winning, reserve_met_at_this_bid, recorded_by
) ON public.auction_bids TO anon, authenticated;