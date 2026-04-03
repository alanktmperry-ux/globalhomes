import { useState, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';

export interface SchoolSearchResult {
  id: string;
  name: string;
  type: string;
  sector: string;
  suburb: string;
  state: string;
  icsea: number | null;
}

export function useSchoolSearch() {
  const [results, setResults] = useState<SchoolSearchResult[]>([]);
  const [loading, setLoading] = useState(false);

  const searchSchools = useCallback(async (query: string, state?: string) => {
    if (!query || query.length < 2) {
      setResults([]);
      return;
    }
    setLoading(true);

    let q = supabase
      .from('schools')
      .select('id, name, type, sector, suburb, state, icsea')
      .ilike('name', `%${query}%`)
      .order('enrolment', { ascending: false })
      .limit(8);

    if (state) q = q.eq('state', state.toUpperCase());

    const { data } = await q;
    setResults((data as SchoolSearchResult[]) ?? []);
    setLoading(false);
  }, []);

  return { results, loading, searchSchools };
}
