import { useEffect, useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/features/auth/AuthProvider';

/**
 * Shared, cached Halo credits balance for the current user.
 *
 * halo_credits.agent_id references agents.id (NOT auth.users.id), so we must
 * resolve the agent record first before querying the balance.
 */
export function useHaloCreditsBalance() {
  const { user } = useAuth();
  const userId = user?.id;
  const queryClient = useQueryClient();
  const [agentId, setAgentId] = useState<string | null>(null);

  const query = useQuery({
    queryKey: ['halo-credits-balance', userId],
    enabled: !!userId,
    staleTime: 5 * 60 * 1000,
    gcTime: 30 * 60 * 1000,
    queryFn: async () => {
      const { data: agent } = await supabase
        .from('agents')
        .select('id')
        .eq('user_id', userId!)
        .maybeSingle();
      if (!agent) return 0;
      setAgentId(agent.id);
      const { data, error } = await supabase
        .from('halo_credits')
        .select('balance')
        .eq('agent_id', agent.id)
        .maybeSingle();
      if (error) throw error;
      return data?.balance ?? 0;
    },
  });

  // Realtime: invalidate the shared cache so every consumer refreshes.
  useEffect(() => {
    if (!agentId) return;
    const channel = supabase
      .channel('halo-credits-' + agentId)
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'halo_credits', filter: `agent_id=eq.${agentId}` },
        () => {
          queryClient.invalidateQueries({ queryKey: ['halo-credits-balance', userId] });
        },
      )
      .subscribe();
    return () => {
      supabase.removeChannel(channel);
    };
  }, [agentId, userId, queryClient]);

  return {
    balance: query.data ?? 0,
    loading: query.isLoading,
  };
}
