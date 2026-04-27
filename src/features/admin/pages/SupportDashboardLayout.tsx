import { useEffect } from 'react';
import { Outlet, useNavigate, NavLink } from 'react-router-dom';
import { HeadphonesIcon, Users, LogOut } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/features/auth/AuthProvider';
import { Loader2 } from 'lucide-react';

interface SupportNavItemProps {
  to: string;
  icon: React.ComponentType<{ size?: number }>;
  label: string;
}

const SupportNavItem = ({ to, icon: Icon, label }: SupportNavItemProps) => (
  <NavLink
    to={to}
    className={({ isActive }) =>
      `flex items-center gap-2 px-3 py-2 rounded-lg text-[13px] transition-colors ${
        isActive
          ? 'bg-stone-100 text-stone-900 font-medium'
          : 'text-stone-600 hover:bg-stone-50 hover:text-stone-900'
      }`
    }
  >
    <Icon size={15} />
    <span>{label}</span>
  </NavLink>
);

export default function SupportDashboardLayout() {
  const navigate = useNavigate();
  const { user, loading, isSupport, isAdmin } = useAuth();

  useEffect(() => {
    if (!loading && (!user || (!isSupport && !isAdmin))) {
      navigate('/support/login', { replace: true });
    }
  }, [loading, user, isSupport, isAdmin, navigate]);

  if (loading) {
    return (
      <div className="min-h-screen bg-stone-50 flex items-center justify-center">
        <Loader2 className="animate-spin text-stone-400" size={28} />
      </div>
    );
  }

  if (!user || (!isSupport && !isAdmin)) return null;

  const handleSignOut = async () => {
    await supabase.auth.signOut();
    navigate('/support/login');
  };

  return (
    <div className="flex min-h-screen bg-stone-50">
      <div className="w-[220px] flex-shrink-0 bg-white border-r border-stone-100 flex flex-col py-6 px-4">
        <div className="text-[13px] font-semibold text-stone-900 mb-6 px-2">Support Portal</div>
        <nav className="flex flex-col gap-1">
          <SupportNavItem to="/support/dashboard" icon={HeadphonesIcon} label="Tickets" />
          <SupportNavItem to="/support/agents" icon={Users} label="Agents" />
        </nav>
        <div className="mt-auto">
          <button
            onClick={handleSignOut}
            className="text-[13px] text-stone-400 hover:text-stone-700 flex items-center gap-2 px-2"
          >
            <LogOut size={14} /> Sign out
          </button>
        </div>
      </div>
      <div className="flex-1 overflow-auto">
        <Outlet />
      </div>
    </div>
  );
}
