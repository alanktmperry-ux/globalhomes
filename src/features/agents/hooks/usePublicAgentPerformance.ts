import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';

export interface PublicAgentPerf {
  avg_response_hours: number | null;
  response_rate: number | null;
  sold_listings: number;
  review_count: number;
  avg_rating: number | null;
  active_listings: number;
}

export function usePublicAgentPerformance(agentId: string | undefined) {
  const [perf, setPerf] = useState<PublicAgentPerf | null>(null);

  useEffect(() => {
    if (!agentId) return;
    supabase
      .from('agent_performance_stats')
      .select('avg_response_hours, response_rate, sold_listings, review_count, avg_rating, active_listings')
      .eq('agent_id', agentId)
      .maybeSingle()
      .then(({ data }) => setPerf(data as PublicAgentPerf | null));
  }, [agentId]);

  return perf;
}
