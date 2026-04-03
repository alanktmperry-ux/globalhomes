import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/features/auth/AuthProvider';
import type { Tables } from '@/integrations/supabase/types';

type Property = Tables<'properties'>;

interface ListingWithMeta extends Property {
  _source: 'db';
}

export type AgentListing = ListingWithMeta;

export function useAgentListings() {
  const { user, impersonatedUserId } = useAuth();
  const [listings, setListings] = useState<AgentListing[]>([]);
  const [loading, setLoading] = useState(true);
  const [agentId, setAgentId] = useState<string | null>(null);
  const [fetchKey, setFetchKey] = useState(0);

  const refetch = () => setFetchKey(k => k + 1);

  useEffect(() => {
    const effectiveUserId = impersonatedUserId || user?.id;
    if (!effectiveUserId) { setListings([]); setLoading(false); return; }

    const fetch = async () => {
      setLoading(true);
      const { data: agent } = await supabase
        .from('agents')
        .select('id')
        .eq('user_id', effectiveUserId)
        .maybeSingle();

      if (!agent) {
        setListings([]);
        setLoading(false);
        return;
      }

      setAgentId(agent.id);

      const { data: props } = await supabase
        .from('properties')
        .select('*')
        .eq('agent_id', agent.id)
        .order('created_at', { ascending: false });

      const dbListings: ListingWithMeta[] = (props || []).map(p => ({ ...p, _source: 'db' as const }));

      setListings(dbListings);
      setLoading(false);
    };

    fetch();
  }, [user, impersonatedUserId, fetchKey]);

  const realCount = listings.length;
  const isMockData = false;

  return { listings, loading, agentId, realCount, isMockData, refetch };
}
