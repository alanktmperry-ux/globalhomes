import { useEffect, useState, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import type { ExpressionOfInterest, EOIStatus } from '../types';

export function useAgentEOIs(propertyId: string) {
  const [eois, setEOIs] = useState<ExpressionOfInterest[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchEOIs = useCallback(async () => {
    setLoading(true);
    const { data } = await supabase
      .from('expressions_of_interest')
      .select(`
        *,
        buyer:profiles!expressions_of_interest_buyer_id_fkey (
          full_name, phone,
          pre_approval_verified, pre_approval_amount
        )
      `)
      .eq('property_id', propertyId)
      .order('offered_price', { ascending: false });
    setEOIs((data ?? []) as unknown as ExpressionOfInterest[]);
    setLoading(false);
  }, [propertyId]);

  useEffect(() => {
    fetchEOIs();
    const channel = supabase
      .channel(`eois-${propertyId}`)
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'expressions_of_interest',
        filter: `property_id=eq.${propertyId}`,
      }, () => fetchEOIs())
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [propertyId, fetchEOIs]);

  const updateStatus = async (eoiId: string, status: EOIStatus, notes?: string) => {
    await supabase
      .from('expressions_of_interest')
      .update({ status, ...(notes ? { agent_notes: notes } : {}) } as any)
      .eq('id', eoiId);
    fetchEOIs();
  };

  return { eois, loading, updateStatus };
}
