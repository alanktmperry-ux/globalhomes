import { Search, Heart, MessageCircle, User, LogIn, Shield } from 'lucide-react';
import { useI18n } from '@/lib/i18n';
import { useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '@/lib/AuthProvider';

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
  const { user } = useAuth();

  return (
    <nav className="fixed bottom-0 inset-x-0 z-30 bg-card/95 backdrop-blur-md border-t border-border safe-area-bottom">
      <div className="flex items-center justify-around h-16 max-w-lg mx-auto px-2">
        {navItems.map(item => {
          // If item requires auth and user isn't logged in, show login instead
          if ((item as any).auth && !user) return null;
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
        {!user && (
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
