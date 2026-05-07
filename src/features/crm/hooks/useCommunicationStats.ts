import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';

export interface CommunicationTotals {
  calls: number;
  answered: number;
  sms: number;
  emails: number;
}

interface Options {
  range?: 'week' | 'month' | 'quarter';
  agentId?: string;
}

const RANGE_DAYS: Record<NonNullable<Options['range']>, number> = {
  week: 7,
  month: 30,
  quarter: 90,
};

export function useCommunicationStats({ range = 'month', agentId }: Options = {}) {
  const [totals, setTotals] = useState<CommunicationTotals>({
    calls: 0, answered: 0, sms: 0, emails: 0,
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoading(true);
      const since = new Date(Date.now() - RANGE_DAYS[range] * 86400000).toISOString();
      let query = supabase
        .from('crm_activities')
        .select('type, event_data, completed')
        .gte('created_at', since);
      if (agentId) query = query.eq('agent_id', agentId);
      const { data } = await query;
      if (cancelled) return;

      const t: CommunicationTotals = { calls: 0, answered: 0, sms: 0, emails: 0 };
      for (const row of (data ?? []) as any[]) {
        if (row.type === 'call' || row.type === 'contacted_call') {
          t.calls++;
          const outcome = row.event_data?.outcome ?? row.event_data?.call_outcome;
          if (outcome === 'answered' || outcome === 'connected' || row.completed) t.answered++;
        } else if (row.type === 'sms' || row.type === 'contacted_sms') {
          t.sms++;
        } else if (row.type === 'email' || row.type === 'contacted_email') {
          t.emails++;
        }
      }
      setTotals(t);
      setLoading(false);
    })();
    return () => { cancelled = true; };
  }, [range, agentId]);

  return { totals, loading };
}
