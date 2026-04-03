import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';

export interface CatchmentProperty {
  property_id: string;
  distance_km: number;
  property: {
    id: string;
    address: string;
    suburb: string;
    state: string;
    price: number;
    price_formatted: string | null;
    beds: number;
    baths: number;
    parking: number;
    images: string[] | null;
    image_url: string | null;
    slug: string | null;
    property_type: string | null;
    listing_type: string | null;
    is_active: boolean;
  };
}

export function usePropertiesInCatchment(schoolId: string | null) {
  const [properties, setProperties] = useState<CatchmentProperty[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!schoolId) return;
    setLoading(true);

    supabase
      .from('property_schools')
      .select(`
        property_id,
        distance_km,
        property:properties (
          id, address, suburb, state, price, price_formatted, beds, baths, parking,
          images, image_url, slug, property_type, listing_type, is_active
        )
      `)
      .eq('school_id', schoolId)
      .eq('in_catchment', true)
      .order('distance_km', { ascending: true })
      .limit(50)
      .then(({ data }) => {
        const active = ((data ?? []) as unknown as CatchmentProperty[]).filter(
          (p) => p.property?.is_active
        );
        setProperties(active);
        setLoading(false);
      });
  }, [schoolId]);

  return { properties, loading };
}
