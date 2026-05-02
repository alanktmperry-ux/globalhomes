import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/features/auth/AuthProvider';
import {
  getComplianceConfig,
  DEFAULT_COMPLIANCE,
  type StateComplianceConfig,
} from '../lib/trustComplianceConfig';

export function useAgentStateCompliance() {
  const { user } = useAuth();
  const [compliance, setCompliance] = useState<StateComplianceConfig>(DEFAULT_COMPLIANCE);
  const [agentState, setAgentState] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) {
      setLoading(false);
      return;
    }
    const run = async () => {
      const { data: agent } = await supabase
        .from('agents')
        .select('state')
        .eq('user_id', user.id)
        .maybeSingle();
      const st = (agent as any)?.state || null;
      setAgentState(st);
      setCompliance(getComplianceConfig(st));
      setLoading(false);
    };
    run();
  }, [user]);

  return { compliance, agentState, loading };
}
