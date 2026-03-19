import { Search, Heart, MessageCircle, User, LogIn, LogOut, ShieldCheck, Building2 } from 'lucide-react';
import { useI18n } from '@/shared/lib/i18n';
import { useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '@/features/auth/AuthProvider';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

const navItems = [
  { key: 'nav.search', icon: Search, path: '/' },
  { key: 'nav.saved', icon: Heart, path: '/saved', auth: true },
  { key: 'nav.messages', icon: MessageCircle, path: '/messages', auth: true },
  { key: 'nav.profile', icon: User, path: '/profile', auth: true },
];

export function BottomNav() {
  const { t } = useI18n();
  const location = useLocation();
  const navigate = useNavigate();
  const { user, isAdmin, isAgent, loading } = useAuth();

  const handleSignOut = async () => {
    await supabase.auth.signOut();
    toast.success('Signed out successfully');
    navigate('/');
  };

  const showAgentDashboard = Boolean(user) && (isAgent || loading);

  return (
    <nav className="fixed bottom-0 inset-x-0 z-30 bg-card/95 backdrop-blur-md border-t border-border safe-area-bottom">
      <div className="flex items-center justify-around h-16 max-w-lg mx-auto px-2">
        {navItems.map(item => {
          if ((item as any).auth && !user && !loading) return null;
          const isActive = location.pathname === item.path;
          return (
            <button
              key={item.key}
              onClick={() => navigate(item.path)}
              className={`flex flex-col items-center gap-0.5 py-1 px-3 rounded-xl transition-colors ${
                isActive ? 'text-primary' : 'text-muted-foreground'
              }`}
            >
              <item.icon size={22} strokeWidth={isActive ? 2.5 : 1.8} />
              <span className="text-[10px] font-medium">{t(item.key)}</span>
            </button>
          );
        })}
        {showAgentDashboard && (
          <button
            onClick={() => navigate('/dashboard')}
            className={`flex flex-col items-center gap-0.5 py-1 px-3 rounded-xl transition-colors ${
              location.pathname.startsWith('/dashboard') ? 'text-primary' : 'text-muted-foreground'
            }`}
          >
            <Building2 size={22} strokeWidth={location.pathname.startsWith('/dashboard') ? 2.5 : 1.8} />
            <span className="text-[10px] font-medium">Dashboard</span>
          </button>
        )}
        {user && isAdmin && (
          <button
            onClick={() => navigate('/admin')}
            className={`flex flex-col items-center gap-0.5 py-1 px-3 rounded-xl transition-colors ${
              location.pathname.startsWith('/admin') ? 'text-primary' : 'text-muted-foreground'
            }`}
          >
            <ShieldCheck size={22} strokeWidth={location.pathname.startsWith('/admin') ? 2.5 : 1.8} />
            <span className="text-[10px] font-medium">Admin</span>
          </button>
        )}
        {user ? (
          <button
            onClick={handleSignOut}
            className="flex flex-col items-center gap-0.5 py-1 px-3 rounded-xl transition-colors text-muted-foreground"
          >
            <LogOut size={22} strokeWidth={1.8} />
            <span className="text-[10px] font-medium">Sign Out</span>
          </button>
        ) : (
          <button
            onClick={() => navigate('/login')}
            className="flex flex-col items-center gap-0.5 py-1 px-3 rounded-xl transition-colors text-muted-foreground"
          >
            <LogIn size={22} strokeWidth={1.8} />
            <span className="text-[10px] font-medium">Sign In</span>
          </button>
        )}
      </div>
    </nav>
  );
}
