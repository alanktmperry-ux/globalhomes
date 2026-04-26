import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/features/auth/AuthProvider';

const CURRENT_AGENT_SELECT = `
  id,
  company_logo_url,
  name,
  agency,
  agency_id,
  agency_role,
  approval_status,
  onboarding_complete,
  trust_setup_pending,
  subscription_status,
  payment_failed_at,
  admin_grace_until
`;

export interface CurrentAgent {
  id: string;
  company_logo_url: string | null;
  name: string;
  agency: string | null;
  agency_id: string | null;
  agency_role: string | null;
  approval_status: string;
  onboarding_complete: boolean | null;
  trust_setup_pending: boolean;
  subscription_status: string | null;
  payment_failed_at: string | null;
  admin_grace_until: string | null;
}

export function useCurrentAgent() {
  const { user, impersonatedUserId } = useAuth();
  const effectiveUserId = impersonatedUserId || user?.id;

  const query = useQuery({
    queryKey: ['current-agent', effectiveUserId],
    enabled: !!effectiveUserId,
    staleTime: 5 * 60 * 1000,
    gcTime: 30 * 60 * 1000,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('agents')
        .select(CURRENT_AGENT_SELECT)
        .eq('user_id', effectiveUserId!)
        .maybeSingle();

      if (error) throw error;

      return (data as CurrentAgent | null) ?? null;
    },
  });

  return {
    agent: query.data ?? null,
    loading: query.isLoading,
    error: query.error,
  };
}