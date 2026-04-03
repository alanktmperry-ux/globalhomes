import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';

export interface AuctionResult {
  result: 'sold_at_auction' | 'sold_prior' | 'passed_in' | 'withdrawn';
  sold_price: number | null;
  num_bidders: number | null;
  auction_date: string | null;
}

export function useAuctionResult(propertyId: string | undefined) {
  const [result, setResult] = useState<AuctionResult | null>(null);

  useEffect(() => {
    if (!propertyId) return;
    supabase
      .from('auction_results')
      .select('result, sold_price, num_bidders, auction_date')
      .eq('property_id', propertyId)
      .order('recorded_at', { ascending: false })
      .limit(1)
      .single()
      .then(({ data }) => setResult((data as unknown as AuctionResult) ?? null));
  }, [propertyId]);

  return result;
}
