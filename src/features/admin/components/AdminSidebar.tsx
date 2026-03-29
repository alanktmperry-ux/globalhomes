import { useState } from 'react';
import {
  Shield, Zap, Gamepad2, MessageSquare, Users, UserCheck,
  Building2, DollarSign, TrendingUp, Megaphone, Landmark,
  ShieldAlert, Brain, FileText, Database, ClipboardCheck,
  ArrowLeft, Menu, X, Bot, Star, FileSignature, ShoppingCart,
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useIsMobile } from '@/shared/hooks/use-mobile';
import { cn } from '@/shared/lib/utils';
import { Button } from '@/components/ui/button';
import { Sheet, SheetContent, SheetTitle } from '@/components/ui/sheet';
import { ScrollArea } from '@/components/ui/scroll-area';

export type AdminTab =
  | 'command-centre' | 'agent-lifecycle' | 'compliance' | 'revenue'
  | 'comms' | 'partners' | 'growth' | 'support' | 'users' | 'listings'
  | 'roles' | 'database' | 'demo-requests' | 'reports' | 'ai-insights'
  | 'pre-launch' | 'ai-buyer-concierge' | 'ai-seller-score'
  | 'ai-offer-generator' | 'ai-lead-marketplace' | 'legal-compliance'
  | 'press-outreach';

interface NavItemProps {
  id: AdminTab;
  label: string;
  icon: React.ElementType;
  tab: AdminTab;
  setTab: (t: AdminTab) => void;
  badge?: number;
  onClose?: () => void;
}

const NavItem = ({ id, label, icon: Icon, tab, setTab, badge, onClose }: NavItemProps) => (
  <button
    onClick={() => { setTab(id); onClose?.(); }}
    className={cn(
      'relative w-full flex items-center gap-3 px-3 py-2 rounded-lg text-sm transition-all',
      tab === id
        ? 'bg-primary/10 text-primary font-semibold shadow-sm'
        : 'text-muted-foreground hover:text-foreground hover:bg-accent/60'
    )}
  >
    <Icon size={16} className={cn(tab === id ? 'text-primary' : 'text-muted-foreground/70')} />
    <span className="truncate">{label}</span>
    {badge != null && badge > 0 && (
      <span className="ml-auto min-w-[20px] h-5 flex items-center justify-center rounded-full bg-destructive text-destructive-foreground text-[10px] font-bold px-1.5">
        {badge}
      </span>
    )}
  </button>
);

const SectionLabel = ({ children }: { children: React.ReactNode }) => (
  <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground/50 px-3 pt-4 pb-1.5">
    {children}
  </p>
);

interface AdminSidebarProps {
  tab: AdminTab;
  setTab: (t: AdminTab) => void;
  pendingDemoCount?: number;
}

function SidebarContent({ tab, setTab, pendingDemoCount = 0, onClose }: AdminSidebarProps & { onClose?: () => void }) {
  const navigate = useNavigate();

  return (
    <div className="flex flex-col h-full">
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

          <SectionLabel>Home</SectionLabel>
          <NavItem id="command-centre" label="Command Centre" icon={Zap} tab={tab} setTab={setTab} onClose={onClose} />

          <SectionLabel>Urgent</SectionLabel>
          <NavItem id="demo-requests" label="Demo Requests" icon={Gamepad2} tab={tab} setTab={setTab} badge={pendingDemoCount} onClose={onClose} />
          <NavItem id="support" label="Support Inbox" icon={MessageSquare} tab={tab} setTab={setTab} onClose={onClose} />

          <SectionLabel>Agents</SectionLabel>
          <NavItem id="agent-lifecycle" label="Agent Lifecycle" icon={Users} tab={tab} setTab={setTab} onClose={onClose} />
          <NavItem id="users" label="Users" icon={UserCheck} tab={tab} setTab={setTab} onClose={onClose} />
          <NavItem id="roles" label="Roles" icon={Shield} tab={tab} setTab={setTab} onClose={onClose} />

          <SectionLabel>Platform</SectionLabel>
          <NavItem id="listings" label="Listings" icon={Building2} tab={tab} setTab={setTab} onClose={onClose} />
          <NavItem id="revenue" label="Revenue & Billing" icon={DollarSign} tab={tab} setTab={setTab} onClose={onClose} />
          <NavItem id="growth" label="Growth Funnel" icon={TrendingUp} tab={tab} setTab={setTab} onClose={onClose} />

          <SectionLabel>Engage</SectionLabel>
          <NavItem id="comms" label="Communications" icon={Megaphone} tab={tab} setTab={setTab} onClose={onClose} />
          <NavItem id="partners" label="Partners" icon={Landmark} tab={tab} setTab={setTab} onClose={onClose} />
          <NavItem id="press-outreach" label="PR Outreach" icon={Megaphone} tab={tab} setTab={setTab} onClose={onClose} />

          <SectionLabel>Compliance</SectionLabel>
          <NavItem id="compliance" label="Compliance" icon={ShieldAlert} tab={tab} setTab={setTab} onClose={onClose} />
          <NavItem id="legal-compliance" label="Legal Checklist" icon={FileSignature} tab={tab} setTab={setTab} onClose={onClose} />

          <SectionLabel>AI Builds</SectionLabel>
          <NavItem id="ai-insights" label="AI Insights" icon={Brain} tab={tab} setTab={setTab} onClose={onClose} />

          <SectionLabel>System</SectionLabel>
          <NavItem id="reports" label="Reports" icon={FileText} tab={tab} setTab={setTab} onClose={onClose} />
          <NavItem id="database" label="Database" icon={Database} tab={tab} setTab={setTab} onClose={onClose} />
          <NavItem id="pre-launch" label="Pre-Launch" icon={ClipboardCheck} tab={tab} setTab={setTab} onClose={onClose} />

        </nav>
      </ScrollArea>

      {/* Footer */}
      <div className="px-4 py-3 border-t border-border flex-shrink-0">
        <button
          onClick={() => navigate('/dashboard')}
          className="flex items-center gap-2 text-xs text-muted-foreground hover:text-foreground transition-colors"
        >
          <ArrowLeft size={14} /> Back to Dashboard
        </button>
      </div>
    </div>
  );
}

export default function AdminSidebar({ tab, setTab, pendingDemoCount = 0 }: AdminSidebarProps) {
  const isMobile = useIsMobile();
  const [open, setOpen] = useState(false);

  if (isMobile) {
    return (
      <>
        {/* Mobile top bar with hamburger */}
        <div className="sticky top-0 z-30 flex items-center gap-3 px-3 h-12 border-b border-border bg-background/95 backdrop-blur-sm">
          <Button variant="ghost" size="icon" className="h-9 w-9" onClick={() => setOpen(true)}>
            <Menu size={18} />
          </Button>
          <div className="flex items-center gap-2">
            <Shield size={16} className="text-primary" />
            <span className="text-sm font-bold">Admin</span>
          </div>
        </div>

        <Sheet open={open} onOpenChange={setOpen}>
          <SheetContent side="left" className="w-[280px] p-0">
            <SheetTitle className="sr-only">Admin Navigation</SheetTitle>
            <SidebarContent tab={tab} setTab={setTab} pendingDemoCount={pendingDemoCount} onClose={() => setOpen(false)} />
          </SheetContent>
        </Sheet>
      </>
    );
  }

  // Desktop sidebar
  return (
    <aside className="w-[260px] flex-shrink-0 border-r border-border bg-card/50 backdrop-blur-md flex flex-col sticky top-0 h-screen">
      <SidebarContent tab={tab} setTab={setTab} pendingDemoCount={pendingDemoCount} />
    </aside>
  );
}
