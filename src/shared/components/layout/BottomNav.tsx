import { useState } from 'react';
import { Search, Heart, MessageCircle, User, LogIn, LogOut, ShieldCheck, Building2, Globe, Users } from 'lucide-react';
import { useI18n, languageNames, type Language } from '@/shared/lib/i18n';
import { useLocation, useNavigate } from 'react-router-dom';
import { AnimatePresence, motion } from 'framer-motion';
import { useAuth } from '@/features/auth/AuthProvider';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

const navItems = [
  { key: 'nav.search', icon: Search, path: '/' },
  { key: 'nav.saved', icon: Heart, path: '/saved', auth: true },
  { key: 'nav.agents', icon: Users, path: '/agents' },
  { key: 'nav.messages', icon: MessageCircle, path: '/messages', auth: true },
  { key: 'nav.profile', icon: User, path: '/profile', auth: true },
];

export function BottomNav() {
  const { t, language, setLanguage } = useI18n();
  const location = useLocation();
  const navigate = useNavigate();
  const { user, isAdmin, isAgent, loading } = useAuth();
  const [showLangPicker, setShowLangPicker] = useState(false);

  const handleSignOut = async () => {
    await supabase.auth.signOut();
    toast.success('Signed out successfully');
    navigate('/');
  };

  const showAgentDashboard = Boolean(user) && (isAgent || loading);

  return (
    <nav className="fixed bottom-0 inset-x-0 z-30 bg-card/95 backdrop-blur-md border-t border-border safe-area-bottom">
      <div className="flex items-center justify-around h-16 max-w-lg mx-auto px-2">
        {navItems.map(item => {
          if ((item as any).auth && !user && !loading) return null;
          const isActive = location.pathname === item.path;
          return (
            <button
              key={item.key}
              onClick={() => navigate(item.path)}
              className={`relative flex flex-col items-center gap-0.5 py-1 px-3 rounded-xl transition-colors ${
                isActive ? 'text-primary' : 'text-muted-foreground'
              }`}
            >
              {isActive && (
                <div className="absolute top-1 w-1 h-1 rounded-full bg-primary" />
              )}
              <item.icon size={22} strokeWidth={isActive ? 2.5 : 1.8} />
              <span className={`text-[10px] ${isActive ? 'font-medium text-primary' : 'font-medium text-muted-foreground'}`}>{t(item.key) || (item.key === 'nav.agents' ? 'Agents' : '')}</span>
            </button>
          );
        })}
        {showAgentDashboard && (
          <button
            onClick={() => navigate('/dashboard')}
            className={`flex flex-col items-center gap-0.5 py-1 px-3 rounded-xl transition-colors ${
              location.pathname.startsWith('/dashboard') ? 'text-primary' : 'text-muted-foreground'
            }`}
          >
            <Building2 size={22} strokeWidth={location.pathname.startsWith('/dashboard') ? 2.5 : 1.8} />
            <span className="text-[10px] font-medium">Dashboard</span>
          </button>
        )}
        {user && isAdmin && (
          <button
            onClick={() => navigate('/admin')}
            className={`flex flex-col items-center gap-0.5 py-1 px-3 rounded-xl transition-colors ${
              location.pathname.startsWith('/admin') ? 'text-primary' : 'text-muted-foreground'
            }`}
          >
            <ShieldCheck size={22} strokeWidth={location.pathname.startsWith('/admin') ? 2.5 : 1.8} />
            <span className="text-[10px] font-medium">Admin</span>
          </button>
        )}
        {/* Language picker */}
        <button
          onClick={() => setShowLangPicker(prev => !prev)}
          className="flex flex-col items-center gap-0.5 py-1 px-3 rounded-xl transition-colors text-muted-foreground hover:text-foreground"
        >
          <Globe size={22} strokeWidth={1.8} />
          <span className="text-[10px] font-medium">{language.toUpperCase()}</span>
        </button>

        {showLangPicker && (
          <div className="fixed inset-0 z-50 flex items-end" onClick={() => setShowLangPicker(false)}>
            <div className="w-full bg-card border-t border-border rounded-t-2xl p-4 pb-safe" onClick={e => e.stopPropagation()}>
              <h3 className="font-bold text-sm mb-3 text-center">Select Language</h3>
              <div className="grid grid-cols-3 gap-2">
                {(Object.entries(languageNames) as [Language, string][]).map(([code, name]) => (
                  <button
                    key={code}
                    onClick={() => { setLanguage(code); setShowLangPicker(false); }}
                    className={`text-xs py-2 px-2 rounded-xl border text-center transition-colors ${
                      language === code
                        ? 'bg-primary text-primary-foreground border-primary font-bold'
                        : 'border-border text-foreground hover:border-primary/40'
                    }`}
                  >
                    {name}
                  </button>
                ))}
              </div>
            </div>
          </div>
        )}

        {user ? (
          <button
            onClick={handleSignOut}
            className="flex flex-col items-center gap-0.5 py-1 px-3 rounded-xl transition-colors text-muted-foreground"
          >
            <LogOut size={22} strokeWidth={1.8} />
            <span className="text-[10px] font-medium">Sign Out</span>
          </button>
        ) : (
          <button
            onClick={() => navigate('/login')}
            className="flex flex-col items-center gap-0.5 py-1 px-3 rounded-xl transition-colors text-muted-foreground"
          >
            <LogIn size={22} strokeWidth={1.8} />
            <span className="text-[10px] font-medium">Sign In</span>
          </button>
        )}
      </div>
    </nav>
  );
}
