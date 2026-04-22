import { useEffect, useState } from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '@/features/auth/AuthProvider';
import { supabase } from '@/integrations/supabase/client';
import { Loader2 } from 'lucide-react';

interface Props {
  children: React.ReactNode;
  requireAgent?: boolean;
  requireAdmin?: boolean;
  requirePartner?: boolean;
}

export const ProtectedRoute = ({ children, requireAgent, requireAdmin, requirePartner }: Props) => {
  const { user, loading, isAgent, isAdmin, isPartner, refreshRoles } = useAuth();
  const [provisioning, setProvisioning] = useState(false);
  const [provisionFailed, setProvisionFailed] = useState(false);

  useEffect(() => {
    if (!user || !requireAgent || isAgent || loading || provisioning || provisionFailed) return;
    let cancelled = false;
    (async () => {
      setProvisioning(true);
      try {
        const { data: existing } = await supabase
          .from('agents')
          .select('id')
          .eq('user_id', user.id)
          .maybeSingle();
        if (!existing) {
          const { error } = await supabase.from('agents').insert({
            user_id: user.id,
            email: user.email ?? null,
            name: user.user_metadata?.display_name || user.email?.split('@')[0] || 'Agent',
            is_subscribed: true,
            subscription_status: 'active',
          } as any);
          if (error) {
            console.error('[ProtectedRoute] agent auto-create failed:', error);
            if (!cancelled) setProvisionFailed(true);
            return;
          }
        }
        await refreshRoles();
      } finally {
        if (!cancelled) setProvisioning(false);
      }
    })();
    return () => { cancelled = true; };
  }, [user, requireAgent, isAgent, loading, provisioning, provisionFailed, refreshRoles]);

  if (loading || provisioning) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Loader2 className="animate-spin text-primary" size={32} />
      </div>
    );
  }

  if (!user) return <Navigate to="/login" replace />;

  if (user && !user.email_confirmed_at && !isAdmin) {
    return <Navigate to="/check-email" replace />;
  }

  if (requireAdmin && !isAdmin) return <Navigate to="/" replace />;
  if (requireAgent && !isAgent && !isAdmin) {
    if (provisionFailed) return <Navigate to="/" replace />;
    // still waiting for refreshRoles to flip isAgent — show spinner
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Loader2 className="animate-spin text-primary" size={32} />
      </div>
    );
  }
  if (requirePartner && !isPartner) return <Navigate to="/" replace />;

  return <>{children}</>;
};
