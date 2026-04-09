import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';

export interface RentalFilters {
  suburb?: string;
  state?: string;
  minRent?: number;
  maxRent?: number;
  minBedrooms?: number;
  propertyTypes?: string[];
  petsAllowed?: boolean;
  furnished?: string;
  availableFrom?: string;
}

export function useRentalSearch(filters: RentalFilters = {}) {
  const [properties, setProperties] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [total, setTotal] = useState(0);
  const [error, setError] = useState<string | null>(null);

  const fetchRentals = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      let q = (supabase as any)
        .from('properties')
        .select('*', { count: 'exact' })
        .eq('listing_category', 'rent')
        .eq('is_active', true)
        .order('created_at', { ascending: false });

      if (filters.suburb) q = q.ilike('suburb', `%${filters.suburb}%`);
      if (filters.state) q = q.eq('state', filters.state.toUpperCase());
      if (filters.minRent) q = q.gte('rental_weekly', filters.minRent);
      if (filters.maxRent) q = q.lte('rental_weekly', filters.maxRent);
      if (filters.minBedrooms) q = q.gte('beds', filters.minBedrooms);
      if (filters.petsAllowed) q = q.eq('pets_allowed', true);
      if (filters.furnished === 'furnished') q = q.eq('furnished', true);
      if (filters.furnished === 'unfurnished') q = q.eq('furnished', false);
      if (filters.propertyTypes?.length)
        q = q.in('property_type', filters.propertyTypes);
      if (filters.availableFrom)
        q = q.or(`available_from.is.null,available_from.lte.${filters.availableFrom}`);

      const { data, count, error: queryError } = await q.limit(40);
      if (queryError) throw queryError;
      setProperties(data ?? []);
      setTotal(count ?? 0);
    } catch (e: any) {
      setError(e.message ?? 'Failed to load rentals');
    } finally {
      setLoading(false);
    }
  }, [JSON.stringify(filters)]);

  useEffect(() => { fetchRentals(); }, [fetchRentals]);

  return { properties, loading, total, error, refetch: fetchRentals };
}
