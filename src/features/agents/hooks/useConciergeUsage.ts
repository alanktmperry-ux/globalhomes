import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';

interface ConciergeUsage {
  matchesUsed: number;
  introsUsed: number;
  loading: boolean;
  refresh: () => void;
}

export function useConciergeUsage(agentId: string | null): ConciergeUsage {
  const [matchesUsed, setMatchesUsed] = useState(0);
  const [introsUsed, setIntrosUsed] = useState(0);
  const [loading, setLoading] = useState(true);
  const [tick, setTick] = useState(0);

  useEffect(() => {
    if (!agentId) { setLoading(false); return; }
    const monthStart = new Date(
      new Date().getFullYear(), new Date().getMonth(), 1
    ).toISOString();

    (async () => {
      setLoading(true);
      try {
        const [matchRes, introRes] = await Promise.all([
          (supabase as any)
            .from('concierge_usage')
            .select('id', { count: 'exact', head: true })
            .eq('agent_id', agentId)
            .eq('action', 'match_viewed')
            .gte('created_at', monthStart),
          (supabase as any)
            .from('concierge_usage')
            .select('id', { count: 'exact', head: true })
            .eq('agent_id', agentId)
            .eq('action', 'intro_sent')
            .gte('created_at', monthStart),
        ]);
        setMatchesUsed(matchRes.count || 0);
        setIntrosUsed(introRes.count || 0);
      } catch {
        setMatchesUsed(0);
        setIntrosUsed(0);
      } finally {
        setLoading(false);
      }
    })();
  }, [agentId, tick]);

  return { matchesUsed, introsUsed, loading, refresh: () => setTick(t => t + 1) };
}

export async function recordConciergeAction(
  agentId: string,
  action: 'match_viewed' | 'intro_sent',
  entityId?: string,
) {
  try {
    await (supabase as any).from('concierge_usage').insert({
      agent_id: agentId,
      action,
      entity_id: entityId || null,
      created_at: new Date().toISOString(),
    });
  } catch {
    // non-fatal — table may not exist yet
  }
}
