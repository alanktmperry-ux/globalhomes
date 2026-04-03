import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/features/auth/AuthProvider';

export function useAgentId() {
  const { user } = useAuth();
  const [agentId, setAgentId] = useState<string | null>(null);

  useEffect(() => {
    if (!user) return;
    supabase
      .from('agents')
      .select('id')
      .eq('user_id', user.id)
      .maybeSingle()
      .then(({ data }) => setAgentId(data?.id ?? null));
  }, [user]);

  return agentId;
}
