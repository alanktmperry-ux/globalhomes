import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import type { CRMTask } from '../types';
import { useAgentId } from './useAgentId';

export function useCRMTasks(leadId?: string) {
  const agentId = useAgentId();
  const [tasks, setTasks] = useState<CRMTask[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => { fetchTasks(); }, [leadId, agentId]);

  const fetchTasks = async () => {
    if (!agentId) return;
    setLoading(true);
    let q = supabase
      .from('crm_tasks')
      .select('*')
      .eq('agent_id', agentId)
      .eq('completed', false)
      .order('due_at', { ascending: true });
    if (leadId) q = q.eq('lead_id', leadId);
    const { data } = await q;
    setTasks((data as CRMTask[]) ?? []);
    setLoading(false);
  };

  const addTask = async (taskLeadId: string, title: string, dueAt: string) => {
    if (!agentId) return;
    await supabase.from('crm_tasks').insert({
      lead_id: taskLeadId,
      agent_id: agentId,
      title,
      due_at: dueAt,
    } as any);
    fetchTasks();
  };

  const completeTask = async (taskId: string) => {
    await supabase.from('crm_tasks').update({ completed: true } as any).eq('id', taskId);
    fetchTasks();
  };

  return { tasks, loading, addTask, completeTask };
}
