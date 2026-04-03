import { useCallback, useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import type { AgentSearchResult, AgentFilters } from '../types';

export function useAgentSearch(filters: AgentFilters, page = 0) {
  const [results, setResults] = useState<AgentSearchResult[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(false);

  const search = useCallback(async () => {
    setLoading(true);
    const { data, error } = await supabase.rpc('find_agents', {
      p_suburb: filters.suburb || null,
      p_state: filters.state || null,
      p_specialty: filters.specialty || null,
      p_min_rating: filters.minRating || null,
      p_agency_id: filters.agencyId || null,
      p_limit: 24,
      p_offset: page * 24,
    });

    if (!error && data) {
      setResults(data as AgentSearchResult[]);
      setTotal((data as any)[0]?.total_count ?? 0);
    }
    setLoading(false);
  }, [filters.suburb, filters.state, filters.specialty, filters.minRating, filters.agencyId, page]);

  useEffect(() => { search(); }, [search]);

  return { results, total, loading, refetch: search };
}
