import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import type { PriceChange } from '../types';

export function usePriceHistory(propertyId: string) {
  const [history, setHistory] = useState<PriceChange[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!propertyId) return;
    supabase.from('property_price_changes')
      .select('*')
      .eq('property_id', propertyId)
      .order('changed_at', { ascending: false })
      .limit(20)
      .then(({ data }) => {
        setHistory((data ?? []) as unknown as PriceChange[]);
        setLoading(false);
      });
  }, [propertyId]);

  return { history, loading };
}
