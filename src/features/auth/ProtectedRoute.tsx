import { useEffect, useState } from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '@/features/auth/AuthProvider';
import { supabase } from '@/integrations/supabase/client';
import { Loader2 } from 'lucide-react';


interface Props {
  children: React.ReactNode;
  requireAgent?: boolean;
  requireAdmin?: boolean;
  requirePartner?: boolean;
  requireSupport?: boolean;
  /** Block seekers (userRole === 'user') from this route. Use on agent-only flows that don't require an existing agent record (e.g. /onboarding/agency). */
  blockSeekers?: boolean;
}

export const ProtectedRoute = ({ children, requireAgent, requireAdmin, requirePartner, requireSupport, blockSeekers }: Props) => {
  const { user, loading, isAgent, isAdmin, isPartner, isSupport, isPrincipal, userRole } = useAuth();
  const location = useLocation();
  const [approvalState, setApprovalState] = useState<'loading' | 'pending' | 'approved' | 'none'>('loading');

  useEffect(() => {
    if (!user || !requireAgent || isAdmin) {
      setApprovalState('approved');
      return;
    }
    let cancelled = false;
    (async () => {
      const { data } = await supabase
        .from('agents')
        .select('id, approval_status')
        .eq('user_id', user.id)
        .maybeSingle();

      if (cancelled) return;

      if (!data) {
        setApprovalState('none');
      } else if (data.approval_status !== 'approved') {
        setApprovalState('pending');
      } else {
        setApprovalState('approved');
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [user, requireAgent, isAdmin]);

  if (loading || (requireAgent && approvalState === 'loading' && user && !isAdmin)) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Loader2 className="animate-spin text-primary" size={32} />
      </div>
    );
  }

  if (!user) {
    if (requireAdmin || requireSupport) return <Navigate to="/admin/login" replace />;
    if (requirePartner) return <Navigate to="/" replace />;
    const redirectParam = encodeURIComponent(location.pathname + location.search);
    return <Navigate to={`/login?redirect=${redirectParam}`} replace />;
  }

  if (user && !user.email_confirmed_at && !isAdmin) {
    return <Navigate to="/check-email" replace />;
  }

  // Role-boundary guard: a seeker must never enter agent-only flows.
  // Applies to requireAgent routes AND blockSeekers routes (e.g. /onboarding/agency).
  // Admins, agents, principals, partners, support all bypass this check.
  const isSeekerOnly =
    userRole === 'user' && !isAgent && !isAdmin && !isPartner && !isSupport && !isPrincipal;
  if ((requireAgent || blockSeekers) && isSeekerOnly) {
    return <Navigate to="/seeker/dashboard" replace />;
  }

  if (requireAdmin && !isAdmin) return <Navigate to="/admin/login" replace />;
  if (requireSupport && !isAdmin && !isSupport) return <Navigate to="/admin/login" replace />;

  // Agent guard: if no agents row exists, send to onboarding to create one.
  if (requireAgent && !isAdmin && approvalState === 'none') {
    return <Navigate to="/onboarding/agency" replace />;
  }

  if (requireAgent && !isAdmin && approvalState === 'pending') {
    return <Navigate to="/onboarding/agency" replace />;
  }

  if (requireAgent && !isAgent && !isAdmin && approvalState !== 'approved') {
    return <Navigate to="/onboarding/agency" replace />;
  }

  if (requirePartner && !isPartner) return <Navigate to="/" replace />;
  if (requireSupport && !isSupport && !isAdmin) return <Navigate to="/" replace />;

  return <>{children}</>;
};
