import { useEffect } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Property } from '@/shared/lib/types';
import { mapDbProperty } from '@/features/properties/api/fetchPublicProperties';

const PROPERTIES_QUERY = '*, agents(name, agency, phone, email, avatar_url, is_subscribed, verification_badge_level, specialization, years_experience, rating, review_count)';

async function fetchProperties(limit = 50): Promise<Property[]> {
  const { data, error } = await supabase
    .from('properties')
    .select(PROPERTIES_QUERY)
    .eq('is_active', true)
    .eq('status', 'public')
    .order('created_at', { ascending: false })
    .limit(limit);

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
  limit = 50
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
  const { data: withAgents, error: agentError } = await supabase
    .from('properties')
    .select(PROPERTIES_QUERY)
    .in('id', ids);

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
}

export function useRealtimeProperties({
  limit = 50,
  nearbyCenter = null,
  nearbyRadiusKm = null,
}: UseRealtimePropertiesOptions = {}) {
  const queryClient = useQueryClient();

  const isNearbySearch = nearbyCenter && nearbyRadiusKm && nearbyRadiusKm > 0;

  const queryKey = isNearbySearch
    ? ['properties', 'nearby', nearbyCenter.lat, nearbyCenter.lng, nearbyRadiusKm, limit]
    : ['properties', 'all', limit];

  const query = useQuery({
    queryKey,
    queryFn: () =>
      isNearbySearch
        ? fetchNearbyProperties(nearbyCenter.lat, nearbyCenter.lng, nearbyRadiusKm, limit)
        : fetchProperties(limit),
    staleTime: 5 * 60 * 1000, // 5 minutes
    gcTime: 10 * 60 * 1000,   // 10 minutes garbage collection
    refetchOnWindowFocus: false,
  });

  // Subscribe to realtime changes and invalidate cache
  useEffect(() => {
    const channel = supabase
      .channel('properties-realtime')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'properties' },
        (payload) => {
          console.log('[Realtime] Property change:', payload.eventType, payload.new?.['id'] ?? payload.old?.['id']);
          // Invalidate all property queries to refetch
          queryClient.invalidateQueries({ queryKey: ['properties'] });
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [queryClient]);

  return {
    properties: query.data ?? [],
    isLoading: query.isLoading,
    error: query.error?.message ?? null,
    refetch: query.refetch,
  };
}
