import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import type { AuctionRegistration } from '@/types/auction';

export function useAuctionRegistrations(auctionId: string | undefined) {
  const [registrations, setRegistrations] = useState<AuctionRegistration[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchRegs = useCallback(async () => {
    if (!auctionId) { setLoading(false); return; }
    const { data } = await supabase
      .from('auction_bidder_registrations')
      .select('*')
      .eq('auction_id', auctionId)
      .order('paddle_number', { ascending: true });
    setRegistrations((data as unknown as AuctionRegistration[]) ?? []);
    setLoading(false);
  }, [auctionId]);

  useEffect(() => { fetchRegs(); }, [fetchRegs]);

  const addRegistration = async (values: Record<string, any>) => {
    const { data, error } = await supabase
      .from('auction_bidder_registrations')
      .insert({ ...values, auction_id: auctionId } as any)
      .select()
      .single();
    if (!error) await fetchRegs();
    return { data: data as unknown as AuctionRegistration | null, error };
  };

  const approveRegistration = async (id: string) => {
    const { error } = await supabase
      .from('auction_bidder_registrations')
      .update({ is_approved: true, approved_at: new Date().toISOString() } as any)
      .eq('id', id);
    if (!error) {
      await fetchRegs();
      await supabase.functions.invoke('send-auction-registration-confirmation', { body: { registration_id: id } });
    }
    return { error };
  };

  const verifyId = async (id: string) => {
    const { error } = await supabase
      .from('auction_bidder_registrations')
      .update({ id_verified: true, id_verified_at: new Date().toISOString() } as any)
      .eq('id', id);
    if (!error) await fetchRegs();
    return { error };
  };

  return { registrations, loading, addRegistration, approveRegistration, verifyId, refetch: fetchRegs };
}
