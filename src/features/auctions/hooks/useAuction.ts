import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import type { Auction, AuctionPublicView } from '@/types/auction';

export function useAuctionPublic(propertyId: string | undefined) {
  const [auction, setAuction] = useState<AuctionPublicView | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!propertyId) { setLoading(false); return; }
    setLoading(true);

    supabase.rpc('get_auction_public', { p_property_id: propertyId })
      .then(({ data, error: err }) => {
        if (err) { setError(err.message); } else { setAuction(data as unknown as AuctionPublicView); }
        setLoading(false);
      });
  }, [propertyId]);

  return { auction, loading, error };
}

export function useAuctionAgent(propertyId: string | undefined) {
  const [auction, setAuction] = useState<Auction | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchAuction = useCallback(async () => {
    if (!propertyId) { setLoading(false); return; }
    const { data } = await supabase
      .from('auctions')
      .select('*')
      .eq('property_id', propertyId)
      .neq('status', 'withdrawn')
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle();
    if (data) {
      // Fetch sensitive fields (reserve_price, vendor_bid_limit) via RPC
      const { data: sensitive } = await supabase.rpc('get_auction_sensitive', { p_auction_id: data.id } as any);
      const row = Array.isArray(sensitive) && sensitive.length > 0 ? sensitive[0] : null;
      setAuction({
        ...data,
        reserve_price: row?.reserve_price ?? null,
        vendor_bid_limit: row?.vendor_bid_limit ?? null,
      } as unknown as Auction);
    } else {
      setAuction(null);
    }
    setLoading(false);
  }, [propertyId]);

  useEffect(() => { fetchAuction(); }, [fetchAuction]);

  const createAuction = async (values: Record<string, any>) => {
    const { data, error } = await supabase.from('auctions').insert(values as any).select().single();
    if (!error) setAuction(data as unknown as Auction);
    return { data: data as unknown as Auction | null, error };
  };

  const updateAuction = async (id: string, values: Record<string, any>) => {
    const { data, error } = await supabase.from('auctions').update(values as any).eq('id', id).select().single();
    if (!error) setAuction(data as unknown as Auction);
    return { data: data as unknown as Auction | null, error };
  };

  const setLive = async (id: string) => updateAuction(id, { status: 'live' });

  const concludeAuction = async (id: string, outcome: 'sold' | 'passed_in', soldPrice?: number, winningRegId?: string) => {
    const { data, error } = await supabase.rpc('conclude_auction', {
      p_auction_id: id,
      p_outcome: outcome,
      p_sold_price: soldPrice ?? null,
      p_winning_reg_id: winningRegId ?? null,
    } as any);
    if (!error) await fetchAuction();
    return { data, error };
  };

  return { auction, loading, createAuction, updateAuction, setLive, concludeAuction, refetch: fetchAuction };
}
