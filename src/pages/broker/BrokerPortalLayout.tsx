/**
 * BrokerPortalLayout
 * Sidebar shell for the broker portal.
 */
import { ReactNode } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { LogOut, Inbox, Briefcase, CheckCircle2, Settings } from "lucide-react";
import type { BrokerRecord } from "./brokerPortalUtils";

export type PortalTab = "new" | "pipeline" | "settled" | "settings";

interface Props {
  broker: BrokerRecord;
  active: PortalTab;
  onTabChange: (t: PortalTab) => void;
  children: ReactNode;
}

const NAV: { id: PortalTab; label: string; icon: typeof Inbox }[] = [
  { id: "new", label: "New Leads", icon: Inbox },
  { id: "pipeline", label: "My Pipeline", icon: Briefcase },
  { id: "settled", label: "Settled", icon: CheckCircle2 },
  { id: "settings", label: "Settings", icon: Settings },
];

export default function BrokerPortalLayout({ broker, active, onTabChange, children }: Props) {
  const navigate = useNavigate();

  const handleLogout = async () => {
    await supabase.auth.signOut();
    navigate("/broker/login");
  };

  return (
    <div className="min-h-screen bg-slate-50 flex">
      {/* Sidebar */}
      <aside className="w-60 shrink-0 bg-white border-r border-slate-200 flex flex-col">
        <div className="p-5 border-b border-slate-200">
          <h1 className="text-lg font-bold text-slate-900">ListHQ</h1>
          <p className="text-xs text-slate-500 mt-0.5">Finance Portal</p>
        </div>

        <nav className="flex-1 p-3 space-y-1">
          {NAV.map((item) => {
            const Icon = item.icon;
            const isActive = active === item.id;
            return (
              <button
                key={item.id}
                onClick={() => onTabChange(item.id)}
                className={`w-full flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                  isActive
                    ? "bg-blue-50 text-blue-700"
                    : "text-slate-600 hover:bg-slate-50 hover:text-slate-900"
                }`}
              >
                <Icon size={16} />
                {item.label}
              </button>
            );
          })}
        </nav>

        <div className="p-3 border-t border-slate-200">
          <div className="px-3 py-2 mb-2">
            <p className="text-sm font-medium text-slate-900 truncate">
              {broker.full_name || broker.name}
            </p>
            <p className="text-xs text-slate-500 truncate">{broker.email}</p>
            {broker.company && <p className="text-xs text-slate-400 truncate mt-0.5">{broker.company}</p>}
          </div>
          <Button
            variant="ghost"
            size="sm"
            className="w-full justify-start text-slate-600"
            onClick={handleLogout}
          >
            <LogOut size={14} className="mr-2" /> Sign out
          </Button>
        </div>
      </aside>

      {/* Main */}
      <main className="flex-1 min-w-0 overflow-hidden">{children}</main>
    </div>
  );
}
