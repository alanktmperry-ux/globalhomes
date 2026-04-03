import { useEffect, useState, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/features/auth/AuthProvider';

export interface AgentPerformanceStats {
  active_listings: number;
  total_listings: number;
  sold_listings: number;
  avg_days_to_sale: number | null;
  avg_sale_vs_guide: number | null;
  total_enquiries: number;
  responded_count: number;
  response_rate: number | null;
  avg_response_hours: number | null;
  review_count: number;
  avg_rating: number | null;
  calculated_at: string;
}

export function useAgentPerformanceStats() {
  const { user } = useAuth();
  const [stats, setStats] = useState<AgentPerformanceStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [agentId, setAgentId] = useState<string | null>(null);

  // Resolve agent ID
  useEffect(() => {
    if (!user) return;
    supabase
      .from('agents')
      .select('id')
      .eq('user_id', user.id)
      .maybeSingle()
      .then(({ data }) => {
        if (data) setAgentId(data.id);
        else setLoading(false);
      });
  }, [user]);

  const fetchStats = useCallback(async () => {
    if (!agentId) return;
    setLoading(true);

    // Trigger recompute
    await supabase.functions.invoke('recompute-agent-stats', {
      body: { agent_id: agentId },
    });

    const { data } = await supabase
      .from('agent_performance_stats')
      .select('*')
      .eq('agent_id', agentId)
      .maybeSingle();

    setStats(data as AgentPerformanceStats | null);
    setLoading(false);
  }, [agentId]);

  useEffect(() => {
    if (agentId) fetchStats();
  }, [agentId, fetchStats]);

  return { stats, loading, agentId, refetch: fetchStats };
}
