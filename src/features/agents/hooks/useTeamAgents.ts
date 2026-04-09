import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/features/auth/AuthProvider';

export interface TeamAgent {
  id: string;
  user_id: string;
  name: string;
  email: string | null;
  phone: string | null;
  avatar_url: string | null;
  agency_role: string;
  is_subscribed: boolean;
  license_number: string | null;
  licence_expiry_date: string | null;
  cpd_hours_completed: number;
  cpd_hours_required: number;
  professional_indemnity_expiry: string | null;
  contact_count: number;
  active_listings: number;
}

export function useTeamAgents() {
  const { agencyId, isPrincipal, isAdmin } = useAuth();
  const [agents, setAgents] = useState<TeamAgent[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchAgents = useCallback(async () => {
    if (!agencyId || (!isPrincipal && !isAdmin)) {
      setLoading(false);
      return;
    }
    setLoading(true);

    const { data: agentRows } = await supabase
      .from('agents')
      .select('id, user_id, name, email, phone, avatar_url, agency_role, is_subscribed, license_number, licence_expiry_date, cpd_hours_completed, cpd_hours_required, professional_indemnity_expiry')
      .eq('agency_id', agencyId);

    if (!agentRows || agentRows.length === 0) {
      setAgents([]);
      setLoading(false);
      return;
    }

    const agentIds = agentRows.map(a => a.id);

    const [contactsRes, listingsRes] = await Promise.all([
      supabase.from('contacts').select('assigned_agent_id').eq('agency_id', agencyId),
      supabase.from('properties').select('agent_id').in('agent_id', agentIds).eq('is_active', true),
    ]);

    const contacts = contactsRes.data || [];
    const listings = listingsRes.data || [];

    const enriched: TeamAgent[] = agentRows.map(a => ({
      id: a.id,
      user_id: a.user_id,
      name: a.name,
      email: a.email,
      phone: a.phone,
      avatar_url: a.avatar_url,
      agency_role: (a as any).agency_role || 'agent',
      is_subscribed: a.is_subscribed,
      license_number: a.license_number,
      licence_expiry_date: (a as any).licence_expiry_date || null,
      cpd_hours_completed: (a as any).cpd_hours_completed || 0,
      cpd_hours_required: (a as any).cpd_hours_required || 12,
      professional_indemnity_expiry: (a as any).professional_indemnity_expiry || null,
      contact_count: contacts.filter(c => c.assigned_agent_id === a.id).length,
      active_listings: listings.filter(l => l.agent_id === a.id).length,
    }));

    setAgents(enriched);
    setLoading(false);
  }, [agencyId, isPrincipal, isAdmin]);

  useEffect(() => { fetchAgents(); }, [fetchAgents]);

  return { agents, loading, refetch: fetchAgents };
}
