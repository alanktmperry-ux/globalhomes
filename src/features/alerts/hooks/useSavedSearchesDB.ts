import { useEffect, useState, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/features/auth/AuthProvider';
import type { SavedSearchRecord, AlertFrequency } from '../types';

export function useSavedSearchesDB() {
  const { user } = useAuth();
  const [searches, setSearches] = useState<SavedSearchRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [totalUnread, setUnread] = useState(0);

  const fetchSearches = useCallback(async () => {
    if (!user) { setSearches([]); setUnread(0); setLoading(false); return; }
    setLoading(true);
    const { data } = await supabase
      .from('saved_searches')
      .select('*')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false });
    const list = (data ?? []) as unknown as SavedSearchRecord[];
    setSearches(list);
    setUnread(list.reduce((sum, s) => sum + s.new_match_count, 0));
    setLoading(false);
  }, [user]);

  useEffect(() => {
    fetchSearches();
    const channel = supabase
      .channel('saved-searches-realtime')
      .on('postgres_changes', {
        event: 'UPDATE', schema: 'public', table: 'saved_searches',
      }, () => fetchSearches())
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [fetchSearches]);

  const saveSearch = async (
    name: string,
    criteria: Partial<SavedSearchRecord>,
    frequency: AlertFrequency = 'instant'
  ) => {
    if (!user) return null;
    const { data } = await supabase
      .from('saved_searches')
      .insert({
        user_id: user.id,
        name,
        alert_frequency: frequency,
        suburbs: criteria.suburbs ?? [],
        states: criteria.states ?? [],
        min_price: criteria.min_price ?? null,
        max_price: criteria.max_price ?? null,
        min_bedrooms: criteria.min_bedrooms ?? null,
        max_bedrooms: criteria.max_bedrooms ?? null,
        min_bathrooms: criteria.min_bathrooms ?? null,
        property_types: criteria.property_types ?? [],
        listing_status: criteria.listing_status ?? 'active',
        has_virtual_tour: criteria.has_virtual_tour ?? null,
        min_land_sqm: criteria.min_land_sqm ?? null,
        max_land_sqm: criteria.max_land_sqm ?? null,
        listing_mode: criteria.listing_mode ?? null,
        keywords: criteria.keywords ?? null,
      } as any)
      .select().single();
    fetchSearches();
    return data;
  };

  const updateSearch = async (id: string, updates: Partial<SavedSearchRecord>) => {
    await supabase.from('saved_searches').update(updates as any).eq('id', id);
    fetchSearches();
  };

  const deleteSearch = async (id: string) => {
    await supabase.from('saved_searches').delete().eq('id', id);
    fetchSearches();
  };

  const clearBadge = async (id: string) => {
    await supabase.from('saved_searches')
      .update({ new_match_count: 0 } as any)
      .eq('id', id);
    fetchSearches();
  };

  return {
    searches, loading, totalUnread,
    saveSearch, updateSearch, deleteSearch, clearBadge,
  };
}
