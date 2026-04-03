import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';

export interface PropertySchool {
  school_id: string;
  distance_km: number;
  in_catchment: boolean;
  school: {
    name: string;
    type: string;
    sector: string;
    suburb: string;
    state: string;
    icsea: number | null;
    lat: number | null;
    lng: number | null;
    website_url: string | null;
  };
}

export function usePropertySchools(propertyId: string | undefined) {
  const [schools, setSchools] = useState<PropertySchool[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!propertyId) { setLoading(false); return; }
    setLoading(true);

    supabase
      .from('property_schools')
      .select(`
        school_id,
        distance_km,
        in_catchment,
        school:schools (
          name, type, sector, suburb, state, icsea, lat, lng, website_url
        )
      `)
      .eq('property_id', propertyId)
      .order('distance_km', { ascending: true })
      .limit(10)
      .then(({ data }) => {
        setSchools((data as unknown as PropertySchool[]) ?? []);
        setLoading(false);
      });
  }, [propertyId]);

  return { schools, loading };
}
