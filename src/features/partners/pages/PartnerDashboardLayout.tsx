import { useEffect } from 'react';
import { Outlet, useNavigate, Link, useLocation } from 'react-router-dom';
import { useAuth } from '@/features/auth/AuthProvider';
import { Landmark, LayoutDashboard, LogOut } from 'lucide-react';

const PartnerDashboardLayout = () => {
  const { user, isPartner, loading, signOut } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  useEffect(() => {
    if (!loading && (!user || !isPartner)) {
      navigate('/partner/login');
    }
  }, [user, isPartner, loading, navigate]);

  const handleSignOut = async () => {
    await signOut();
    navigate('/partner/login');
  };

  if (loading || !user || !isPartner) return null;

  const isActive = (path: string) => location.pathname === path;

  return (
    <div className="min-h-screen flex w-full bg-background text-foreground">
      {/* Slim sidebar */}
      <aside className="w-60 border-r border-border flex flex-col bg-card shrink-0">
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

        <nav className="flex-1 p-3 space-y-1">
          <Link
            to="/partner/dashboard"
            className={`flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm transition-colors ${
              isActive('/partner/dashboard')
                ? 'bg-secondary text-foreground font-medium'
                : 'text-muted-foreground hover:bg-secondary/60 hover:text-foreground'
            }`}
          >
            <LayoutDashboard size={16} />
            Overview
          </Link>
        </nav>

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
  );
};

export default PartnerDashboardLayout;
