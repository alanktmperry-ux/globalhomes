import { useEffect, useState, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/features/auth/AuthProvider';

export type CardKey =
  | 'tasks_due'
  | 'active_contacts'
  | 'appraisals_month'
  | 'sales_month'
  | 'trust_balance'
  | 'unresponded_leads'
  | 'reputation_score'
  | 'todays_inspections'
  | 'todays_voice_matches'
  | 'listing_performance'
  | 'recent_activity'
  | 'gci'
  | 'pipeline_12mo';

export interface CardLayoutEntry {
  card_key: CardKey;
  is_visible: boolean;
  display_order: number;
}

export const DEFAULT_LAYOUT: CardLayoutEntry[] = [
  { card_key: 'tasks_due',           is_visible: true, display_order: 0 },
  { card_key: 'active_contacts',     is_visible: true, display_order: 1 },
  { card_key: 'appraisals_month',    is_visible: true, display_order: 2 },
  { card_key: 'sales_month',         is_visible: true, display_order: 3 },
  { card_key: 'trust_balance',       is_visible: true, display_order: 4 },
  { card_key: 'unresponded_leads',   is_visible: true, display_order: 5 },
  { card_key: 'reputation_score',    is_visible: true, display_order: 6 },
  { card_key: 'todays_inspections',  is_visible: true, display_order: 7 },
  { card_key: 'todays_voice_matches',is_visible: true, display_order: 8 },
  { card_key: 'listing_performance', is_visible: true, display_order: 9 },
  { card_key: 'recent_activity',     is_visible: true, display_order: 10 },
  { card_key: 'gci',                 is_visible: true, display_order: 11 },
  { card_key: 'pipeline_12mo',       is_visible: true, display_order: 12 },
];

export const CARD_LABELS: Record<CardKey, string> = {
  tasks_due: 'Tasks Due',
  active_contacts: 'Active Contacts',
  appraisals_month: 'Appraisals This Month',
  sales_month: 'Sales This Month',
  trust_balance: 'Trust Balance',
  unresponded_leads: 'Unresponded Leads',
  reputation_score: 'Reputation Score',
  todays_inspections: "Today's Inspections",
  todays_voice_matches: "Today's Voice Matches",
  listing_performance: 'Listing Performance',
  recent_activity: 'Recent Activity',
  gci: 'GCI — Gross Commission Income',
  pipeline_12mo: 'Pipeline — 12 Month Deal Flow',
};

const STAT_TILE_KEYS: CardKey[] = [
  'tasks_due', 'active_contacts', 'appraisals_month', 'sales_month',
  'trust_balance', 'unresponded_leads', 'reputation_score',
];
export const isStatTile = (k: CardKey) => STAT_TILE_KEYS.includes(k);

/** Normalise a stored layout: keep only known keys, append new ones at the end. */
function normalise(stored: CardLayoutEntry[] | undefined | null): CardLayoutEntry[] {
  const known = new Map<CardKey, CardLayoutEntry>();
  if (Array.isArray(stored)) {
    for (const entry of stored) {
      if (entry && typeof entry.card_key === 'string' &&
          DEFAULT_LAYOUT.some(d => d.card_key === entry.card_key)) {
        known.set(entry.card_key as CardKey, {
          card_key: entry.card_key as CardKey,
          is_visible: entry.is_visible !== false,
          display_order: typeof entry.display_order === 'number' ? entry.display_order : 999,
        });
      }
    }
  }
  // Append any missing keys at the end as visible
  let nextOrder = known.size;
  for (const def of DEFAULT_LAYOUT) {
    if (!known.has(def.card_key)) {
      known.set(def.card_key, { ...def, display_order: nextOrder++ });
    }
  }
  return [...known.values()].sort((a, b) => a.display_order - b.display_order);
}

export function useDashboardLayout() {
  const { user } = useAuth();
  const [layout, setLayout] = useState<CardLayoutEntry[]>(DEFAULT_LAYOUT);
  const [loaded, setLoaded] = useState(false);
  const [agentId, setAgentId] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      if (!user) { setLoaded(true); return; }
      const { data: agent } = await supabase
        .from('agents')
        .select('id')
        .eq('user_id', user.id)
        .maybeSingle();
      if (cancelled) return;
      if (!agent?.id) { setLoaded(true); return; }
      setAgentId(agent.id);

      const { data } = await supabase
        .from('agent_dashboard_prefs')
        .select('prefs')
        .eq('agent_id', agent.id)
        .maybeSingle();
      if (cancelled) return;

      const stored = (data?.prefs as { dashboard_layout?: CardLayoutEntry[] } | null)?.dashboard_layout;
      setLayout(normalise(stored));
      setLoaded(true);
    })();
    return () => { cancelled = true; };
  }, [user]);

  const save = useCallback(async (next: CardLayoutEntry[]) => {
    setLayout(next);
    if (!agentId) return;
    // Read existing prefs to merge
    const { data: existing } = await supabase
      .from('agent_dashboard_prefs')
      .select('prefs')
      .eq('agent_id', agentId)
      .maybeSingle();
    const merged = { ...(existing?.prefs as object ?? {}), dashboard_layout: next };
    await supabase
      .from('agent_dashboard_prefs')
      .upsert([{ agent_id: agentId, prefs: merged as any, updated_at: new Date().toISOString() }], { onConflict: 'agent_id' });
  }, [agentId]);

  const reset = useCallback(() => save(DEFAULT_LAYOUT), [save]);

  return { layout, setLayoutLocal: setLayout, save, reset, loaded };
}
