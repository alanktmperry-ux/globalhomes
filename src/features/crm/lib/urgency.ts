import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';

export type UrgencyTier = 'hot' | 'warm' | 'cool' | 'cold';

export interface UrgencyThresholds {
  warm_max_hours: number;
  cool_max_days: number;
  going_cold_warn_days: number;
}

export const DEFAULT_THRESHOLDS: UrgencyThresholds = {
  warm_max_hours: 24,
  cool_max_days: 7,
  going_cold_warn_days: 6,
};

/**
 * Sticky-Hot urgency model:
 *  - hot:  never contacted (any age)
 *  - warm: contacted within last warm_max_hours
 *  - cool: contacted within last cool_max_days
 *  - cold: contacted longer than cool_max_days ago
 */
export function computeUrgency(
  lastContacted: string | null | undefined,
  t: UrgencyThresholds = DEFAULT_THRESHOLDS,
): UrgencyTier {
  if (!lastContacted) return 'hot';
  const ageMs = Date.now() - new Date(lastContacted).getTime();
  if (ageMs < t.warm_max_hours * 3_600_000) return 'warm';
  if (ageMs < t.cool_max_days * 86_400_000) return 'cool';
  return 'cold';
}

export const URGENCY_CONFIG: Record<UrgencyTier, {
  label: string;
  sub: string;
  /** Tailwind classes for chips/tiles. Uses semantic + brand-safe palette. */
  chip: string;
  tile: string;
  dot: string;
  order: number;
}> = {
  hot:  { label: 'Hot',  sub: 'never contacted',     chip: 'bg-destructive/10 text-destructive border-destructive/20', tile: 'border-destructive/30',  dot: 'bg-destructive',  order: 0 },
  warm: { label: 'Warm', sub: 'contacted < 24h',     chip: 'bg-amber-500/10 text-amber-700 border-amber-500/20',      tile: 'border-amber-500/30',   dot: 'bg-amber-500',    order: 1 },
  cool: { label: 'Cool', sub: 'contacted 1-7 days',  chip: 'bg-blue-500/10 text-blue-700 border-blue-500/20',         tile: 'border-blue-500/30',    dot: 'bg-blue-500',     order: 2 },
  cold: { label: 'Cold', sub: 'no contact 7+ days',  chip: 'bg-muted text-muted-foreground border-border',            tile: 'border-border',         dot: 'bg-muted-foreground', order: 3 },
};

export const URGENCY_TIERS: UrgencyTier[] = ['hot', 'warm', 'cool', 'cold'];

/**
 * Loads urgency thresholds for the current agent's agency (or solo agent fallback).
 * Falls back to DEFAULT_THRESHOLDS if no row exists.
 */
export function useUrgencyThresholds() {
  const [thresholds, setThresholds] = useState<UrgencyThresholds>(DEFAULT_THRESHOLDS);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { setLoading(false); return; }

      const { data: agent } = await supabase
        .from('agents')
        .select('id, agency_id')
        .eq('user_id', user.id)
        .maybeSingle();
      if (!agent || cancelled) { setLoading(false); return; }

      let row: any = null;
      if (agent.agency_id) {
        const { data } = await supabase
          .from('crm_urgency_settings' as any)
          .select('*')
          .eq('agency_id', agent.agency_id)
          .maybeSingle();
        row = data;
      }
      if (!row) {
        const { data } = await supabase
          .from('crm_urgency_settings' as any)
          .select('*')
          .eq('agent_id', agent.id)
          .is('agency_id', null)
          .maybeSingle();
        row = data;
      }

      if (!cancelled) {
        if (row) {
          setThresholds({
            warm_max_hours: row.warm_max_hours,
            cool_max_days: row.cool_max_days,
            going_cold_warn_days: row.going_cold_warn_days,
          });
        }
        setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, []);

  return { thresholds, loading };
}
