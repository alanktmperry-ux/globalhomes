import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';

export function useSuburbListings(suburb: string, state: string) {
  const [active, setActive] = useState<any[]>([]);
  const [recentSales, setRecent] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!suburb || !state) return;
    Promise.all([
      supabase
        .from('properties')
        .select('id, address, price, price_formatted, beds, baths, parking, property_type, images, image_url, slug, listing_type, listing_mode, sold_price, sold_at')
        .ilike('suburb', suburb)
        .ilike('state', state)
        .eq('is_active', true)
        .order('created_at', { ascending: false })
        .limit(6),
      supabase
        .from('properties')
        .select('id, address, sold_price, sold_at, beds, baths, property_type, images, image_url, slug')
        .ilike('suburb', suburb)
        .ilike('state', state)
        .not('sold_at', 'is', null)
        .order('sold_at', { ascending: false })
        .limit(6),
    ]).then(([activeRes, soldRes]) => {
      setActive(activeRes.data ?? []);
      setRecent(soldRes.data ?? []);
      setLoading(false);
    });
  }, [suburb, state]);

  return { active, recentSales, loading };
}
