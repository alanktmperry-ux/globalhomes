import { SidebarTrigger } from '@/components/ui/sidebar';
import { Bell } from 'lucide-react';
import { Badge } from '@/components/ui/badge';

interface Props {
  title: string;
  subtitle?: string;
  actions?: React.ReactNode;
}

const DashboardHeader = ({ title, subtitle, actions }: Props) => (
  <header className="sticky top-0 z-20 bg-background/80 backdrop-blur-xl border-b border-border">
    <div className="flex items-center justify-between px-4 sm:px-6 py-3">
      <div className="flex items-center gap-3">
        <SidebarTrigger className="lg:hidden" />
        <div>
          <h1 className="font-display text-lg font-bold">{title}</h1>
          {subtitle && <p className="text-xs text-muted-foreground">{subtitle}</p>}
        </div>
      </div>
      <div className="flex items-center gap-2">
        {actions}
        <button className="relative w-9 h-9 rounded-xl bg-secondary flex items-center justify-center hover:bg-accent transition-colors">
          <Bell size={16} />
          <span className="absolute -top-0.5 -right-0.5 w-2.5 h-2.5 bg-destructive rounded-full border-2 border-background" />
        </button>
      </div>
    </div>
  </header>
);

export default DashboardHeader;
