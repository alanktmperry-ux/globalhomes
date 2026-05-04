import { useState } from 'react';
import { Search, Heart, MessageCircle, User, LogIn, Building2, Globe, Users, ShieldCheck } from 'lucide-react';
import { useI18n, languageNames, type Language } from '@/shared/lib/i18n';
import { useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '@/features/auth/AuthProvider';
import { useConversations } from '@/features/messaging/hooks/useConversations';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

export function BottomNav() {
  const { t, language, setLanguage } = useI18n();
  const location = useLocation();
  const navigate = useNavigate();
  const { user, isAdmin, isAgent, loading } = useAuth();
  const [showLangPicker, setShowLangPicker] = useState(false);
  const { totalUnread } = useConversations(user?.id);

  const handleSignOut = async () => {
    await supabase.auth.signOut();
    toast.success('Signed out successfully');
    navigate('/');
  };

  const isActive = (path: string) =>
    path === '/' ? location.pathname === '/' : location.pathname.startsWith(path);

  const itemClass = (path: string) =>
    `flex flex-col items-center gap-1 py-1.5 px-3 rounded-2xl transition-all duration-150 ${
      isActive(path) ? 'bg-blue-50 text-blue-600' : 'text-slate-400 hover:text-slate-600'
    }`;

  const iconStroke = (path: string) => (isActive(path) ? 2 : 1.8);

  const labelClass = (path: string) =>
    `text-[10px] font-medium leading-none ${isActive(path) ? 'text-blue-600' : 'text-slate-500'}`;

  return (
    <nav className="fixed bottom-0 inset-x-0 z-30 bg-white/95 backdrop-blur-md border-t border-slate-100 safe-area-bottom md:hidden">
      <div className="flex items-center justify-around h-[68px] max-w-lg mx-auto px-2">

        {/* Search — always visible */}
        <button onClick={() => navigate('/')} className={itemClass('/')}>
          <Search size={22} strokeWidth={iconStroke('/')} />
          <span className={labelClass('/')}>Search</span>
        </button>

        {/* Agents — always visible */}
        <button onClick={() => navigate('/agents')} className={itemClass('/agents')}>
          <Users size={22} strokeWidth={iconStroke('/agents')} />
          <span className={labelClass('/agents')}>Agents</span>
        </button>

        {/* Saved — auth only */}
        {user && !isAgent && (
          <button onClick={() => navigate('/saved')} className={itemClass('/saved')}>
            <Heart size={22} strokeWidth={iconStroke('/saved')} />
            <span className={labelClass('/saved')}>Saved</span>
          </button>
        )}

        {/* Dashboard — agents only */}
        {user && (isAgent || loading) && (
          <button onClick={() => navigate('/dashboard')} className={itemClass('/dashboard')}>
            <Building2 size={22} strokeWidth={iconStroke('/dashboard')} />
            <span className={labelClass('/dashboard')}>Dashboard</span>
          </button>
        )}

        {/* Messages — auth only */}
        {user && (
          <button onClick={() => navigate('/messages')} className={itemClass('/messages')}>
            <div className="relative">
              <MessageCircle size={22} strokeWidth={iconStroke('/messages')} />
              {totalUnread > 0 && (
                <span className="absolute -top-1.5 -right-2.5 min-w-[15px] h-[15px] px-0.5 rounded-full bg-red-500 border-[1.5px] border-white text-[9px] font-bold text-white flex items-center justify-center">
                  {totalUnread > 99 ? '99+' : totalUnread}
                </span>
              )}
            </div>
            <span className={labelClass('/messages')}>Messages</span>
          </button>
        )}

        {/* Language */}
        <button
          onClick={() => setShowLangPicker(prev => !prev)}
          className="flex flex-col items-center gap-1 py-1.5 px-3 rounded-2xl transition-all text-slate-400 hover:text-slate-600"
        >
          <Globe size={22} strokeWidth={1.8} />
          <span className="text-[10px] font-medium leading-none text-slate-500">{language.toUpperCase()}</span>
        </button>

        {/* Admin shortcut */}
        {user && isAdmin && (
          <button onClick={() => navigate('/admin')} className={itemClass('/admin')}>
            <ShieldCheck size={22} strokeWidth={iconStroke('/admin')} />
            <span className={labelClass('/admin')}>Admin</span>
          </button>
        )}

        {/* Sign in pill / Profile */}
        {!user && !loading ? (
          <button
            onClick={() => navigate('/agent-auth')}
            className="flex items-center gap-1.5 bg-blue-600 hover:bg-blue-700 text-white px-4 py-2.5 rounded-full transition-colors"
          >
            <LogIn size={14} strokeWidth={2} />
            <span className="text-[12px] font-semibold">Try free</span>
          </button>
        ) : user ? (
          <button onClick={() => navigate('/profile')} className={itemClass('/profile')}>
            <User size={22} strokeWidth={iconStroke('/profile')} />
            <span className={labelClass('/profile')}>Profile</span>
          </button>
        ) : null}

      </div>

      {/* Language picker sheet */}
      {showLangPicker && (
        <div className="fixed inset-0 z-50 flex items-end" onClick={() => setShowLangPicker(false)}>
          <div className="w-full bg-white border-t border-slate-100 rounded-t-2xl p-4 pb-8 shadow-2xl" onClick={e => e.stopPropagation()}>
            <div className="w-8 h-1 bg-slate-200 rounded-full mx-auto mb-4" />
            <h3 className="text-sm font-semibold text-slate-900 mb-3 text-center">Select Language</h3>
            <div className="grid grid-cols-3 gap-2">
              {(Object.entries(languageNames) as [Language, string][]).map(([code, name]) => (
                <button
                  key={code}
                  onClick={() => { setLanguage(code); setShowLangPicker(false); }}
                  className={`text-xs py-2.5 px-2 rounded-xl border text-center transition-colors ${
                    language === code
                      ? 'bg-blue-600 text-white border-blue-600 font-semibold'
                      : 'border-slate-200 text-slate-600 hover:border-blue-300'
                  }`}
                >
                  {name}
                </button>
              ))}
            </div>
          </div>
        </div>
      )}
    </nav>
  );
}
