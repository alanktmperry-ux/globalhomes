import { useCallback, useEffect, useRef, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/features/auth/AuthProvider';
import { useUrgencyThresholds, DEFAULT_THRESHOLDS } from '@/features/crm/lib/urgency';

export type PrioritySourceKey = 'hot_lead' | 'going_cold' | 'overdue_action' | 'unresponded' | 'due_soon';

export interface PriorityItem {
  id: string;                  // unique row key (source_key + ':' + source_id)
  sourceKey: PrioritySourceKey;
  sourceId: string;            // entity id (crm_lead.id | contact.id | lead.id)
  weight: number;              // higher = more urgent
  ageMs: number;               // tiebreaker
  title: string;
  context: string;
  /** path to navigate to when the action button is clicked */
  actionHref: string;
  /** label for action button */
  actionLabel: string;
}

const REFRESH_MS = 5 * 60 * 1000;

/**
 * Builds a deterministic, weight-sorted list of the top priorities for the
 * authenticated agent. Refreshes every 5 minutes and on window focus.
 */
export function useTodayPriorities(limit = 5) {
  const { user } = useAuth();
  const { thresholds } = useUrgencyThresholds();
  const [items, setItems] = useState<PriorityItem[]>([]);
  const [agentId, setAgentId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const refreshRef = useRef<() => void>(() => {});

  const load = useCallback(async () => {
    if (!user) { setLoading(false); return; }

    const { data: agent } = await supabase
      .from('agents')
      .select('id')
      .eq('user_id', user.id)
      .maybeSingle();
    if (!agent) { setLoading(false); return; }
    setAgentId(agent.id);

    const t = thresholds || DEFAULT_THRESHOLDS;
    const nowMs = Date.now();

    // --- Active dismissals ---
    const { data: dismissalsRaw } = await supabase
      .from('agent_priority_dismissals' as any)
      .select('source_key, source_id, dismissed_until')
      .eq('agent_id', agent.id)
      .gt('dismissed_until', new Date().toISOString());
    const dismissed = new Set(
      ((dismissalsRaw as any[]) || []).map(d => `${d.source_key}:${d.source_id}`),
    );

    const candidates: PriorityItem[] = [];

    // --- 1. HOT leads (uncontacted) ---
    const { data: hotLeads } = await supabase
      .from('crm_leads')
      .select('id, contact_id, source_property_id, created_at, contacts:contact_id(first_name, last_name), properties:source_property_id(address)')
      .eq('agent_id', agent.id)
      .is('last_contacted', null)
      .not('stage', 'in', '(settled,lost)')
      .order('created_at', { ascending: false })
      .limit(20);

    for (const l of hotLeads || []) {
      const name = ((l as any).contacts ? `${(l as any).contacts.first_name ?? ''} ${(l as any).contacts.last_name ?? ''}`.trim() : '') || 'New lead';
      const propAddr = (l as any).properties?.address;
      const ageMs = nowMs - new Date(l.created_at).getTime();
      candidates.push({
        id: `hot_lead:${l.id}`,
        sourceKey: 'hot_lead',
        sourceId: l.id,
        weight: 100,
        ageMs,
        title: `Call ${name}`,
        context: propAddr
          ? `Enquired on ${propAddr} · ${formatAgo(ageMs)} ago`
          : `New enquiry · ${formatAgo(ageMs)} ago`,
        actionHref: `/dashboard/crm?lead=${l.id}&action=call`,
        actionLabel: 'Call',
      });
    }

    // --- 2. Leads going COLD (within warning window before cold cutoff) ---
    const coldCutoffMs = t.cool_max_days * 86_400_000;
    const warnStartMs = (t.cool_max_days - (t.cool_max_days - t.going_cold_warn_days)) * 86_400_000;
    const warnFromIso = new Date(nowMs - coldCutoffMs).toISOString();          // upper bound: still cool
    const warnToIso = new Date(nowMs - warnStartMs).toISOString();             // lower bound: entered warn window
    const { data: coldSoon } = await supabase
      .from('crm_leads')
      .select('id, contact_id, last_contacted, contacts:contact_id(first_name, last_name)')
      .eq('agent_id', agent.id)
      .gt('last_contacted', warnFromIso)
      .lte('last_contacted', warnToIso)
      .not('stage', 'in', '(settled,lost)')
      .order('last_contacted', { ascending: true })
      .limit(20);

    for (const l of coldSoon || []) {
      const name = ((l as any).contacts ? `${(l as any).contacts.first_name ?? ''} ${(l as any).contacts.last_name ?? ''}`.trim() : '') || 'Lead';
      const ageMs = nowMs - new Date((l as any).last_contacted).getTime();
      candidates.push({
        id: `going_cold:${l.id}`,
        sourceKey: 'going_cold',
        sourceId: l.id,
        weight: 80,
        ageMs,
        title: `Follow up with ${name}`,
        context: `Going cold — last contacted ${formatAgo(ageMs)} ago`,
        actionHref: `/dashboard/crm?lead=${l.id}&action=followup`,
        actionLabel: 'Follow up',
      });
    }

    // --- 3. Overdue next_action_due_at on contacts ---
    const { data: overdue } = await supabase
      .from('contacts')
      .select('id, first_name, last_name, next_action_due_at, next_action_note')
      .eq('assigned_agent_id', agent.id)
      .not('next_action_due_at', 'is', null)
      .lt('next_action_due_at', new Date().toISOString())
      .order('next_action_due_at', { ascending: true })
      .limit(20);

    for (const c of overdue || []) {
      const name = `${c.first_name ?? ''} ${c.last_name ?? ''}`.trim() || 'Contact';
      const ageMs = nowMs - new Date((c as any).next_action_due_at).getTime();
      const note = (c as any).next_action_note || 'Follow up';
      candidates.push({
        id: `overdue_action:${c.id}`,
        sourceKey: 'overdue_action',
        sourceId: c.id,
        weight: 75,
        ageMs,
        title: `${truncate(note, 60)} — ${name}`,
        context: `Was due ${formatAgo(ageMs)} ago`,
        actionHref: `/dashboard/contacts/${c.id}?scrollTo=next_action`,
        actionLabel: 'Open',
      });
    }

    // --- 4. Unresponded enquiries >24h ---
    const { data: unresp } = await supabase
      .from('leads')
      .select('id, user_name, user_email, created_at, property_id, properties:property_id(address)')
      .eq('agent_id', agent.id)
      .is('responded_at', null)
      .is('archived_at', null)
      .lt('created_at', new Date(nowMs - 86_400_000).toISOString())
      .order('created_at', { ascending: true })
      .limit(20);

    for (const l of unresp || []) {
      const name = (l as any).user_name || (l as any).user_email || 'Enquirer';
      const propAddr = (l as any).properties?.address;
      const ageMs = nowMs - new Date(l.created_at).getTime();
      candidates.push({
        id: `unresponded:${l.id}`,
        sourceKey: 'unresponded',
        sourceId: l.id,
        weight: 60,
        ageMs,
        title: `Reply to ${name}`,
        context: propAddr ? `About ${propAddr} · ${formatAgo(ageMs)} ago` : `${formatAgo(ageMs)} ago`,
        actionHref: `/dashboard/leads?lead=${l.id}`,
        actionLabel: 'Reply',
      });
    }

    // --- 5. Due within 24h ---
    const { data: dueSoon } = await supabase
      .from('contacts')
      .select('id, first_name, last_name, next_action_due_at, next_action_note')
      .eq('assigned_agent_id', agent.id)
      .not('next_action_due_at', 'is', null)
      .gte('next_action_due_at', new Date().toISOString())
      .lte('next_action_due_at', new Date(nowMs + 86_400_000).toISOString())
      .order('next_action_due_at', { ascending: true })
      .limit(20);

    for (const c of dueSoon || []) {
      const name = `${c.first_name ?? ''} ${c.last_name ?? ''}`.trim() || 'Contact';
      const dueIn = new Date((c as any).next_action_due_at).getTime() - nowMs;
      const note = (c as any).next_action_note || 'Follow up';
      candidates.push({
        id: `due_soon:${c.id}`,
        sourceKey: 'due_soon',
        sourceId: c.id,
        weight: 50,
        ageMs: -dueIn, // negative so soonest-due ranks first within the weight tier
        title: `${truncate(note, 60)} — ${name}`,
        context: `Due in ${formatIn(dueIn)}`,
        actionHref: `/dashboard/contacts/${c.id}?scrollTo=next_action`,
        actionLabel: 'Open',
      });
    }

    // --- Filter dismissed, sort, slice ---
    const visible = candidates
      .filter(c => !dismissed.has(c.id))
      .sort((a, b) => b.weight - a.weight || b.ageMs - a.ageMs)
      .slice(0, limit);

    setItems(visible);
    setLoading(false);
  }, [user, thresholds, limit]);

  refreshRef.current = load;

  useEffect(() => {
    load();
    const interval = setInterval(() => refreshRef.current?.(), REFRESH_MS);
    const onFocus = () => refreshRef.current?.();
    window.addEventListener('focus', onFocus);
    return () => {
      clearInterval(interval);
      window.removeEventListener('focus', onFocus);
    };
  }, [load]);

  const dismiss = useCallback(async (item: PriorityItem) => {
    if (!agentId) return;
    setItems(prev => prev.filter(i => i.id !== item.id));
    await supabase.from('agent_priority_dismissals' as any).upsert(
      {
        agent_id: agentId,
        source_key: item.sourceKey,
        source_id: item.sourceId,
        dismissed_until: new Date(Date.now() + 4 * 3_600_000).toISOString(),
      },
      { onConflict: 'agent_id,source_key,source_id' },
    );
  }, [agentId]);

  return { items, loading, refresh: load, dismiss };
}

// --- helpers ---
function formatAgo(ms: number): string {
  const m = Math.floor(ms / 60_000);
  if (m < 60) return `${m}m`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h`;
  const d = Math.floor(h / 24);
  return `${d}d`;
}
function formatIn(ms: number): string {
  if (ms <= 0) return 'now';
  return formatAgo(ms);
}
function truncate(s: string, n: number) {
  return s.length > n ? s.slice(0, n - 1) + '…' : s;
}
