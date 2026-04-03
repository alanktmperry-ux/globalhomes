import { useEffect, useState, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';

export interface ComparableSale {
  id: string;
  address: string;
  suburb: string;
  sold_price: number;
  sold_at: string;
  beds: number;
  baths: number;
  parking: number;
  floor_area_sqm: number | null;
  land_size_sqm: number | null;
  price_per_sqm: number | null;
  images: string[];
  slug: string | null;
  lat: number;
  lng: number;
  distance_km: number;
  property_type: string;
}

export interface SuburbSoldStats {
  count: number;
  median_price: number | null;
  avg_days_on_market: number | null;
  min_price: number | null;
  max_price: number | null;
  avg_price_sqm: number | null;
}

export function useComparableSales(
  propertyId: string | undefined,
  lat: number | null | undefined,
  lng: number | null | undefined,
  bedrooms: number | undefined,
  suburb: string | undefined,
  state: string | undefined
) {
  const [comps, setComps] = useState<ComparableSale[]>([]);
  const [stats, setStats] = useState<SuburbSoldStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [radiusKm, setRadiusKm] = useState(1.0);

  const fetchComps = useCallback(async (radius: number) => {
    if (!lat || !lng || !propertyId || !bedrooms) return;
    setLoading(true);

    const { data: compData } = await supabase.rpc('find_comparable_sales', {
      p_lat: lat,
      p_lng: lng,
      p_bedrooms: bedrooms,
      p_property_id: propertyId,
      p_radius_km: radius,
      p_limit: 6,
    });

    // Auto-expand radius if fewer than 3 results
    if ((compData?.length ?? 0) < 3 && radius < 3.0) {
      const newRadius = radius === 1.0 ? 2.0 : 3.0;
      setRadiusKm(newRadius);
      fetchComps(newRadius);
      return;
    }

    setComps((compData as ComparableSale[]) ?? []);
    setLoading(false);
  }, [lat, lng, propertyId, bedrooms]);

  const fetchStats = useCallback(async () => {
    if (!suburb || !state || !bedrooms) return;
    const { data } = await supabase.rpc('suburb_sold_stats', {
      p_suburb: suburb,
      p_state: state,
      p_bedrooms: bedrooms,
      p_months: 12,
    });
    const row = Array.isArray(data) ? data[0] : data;
    setStats(row ?? null);
  }, [suburb, state, bedrooms]);

  useEffect(() => {
    fetchComps(1.0);
    fetchStats();
  }, [fetchComps, fetchStats]);

  return { comps, stats, loading, radiusKm };
}
