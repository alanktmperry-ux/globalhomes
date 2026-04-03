import { useEffect, useState, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import type { OffmarketSubscription } from '../types';

export function useOffmarketSubscriptions() {
  const [subs, setSubs] = useState<OffmarketSubscription[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchSubs = useCallback(async () => {
    setLoading(true);
    const { data } = await supabase
      .from('offmarket_subscriptions')
      .select('*')
      .order('created_at', { ascending: false });
    setSubs((data ?? []) as unknown as OffmarketSubscription[]);
    setLoading(false);
  }, []);

  useEffect(() => { fetchSubs(); }, [fetchSubs]);

  const addSubscription = async (sub: {
    suburb: string;
    state: string;
    min_price?: number;
    max_price?: number;
    min_bedrooms?: number;
    property_types?: string[];
  }) => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;
    await supabase
      .from('offmarket_subscriptions')
      .upsert(
        { ...sub, buyer_id: user.id, property_types: sub.property_types ?? [] } as any,
        { onConflict: 'buyer_id,suburb,state' }
      );
    fetchSubs();
  };

  const removeSubscription = async (id: string) => {
    await supabase.from('offmarket_subscriptions').delete().eq('id', id);
    fetchSubs();
  };

  return { subs, loading, addSubscription, removeSubscription };
}
