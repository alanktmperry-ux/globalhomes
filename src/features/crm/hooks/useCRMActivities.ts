import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import type { CRMActivity, ActivityType } from '../types';
import { useAgentId } from './useAgentId';

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

  const addActivity = async (type: ActivityType, body: string, subject?: string, dueAt?: string) => {
    if (!agentId) return;
    await supabase.from('crm_activities').insert({
      lead_id: leadId,
      agent_id: agentId,
      type,
      body,
      subject: subject || null,
      due_at: dueAt || null,
      completed: type !== 'task',
    } as any);
    if (['call', 'email', 'meeting'].includes(type)) {
      await supabase.from('crm_leads')
        .update({ last_contacted: new Date().toISOString() } as any)
        .eq('id', leadId);
    }
    fetchActivities();
  };

  return { activities, loading, addActivity };
}
