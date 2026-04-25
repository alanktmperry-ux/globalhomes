import { useEffect, useState, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';

export interface ReputationComponent {
  score: number;
  max: number;
  reason: string;
}

export interface ReputationBreakdown {
  response_time: ReputationComponent;
  conversion: ReputationComponent;
  reviews: ReputationComponent;
  activity: ReputationComponent;
  total: number;
  computed_at: string;
}

export interface ReputationHistoryRow {
  total_score: number;
  computed_at: string;
}

export type ReputationTier = 'Bronze' | 'Silver' | 'Gold' | 'Platinum';

export function getReputationTier(score: number): { tier: ReputationTier; color: string; bg: string } {
  if (score >= 91) return { tier: 'Platinum', color: 'text-violet-600', bg: 'bg-violet-100' };
  if (score >= 71) return { tier: 'Gold', color: 'text-amber-600', bg: 'bg-amber-100' };
  if (score >= 41) return { tier: 'Silver', color: 'text-slate-600', bg: 'bg-slate-100' };
  return { tier: 'Bronze', color: 'text-orange-700', bg: 'bg-orange-100' };
}

export function useAgentReputation(agentId: string | null | undefined) {
  const [breakdown, setBreakdown] = useState<ReputationBreakdown | null>(null);
  const [history, setHistory] = useState<ReputationHistoryRow[]>([]);
  const [loading, setLoading] = useState(false);
  const [recomputing, setRecomputing] = useState(false);

  const loadLatest = useCallback(async () => {
    if (!agentId) return;
    setLoading(true);
    const { data: latest } = await supabase
      .from('agent_reputation_history')
      .select('components, total_score, computed_at')
      .eq('agent_id', agentId)
      .order('computed_at', { ascending: false })
      .limit(1)
      .maybeSingle();

    if (latest?.components) {
      setBreakdown(latest.components as unknown as ReputationBreakdown);
    }

    const since = new Date(Date.now() - 90 * 24 * 60 * 60 * 1000).toISOString();
    const { data: hist } = await supabase
      .from('agent_reputation_history')
      .select('total_score, computed_at')
      .eq('agent_id', agentId)
      .gte('computed_at', since)
      .order('computed_at', { ascending: true });
    setHistory((hist as ReputationHistoryRow[]) ?? []);
    setLoading(false);
  }, [agentId]);

  const recompute = useCallback(async () => {
    if (!agentId) return;
    setRecomputing(true);
    try {
      const { data, error } = await supabase.functions.invoke('compute-agent-reputation', {
        body: { agent_id: agentId },
      });
      if (!error && data?.components) {
        setBreakdown(data.components as ReputationBreakdown);
        await loadLatest();
      }
    } finally {
      setRecomputing(false);
    }
  }, [agentId, loadLatest]);

  useEffect(() => {
    loadLatest();
  }, [loadLatest]);

  // Trend vs 30 days ago
  const score = breakdown?.total ?? 0;
  let trend: 'up' | 'down' | 'neutral' = 'neutral';
  let priorScore = 0;
  if (history.length > 1) {
    const cutoff = Date.now() - 30 * 24 * 60 * 60 * 1000;
    const prior = [...history].reverse().find(h => new Date(h.computed_at).getTime() <= cutoff);
    if (prior) {
      priorScore = prior.total_score;
      if (score > prior.total_score) trend = 'up';
      else if (score < prior.total_score) trend = 'down';
    }
  }

  return { breakdown, history, score, trend, priorScore, loading, recomputing, recompute, reload: loadLatest };
}
