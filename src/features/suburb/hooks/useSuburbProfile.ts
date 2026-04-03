import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import type { SuburbRecord, SuburbMarketStats, SuburbAmenities, SuburbPricePoint, PropertyType } from '../types';

export function useSuburbProfile(slug: string, state: string) {
  const [suburb, setSuburb] = useState<SuburbRecord | null>(null);
  const [stats, setStats] = useState<SuburbMarketStats[]>([]);
  const [amenities, setAmenities] = useState<SuburbAmenities | null>(null);
  const [priceHistory, setHistory] = useState<SuburbPricePoint[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!slug || !state) return;
    fetchAll();
  }, [slug, state]);

  const suburbName = slug.replace(/-/g, ' ');
  const stateUpper = state.toUpperCase();

  const fetchAll = async () => {
    setLoading(true);
    try {
      const [suburbRes, statsRes, amenitiesRes, historyRes] = await Promise.all([
        supabase
          .from('suburbs')
          .select('*')
          .eq('slug', slug)
          .eq('state', stateUpper)
          .maybeSingle(),
        supabase
          .from('suburb_market_stats')
          .select('*')
          .ilike('suburb', suburbName)
          .eq('state', stateUpper),
        supabase
          .from('suburb_amenities')
          .select('*')
          .ilike('suburb', suburbName)
          .eq('state', stateUpper)
          .maybeSingle(),
        supabase
          .from('suburb_price_history')
          .select('*')
          .ilike('suburb', suburbName)
          .eq('state', stateUpper)
          .eq('property_type', 'house')
          .order('month', { ascending: true })
          .limit(60),
      ]);

      setSuburb(suburbRes.data as unknown as SuburbRecord | null);
      setStats((statsRes.data ?? []) as unknown as SuburbMarketStats[]);
      setAmenities(amenitiesRes.data as unknown as SuburbAmenities | null);
      setHistory((historyRes.data ?? []) as unknown as SuburbPricePoint[]);
    } catch (e: any) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  };

  const getStats = (type: PropertyType = 'house') =>
    stats.find(s => s.property_type === type) ?? null;

  return { suburb, stats, getStats, amenities, priceHistory, loading, error };
}
