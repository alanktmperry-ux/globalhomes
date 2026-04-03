import { useState, useRef, useEffect } from 'react';
import { Globe, ChevronDown, User, LogIn, Home, Building2, Plus, List, LayoutDashboard, ShieldCheck } from 'lucide-react';
// ChevronDown retained for agent dropdown
import { useNavigate, Link } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { useCurrency } from '@/shared/lib/CurrencyContext';
import { useAuth } from '@/features/auth/AuthProvider';
import { NotificationBell } from '@/features/agents/components/dashboard/NotificationBell';
import { LanguageSwitcher } from '@/components/LanguageSwitcher';
import { useI18n } from '@/shared/lib/i18n';

export function SiteHeader() {
  const { listingMode, setListingMode } = useCurrency();
  const { user, userRole, isAgent, isAdmin } = useAuth();
  const { t } = useI18n();
  const navigate = useNavigate();
  const [showAgentMenu, setShowAgentMenu] = useState(false);
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
        
        {/* Sale / Rent toggle */}
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
            {t('listing.forsale')}
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
            {t('listing.forrent')}
          </button>
        </div>

        {/* Right side actions */}
        <div className="flex items-center gap-2 shrink-0">
          <LanguageSwitcher />

          {/* Agent dashboard shortcut – always visible for agents */}
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

          {/* Admin shortcut – only for admins */}
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

          {/* Mode-aware role badge with agent quick actions */}
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

              {/* Agent quick-action dropdown */}
              <AnimatePresence>
                {isAgent && showAgentMenu && (
                  <motion.div
                    initial={{ opacity: 0, y: -4 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -4 }}
                    className="absolute right-0 top-full mt-1 w-48 bg-popover border border-border rounded-xl shadow-elevated overflow-hidden z-50"
                  >
                    <button
                      onClick={() => { navigate('/pocket-listing'); setShowAgentMenu(false); }}
                      className="w-full flex items-center gap-2.5 px-4 py-2.5 text-sm text-foreground hover:bg-accent transition-colors"
                    >
                      <Plus size={14} className="text-primary" />
                      {t('header.listProperty')}
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

          {/* User button */}
          <button
            onClick={() => navigate(user ? '/profile' : '/auth')}
            className="w-9 h-9 rounded-full bg-secondary flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-accent transition-colors"
            aria-label={user ? t('nav.profile') : t('common.signin')}
          >
            {user ? <User size={18} /> : <LogIn size={18} />}
          </button>
        </div>
      </div>
    </header>
  );
}
