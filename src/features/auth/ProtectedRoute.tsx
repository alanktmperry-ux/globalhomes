import { useEffect, useState } from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '@/features/auth/AuthProvider';
import { supabase } from '@/integrations/supabase/client';
import { Loader2, Clock } from 'lucide-react';

interface Props {
  children: React.ReactNode;
  requireAgent?: boolean;
  requireAdmin?: boolean;
  requirePartner?: boolean;
  requireSupport?: boolean;
}

export const ProtectedRoute = ({ children, requireAgent, requireAdmin, requirePartner, requireSupport }: Props) => {
  const { user, loading, isAgent, isAdmin, isPartner, isSupport } = useAuth();
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
        .select('id, is_approved')
        .eq('user_id', user.id)
        .maybeSingle();

      if (cancelled) return;

      if (!data) {
        setApprovalState('none');
      } else if (!data.is_approved) {
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
    // Admin routes have their own login screen — never bounce admins to the seeker login (or worse, a 404).
    return <Navigate to={requireAdmin ? '/agents/login' : '/login'} replace />;
  }

  if (user && !user.email_confirmed_at && !isAdmin) {
    return <Navigate to="/check-email" replace />;
  }

  if (requireAdmin && !isAdmin && !isSupport) return <Navigate to="/agents/login" replace />;

  // Agent guard: if no agents row exists, send to onboarding to create one.
  if (requireAgent && !isAdmin && approvalState === 'none') {
    return <Navigate to="/onboarding/agency" replace />;
  }

  // Pending approval screen for agents who haven't been approved yet.
  if (requireAgent && !isAdmin && approvalState === 'pending') {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center px-6">
        <div className="max-w-md text-center space-y-6">
          <div className="mx-auto w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center">
            <Clock className="text-primary" size={32} />
          </div>
          <h1 className="text-2xl font-bold">Account pending review</h1>
          <p className="text-muted-foreground">
            Your agent account is pending review. You'll receive an email within 24 hours once approved.
          </p>
          <p className="text-xs text-muted-foreground">
            Signed in as {user.email}
          </p>
        </div>
      </div>
    );
  }

  if (requireAgent && !isAgent && !isAdmin && approvalState !== 'approved') {
    return <Navigate to="/onboarding/agency" replace />;
  }

  if (requirePartner && !isPartner) return <Navigate to="/" replace />;
  if (requireSupport && !isSupport && !isAdmin) return <Navigate to="/" replace />;

  return <>{children}</>;
};
