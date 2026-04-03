import { useEffect, useState, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/features/auth/AuthProvider';
import type { CRMLead, LeadStage } from '../types';
import { useAgentId } from './useAgentId';

interface Filters {
  stage?: LeadStage | 'all';
  search?: string;
  propertyId?: string;
  priority?: string;
}

export function useCRMLeads(filters: Filters = {}) {
  const agentId = useAgentId();
  const [leads, setLeads] = useState<CRMLead[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchLeads = useCallback(async () => {
    if (!agentId) return;
    setLoading(true);

    let q = supabase
      .from('crm_leads')
      .select('*, properties(address, suburb, state)')
      .eq('agent_id', agentId)
      .order('updated_at', { ascending: false });

    if (filters.stage && filters.stage !== 'all') q = q.eq('stage', filters.stage);
    if (filters.propertyId) q = q.eq('property_id', filters.propertyId);
    if (filters.priority) q = q.eq('priority', filters.priority);
    if (filters.search) {
      q = q.or(
        `first_name.ilike.%${filters.search}%,` +
        `last_name.ilike.%${filters.search}%,` +
        `email.ilike.%${filters.search}%,` +
        `phone.ilike.%${filters.search}%`
      );
    }

    const { data } = await q;
    setLeads((data as CRMLead[]) ?? []);
    setLoading(false);
  }, [agentId, filters.stage, filters.search, filters.propertyId, filters.priority]);

  useEffect(() => { fetchLeads(); }, [fetchLeads]);

  const updateStage = async (leadId: string, stage: LeadStage) => {
    await supabase.from('crm_leads').update({ stage } as any).eq('id', leadId);
    fetchLeads();
  };

  const updateLead = async (leadId: string, updates: Partial<CRMLead>) => {
    await supabase.from('crm_leads').update(updates as any).eq('id', leadId);
    fetchLeads();
  };

  const createLead = async (lead: Partial<CRMLead>) => {
    if (!agentId) return;
    const { data } = await supabase
      .from('crm_leads')
      .insert({ ...lead, agent_id: agentId, stage: 'new', source: 'manual' } as any)
      .select()
      .single();
    fetchLeads();
    return data;
  };

  return { leads, loading, fetchLeads, updateStage, updateLead, createLead };
}
