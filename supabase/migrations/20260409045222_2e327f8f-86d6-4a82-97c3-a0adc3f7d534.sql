
CREATE OR REPLACE VIEW public.properties_public_safe WITH (security_invoker = on) AS
SELECT
  id, title, slug, description, address, suburb, state, postcode, country,
  property_type, listing_type, listing_category, listing_mode, status,
  price, price_formatted, price_guide_low, price_guide_high,
  rental_weekly, bond_amount,
  beds, baths, parking, land_size_sqm, floor_area_sqm, price_per_sqm,
  lat, lng, features, images, floor_plan_url, video_url, virtual_tour_url,
  year_built, council_rates_annual, strata_fees_quarterly, zoning,
  is_active, is_featured, boost_tier, featured_until,
  views, contact_clicks,
  agent_id, listed_at, sold_at, sold_price,
  created_at, updated_at,
  auction_date, auction_time, eoi_close_date, eoi_guide_price,
  ensuites, study_rooms, has_pool, has_solar, air_con_type,
  estimated_weekly_rent, is_new_build
FROM public.properties;

CREATE POLICY "Public read active listings"
ON public.properties FOR SELECT TO anon
USING (is_active = true AND status IN ('public', 'active'));

DROP POLICY IF EXISTS "authenticated_can_create_conversation" ON public.conversations;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE tablename = 'conversations'
    AND schemaname = 'public'
    AND cmd = 'INSERT'
  ) THEN
    EXECUTE 'CREATE POLICY "Users create own conversations" ON public.conversations FOR INSERT TO authenticated WITH CHECK (auth.uid() = participant_1 OR auth.uid() = participant_2)';
  END IF;
END $$;

DROP POLICY IF EXISTS "Authenticated users can delete property photos" ON storage.objects;
DROP POLICY IF EXISTS "Anyone can delete property photos" ON storage.objects;

CREATE POLICY "Agents can delete own property photos"
ON storage.objects FOR DELETE TO authenticated
USING (
  bucket_id = 'property-photos'
  AND (storage.foldername(name))[1] = auth.uid()::text
);
