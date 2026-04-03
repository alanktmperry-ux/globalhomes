import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import type { AuctionBid, AuctionUpdate, PreAuctionOffer } from '@/types/auction';

export function useLiveAuction(auctionId: string | undefined) {
  const [bids, setBids] = useState<AuctionBid[]>([]);
  const [updates, setUpdates] = useState<AuctionUpdate[]>([]);
  const [lastBid, setLastBid] = useState<number | null>(null);
  const [reserveMet, setReserveMet] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (!auctionId) return;

    supabase.rpc('get_live_bids', { p_auction_id: auctionId, p_limit: 50 })
      .then(({ data }) => {
        if (data) {
          const bidData = data as unknown as AuctionBid[];
          setBids(bidData);
          const winning = bidData.find((b) => b.is_winning);
          if (winning) {
            setLastBid(winning.bid_amount);
            setReserveMet(winning.reserve_met_at_this_bid);
          }
        }
      });

    supabase.from('auction_updates')
      .select('*')
      .eq('auction_id', auctionId)
      .order('created_at', { ascending: false })
      .limit(30)
      .then(({ data }) => setUpdates((data as unknown as AuctionUpdate[]) ?? []));
  }, [auctionId]);

  // Realtime subscription
  useEffect(() => {
    if (!auctionId) return;

    const channel = supabase
      .channel(`auction-live-${auctionId}`)
      .on('postgres_changes', {
        event: 'INSERT',
        schema: 'public',
        table: 'auction_bids',
        filter: `auction_id=eq.${auctionId}`,
      }, (payload) => {
        const newBid = payload.new as unknown as AuctionBid;
        setBids(prev => [newBid, ...prev]);
        if (newBid.bid_amount > (lastBid ?? 0)) {
          setLastBid(newBid.bid_amount);
          setReserveMet(newBid.reserve_met_at_this_bid);
        }
      })
      .on('postgres_changes', {
        event: 'INSERT',
        schema: 'public',
        table: 'auction_updates',
        filter: `auction_id=eq.${auctionId}`,
      }, (payload) => {
        setUpdates(prev => [payload.new as unknown as AuctionUpdate, ...prev]);
      })
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [auctionId, lastBid]);

  const recordBid = useCallback(async (
    amount: number,
    bidType: 'genuine' | 'vendor' | 'opening',
    registrationId?: string,
    source: string = 'floor'
  ) => {
    setIsSubmitting(true);
    const { data, error } = await supabase.rpc('record_auction_bid', {
      p_auction_id: auctionId,
      p_bid_amount: amount,
      p_bid_type: bidType,
      p_registration_id: registrationId ?? null,
      p_bid_source: source,
    } as any);
    setIsSubmitting(false);
    return { data, error };
  }, [auctionId]);

  return { bids, updates, lastBid, reserveMet, isSubmitting, recordBid };
}

export function usePreAuctionOffers(auctionId: string | undefined) {
  const [offers, setOffers] = useState<PreAuctionOffer[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!auctionId) { setLoading(false); return; }
    supabase.from('pre_auction_offers')
      .select('*')
      .eq('auction_id', auctionId)
      .order('submitted_at', { ascending: false })
      .then(({ data }) => {
        setOffers((data as unknown as PreAuctionOffer[]) ?? []);
        setLoading(false);
      });
  }, [auctionId]);

  const submitOffer = async (values: Record<string, any>) => {
    const { data, error } = await supabase
      .from('pre_auction_offers')
      .insert(values as any)
      .select()
      .single();
    if (!error) setOffers(prev => [data as unknown as PreAuctionOffer, ...prev]);
    return { data: data as unknown as PreAuctionOffer | null, error };
  };

  const respondToOffer = async (id: string, status: string, notes?: string) => {
    const { error } = await supabase.from('pre_auction_offers').update({
      status, response_notes: notes, reviewed_at: new Date().toISOString(),
    } as any).eq('id', id);
    if (!error) setOffers(prev => prev.map(o => o.id === id ? { ...o, status: status as any, response_notes: notes } : o));
    return { error };
  };

  return { offers, loading, submitOffer, respondToOffer };
}
