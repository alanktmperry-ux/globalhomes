import { useEffect } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/features/auth/AuthProvider';

/**
 * Shared, cached Halo credits balance for the current user.
 *
 * Cached with React Query (5min stale time) so the agent sidebar, the Halo
 * Board page, and any other consumer share a single network call. A realtime
 * subscription invalidates the cache when the balance changes server-side.
 */
export function useHaloCreditsBalance() {
  const { user } = useAuth();
  const userId = user?.id;
  const queryClient = useQueryClient();

  const query = useQuery({
    queryKey: ['halo-credits-balance', userId],
    enabled: !!userId,
    staleTime: 5 * 60 * 1000,
    gcTime: 30 * 60 * 1000,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('halo_credits')
        .select('balance')
        .eq('agent_id', userId!)
        .maybeSingle();
      if (error) throw error;
      return data?.balance ?? 0;
    },
  });

  // Realtime: invalidate the shared cache so every consumer refreshes.
  useEffect(() => {
    if (!userId) return;
    const channel = supabase
      .channel('halo-credits-' + userId)
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'halo_credits', filter: `agent_id=eq.${userId}` },
        () => {
          queryClient.invalidateQueries({ queryKey: ['halo-credits-balance', userId] });
        },
      )
      .subscribe();
    return () => {
      supabase.removeChannel(channel);
    };
  }, [userId, queryClient]);

  return {
    balance: query.data ?? 0,
    loading: query.isLoading,
  };
}
