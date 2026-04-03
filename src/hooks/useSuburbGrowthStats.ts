import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';

export interface SuburbGrowthStats {
  median_price: number | null;
  growth_1yr: number | null;
  growth_5yr: number | null;
  growth_10yr: number | null;
  median_rent_pw: number | null;
  rental_yield: number | null;
  vacancy_rate: number | null;
}

export function useSuburbGrowthStats(suburb: string | undefined, state: string | undefined) {
  const [stats, setStats] = useState<SuburbGrowthStats | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!suburb || !state) { setLoading(false); return; }
    (supabase as any)
      .from('suburb_growth_stats')
      .select('median_price, growth_1yr, growth_5yr, growth_10yr, median_rent_pw, rental_yield, vacancy_rate')
      .ilike('suburb', suburb)
      .ilike('state', state)
      .order('period_end', { ascending: false })
      .limit(1)
      .maybeSingle()
      .then(({ data }: any) => {
        setStats(data as SuburbGrowthStats | null);
        setLoading(false);
      });
  }, [suburb, state]);

  return { stats, loading };
}
