import { lazy, Suspense, useState, useRef, useEffect } from 'react';
import { MapPin, Bookmark } from 'lucide-react';
import { Globe, ChevronDown, User, LogIn, Home, Building2, Plus, List, LayoutDashboard, ShieldCheck, Menu, FileText, Handshake, Wrench, Sparkles, Search, MoreHorizontal, HelpCircle, Users, Banknote } from 'lucide-react';
import { useNavigate, Link } from 'react-router-dom';
// framer-motion intentionally NOT imported — it forced the whole library into
// the cold-paint critical path. Dropdowns now use plain conditional rendering
// with CSS transitions for the same visual effect at zero JS cost.
import { useCurrency } from '@/shared/lib/CurrencyContext';
import { useAuth } from '@/features/auth/AuthProvider';
import { NotificationBell } from '@/features/agents/components/dashboard/NotificationBell';
import { SeekerNotificationBell } from '@/components/halo/SeekerNotificationBell';
import { LanguageSwitcher } from '@/shared/components/layout/LanguageSwitcher';
import { CurrencySwitcher } from '@/shared/components/layout/CurrencySwitcher';
// Lazy-loaded — pulls in framer-motion, only needed when the user opens the
// "Become an agent" modal. Keeping it static added ~50KB gz to every cold load.
const AgentRegistrationModal = lazy(() => import('@/features/agents/components/AgentRegistrationModal'));

import { useI18n } from '@/shared/lib/i18n';
import { Sheet, SheetContent, SheetTrigger } from '@/components/ui/sheet';

export function SiteHeader() {
  const { listingMode, setListingMode } = useCurrency();
  const { user, userRole, isAgent, isAdmin } = useAuth();
  const { t } = useI18n();
  const navigate = useNavigate();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [showAgentModal, setShowAgentModal] = useState(false);

  const navTo = (path: string) => {
    setMobileOpen(false);
    navigate(path);
  };

  const [showUserMenu, setShowUserMenu] = useState(false);
  const userMenuRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (userMenuRef.current && !userMenuRef.current.contains(e.target as Node)) {
        setShowUserMenu(false);
      }
    }
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, []);

  const isSeeker = !!user && !isAgent && !isAdmin;

  return (
    <header className="sticky top-0 z-50 bg-card/80 backdrop-blur-md border-b border-border/50">
      <div className="max-w-7xl mx-auto px-4 h-14 flex items-center justify-between gap-3">
        {/* Logo — always show globe + ListHQ wordmark on every breakpoint */}
        <div className="flex items-center gap-3 shrink-0 min-w-0">
          <Link to="/" className="flex items-center gap-2 shrink-0" aria-label="ListHQ home">
            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-primary to-cyan-accent flex items-center justify-center shrink-0">
              <Globe size={18} className="text-primary-foreground" />
            </div>
            <span className="font-display text-base font-bold text-foreground tracking-tight">
              ListHQ
            </span>
          </Link>

          {/* Left-side primary nav (desktop only) */}
          <div className="hidden md:flex items-center gap-1 pl-3 ml-1 border-l border-border/60">
            <Link
              to="/search"
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold text-foreground hover:text-primary hover:bg-primary/5 transition-colors"
            >
              <Search size={13} className="text-primary" /> Search
            </Link>
            <Link
              to="/agents"
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold text-foreground hover:text-primary hover:bg-primary/5 transition-colors"
            >
              <Users size={13} className="text-primary" /> Find an Agent
            </Link>
            <Link
              to="/pricing"
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold text-foreground hover:text-primary hover:bg-primary/5 transition-colors"
            >
              <Sparkles size={13} className="text-primary" /> Pricing
            </Link>
          </div>
        </div>

        {/* ─── Desktop right side actions (hidden below md) ─── */}
        <div className="hidden md:flex items-center gap-2 shrink-0">
          {/* Combined globe/settings — currency + language */}
          <SettingsMenu />

          {/* Primary CTA — varies by role */}
          {!user && (
            <button
              onClick={() => navigate('/auth?mode=agent')}
              className="inline-flex items-center gap-1.5 px-4 py-1.5 rounded-full text-xs font-semibold bg-primary text-primary-foreground hover:bg-primary/90 transition-colors shadow-sm"
            >
              Start free trial
            </button>
          )}
          {user && isAgent && (
            <button
              onClick={() => navigate('/dashboard')}
              className="inline-flex items-center gap-1.5 px-4 py-1.5 rounded-full text-xs font-semibold bg-primary text-primary-foreground hover:bg-primary/90 transition-colors shadow-sm"
            >
              <LayoutDashboard size={13} /> Dashboard
            </button>
          )}
          {isSeeker && (
            <button
              onClick={() => navigate('/halo/new')}
              className="inline-flex items-center gap-1.5 px-4 py-1.5 rounded-full text-xs font-semibold bg-primary text-primary-foreground hover:bg-primary/90 transition-colors shadow-sm"
            >
              <Sparkles size={13} /> Post a Halo
            </button>
          )}

          {/* Admin shortcut stays distinct */}
          {user && isAdmin && (
            <button
              onClick={() => navigate('/admin')}
              className="w-9 h-9 rounded-full bg-primary/10 flex items-center justify-center text-primary hover:bg-primary/20 transition-colors"
              aria-label="Admin"
              title="Admin"
            >
              <ShieldCheck size={17} />
            </button>
          )}

          {/* User avatar — opens dropdown when signed in, otherwise goes to auth */}
          {user ? (
            <div ref={userMenuRef} className="relative">
              <button
                onClick={() => setShowUserMenu(o => !o)}
                className="w-9 h-9 rounded-full bg-secondary flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-accent transition-colors"
                aria-label="Account menu"
              >
                <User size={18} />
              </button>
              {showUserMenu && (
                <div className="absolute right-0 top-full mt-1 w-56 bg-popover border border-border rounded-xl shadow-elevated overflow-hidden z-50 animate-in fade-in slide-in-from-top-1 duration-150">
                  <button onClick={() => { navigate('/profile'); setShowUserMenu(false); }} className="w-full flex items-center gap-2.5 px-4 py-2.5 text-sm text-foreground hover:bg-accent transition-colors">
                    <User size={14} className="text-muted-foreground" /> {t('nav.profile')}
                  </button>
                  {isSeeker && (
                    <button onClick={() => { navigate('/seeker/dashboard'); setShowUserMenu(false); }} className="w-full flex items-center gap-2.5 px-4 py-2.5 text-sm text-foreground hover:bg-accent transition-colors">
                      <Sparkles size={14} className="text-muted-foreground" /> My Halos
                    </button>
                  )}
                  {!isAgent && (
                    <>
                      <button onClick={() => { navigate('/notifications'); setShowUserMenu(false); }} className="w-full flex items-center gap-2.5 px-4 py-2.5 text-sm text-foreground hover:bg-accent transition-colors">
                        <Sparkles size={14} className="text-muted-foreground" /> Notifications
                      </button>
                      <button onClick={() => { navigate('/saved'); setShowUserMenu(false); }} className="w-full flex items-center gap-2.5 px-4 py-2.5 text-sm text-foreground hover:bg-accent transition-colors">
                        <Bookmark size={14} className="text-muted-foreground" /> Saved properties
                      </button>
                    </>
                  )}
                  {isAgent && (
                    <button onClick={() => { navigate('/dashboard'); setShowUserMenu(false); }} className="w-full flex items-center gap-2.5 px-4 py-2.5 text-sm text-foreground hover:bg-accent transition-colors">
                      <LayoutDashboard size={14} className="text-muted-foreground" /> Dashboard
                    </button>
                  )}
                </div>
              )}
            </div>
          ) : (
            <button
              onClick={() => navigate('/auth')}
              className="w-9 h-9 rounded-full bg-secondary flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-accent transition-colors"
              aria-label="Sign in"
              title="Sign in"
            >
              <User size={18} />
            </button>
          )}
        </div>


        {/* ─── Mobile hamburger (visible below md) ─── */}
        <div className="flex md:hidden items-center gap-1 shrink-0">
          {user && isAgent && <NotificationBell />}
          <Sheet open={mobileOpen} onOpenChange={setMobileOpen}>
            <SheetTrigger asChild>
              <button
                className="w-9 h-9 rounded-full bg-secondary flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-accent transition-colors"
                aria-label="Open menu"
              >
                <Menu size={20} />
              </button>
            </SheetTrigger>
            <SheetContent side="right" className="w-72 p-0">
              <nav className="flex flex-col gap-1 p-4 pt-10">
                {/* Language & Currency */}
                <div className="px-1 pb-3 mb-2 border-b border-border">
                  <p className="text-[11px] uppercase tracking-wider font-semibold text-muted-foreground px-2 mb-2">
                    Language & Currency
                  </p>
                  <div className="flex items-center gap-2 [&>div>button]:h-11 [&>div>button]:px-3 [&>div>button]:text-base [&>div>button]:bg-secondary [&>div>button]:flex-1">
                    <CurrencySwitcher />
                    <LanguageSwitcher />
                  </div>
                </div>

                <button onClick={() => navTo('/suburbs')} className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm text-foreground hover:bg-accent transition-colors">
                  <MapPin size={16} className="text-muted-foreground" /> Browse Suburbs
                </button>
                <button onClick={() => navTo('/agents')} className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm text-foreground hover:bg-accent transition-colors">
                  <Users size={16} className="text-primary" /> Find an Agent
                </button>
                <button onClick={() => navTo('/brokers')} className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm text-foreground hover:bg-accent transition-colors">
                  <Banknote size={16} className="text-primary" /> Find a Broker
                </button>
                <button onClick={() => navTo('/pricing')} className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm text-foreground hover:bg-accent transition-colors">
                  <Sparkles size={16} className="text-primary" /> Pricing
                </button>
                <button onClick={() => navTo('/exclusive')} className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm text-foreground hover:bg-accent transition-colors">
                  <Sparkles size={16} className="text-primary" /> Exclusive
                  <span className="ml-auto text-[9px] font-bold uppercase bg-red-500 text-white rounded-full px-1.5 py-0.5">NEW</span>
                </button>
                <button onClick={() => navTo('/home-services')} className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm text-foreground hover:bg-accent transition-colors">
                  <Wrench size={16} className="text-primary" /> Services
                </button>
                <button onClick={() => navTo('/conveyancing')} className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm text-foreground hover:bg-accent transition-colors">
                  <FileText size={16} className="text-primary" /> Conveyancing
                </button>
                <button onClick={() => navTo('/refer')} className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm text-foreground hover:bg-accent transition-colors">
                  <Handshake size={16} className="text-primary" /> Referral Program
                </button>

                {/* Agent links */}
                {user && isAgent && (
                  <>
                    <button onClick={() => navTo('/dashboard')} className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm text-foreground hover:bg-accent transition-colors">
                      <LayoutDashboard size={16} className="text-primary" /> Dashboard
                    </button>
                    <button onClick={() => { localStorage.removeItem('pocket-listing-draft'); navTo('/pocket-listing?type=sale&t=' + Date.now()); }} className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm text-foreground hover:bg-accent transition-colors">
                      <Plus size={16} className="text-primary" /> Sale Listing
                    </button>
                    <button onClick={() => { localStorage.removeItem('pocket-listing-draft'); navTo('/pocket-listing?type=rent&t=' + Date.now()); }} className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm text-foreground hover:bg-accent transition-colors">
                      <Plus size={16} className="text-primary" /> Rental Listing
                    </button>
                    <button onClick={() => navTo('/dashboard/listings')} className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm text-foreground hover:bg-accent transition-colors">
                      <List size={16} className="text-muted-foreground" /> {t('header.myListings')}
                    </button>
                    <div className="border-t border-border my-1" />
                  </>
                )}

                {/* Admin link */}
                {user && isAdmin && (
                  <button onClick={() => navTo('/admin')} className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm text-foreground hover:bg-accent transition-colors">
                    <ShieldCheck size={16} className="text-primary" /> Admin
                  </button>
                )}

                {/* Buyer links */}
                {user && !isAgent && !isAdmin && (
                  <>
                    <button onClick={() => navTo('/halo/new')} className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm text-foreground hover:bg-accent transition-colors">
                      <Sparkles size={16} className="text-primary" /> Create your Halo
                    </button>
                    <button onClick={() => navTo('/seeker/dashboard')} className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm text-foreground hover:bg-accent transition-colors">
                      <Sparkles size={16} className="text-muted-foreground" /> My Halos
                    </button>
                  </>
                )}

                {/* Buyer links */}
                {user && !isAgent && (
                  <>
                    <button onClick={() => navTo('/saved')} className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm text-foreground hover:bg-accent transition-colors">
                      <Home size={16} className="text-primary" /> {t('nav.search')}
                    </button>
                    <button onClick={() => navTo('/my-applications')} className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm text-foreground hover:bg-accent transition-colors">
                      <FileText size={16} className="text-muted-foreground" /> My Applications
                    </button>
                  </>
                )}

                {/* Profile / Sign in / Agent CTA */}
                {user ? (
                  <button onClick={() => navTo('/profile')} className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm text-foreground hover:bg-accent transition-colors">
                    <User size={16} className="text-muted-foreground" />
                    {t('nav.profile')}
                  </button>
                ) : (
                  <>
                    <button onClick={() => navTo('/auth')} className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm text-muted-foreground hover:text-foreground hover:bg-accent transition-colors">
                      <LogIn size={16} />
                      Sign in
                    </button>
                  </>
                )}
              </nav>
            </SheetContent>
          </Sheet>
        </div>
      </div>
      {showAgentModal && (
        <Suspense fallback={null}>
          <AgentRegistrationModal open={showAgentModal} onOpenChange={setShowAgentModal} />
        </Suspense>
      )}
    </header>
  );
}

/**
 * Combined currency + language picker shown as a single globe icon in the
 * desktop nav. Reuses the existing CurrencySwitcher and LanguageSwitcher
 * (each owns its own portal/dropdown state) inside a small popover.
 */
function SettingsMenu() {
  const [open, setOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const handler = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        const target = e.target as HTMLElement;
        if (target.closest('[data-settings-portal-ignore]')) return;
        setOpen(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [open]);

  return (
    <div ref={containerRef} className="relative">
      <button
        onClick={() => setOpen(o => !o)}
        className="w-9 h-9 rounded-full bg-secondary flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-accent transition-colors"
        aria-label="Language and currency"
        title="Language & currency"
      >
        <Globe size={17} />
      </button>
      {open && (
        <div
          data-settings-portal-ignore
          className="absolute right-0 top-full mt-1 w-56 bg-popover border border-border rounded-xl shadow-elevated overflow-hidden z-50 animate-in fade-in slide-in-from-top-1 duration-150 p-2 space-y-1"
        >
          <div className="px-2 pt-1 text-[10px] uppercase tracking-wider font-semibold text-muted-foreground">
            Currency
          </div>
          <div className="px-1">
            <CurrencySwitcher />
          </div>
          <div className="border-t border-border my-1" />
          <div className="px-2 text-[10px] uppercase tracking-wider font-semibold text-muted-foreground">
            Language
          </div>
          <div className="px-1 pb-1">
            <LanguageSwitcher />
          </div>
        </div>
      )}
    </div>
  );
}