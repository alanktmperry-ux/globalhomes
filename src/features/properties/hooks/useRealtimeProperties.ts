import { useEffect } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Property } from '@/shared/lib/types';
import { mapDbProperty } from '@/features/properties/api/fetchPublicProperties';

// Only select public-safe agent columns. Do NOT add user_id, stripe_*, support_pin,
// payment_failed_at, admin_grace_until, or any internal/admin fields here — these
// must never be exposed to anonymous visitors via the property join.
// Property columns are explicitly listed (no `*`) to keep the payload small —
// avoids returning heavy jsonb columns like `translations`, `meta`, `seo_*`.
const PROPERTY_COLS = 'id, title, address, suburb, state, country, price, price_formatted, beds, baths, parking, sqm, image_url, images, description, estimated_value, property_type, features, agent_id, listed_date, created_at, views, contact_clicks, lat, lng, rental_yield_pct, str_permitted, year_built, council_rates_annual, strata_fees_quarterly, rental_weekly, currency_code, listing_type, is_active, status, moderation_status';
const PROPERTIES_QUERY = `${PROPERTY_COLS}, agents!inner(id, name, agency, agency_id, phone, email, avatar_url, profile_photo_url, company_logo_url, is_subscribed, verification_badge_level, specialization, years_experience, rating, review_count, approval_status, bio, license_number, slug, headline, languages_spoken, service_areas)`;

async function fetchProperties(limit = 50, listingType?: 'sale' | 'rent', suburb?: string): Promise<Property[]> {
  let query = supabase
    .from('properties')
    .select(PROPERTIES_QUERY)
    .eq('is_active', true)
    .eq('status', 'public')
    .eq('moderation_status', 'approved')
    .eq('agents.approval_status', 'approved')
    .not('agent_id', 'is', null)
    .order('created_at', { ascending: false })
    .limit(limit);

  if (listingType === 'rent') {
    query = query.eq('listing_type', 'rent');
  } else if (listingType === 'sale') {
    query = query.or('listing_type.eq.sale,listing_type.is.null');
  }

  if (suburb) {
    query = query.or(`suburb.ilike.%${suburb}%,address.ilike.%${suburb}%`);
  }

  const { data, error } = await query;

  if (error) {
    console.error('[useRealtimeProperties] fetch error:', error.message);
    throw error;
  }

  return (data ?? []).map((p) => mapDbProperty(p as any));
}

async function fetchNearbyProperties(
  lat: number,
  lng: number,
  radiusKm: number,
  limit = 50,
  listingType?: 'sale' | 'rent'
): Promise<Property[]> {
  const { data, error } = await supabase.rpc('nearby_properties', {
    _lat: lat,
    _lng: lng,
    _radius_km: radiusKm,
    _limit: limit,
  });

  if (error) {
    console.error('[useRealtimeProperties] nearby_properties RPC error:', error.message);
    throw error;
  }

  if (import.meta.env.DEV) console.log('[useRealtimeProperties] nearby_properties RPC result', {
    lat,
    lng,
    radiusKm,
    rpcCount: data?.length ?? 0,
  });

  // RPC returns raw rows without agent join, so we need to fetch agents separately
  if (!data || data.length === 0) return [];

  const ids = data.map((p: any) => p.id);
  let query = supabase
    .from('properties')
    .select(PROPERTIES_QUERY)
    .eq('status', 'public')
    .not('agent_id', 'is', null)
    .in('id', ids);

  if (listingType === 'rent') {
    query = query.eq('listing_type', 'rent');
  } else if (listingType === 'sale') {
    query = query.or('listing_type.eq.sale,listing_type.is.null');
  }

  const { data: withAgents, error: agentError } = await query;

  if (agentError) {
    console.error('[useRealtimeProperties] agent join error:', agentError.message);
    return data.map((p: any) => mapDbProperty(p));
  }

  if (import.meta.env.DEV) console.log('[useRealtimeProperties] nearby_properties hydrated result', {
    lat,
    lng,
    radiusKm,
    hydratedCount: withAgents?.length ?? 0,
  });

  return (withAgents ?? []).map((p) => mapDbProperty(p as any));
}

interface UseRealtimePropertiesOptions {
  limit?: number;
  nearbyCenter?: { lat: number; lng: number } | null;
  nearbyRadiusKm?: number | null;
  listingType?: 'sale' | 'rent';
  suburb?: string | null;
  /**
   * When false, skips fetching entirely. Use to defer the heavy 100-row
   * landing-page search query until the user actually performs a search.
   */
  enabled?: boolean;
}

export function useRealtimeProperties({
  limit = 50,
  nearbyCenter = null,
  nearbyRadiusKm = null,
  listingType,
  suburb = null,
  enabled = true,
}: UseRealtimePropertiesOptions = {}) {
  const queryClient = useQueryClient();

  const isNearbySearch = nearbyCenter && nearbyRadiusKm && nearbyRadiusKm > 0;

  const queryKey = isNearbySearch
    ? ['properties', 'nearby', nearbyCenter.lat, nearbyCenter.lng, nearbyRadiusKm, limit, listingType, suburb]
    : ['properties', 'all', limit, listingType, suburb];

  const query = useQuery({
    queryKey,
    queryFn: () =>
      isNearbySearch
        ? fetchNearbyProperties(nearbyCenter.lat, nearbyCenter.lng, nearbyRadiusKm, limit, listingType)
        : fetchProperties(limit, listingType, suburb || undefined),
    enabled,
    staleTime: 5 * 60 * 1000, // 5 minutes
    gcTime: 10 * 60 * 1000,   // 10 minutes garbage collection
    refetchOnWindowFocus: false,
  });

  // Subscribe to realtime changes only for authenticated users (agents)
  // to avoid unnecessary WebSocket connections for anonymous visitors
  useEffect(() => {
    let channel: ReturnType<typeof supabase.channel> | null = null;

    supabase.auth.getSession().then(({ data: { session } }) => {
      if (!session) return; // Skip realtime for anonymous visitors
      channel = supabase
        .channel('properties-realtime')
        .on(
          'postgres_changes',
          { event: '*', schema: 'public', table: 'properties' },
          () => {
            queryClient.invalidateQueries({ queryKey: ['properties'] });
          }
        )
        .subscribe();
    });

    return () => {
      if (channel) supabase.removeChannel(channel);
    };
  }, [queryClient]);

  return {
    properties: query.data ?? [],
    isLoading: query.isLoading,
    error: query.error?.message ?? null,
    refetch: query.refetch,
  };
}
