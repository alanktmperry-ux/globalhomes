import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import type { CRMActivity, ActivityType } from '../types';
import { useAgentId } from './useAgentId';

function nextBusinessDay(): string {
  const d = new Date();
  d.setDate(d.getDate() + 1);
  if (d.getDay() === 6) d.setDate(d.getDate() + 2); // Sat → Mon
  if (d.getDay() === 0) d.setDate(d.getDate() + 1); // Sun → Mon
  d.setHours(9, 0, 0, 0);
  return d.toISOString();
}

export function useCRMActivities(leadId: string) {
  const agentId = useAgentId();
  const [activities, setActivities] = useState<CRMActivity[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => { fetchActivities(); }, [leadId]);

  const fetchActivities = async () => {
    setLoading(true);
    const { data } = await supabase
      .from('crm_activities')
      .select('*')
      .eq('lead_id', leadId)
      .order('created_at', { ascending: false });
    setActivities((data as CRMActivity[]) ?? []);
    setLoading(false);
  };

  const addActivity = async (
    type: ActivityType,
    body: string,
    subject?: string,
    dueAt?: string,
    outcome?: string | null,
  ) => {
    if (!agentId) return;
    await supabase.from('crm_activities').insert({
      lead_id: leadId,
      agent_id: agentId,
      type,
      body,
      subject: subject || null,
      due_at: dueAt || null,
      completed: type !== 'task',
      event_data: outcome ? { outcome } : null,
    } as any);
    if (['call', 'email', 'meeting'].includes(type)) {
      await supabase.from('crm_leads')
        .update({ last_contacted: new Date().toISOString() } as any)
        .eq('id', leadId);
    }

    // Auto follow-up task for missed calls and voicemails
    if (type === 'call' && (outcome === 'missed' || outcome === 'voicemail')) {
      const label = outcome === 'voicemail' ? 'Return voicemail' : 'Call back';
      await supabase.from('crm_tasks').insert({
        lead_id: leadId,
        agent_id: agentId,
        title: `${label} — ${new Date().toLocaleString('en-AU', { weekday: 'short', hour: '2-digit', minute: '2-digit' })}`,
        due_at: nextBusinessDay(),
      } as any);
    }
    fetchActivities();
  };

  return { activities, loading, addActivity };
}
