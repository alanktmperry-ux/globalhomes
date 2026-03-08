import { Search, Heart, MessageCircle, User } from 'lucide-react';
import { useI18n } from '@/lib/i18n';
import { useLocation, useNavigate } from 'react-router-dom';

const navItems = [
  { key: 'nav.search', icon: Search, path: '/' },
  { key: 'nav.saved', icon: Heart, path: '/saved' },
  { key: 'nav.messages', icon: MessageCircle, path: '/messages' },
  { key: 'nav.profile', icon: User, path: '/profile' },
];

export function BottomNav() {
  const { t } = useI18n();
  const location = useLocation();
  const navigate = useNavigate();

  return (
    <nav className="fixed bottom-0 inset-x-0 z-30 bg-card/95 backdrop-blur-md border-t border-border safe-area-bottom">
      <div className="flex items-center justify-around h-16 max-w-lg mx-auto px-2">
        {navItems.map(item => {
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
      </div>
    </nav>
  );
}
