import { Link, useLocation } from 'react-router-dom';
import { LayoutDashboard, Home, MessageSquare, Sparkles } from 'lucide-react';
import { useAuth } from '@/features/auth/AuthProvider';
import { useConversations } from '@/features/messaging/hooks/useConversations';
import { cn } from '@/lib/utils';

export function DashboardBottomTabs() {
  const location = useLocation();
  const { user } = useAuth();
  const { totalUnread } = useConversations(user?.id);

  const tabs = [
    { to: '/dashboard', icon: LayoutDashboard, label: 'Home', exact: true, badge: 0 },
    { to: '/dashboard/listings', icon: Home, label: 'Listings', badge: 0 },
    { to: '/dashboard/inbox', icon: MessageSquare, label: 'Inbox', badge: totalUnread },
    { to: '/halo/board', icon: Sparkles, label: 'Matches', badge: 0 },
  ];

  return (
    <nav
      className="fixed bottom-0 left-0 right-0 z-30 bg-card border-t border-border lg:hidden"
      style={{ paddingBottom: 'env(safe-area-inset-bottom)' }}
    >
      <div className="grid grid-cols-4">
        {tabs.map(({ to, icon: Icon, label, badge, exact }) => {
          const active = exact ? location.pathname === to : location.pathname === to || location.pathname.startsWith(to + '/');
          return (
            <Link
              key={to}
              to={to}
              className={cn(
                'flex flex-col items-center justify-center py-2 gap-0.5 relative transition-colors',
                active ? 'text-primary' : 'text-muted-foreground hover:text-foreground',
              )}
            >
              <div className="relative">
                <Icon size={20} />
                {badge > 0 && (
                  <span className="absolute -top-1 -right-1 min-w-[14px] h-[14px] px-1 rounded-full bg-primary text-primary-foreground text-[9px] font-bold flex items-center justify-center">
                    {badge > 9 ? '9+' : badge}
                  </span>
                )}
              </div>
              <span className="text-[10px] font-medium">{label}</span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
