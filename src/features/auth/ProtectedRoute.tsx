import { useEffect } from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '@/features/auth/AuthProvider';
import { supabase } from '@/integrations/supabase/client';
import { Loader2 } from 'lucide-react';

interface Props {
  children: React.ReactNode;
  requireAgent?: boolean;
  requireAdmin?: boolean;
  requirePartner?: boolean;
  requireSupport?: boolean;
}

export const ProtectedRoute = ({ children, requireAgent, requireAdmin, requirePartner, requireSupport }: Props) => {
  const { user, loading, isAgent, isAdmin, isPartner, isSupport, refreshRoles } = useAuth();

  // Auto-approve verified-email agents (no manual admin gate)
  useEffect(() => {
    if (!user || !requireAgent || isAgent || loading) return;
    let cancelled = false;
    (async () => {
      const { data: existing } = await supabase
        .from('agents')
        .select('id, is_approved, approval_status')
        .eq('user_id', user.id)
        .maybeSingle();

      if (cancelled) return;

      if (existing && user.email_confirmed_at) {
        const needsApproval =
          !existing.is_approved || (existing as any).approval_status !== 'approved';
        if (needsApproval) {
          await supabase
            .from('agents')
            .update({
              is_approved: true,
              approval_status: 'approved',
              updated_at: new Date().toISOString(),
            } as any)
            .eq('id', existing.id);
        }
        await refreshRoles();
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [user, requireAgent, isAgent, loading, refreshRoles]);

  if (loading) {
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

  if (requireAdmin && !isAdmin && !isSupport) return <Navigate to="/" replace />;
  // Agent guard: if no agents row exists, send to onboarding to create one.
  if (requireAgent && !isAgent && !isAdmin) return <Navigate to="/onboarding/agency" replace />;
  if (requirePartner && !isPartner) return <Navigate to="/" replace />;
  if (requireSupport && !isSupport && !isAdmin) return <Navigate to="/" replace />;

  return <>{children}</>;
};
