import { useState, useRef, useEffect } from 'react';
import { Globe, ChevronDown, User, LogIn, Home, Building2, Plus, List, LayoutDashboard, ShieldCheck, Menu } from 'lucide-react';
import { useNavigate, Link } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { useCurrency } from '@/shared/lib/CurrencyContext';
import { useAuth } from '@/features/auth/AuthProvider';
import { NotificationBell } from '@/features/agents/components/dashboard/NotificationBell';
import { LanguageSwitcher } from '@/shared/components/layout/LanguageSwitcher';
import { DarkModeToggle } from '@/shared/components/layout/DarkModeToggle';
import { useI18n } from '@/shared/lib/i18n';
import { Sheet, SheetContent, SheetTrigger } from '@/components/ui/sheet';

export function SiteHeader() {
  const { listingMode, setListingMode } = useCurrency();
  const { user, userRole, isAgent, isAdmin } = useAuth();
  const { t } = useI18n();
  const navigate = useNavigate();
  const [showAgentMenu, setShowAgentMenu] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const agentMenuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (agentMenuRef.current && !agentMenuRef.current.contains(e.target as Node)) {
        setShowAgentMenu(false);
      }
    }
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, []);

  const navTo = (path: string) => {
    setMobileOpen(false);
    navigate(path);
  };

  return (
    <header className="sticky top-0 z-40 bg-card/80 backdrop-blur-md border-b border-border/50">
      <div className="max-w-7xl mx-auto px-4 h-14 flex items-center justify-between gap-3">
        {/* Logo */}
        <Link to="/" className="flex items-center gap-2 shrink-0">
          <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-primary to-cyan-accent flex items-center justify-center">
            <Globe size={18} className="text-primary-foreground" />
          </div>
          <span className="font-display text-base font-bold text-foreground tracking-tight hidden sm:inline">
            ListHQ
          </span>
        </Link>
        
        {/* Sale / Rent toggle — visible on all sizes */}
        <div className="flex items-center bg-secondary rounded-full p-0.5 shrink-0">
          <button
            onClick={() => {
              setListingMode('sale');
              window.dispatchEvent(new CustomEvent('listing-mode-changed'));
            }}
            className={`px-4 py-1.5 rounded-full text-xs font-semibold transition-all duration-200 ${
              listingMode === 'sale'
                ? 'bg-primary text-primary-foreground shadow-sm'
                : 'text-muted-foreground hover:text-foreground'
            }`}
          >
            {t('nav.forSale')}
          </button>
          <button
            onClick={() => {
              setListingMode('rent');
              window.dispatchEvent(new CustomEvent('listing-mode-changed'));
            }}
            className={`px-4 py-1.5 rounded-full text-xs font-semibold transition-all duration-200 ${
              listingMode === 'rent'
                ? 'bg-primary text-primary-foreground shadow-sm'
                : 'text-muted-foreground hover:text-foreground'
            }`}
          >
            {t('nav.forRent')}
          </button>
        </div>

        {/* ─── Desktop right side actions (hidden below md) ─── */}
        <div className="hidden md:flex items-center gap-2 shrink-0">
          <DarkModeToggle />
          <LanguageSwitcher />

          {user && isAgent && (
            <>
              <NotificationBell />
              <button
                onClick={() => navigate('/dashboard')}
                className="w-9 h-9 rounded-full bg-primary/10 flex items-center justify-center text-primary hover:bg-primary/20 transition-colors"
                aria-label="Dashboard"
                title="Dashboard"
              >
                <LayoutDashboard size={17} />
              </button>
            </>
          )}

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

          {user && userRole && (
            <div ref={agentMenuRef} className="relative">
              <button
                onClick={() => {
                  if (isAgent) {
                    setShowAgentMenu(o => !o);
                  } else {
                    navigate('/saved');
                  }
                }}
                className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-primary/10 text-primary hover:bg-primary/20 transition-colors cursor-pointer"
              >
                {isAgent ? <Building2 size={13} /> : <Home size={13} />}
                <span className="text-[11px] font-semibold uppercase tracking-wide">
                  {isAgent ? t('agent.portal') : t('nav.search')}
                </span>
                {isAgent && <ChevronDown size={12} />}
              </button>

              <AnimatePresence>
                {isAgent && showAgentMenu && (
                  <motion.div
                    initial={{ opacity: 0, y: -4 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -4 }}
                    className="absolute right-0 top-full mt-1 w-48 bg-popover border border-border rounded-xl shadow-elevated overflow-hidden z-50"
                  >
                    <button
                      onClick={() => { localStorage.removeItem('pocket-listing-draft'); navigate('/pocket-listing?type=sale&t=' + Date.now()); setShowAgentMenu(false); }}
                      className="w-full flex items-center gap-2.5 px-4 py-2.5 text-sm text-foreground hover:bg-accent transition-colors"
                    >
                      <Plus size={14} className="text-primary" />
                      Sale Listing
                    </button>
                    <button
                      onClick={() => { localStorage.removeItem('pocket-listing-draft'); navigate('/pocket-listing?type=rent&t=' + Date.now()); setShowAgentMenu(false); }}
                      className="w-full flex items-center gap-2.5 px-4 py-2.5 text-sm text-foreground hover:bg-accent transition-colors"
                    >
                      <Plus size={14} className="text-primary" />
                      Rental Listing
                    </button>
                    <button
                      onClick={() => { navigate('/dashboard/listings'); setShowAgentMenu(false); }}
                      className="w-full flex items-center gap-2.5 px-4 py-2.5 text-sm text-foreground hover:bg-accent transition-colors"
                    >
                      <List size={14} className="text-muted-foreground" />
                      {t('header.myListings')}
                    </button>
                    <div className="border-t border-border" />
                    <button
                      onClick={() => { navigate('/dashboard'); setShowAgentMenu(false); }}
                      className="w-full flex items-center gap-2.5 px-4 py-2.5 text-sm text-foreground hover:bg-accent transition-colors"
                    >
                      <LayoutDashboard size={14} className="text-muted-foreground" />
                      Dashboard
                    </button>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          )}

          {user ? (
            <button
              onClick={() => navigate('/profile')}
              className="w-9 h-9 rounded-full bg-secondary flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-accent transition-colors"
              aria-label={t('nav.profile')}
            >
              <User size={18} />
            </button>
          ) : (
            <button
              onClick={() => navigate('/auth')}
              className="flex items-center gap-1.5 rounded-full border border-border px-3 py-1.5 text-sm text-muted-foreground hover:bg-accent hover:text-foreground transition-colors"
            >
              <User size={14} />
              {t('common.signin')}
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
                {/* Theme & language */}
                <div className="flex items-center gap-2 px-3 pb-3 border-b border-border mb-2">
                  <DarkModeToggle />
                  <LanguageSwitcher />
                </div>

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
                {user && !isAgent && (
                  <button onClick={() => navTo('/saved')} className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm text-foreground hover:bg-accent transition-colors">
                    <Home size={16} className="text-primary" /> {t('nav.search')}
                  </button>
                )}

                {/* Profile / Sign in */}
                <button onClick={() => navTo(user ? '/profile' : '/auth')} className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm text-foreground hover:bg-accent transition-colors">
                  {user ? <User size={16} className="text-muted-foreground" /> : <LogIn size={16} className="text-muted-foreground" />}
                  {user ? t('nav.profile') : t('common.signin')}
                </button>
              </nav>
            </SheetContent>
          </Sheet>
        </div>
      </div>
    </header>
  );
}