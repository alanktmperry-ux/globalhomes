import React, { useEffect, useState, useCallback } from 'react';
import { Outlet, useNavigate, Link, useLocation } from 'react-router-dom';
import { useAuth } from '@/features/auth/AuthProvider';
import { supabase } from '@/integrations/supabase/client';
import { LayoutDashboard, LogOut, Landmark, Home, AlertTriangle, ChevronDown } from 'lucide-react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

interface AgencyLink {
  id: string;
  name: string;
  agentId: string;
}

interface PartnerContextType {
  activeAgency: AgencyLink | null;
  agencies: AgencyLink[];
  setActiveAgency: (a: AgencyLink) => void;
}

export const PartnerContext = React.createContext<PartnerContextType>({
  activeAgency: null,
  agencies: [],
  setActiveAgency: () => {},
});

export const usePartner = () => React.useContext(PartnerContext);

const NAV_ITEMS = [
  { label: 'Overview', url: '/partner/dashboard', icon: LayoutDashboard },
  { label: 'Trust Accounting', url: '/partner/trust', icon: Landmark },
  { label: 'Rent Roll', url: '/partner/rent-roll', icon: Home },
  { label: 'Arrears', url: '/partner/arrears', icon: AlertTriangle },
];

const PartnerDashboardLayout = () => {
  const { user, isPartner, loading, signOut } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const [activeAgency, setActiveAgency] = useState<AgencyLink | null>(null);
  const [agencies, setAgencies] = useState<AgencyLink[]>([]);
  const [agenciesLoading, setAgenciesLoading] = useState(true);

  useEffect(() => {
    if (!loading && (!user || !isPartner)) {
      navigate('/partner/login');
    }
  }, [user, isPartner, loading, navigate]);

  const fetchAgencies = useCallback(async () => {
    if (!user) return;
    setAgenciesLoading(true);

    const { data: partner } = await supabase
      .from('partners')
      .select('id')
      .eq('user_id', user.id)
      .maybeSingle();

    if (!partner) { setAgenciesLoading(false); return; }

    const { data: links } = await supabase
      .from('partner_agencies')
      .select('agency_id, invited_by_agent_id, agencies(id, name)')
      .eq('partner_id', partner.id)
      .eq('status', 'active');

    const mapped = (links || []).map((l: any) => ({
      id: l.agencies?.id || l.agency_id,
      name: l.agencies?.name || 'Unknown',
      agentId: l.invited_by_agent_id,
    }));
    setAgencies(mapped);
    if (mapped.length > 0 && !activeAgency) {
      setActiveAgency(mapped[0]);
    }
    setAgenciesLoading(false);
  }, [user, activeAgency]);

  useEffect(() => {
    if (user && isPartner) fetchAgencies();
  }, [user, isPartner, fetchAgencies]);

  const handleSignOut = async () => {
    await signOut();
    navigate('/partner/login');
  };

  if (loading || !user || !isPartner) return null;

  const isActive = (path: string) => location.pathname === path;

  return (
    <PartnerContext.Provider value={{ activeAgency, agencies, setActiveAgency }}>
      <div className="min-h-screen flex w-full bg-background text-foreground">
        {/* Sidebar */}
        <aside className="w-[220px] border-r border-border flex flex-col bg-card shrink-0">
          <div className="p-5 border-b border-border">
            <Link to="/partner/dashboard" className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-lg bg-primary flex items-center justify-center">
                <span className="text-primary-foreground text-[10px] font-bold">LHQ</span>
              </div>
              <div>
                <p className="text-sm font-bold text-foreground leading-none">ListHQ</p>
                <p className="text-[10px] text-muted-foreground uppercase tracking-wider mt-0.5">Partner Portal</p>
              </div>
            </Link>
          </div>

          {/* Agency Switcher */}
          <div className="px-3 pt-4 pb-2">
            {agencies.length > 0 ? (
              <Select
                value={activeAgency?.id || ''}
                onValueChange={(val) => {
                  const found = agencies.find(a => a.id === val);
                  if (found) setActiveAgency(found);
                }}
              >
                <SelectTrigger className="h-9 text-xs">
                  <SelectValue placeholder="Select agency" />
                </SelectTrigger>
                <SelectContent>
                  {agencies.map(a => (
                    <SelectItem key={a.id} value={a.id} className="text-xs">
                      {a.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            ) : (
              <p className="text-[11px] text-muted-foreground px-1 leading-relaxed">
                No active client agencies yet. Check your overview for pending invitations.
              </p>
            )}
          </div>

          {/* Nav */}
          <nav className="flex-1 p-3 space-y-1">
            {NAV_ITEMS.map(item => (
              <Link
                key={item.url}
                to={item.url}
                className={`flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm transition-colors ${
                  isActive(item.url)
                    ? 'bg-secondary text-foreground font-medium'
                    : 'text-muted-foreground hover:bg-secondary/60 hover:text-foreground'
                }`}
              >
                <item.icon size={16} />
                {item.label}
              </Link>
            ))}
          </nav>

          {/* Sign out */}
          <div className="p-3 border-t border-border">
            <button
              onClick={handleSignOut}
              className="flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm text-muted-foreground hover:bg-secondary/60 hover:text-foreground transition-colors w-full"
            >
              <LogOut size={16} />
              Sign out
            </button>
          </div>
        </aside>

        {/* Main content */}
        <main className="flex-1 flex flex-col min-h-screen overflow-x-hidden">
          <Outlet />
        </main>
      </div>
    </PartnerContext.Provider>
  );
};

export default PartnerDashboardLayout;
