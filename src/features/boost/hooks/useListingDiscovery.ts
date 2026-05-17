import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { fillFeaturedSlots } from '../lib/shufflePool';
import type { FeaturedListing } from '../types';

const FEATURED_SELECT =
  'id, title, address, suburb, state, price_formatted, beds, baths, parking, image_url, images, boost_tier, featured_until, agent_id, listing_type';

const STANDARD_SELECT =
  '*, agents(name, agency, phone, email, avatar_url, is_subscribed, verification_badge_level)';

type ListingType = 'sale' | 'rent' | 'off_market';

function mapToFeaturedListing(row: Record<string, unknown>): Omit<FeaturedListing, 'slotPosition'> {
  return {
    id: row.id as string,
    title: row.title as string,
    address: row.address as string,
    suburb: row.suburb as string,
    state: (row.state as string | null) ?? null,
    priceFormatted: (row.price_formatted as string | null) ?? null,
    beds: (row.beds as number | null) ?? null,
    baths: (row.baths as number | null) ?? null,
    parking: (row.parking as number | null) ?? null,
    imageUrl: (row.image_url as string) ?? ((row.images as string[])?.[0] ?? ''),
    boostTier: row.boost_tier as 'premier' | 'featured',
    listingType: (row.listing_type as string | null) ?? null,
    agentId: (row.agent_id as string | null) ?? null,
  };
}

export function useListingDiscovery(suburbInput: string | null, listingType: ListingType) {
  const [suburb, setSuburb] = useState<string | null>(suburbInput);
  const [featuredSlots, setFeaturedSlots] = useState<FeaturedListing[]>([]);
  const [standardListings, setStandardListings] = useState<unknown[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // Sync when caller changes the suburb (e.g. user applies a filter)
  useEffect(() => {
    setSuburb(suburbInput);
  }, [suburbInput]);

  // Geo-detect when no suburb is provided
  useEffect(() => {
    if (suburb !== null) return;
    if (!navigator.geolocation) { setIsLoading(false); return; }

    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        try {
          const { data } = await supabase.functions.invoke('get-featured-listings', {
            body: {
              lat: pos.coords.latitude,
              lng: pos.coords.longitude,
              radius_km: 15,
              listing_type: listingType === 'off_market' ? undefined : listingType,
            },
          });
          const detectedSuburb = (data?.featured as Record<string, unknown>[] | undefined)?.[0]?.suburb as string | undefined;
          if (detectedSuburb) setSuburb(detectedSuburb);
          else setIsLoading(false);
        } catch {
          setIsLoading(false);
        }
      },
      () => { setIsLoading(false); },
      { timeout: 5000, maximumAge: 300000 },
    );
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []); // run once on mount only

  // Fetch featured + standard when suburb is resolved
  useEffect(() => {
    if (!suburb) { setIsLoading(false); return; }

    let cancelled = false;
    setIsLoading(true);

    const now = new Date().toISOString();

    async function load() {
      let featuredQuery = supabase
        .from('properties')
        .select(FEATURED_SELECT)
        .ilike('suburb', `%${suburb}%`)
        .eq('is_featured', true)
        .eq('is_active', true)
        .gt('featured_until', now);

      let standardQuery = supabase
        .from('properties')
        .select(STANDARD_SELECT)
        .ilike('suburb', `%${suburb}%`)
        .eq('is_active', true)
        .not('agent_id', 'is', null)
        .order('created_at', { ascending: false })
        .limit(48);

      if (listingType === 'rent') {
        featuredQuery = featuredQuery.eq('listing_type', 'rent');
        standardQuery = standardQuery.eq('listing_type', 'rent');
      } else if (listingType === 'sale') {
        featuredQuery = featuredQuery.or('listing_type.eq.sale,listing_type.is.null');
        standardQuery = standardQuery.not('listing_type', 'eq', 'rent');
      } else if (listingType === 'off_market') {
        featuredQuery = featuredQuery.eq('listing_type', 'off_market');
        standardQuery = standardQuery.eq('listing_type', 'off_market');
      }

      const [featuredResult, standardResult] = await Promise.all([
        featuredQuery,
        standardQuery,
      ]);

      if (cancelled) return;

      const allFeatured = (featuredResult.data ?? []).map(mapToFeaturedListing);
      const premierPool = allFeatured.filter(f => f.boostTier === 'premier');
      const featuredPool = allFeatured.filter(f => f.boostTier === 'featured');

      const { featuredSlots: slots, standardListings: standard } = fillFeaturedSlots(
        premierPool,
        featuredPool,
        (standardResult.data ?? []) as { id: string }[],
      );

      setFeaturedSlots(slots as FeaturedListing[]);
      setStandardListings(standard);
      setIsLoading(false);
    }

    load().catch(() => { if (!cancelled) setIsLoading(false); });
    return () => { cancelled = true; };
  }, [suburb, listingType]);

  return { suburb, setSuburb, featuredSlots, standardListings, isLoading };
}
