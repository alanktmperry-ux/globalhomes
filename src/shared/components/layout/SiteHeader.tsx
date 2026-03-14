import { useState, useRef, useEffect } from 'react';
import { Globe, ChevronDown, User, LogIn, Home, Building2, Plus, List, LayoutDashboard } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { useCurrency, CURRENCIES, CurrencyCode } from '@/lib/CurrencyContext';
import { useAuth } from '@/lib/AuthProvider';

export function SiteHeader() {
  const { currency, setCurrencyCode, listingMode, setListingMode } = useCurrency();
  const { user, userRole, isAgent } = useAuth();
  const navigate = useNavigate();
  const [showCurrencyDropdown, setShowCurrencyDropdown] = useState(false);
  const [showAgentMenu, setShowAgentMenu] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const agentMenuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setShowCurrencyDropdown(false);
      }
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
        <button
          onClick={() => navigate('/')}
          className="flex items-center gap-2 shrink-0"
        >
          <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-primary to-cyan-accent flex items-center justify-center">
            <Globe size={18} className="text-primary-foreground" />
          </div>
          <span className="font-display text-base font-bold text-foreground tracking-tight hidden sm:inline">
            Global Homes
          </span>
        </button>

        {/* Sale / Rent toggle */}
        <div className="flex items-center bg-secondary rounded-full p-0.5 shrink-0">
          <button
            onClick={() => setListingMode('sale')}
            className={`px-4 py-1.5 rounded-full text-xs font-semibold transition-all duration-200 ${
              listingMode === 'sale'
                ? 'bg-primary text-primary-foreground shadow-sm'
                : 'text-muted-foreground hover:text-foreground'
            }`}
          >
            For Sale
          </button>
          <button
            onClick={() => setListingMode('rent')}
            className={`px-4 py-1.5 rounded-full text-xs font-semibold transition-all duration-200 ${
              listingMode === 'rent'
                ? 'bg-primary text-primary-foreground shadow-sm'
                : 'text-muted-foreground hover:text-foreground'
            }`}
          >
            For Rent
          </button>
        </div>

        {/* Right side actions */}
        <div className="flex items-center gap-2 shrink-0">
          {/* Currency selector */}
          <div ref={dropdownRef} className="relative">
            <button
              onClick={() => setShowCurrencyDropdown(!showCurrencyDropdown)}
              className="flex items-center gap-1 px-3 py-1.5 rounded-lg bg-secondary text-sm font-medium text-foreground hover:bg-accent transition-colors"
            >
              <span>{currency.label}</span>
              <ChevronDown size={14} className="text-muted-foreground" />
            </button>

            <AnimatePresence>
              {showCurrencyDropdown && (
                <motion.div
                  initial={{ opacity: 0, y: -4 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -4 }}
                  className="absolute right-0 top-full mt-1 w-36 bg-popover border border-border rounded-xl shadow-elevated overflow-hidden z-50"
                >
                  {CURRENCIES.map((c) => (
                    <button
                      key={c.code}
                      onClick={() => {
                        setCurrencyCode(c.code as CurrencyCode);
                        setShowCurrencyDropdown(false);
                      }}
                      className={`w-full text-left px-4 py-2.5 text-sm transition-colors ${
                        c.code === currency.code
                          ? 'bg-primary/10 text-primary font-medium'
                          : 'text-foreground hover:bg-accent'
                      }`}
                    >
                      {c.label}
                    </button>
                  ))}
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          {/* Agent dashboard shortcut – always visible for agents */}
          {user && isAgent && (
            <button
              onClick={() => navigate('/dashboard')}
              className="w-9 h-9 rounded-full bg-primary/10 flex items-center justify-center text-primary hover:bg-primary/20 transition-colors"
              aria-label="Dashboard"
              title="Dashboard"
            >
              <LayoutDashboard size={17} />
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
                  {isAgent ? 'Agent' : 'Buyer'}
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
                      List a property
                    </button>
                    <button
                      onClick={() => { navigate('/dashboard/listings'); setShowAgentMenu(false); }}
                      className="w-full flex items-center gap-2.5 px-4 py-2.5 text-sm text-foreground hover:bg-accent transition-colors"
                    >
                      <List size={14} className="text-muted-foreground" />
                      My listings
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
            aria-label={user ? 'Profile' : 'Sign in'}
          >
            {user ? <User size={18} /> : <LogIn size={18} />}
          </button>
        </div>
      </div>
    </header>
  );
}
