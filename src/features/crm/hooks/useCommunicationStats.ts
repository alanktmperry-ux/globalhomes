import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';

export type CommsRange = 'week' | 'month' | 'all';

export interface AgentCommsStats {
  agent_id: string;
  agent_name: string;
  totalCalls: number;
  answered: number;
  missed: number;
  voicemail: number;
  noAnswer: number;
  totalSms: number;
  avgCallDuration: number;
  lastActivity: string | null;
}

interface ActivityRow {
  agent_id: string;
  type: string;
  outcome: string | null;
  duration_seconds: number | null;
  created_at: string;
}

function rangeStart(range: CommsRange): string | null {
  if (range === 'all') return null;
  const d = new Date();
  if (range === 'week') d.setDate(d.getDate() - 7);
  else d.setMonth(d.getMonth() - 1);
  return d.toISOString();
}

export function useCommunicationStats(range: CommsRange) {
  const [stats, setStats] = useState<AgentCommsStats[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoading(true);
      setError(null);
      try {
        let query = supabase
          .from('crm_activities')
          .select('agent_id, type, outcome, duration_seconds, created_at')
          .in('type', ['call', 'sms']);

        const since = rangeStart(range);
        if (since) query = query.gte('created_at', since);

        const { data, error: qErr } = await query.limit(10000);
        if (qErr) throw qErr;

        const rows = (data ?? []) as ActivityRow[];
        const agentIds = Array.from(new Set(rows.map((r) => r.agent_id).filter(Boolean)));

        const nameMap = new Map<string, string>();
        if (agentIds.length) {
          const { data: agents } = await supabase
            .from('agents')
            .select('id, full_name')
            .in('id', agentIds);
          (agents ?? []).forEach((a: any) => nameMap.set(a.id, a.full_name ?? 'Unknown'));
        }

        const grouped = new Map<string, AgentCommsStats>();
        for (const r of rows) {
          if (!r.agent_id) continue;
          let s = grouped.get(r.agent_id);
          if (!s) {
            s = {
              agent_id: r.agent_id,
              agent_name: nameMap.get(r.agent_id) ?? 'Unknown',
              totalCalls: 0,
              answered: 0,
              missed: 0,
              voicemail: 0,
              noAnswer: 0,
              totalSms: 0,
              avgCallDuration: 0,
              lastActivity: null,
            };
            grouped.set(r.agent_id, s);
          }
          if (r.type === 'call') {
            s.totalCalls += 1;
            if (r.outcome === 'answered') s.answered += 1;
            else if (r.outcome === 'missed') s.missed += 1;
            else if (r.outcome === 'voicemail') s.voicemail += 1;
            else if (r.outcome === 'no_answer') s.noAnswer += 1;
            // accumulate duration in avgCallDuration field temporarily
            if (r.duration_seconds) s.avgCallDuration += r.duration_seconds;
          } else if (r.type === 'sms') {
            s.totalSms += 1;
          }
          if (!s.lastActivity || r.created_at > s.lastActivity) s.lastActivity = r.created_at;
        }

        // finalize avg
        const result = Array.from(grouped.values()).map((s) => ({
          ...s,
          avgCallDuration: s.totalCalls > 0 ? Math.round(s.avgCallDuration / s.totalCalls) : 0,
        }));

        result.sort((a, b) => b.totalCalls + b.totalSms - (a.totalCalls + a.totalSms));

        if (!cancelled) setStats(result);
      } catch (e) {
        if (!cancelled) setError(e instanceof Error ? e.message : 'Failed to load stats');
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [range]);

  return { stats, loading, error };
}
