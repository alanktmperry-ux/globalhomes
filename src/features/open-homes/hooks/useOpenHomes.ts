import { useEffect, useState, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';

export interface OpenHomeSession {
  id: string;
  property_id: string;
  agent_id: string;
  starts_at: string;
  ends_at: string;
  max_attendees: number;
  status: 'scheduled' | 'in_progress' | 'completed' | 'cancelled';
  notes: string | null;
  qr_token: string;
}

export interface OpenHomeWithCounts extends OpenHomeSession {
  registered_count: number;
  waitlist_count: number;
  attended_count: number;
  is_full: boolean;
}

export function useOpenHomes(propertyId: string | undefined) {
  const [sessions, setSessions] = useState<OpenHomeWithCounts[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchSessions = useCallback(async () => {
    if (!propertyId) return;
    setLoading(true);

    const { data: openHomes } = await supabase
      .from('open_homes')
      .select('*')
      .eq('property_id', propertyId)
      .in('status', ['scheduled', 'in_progress'])
      .order('starts_at', { ascending: true });

    if (!openHomes || openHomes.length === 0) {
      setSessions([]);
      setLoading(false);
      return;
    }

    // Fetch registration counts for each session
    const ids = openHomes.map(oh => oh.id);
    const { data: regs } = await supabase
      .from('open_home_registrations')
      .select('open_home_id, on_waitlist, attended')
      .in('open_home_id', ids);

    const countMap: Record<string, { registered: number; waitlist: number; attended: number }> = {};
    (regs ?? []).forEach(r => {
      if (!countMap[r.open_home_id]) countMap[r.open_home_id] = { registered: 0, waitlist: 0, attended: 0 };
      if (r.on_waitlist) countMap[r.open_home_id].waitlist++;
      else countMap[r.open_home_id].registered++;
      if (r.attended) countMap[r.open_home_id].attended++;
    });

    setSessions(openHomes.map(oh => {
      const c = countMap[oh.id] ?? { registered: 0, waitlist: 0, attended: 0 };
      return {
        ...oh,
        registered_count: c.registered,
        waitlist_count: c.waitlist,
        attended_count: c.attended,
        is_full: oh.max_attendees > 0 && c.registered >= oh.max_attendees,
      } as OpenHomeWithCounts;
    }));
    setLoading(false);
  }, [propertyId]);

  useEffect(() => { fetchSessions(); }, [fetchSessions]);

  // Realtime updates
  useEffect(() => {
    if (!propertyId) return;
    const channel = supabase
      .channel(`open_homes_${propertyId}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'open_home_registrations' }, () => fetchSessions())
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [propertyId, fetchSessions]);

  return { sessions, loading, refetch: fetchSessions };
}

export function useAgentOpenHomes(agentId: string | undefined) {
  const [sessions, setSessions] = useState<OpenHomeWithCounts[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!agentId) { setLoading(false); return; }
    (async () => {
      const { data: openHomes } = await supabase
        .from('open_homes')
        .select('*')
        .eq('agent_id', agentId)
        .order('starts_at', { ascending: true });

      if (!openHomes || openHomes.length === 0) {
        setSessions([]);
        setLoading(false);
        return;
      }

      const ids = openHomes.map(oh => oh.id);
      const { data: regs } = await supabase
        .from('open_home_registrations')
        .select('open_home_id, on_waitlist, attended')
        .in('open_home_id', ids);

      const countMap: Record<string, { registered: number; waitlist: number; attended: number }> = {};
      (regs ?? []).forEach(r => {
        if (!countMap[r.open_home_id]) countMap[r.open_home_id] = { registered: 0, waitlist: 0, attended: 0 };
        if (r.on_waitlist) countMap[r.open_home_id].waitlist++;
        else countMap[r.open_home_id].registered++;
        if (r.attended) countMap[r.open_home_id].attended++;
      });

      setSessions(openHomes.map(oh => {
        const c = countMap[oh.id] ?? { registered: 0, waitlist: 0, attended: 0 };
        return {
          ...oh,
          registered_count: c.registered,
          waitlist_count: c.waitlist,
          attended_count: c.attended,
          is_full: oh.max_attendees > 0 && c.registered >= oh.max_attendees,
        } as OpenHomeWithCounts;
      }));
      setLoading(false);
    })();
  }, [agentId]);

  return { sessions, loading };
}
