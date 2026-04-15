import { useEffect } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Property } from '@/shared/lib/types';
import { mapDbProperty } from '@/features/properties/api/fetchPublicProperties';

const PROPERTIES_QUERY = '*, agents!inner(name, agency, phone, email, avatar_url, is_subscribed, verification_badge_level, specialization, years_experience, rating, review_count, approval_status)';

async function fetchProperties(limit = 50, listingType?: 'sale' | 'rent', suburb?: string): Promise<Property[]> {
  let query = supabase
    .from('properties')
    .select(PROPERTIES_QUERY)
    .eq('is_active', true)
    .eq('status', 'public')
    .eq('moderation_status', 'approved')
    .eq('agents.approval_status', 'approved')
    .order('created_at', { ascending: false })
    .limit(limit);

  const suburbFilter = suburb
    ? `suburb.ilike.%${suburb}%,address.ilike.%${suburb}%`
    : null;

  if (listingType === 'rent') {
    if (suburbFilter) {
      query = query.or(suburbFilter);
    }
    query = query.eq('listing_type', 'rent');
  } else if (listingType === 'sale') {
    if (suburbFilter) {
      query = query.or(
        `and(or(${suburbFilter}),or(listing_type.eq.sale,listing_type.is.null))`
      );
    } else {
      query = query.or('listing_type.eq.sale,listing_type.is.null');
    }
  } else if (suburbFilter) {
    query = query.or(suburbFilter);
  }

  const { data, error } = await query;

  if (error) {
    console.error('[useRealtimeProperties] fetch error:', error.message);
    throw error;
  }

  return (data ?? []).map(mapDbProperty);
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

  // RPC returns raw rows without agent join, so we need to fetch agents separately
  if (!data || data.length === 0) return [];

  const ids = data.map((p: any) => p.id);
  let query = supabase
    .from('properties')
    .select(PROPERTIES_QUERY)
    .in('id', ids);

  if (listingType === 'rent') {
    query = query.eq('listing_type', 'rent');
  } else if (listingType === 'sale') {
    query = query.or('listing_type.eq.sale,listing_type.is.null');
  }

  const { data: withAgents, error: agentError } = await query;

  if (agentError) {
    console.error('[useRealtimeProperties] agent join error:', agentError.message);
    return data.map(mapDbProperty);
  }

  return (withAgents ?? []).map(mapDbProperty);
}

interface UseRealtimePropertiesOptions {
  limit?: number;
  nearbyCenter?: { lat: number; lng: number } | null;
  nearbyRadiusKm?: number | null;
  listingType?: 'sale' | 'rent';
  suburb?: string | null;
}

export function useRealtimeProperties({
  limit = 50,
  nearbyCenter = null,
  nearbyRadiusKm = null,
  listingType,
  suburb = null,
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
