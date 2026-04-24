import { useEffect, useState, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import type { CRMLead, LeadStage } from '../types';
import { useAgentId } from './useAgentId';
import { computeUrgency, useUrgencyThresholds, type UrgencyTier } from '../lib/urgency';

interface Filters {
  stage?: LeadStage | 'all';
  search?: string;
  propertyId?: string;
  priority?: string;
  urgency?: UrgencyTier[];
}

/**
 * Decorate a raw lead row with backward-compatible accessor fields
 * (first_name/last_name/email/phone/source/budget_max/pre_approved)
 * proxied from the joined contact, so existing UI components keep working.
 */
function decorate(row: any): CRMLead & Record<string, any> {
  const contact = row.contact ?? {};
  return {
    ...row,
    contact,
    property: row.properties ?? row.property,
    // Backward-compat surface
    first_name: contact.first_name ?? '',
    last_name: contact.last_name ?? null,
    email: contact.email ?? null,
    phone: contact.phone ?? null,
    source: row.enquiry_source,
    budget_max: contact.budget_max ?? null,
    budget_min: contact.budget_min ?? null,
    pre_approved: false,
    property_id: row.source_property_id ?? null,
  };
}

export function useCRMLeads(filters: Filters = {}) {
  const agentId = useAgentId();
  const [leads, setLeads] = useState<CRMLead[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchLeads = useCallback(async () => {
    if (!agentId) { setLoading(false); return; }
    setLoading(true);

    let q: any = supabase
      .from('crm_leads')
      .select(`
        *,
        contact:contacts!crm_leads_contact_id_fkey (
          first_name, last_name, email, phone, mobile,
          budget_min, budget_max, ranking, contact_type
        ),
        properties:properties!crm_leads_source_property_id_fkey (
          address, suburb, state, primary_image_url
        )
      `)
      .eq('agent_id', agentId)
      .order('updated_at', { ascending: false });

    if (filters.stage && filters.stage !== 'all') q = q.eq('stage', filters.stage);
    if (filters.propertyId) q = q.eq('source_property_id', filters.propertyId);
    if (filters.priority) q = q.eq('priority', filters.priority);

    const { data } = await q;
    let rows = (data ?? []).map(decorate);

    // Client-side filter for search since it now spans the joined contact
    if (filters.search) {
      const s = filters.search.toLowerCase();
      rows = rows.filter((r: any) =>
        (r.first_name ?? '').toLowerCase().includes(s) ||
        (r.last_name ?? '').toLowerCase().includes(s) ||
        (r.email ?? '').toLowerCase().includes(s) ||
        (r.phone ?? '').toLowerCase().includes(s),
      );
    }

    setLeads(rows as CRMLead[]);
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

  /**
   * NOTE: Direct lead creation is deprecated. Use LeadContactForm instead,
   * which handles find-or-create on the contact side first.
   */
  const createLead = async (_lead: Partial<CRMLead>): Promise<null> => {
    console.warn('[useCRMLeads.createLead] Deprecated — use LeadContactForm');
    return null;
  };

  return { leads, loading, fetchLeads, updateStage, updateLead, createLead };
}
