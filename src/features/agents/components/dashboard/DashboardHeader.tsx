import { SidebarTrigger } from '@/components/ui/sidebar';
import { NotificationBell } from './NotificationBell';
import { LanguageSwitcher } from '@/shared/components/layout/LanguageSwitcher';

interface Props {
  title: string;
  subtitle?: string;
  actions?: React.ReactNode;
}

const DashboardHeader = ({ title, subtitle, actions }: Props) => (
  <header
    className="sticky top-0 z-20 backdrop-blur-xl border-b"
    style={{ background: 'rgba(255,255,255,0.85)', borderColor: 'rgba(15,23,42,0.06)' }}
  >
    <div className="h-[68px] flex items-center justify-between px-4 sm:px-6 md:px-10">
      <div className="flex items-center gap-3">
        <SidebarTrigger className="lg:hidden" />
        <div>
          <h1 className="font-display text-lg font-semibold tracking-tight text-[#0F172A]">{title}</h1>
          {subtitle && <p className="text-xs font-light text-[#64748B]">{subtitle}</p>}
        </div>
      </div>
      <div className="flex items-center gap-2">
        {actions}
        <NotificationBell />
      </div>
    </div>
  </header>
);

export default DashboardHeader;
