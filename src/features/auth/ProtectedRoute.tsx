import { Navigate } from 'react-router-dom';
import { useAuth } from '@/features/auth/AuthProvider';
import { Loader2 } from 'lucide-react';

interface Props {
  children: React.ReactNode;
  requireAgent?: boolean;
  requireAdmin?: boolean;
  requirePartner?: boolean;
}

export const ProtectedRoute = ({ children, requireAgent, requireAdmin, requirePartner }: Props) => {
  const { user, loading, isAgent, isAdmin, isPartner } = useAuth();

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

  if (requireAdmin && !isAdmin) return <Navigate to="/" replace />;
  if (requireAgent && !isAgent && !isAdmin) return <Navigate to="/onboarding/agency" replace />;
  if (requirePartner && !isPartner) return <Navigate to="/" replace />;

  return <>{children}</>;
};
