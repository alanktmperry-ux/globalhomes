import { Link, useLocation, useNavigate } from 'react-router-dom';
import {
  Zap, CheckCircle, Users, Building2, DollarSign, Megaphone, Settings,
  Shield, ArrowLeft, LineChart, Wallet, Landmark, Sparkles, Share2, Briefcase,
  Command, LifeBuoy, ShieldCheck, Star,
} from 'lucide-react';
import { cn } from '@/shared/lib/utils';
import { ScrollArea } from '@/components/ui/scroll-area';

interface NavItem {
  to: string;
  label: string;
  icon: React.ElementType;
  exact?: boolean;
  badge?: number;
  badgeTone?: 'default' | 'destructive';
}

/** @deprecated Legacy tab key kept for back-compat with old AdminDashboard.tsx. */
export type AdminTab = string;

interface AdminSidebarProps {
  pendingApprovalsTotal?: number;
  isSupport?: boolean;
  /** Listings awaiting moderation */
  listingsPendingCount?: number;
  /** Agents approved but onboarding not complete */
  agentsStuckCount?: number;
  /** Failed payments in last 30 days (rendered as red badge) */
  failedPaymentsCount?: number;
  /** Unresolved support tickets */
  supportOpenCount?: number;
  boostsPendingCount?: number;
  /** @deprecated legacy props — ignored */
  tab?: unknown;
  setTab?: unknown;
  pendingDemoCount?: number;
  pendingApprovalCount?: number;
  pendingModerationCount?: number;
}

const ICON_STROKE = 1.75;
const ICON_SIZE = 16;

const SectionLabel = ({ children }: { children: React.ReactNode }) => (
  <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground/50 px-3 pt-4 pb-1.5">
    {children}
  </p>
);

function NavLinkItem({ item, active }: { item: NavItem; active: boolean }) {
  const Icon = item.icon;
  const tone = item.badgeTone ?? 'default';
  return (
    <Link
      to={item.to}
      className={cn(
        'relative w-full flex items-center gap-3 px-3 py-2 rounded-lg text-sm transition-all',
        active
          ? 'bg-primary/10 text-primary font-semibold shadow-sm'
          : 'text-muted-foreground hover:text-foreground hover:bg-accent/60',
      )}
    >
      <Icon
        size={ICON_SIZE}
        strokeWidth={ICON_STROKE}
        className={cn(active ? 'text-primary' : 'text-muted-foreground/70')}
      />
      <span className="truncate">{item.label}</span>
      {item.badge != null && item.badge > 0 && (
        <span
          className={cn(
            'ml-auto min-w-[20px] h-5 flex items-center justify-center rounded-full text-[10px] font-bold px-1.5',
            tone === 'destructive'
              ? 'bg-destructive text-destructive-foreground'
              : 'bg-primary/15 text-primary',
          )}
        >
          {item.badge}
        </span>
      )}
    </Link>
  );
}

export default function AdminSidebar({
  pendingApprovalsTotal = 0,
  isSupport = false,
  listingsPendingCount,
  agentsStuckCount,
  failedPaymentsCount,
  supportOpenCount,
  boostsPendingCount,
}: AdminSidebarProps) {
  const { pathname, search } = useLocation();
  const navigate = useNavigate();

  const isActive = (to: string, exact?: boolean) => {
    const [path] = to.split('?');
    if (exact) return pathname === path || pathname === `${path}/`;
    return pathname === path || pathname.startsWith(`${path}/`);
  };

  const dashboard: NavItem[] = [
    { to: '/admin', label: 'Command Centre', icon: Zap, exact: true },
    { to: '/admin/insights', label: 'Insights', icon: LineChart },
  ];
  const operations: NavItem[] = [
    { to: '/admin/approvals', label: 'Approvals', icon: CheckCircle, badge: pendingApprovalsTotal, badgeTone: 'destructive' },
    { to: '/admin/listings', label: 'Listings', icon: Building2, badge: listingsPendingCount },
    { to: '/admin/boosts', label: 'Boosts', icon: Star, badge: boostsPendingCount, badgeTone: 'destructive' },
    { to: '/admin/agents', label: 'Agents', icon: Users, badge: agentsStuckCount },
    { to: '/admin/support', label: 'Support', icon: LifeBuoy, badge: supportOpenCount, badgeTone: 'destructive' },
    { to: '/admin/careers', label: 'Careers', icon: Briefcase },
  ];
  const growth: NavItem[] = [
    { to: '/admin/halo', label: 'Halo', icon: Sparkles },
    { to: '/admin/outreach', label: 'Outreach', icon: Megaphone },
    { to: '/admin/referral-partners', label: 'Referral Partners', icon: Share2 },
    { to: '/admin/brokers', label: 'Brokers', icon: Landmark },
  ];
  const business: NavItem[] = [
    { to: '/admin/revenue', label: 'Revenue', icon: DollarSign, badge: failedPaymentsCount, badgeTone: 'destructive' },
    { to: '/admin/costs', label: 'Costs', icon: Wallet },
  ];
  const system: NavItem[] = [
    { to: '/admin/system', label: 'System', icon: Settings },
    { to: '/admin/team', label: 'Team', icon: Users },
    { to: '/admin/audit', label: 'Audit Log', icon: ShieldCheck },
  ];

  void search;

  const openPalette = () =>
    window.dispatchEvent(new CustomEvent('admin:open-command-palette'));

  return (
    <aside className="w-[260px] flex-shrink-0 border-r border-border bg-card/50 backdrop-blur-md flex flex-col sticky top-0 h-screen">
      <div className="px-4 pt-5 pb-3 border-b border-border flex-shrink-0">
        <div className="flex items-center gap-2">
          <Shield size={18} strokeWidth={ICON_STROKE} className="text-primary" />
          <span className="font-display text-sm font-bold text-foreground">ListHQ Admin</span>
        </div>
        <p className="text-[10px] text-muted-foreground mt-0.5 pl-[26px]">Platform management</p>
      </div>

      {/* ⌘K Quick actions — promoted as first-class affordance */}
      <div className="px-3 pt-3 pb-1 flex-shrink-0">
        <button
          onClick={openPalette}
          className="w-full flex items-center gap-2 px-3 py-2 rounded-lg border border-border bg-background/60 hover:bg-accent/60 transition-colors text-sm group"
        >
          <Command size={14} strokeWidth={ICON_STROKE} className="text-muted-foreground group-hover:text-foreground" />
          <span className="text-muted-foreground group-hover:text-foreground font-medium">Quick actions</span>
          <kbd className="ml-auto rounded bg-muted px-1.5 py-0.5 text-[10px] font-mono text-muted-foreground">
            ⌘K
          </kbd>
        </button>
      </div>

      <ScrollArea className="flex-1">
        <nav className="px-2 pb-4 space-y-0.5">
          <SectionLabel>Dashboard</SectionLabel>
          {dashboard.map((item) => (
            <NavLinkItem key={item.to} item={item} active={isActive(item.to, item.exact)} />
          ))}

          <SectionLabel>Operations</SectionLabel>
          {operations.map((item) => (
            <NavLinkItem key={item.to} item={item} active={isActive(item.to, item.exact)} />
          ))}

          {!isSupport && (
            <>
              <SectionLabel>Growth</SectionLabel>
              {growth.map((item) => (
                <NavLinkItem key={item.to} item={item} active={isActive(item.to, item.exact)} />
              ))}
            </>
          )}

          <SectionLabel>Business</SectionLabel>
          {business
            .filter((item) => !isSupport || item.to === '/admin/revenue')
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
        </nav>
      </ScrollArea>

      <div className="px-4 py-3 border-t border-border flex-shrink-0">
        <button
          onClick={() => navigate('/')}
          className="flex items-center gap-2 text-xs text-muted-foreground hover:text-foreground transition-colors"
        >
          <ArrowLeft size={14} strokeWidth={ICON_STROKE} /> Back to app
        </button>
      </div>
    </aside>
  );
}
