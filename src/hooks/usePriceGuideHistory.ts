import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';

export interface PriceGuideEntry {
  id: string;
  price_low: number | null;
  price_high: number | null;
  changed_at: string;
  note: string | null;
}

export function usePriceGuideHistory(propertyId: string | undefined) {
  const [history, setHistory] = useState<PriceGuideEntry[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!propertyId) { setLoading(false); return; }
    supabase
      .from('price_guide_history')
      .select('id, price_low, price_high, changed_at, note')
      .eq('property_id', propertyId)
      .order('changed_at', { ascending: false })
      .limit(10)
      .then(({ data }) => {
        setHistory((data as unknown as PriceGuideEntry[]) ?? []);
        setLoading(false);
      });
  }, [propertyId]);

  return { history, loading };
}
