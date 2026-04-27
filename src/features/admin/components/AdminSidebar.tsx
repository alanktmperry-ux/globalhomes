import { Link, useLocation, useNavigate } from 'react-router-dom';
import {
  Zap, CheckCircle, Users, Building2, DollarSign, Megaphone, Settings,
  Shield, ArrowLeft, UserCog, LineChart, BookOpen, Wallet,
} from 'lucide-react';
import { cn } from '@/shared/lib/utils';
import { ScrollArea } from '@/components/ui/scroll-area';

interface NavItem {
  to: string;
  label: string;
  icon: React.ElementType;
  exact?: boolean;
  badge?: number;
}

/** @deprecated Legacy tab key kept for back-compat with old AdminDashboard.tsx (now /admin/legacy). */
export type AdminTab = string;

interface AdminSidebarProps {
  pendingApprovalsTotal?: number;
  isSupport?: boolean;
  /** @deprecated legacy props — ignored */
  tab?: unknown;
  setTab?: unknown;
  pendingDemoCount?: number;
  pendingApprovalCount?: number;
  pendingModerationCount?: number;
}

const SectionLabel = ({ children }: { children: React.ReactNode }) => (
  <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground/50 px-3 pt-4 pb-1.5">
    {children}
  </p>
);

function NavLinkItem({ item, active }: { item: NavItem; active: boolean }) {
  const Icon = item.icon;
  return (
    <Link
      to={item.to}
      className={cn(
        'relative w-full flex items-center gap-3 px-3 py-2 rounded-lg text-sm transition-all',
        active
          ? 'bg-primary/10 text-primary font-semibold shadow-sm'
          : 'text-muted-foreground hover:text-foreground hover:bg-accent/60'
      )}
    >
      <Icon size={16} className={cn(active ? 'text-primary' : 'text-muted-foreground/70')} />
      <span className="truncate">{item.label}</span>
      {item.badge != null && item.badge > 0 && (
        <span className="ml-auto min-w-[20px] h-5 flex items-center justify-center rounded-full bg-destructive text-destructive-foreground text-[10px] font-bold px-1.5">
          {item.badge}
        </span>
      )}
    </Link>
  );
}

export default function AdminSidebar({ pendingApprovalsTotal = 0, isSupport = false }: AdminSidebarProps) {
  const { pathname } = useLocation();
  const navigate = useNavigate();

  const isActive = (to: string, exact?: boolean) =>
    exact ? pathname === to || pathname === `${to}/` : pathname === to || pathname.startsWith(`${to}/`);

  const home: NavItem[] = [
    { to: '/admin', label: 'Command Centre', icon: Zap, exact: true },
  ];
  const strategy: NavItem[] = [
    { to: '/admin/insights', label: 'Insights', icon: LineChart },
    { to: '/admin/costs', label: 'Costs', icon: Wallet },
  ];
  const operations: NavItem[] = [
    { to: '/admin/approvals', label: 'Approvals', icon: CheckCircle, badge: pendingApprovalsTotal },
    { to: '/admin/users', label: 'Accounts', icon: UserCog },
    { to: '/admin/agents', label: 'Agents', icon: Users },
    { to: '/admin/listings', label: 'Listings', icon: Building2 },
  ];
  const business: NavItem[] = [
    { to: '/admin/revenue', label: 'Revenue', icon: DollarSign },
    { to: '/admin/outreach', label: 'Outreach', icon: Megaphone },
  ];
  const system: NavItem[] = [
    { to: '/admin/system', label: 'System', icon: Settings },
  ];
  const help: NavItem[] = [
    { to: '/admin/help', label: 'Help', icon: BookOpen },
  ];

  return (
    <aside className="w-[260px] flex-shrink-0 border-r border-border bg-card/50 backdrop-blur-md flex flex-col sticky top-0 h-screen">
      {/* Header */}
      <div className="px-4 pt-5 pb-3 border-b border-border flex-shrink-0">
        <div className="flex items-center gap-2">
          <Shield size={18} className="text-primary" />
          <span className="font-display text-sm font-bold text-foreground">ListHQ Admin</span>
        </div>
        <p className="text-[10px] text-muted-foreground mt-0.5 pl-[26px]">Platform management</p>
      </div>

      {/* Navigation */}
      <ScrollArea className="flex-1">
        <nav className="px-2 pb-4 space-y-0.5">
          {home.map((item) => (
            <NavLinkItem key={item.to} item={item} active={isActive(item.to, item.exact)} />
          ))}

          {!isSupport && (
            <>
              <SectionLabel>Strategy</SectionLabel>
              {strategy.map((item) => (
                <NavLinkItem key={item.to} item={item} active={isActive(item.to, item.exact)} />
              ))}
            </>
          )}

          <SectionLabel>Operations</SectionLabel>
          {operations.map((item) => (
            <NavLinkItem key={item.to} item={item} active={isActive(item.to, item.exact)} />
          ))}

          <SectionLabel>Business</SectionLabel>
          {business
            .filter((item) => !isSupport || item.to === '/admin/outreach')
            .map((item) => (
              <NavLinkItem key={item.to} item={item} active={isActive(item.to, item.exact)} />
            ))}

          {!isSupport && (
            <>
              <SectionLabel>System</SectionLabel>
              {system.map((item) => (
                <NavLinkItem key={item.to} item={item} active={isActive(item.to, item.exact)} />
              ))}
            </>
          )}

          {help.map((item) => (
            <NavLinkItem key={item.to} item={item} active={isActive(item.to, item.exact)} />
          ))}
        </nav>
      </ScrollArea>

      {/* Footer */}
      <div className="px-4 py-3 border-t border-border flex-shrink-0">
        <button
          onClick={() => navigate('/')}
          className="flex items-center gap-2 text-xs text-muted-foreground hover:text-foreground transition-colors"
        >
          <ArrowLeft size={14} /> Back to app
        </button>
      </div>
    </aside>
  );
}
