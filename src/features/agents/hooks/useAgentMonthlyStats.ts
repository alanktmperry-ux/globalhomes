import { useEffect, useState, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';

export interface AgentMonthlyStats {
  appraisalsThisMonth: number;
  salesThisMonthAmount: number;
  gciActual: number;
  gciBudgeted: number;
  gciPotential: number;
  isLoading: boolean;
}

const EMPTY: AgentMonthlyStats = {
  appraisalsThisMonth: 0,
  salesThisMonthAmount: 0,
  gciActual: 0,
  gciBudgeted: 0,
  gciPotential: 0,
  isLoading: false,
};

export function useAgentMonthlyStats(agentId: string | null | undefined): AgentMonthlyStats {
  const [stats, setStats] = useState<AgentMonthlyStats>(EMPTY);

  const load = useCallback(async () => {
    if (!agentId) { setStats(EMPTY); return; }
    setStats(s => ({ ...s, isLoading: true }));

    const monthStart = new Date();
    monthStart.setDate(1);
    monthStart.setHours(0, 0, 0, 0);

    const now = new Date();
    const fyStart = new Date(now.getMonth() >= 6 ? now.getFullYear() : now.getFullYear() - 1, 6, 1);

    const [appraisalsRes, salesRes, fyRes, pipelineRes, agentRes] = await Promise.all([
      supabase
        .from('contacts')
        .select('id', { count: 'exact', head: true })
        .eq('agent_id', agentId)
        .eq('seller_pipeline_stage', 'appraisal')
        .gte('updated_at', monthStart.toISOString()),
      supabase
        .from('properties')
        .select('commission_amount')
        .eq('agent_id', agentId)
        .gte('settled_at', monthStart.toISOString())
        .not('settled_at', 'is', null),
      supabase
        .from('properties')
        .select('commission_amount')
        .eq('agent_id', agentId)
        .gte('settled_at', fyStart.toISOString())
        .not('settled_at', 'is', null),
      supabase
        .from('properties')
        .select('commission_amount, list_price, commission_rate')
        .eq('agent_id', agentId)
        .is('settled_at', null),
      supabase
        .from('agents')
        .select('gci_budget_annual')
        .eq('id', agentId)
        .maybeSingle(),
    ]);

    const salesThisMonthAmount = ((salesRes.data as any[]) ?? [])
      .reduce((s, r) => s + Number(r.commission_amount ?? 0), 0);

    const gciActual = ((fyRes.data as any[]) ?? [])
      .reduce((s, r) => s + Number(r.commission_amount ?? 0), 0);

    const gciPotential = ((pipelineRes.data as any[]) ?? []).reduce((s, r) => {
      const amt = Number(r.commission_amount ?? 0)
        || (Number(r.list_price ?? 0) * Number(r.commission_rate ?? 0));
      return s + amt;
    }, 0);

    const gciBudgeted = Number((agentRes.data as any)?.gci_budget_annual ?? 0);

    setStats({
      appraisalsThisMonth: appraisalsRes.count ?? 0,
      salesThisMonthAmount,
      gciActual,
      gciBudgeted,
      gciPotential,
      isLoading: false,
    });
  }, [agentId]);

  useEffect(() => { load(); }, [load]);

  return stats;
}
