import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import type { PropertyPerformance, SuburbBenchmarks } from '../types';
import { getErrorMessage } from '@/shared/lib/errorUtils';

export function usePropertyPerformance(propertyId: string | undefined, days = 30) {
  const [performance, setPerformance] = useState<PropertyPerformance | null>(null);
  const [benchmarks, setBenchmarks] = useState<SuburbBenchmarks | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!propertyId) return;
    let cancelled = false;

    async function load() {
      setLoading(true);
      setError(null);
      try {
        const [perfResult, benchResult] = await Promise.all([
          supabase.rpc('get_property_performance', {
            p_property_id: propertyId,
            p_days: days,
          }),
          supabase.rpc('get_suburb_benchmarks', {
            p_property_id: propertyId,
          }),
        ]);

        if (!cancelled) {
          if (perfResult.error) throw perfResult.error;
          if (benchResult.error) throw benchResult.error;
          setPerformance(perfResult.data as unknown as PropertyPerformance);
          setBenchmarks(benchResult.data as unknown as SuburbBenchmarks);
        }
      } catch (e: unknown) {
        if (!cancelled) setError(getErrorMessage(e));
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    load();
    return () => { cancelled = true; };
  }, [propertyId, days]);

  return { performance, benchmarks, loading, error };
}
