import { useEffect, useState, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';

export interface ResponseTimeLead {
  id: string;
  created_at: string;
  first_contacted_at: string | null;
  enquiry_source: string | null;
  contact_id: string | null;
}

export interface ResponseTimeStats {
  medianMinutes: number | null;
  priorMedianMinutes: number | null;
  trend: 'up' | 'down' | 'neutral';   // "up" = faster (good), "down" = slower
  totalLeads: number;
  distribution: { under5m: number; under1h: number; under24h: number; over24h: number };
  sourceMedians: { source: string; medianMinutes: number; count: number }[];
  sparkline: { date: string; medianMinutes: number | null }[];
  worstUnresponded: ResponseTimeLead[];
  loading: boolean;
}

const median = (xs: number[]): number | null => {
  if (xs.length === 0) return null;
  const sorted = [...xs].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  return sorted.length % 2 ? sorted[mid] : (sorted[mid - 1] + sorted[mid]) / 2;
};

const minutesBetween = (a: string, b: string) =>
  (new Date(b).getTime() - new Date(a).getTime()) / 60000;

const SOURCE_GROUPS: { match: RegExp; label: string }[] = [
  { match: /voice/i, label: 'Voice' },
  { match: /open[\s_-]?home|inspection/i, label: 'Open Home' },
  { match: /enquir|property|listing|portal/i, label: 'Enquiry' },
];
const groupSource = (raw: string | null): string => {
  if (!raw) return 'Other';
  for (const g of SOURCE_GROUPS) if (g.match.test(raw)) return g.label;
  return 'Other';
};

export function useResponseTimeStats(agentId: string | null | undefined) {
  const [stats, setStats] = useState<ResponseTimeStats>({
    medianMinutes: null,
    priorMedianMinutes: null,
    trend: 'neutral',
    totalLeads: 0,
    distribution: { under5m: 0, under1h: 0, under24h: 0, over24h: 0 },
    sourceMedians: [],
    sparkline: [],
    worstUnresponded: [],
    loading: false,
  });

  const load = useCallback(async () => {
    if (!agentId) return;
    setStats(s => ({ ...s, loading: true }));

    // Fetch last 60 days of leads (current 30 + prior 30 for trend)
    const since60 = new Date(Date.now() - 60 * 24 * 60 * 60 * 1000).toISOString();
    const { data: leads } = await supabase
      .from('crm_leads')
      .select('id, created_at, first_contacted_at, enquiry_source, contact_id')
      .eq('agent_id', agentId)
      .gte('created_at', since60)
      .order('created_at', { ascending: false });

    const all = (leads ?? []) as ResponseTimeLead[];
    const cutoff30 = Date.now() - 30 * 24 * 60 * 60 * 1000;

    const current = all.filter(l => new Date(l.created_at).getTime() >= cutoff30 && l.first_contacted_at);
    const prior = all.filter(l => {
      const t = new Date(l.created_at).getTime();
      return t < cutoff30 && l.first_contacted_at;
    });

    const currentMins = current.map(l => minutesBetween(l.created_at, l.first_contacted_at!));
    const priorMins = prior.map(l => minutesBetween(l.created_at, l.first_contacted_at!));
    const med = median(currentMins);
    const priorMed = median(priorMins);

    let trend: 'up' | 'down' | 'neutral' = 'neutral';
    if (med != null && priorMed != null) {
      if (med < priorMed) trend = 'up';
      else if (med > priorMed) trend = 'down';
    }

    // Distribution (current 30 days)
    const distribution = currentMins.reduce(
      (acc, m) => {
        if (m < 5) acc.under5m++;
        else if (m < 60) acc.under1h++;
        else if (m < 1440) acc.under24h++;
        else acc.over24h++;
        return acc;
      },
      { under5m: 0, under1h: 0, under24h: 0, over24h: 0 },
    );

    // Source medians
    const bySource = new Map<string, number[]>();
    for (const l of current) {
      const g = groupSource(l.enquiry_source);
      if (!bySource.has(g)) bySource.set(g, []);
      bySource.get(g)!.push(minutesBetween(l.created_at, l.first_contacted_at!));
    }
    const sourceMedians = [...bySource.entries()]
      .map(([source, vals]) => ({ source, medianMinutes: median(vals)!, count: vals.length }))
      .sort((a, b) => b.count - a.count);

    // Sparkline: median per day (last 30 days)
    const days = new Map<string, number[]>();
    for (let i = 29; i >= 0; i--) {
      const d = new Date(Date.now() - i * 24 * 60 * 60 * 1000);
      days.set(d.toISOString().slice(0, 10), []);
    }
    for (const l of current) {
      const key = new Date(l.created_at).toISOString().slice(0, 10);
      if (days.has(key)) days.get(key)!.push(minutesBetween(l.created_at, l.first_contacted_at!));
    }
    const sparkline = [...days.entries()].map(([date, vals]) => ({
      date,
      medianMinutes: vals.length ? median(vals) : null,
    }));

    // Worst 5 unresponded — leads with first_contacted_at NULL, oldest created_at first
    const unresponded = all
      .filter(l => !l.first_contacted_at)
      .sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime())
      .slice(0, 5);

    setStats({
      medianMinutes: med,
      priorMedianMinutes: priorMed,
      trend,
      totalLeads: current.length,
      distribution,
      sourceMedians,
      sparkline,
      worstUnresponded: unresponded,
      loading: false,
    });
  }, [agentId]);

  useEffect(() => { load(); }, [load]);

  return { ...stats, reload: load };
}

export function formatDuration(minutes: number | null): string {
  if (minutes == null) return '—';
  if (minutes < 1) return '<1m';
  if (minutes < 60) return `${Math.round(minutes)}m`;
  if (minutes < 1440) {
    const h = Math.floor(minutes / 60);
    const m = Math.round(minutes % 60);
    return m ? `${h}h ${m}m` : `${h}h`;
  }
  const d = Math.floor(minutes / 1440);
  const h = Math.round((minutes % 1440) / 60);
  return h ? `${d}d ${h}h` : `${d}d`;
}

export function getResponseTimeColor(minutes: number | null): { text: string; ring: string } {
  if (minutes == null) return { text: 'text-muted-foreground', ring: '' };
  if (minutes < 60) return { text: 'text-success', ring: 'ring-success/20' };
  if (minutes < 1440) return { text: 'text-amber-600', ring: 'ring-amber-500/20' };
  return { text: 'text-destructive', ring: 'ring-destructive/20' };
}
