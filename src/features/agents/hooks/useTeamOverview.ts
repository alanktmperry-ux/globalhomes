import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/features/auth/AuthProvider';

export interface TeamMember {
  id: string;
  name: string;
  avatar_url?: string;
  email?: string;
  agency_role: 'agent' | 'principal' | 'admin';
  contact_count: number;
  active_listings: number;
  pipeline_breakdown: { stage: string; count: number }[];
}

export function useTeamOverview() {
  const { isPrincipal, isAdmin, agencyId } = useAuth();
  const [agents, setAgents] = useState<TeamMember[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchTeam = useCallback(async () => {
    if ((!isPrincipal && !isAdmin) || !agencyId) {
      setLoading(false);
      return;
    }

    setLoading(true);
    setError(null);

    try {
      // Fetch all agents in agency
      const { data: agentRows, error: agentErr } = await supabase
        .from('agents')
        .select('id, name, avatar_url, email, agency_role')
        .eq('agency_id', agencyId);

      if (agentErr) throw agentErr;
      if (!agentRows || agentRows.length === 0) {
        setAgents([]);
        setLoading(false);
        return;
      }

      const agentIds = agentRows.map(a => a.id);

      // Fetch contacts, listings, and pipeline data in parallel
      const [contactsRes, listingsRes, pipelineRes] = await Promise.all([
        supabase
          .from('contacts')
          .select('assigned_agent_id')
          .eq('agency_id', agencyId),
        supabase
          .from('properties')
          .select('agent_id, status')
          .in('agent_id', agentIds)
          .eq('is_active', true),
        supabase
          .from('contacts')
          .select('assigned_agent_id, buyer_pipeline_stage')
          .eq('agency_id', agencyId),
      ]);

      const contacts = contactsRes.data || [];
      const listings = listingsRes.data || [];
      const pipelineData = pipelineRes.data || [];

      const members: TeamMember[] = agentRows.map(agent => {
        const contactCount = contacts.filter(c => c.assigned_agent_id === agent.id).length;
        const activeListings = listings.filter(l => l.agent_id === agent.id).length;

        // Pipeline breakdown
        const agentPipeline = pipelineData.filter(c => c.assigned_agent_id === agent.id);
        const stageMap = new Map<string, number>();
        agentPipeline.forEach(c => {
          const stage = c.buyer_pipeline_stage || 'enquiry';
          stageMap.set(stage, (stageMap.get(stage) || 0) + 1);
        });
        const pipeline_breakdown = Array.from(stageMap.entries()).map(([stage, count]) => ({
          stage,
          count,
        }));

        return {
          id: agent.id,
          name: agent.name,
          avatar_url: agent.avatar_url || undefined,
          email: agent.email || undefined,
          agency_role: ((agent as any).agency_role || 'agent') as TeamMember['agency_role'],
          contact_count: contactCount,
          active_listings: activeListings,
          pipeline_breakdown,
        };
      });

      setAgents(members);
    } catch (err: any) {
      console.error('[useTeamOverview] Error:', err);
      setError(err.message || 'Failed to load team data');
    } finally {
      setLoading(false);
    }
  }, [isPrincipal, isAdmin, agencyId]);

  useEffect(() => {
    fetchTeam();
  }, [fetchTeam]);

  return { agents, loading, error, refetch: fetchTeam };
}
