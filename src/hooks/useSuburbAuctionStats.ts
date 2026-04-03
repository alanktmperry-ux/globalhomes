import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';

export interface SuburbAuctionStats {
  suburb: string;
  state: string;
  period_end: string;
  total_auctions: number;
  cleared: number;
  clearance_rate: number;
  median_price: number | null;
  sample_size: number;
}

export function useSuburbAuctionStats(suburb: string | undefined, state: string | undefined) {
  const [stats, setStats] = useState<SuburbAuctionStats | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!suburb || !state) { setLoading(false); return; }
    supabase
      .from('suburb_auction_stats')
      .select('*')
      .ilike('suburb', suburb)
      .ilike('state', state)
      .order('period_end', { ascending: false })
      .limit(1)
      .single()
      .then(({ data }) => {
        setStats((data as unknown as SuburbAuctionStats) ?? null);
        setLoading(false);
      });
  }, [suburb, state]);

  return { stats, loading };
}
