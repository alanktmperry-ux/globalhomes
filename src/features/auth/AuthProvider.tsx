import { createContext, useContext, useEffect, useState, useRef, useCallback, ReactNode } from 'react';
import { User, Session } from '@supabase/supabase-js';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

interface AuthContextType {
  user: User | null;
  session: Session | null;
  loading: boolean;
  isAgent: boolean;
  isAdmin: boolean;
  isPartner: boolean;
  userRole: 'user' | 'agent' | 'admin' | 'partner' | null;
  signOut: () => Promise<void>;
  impersonating: boolean;
  impersonatedUser: string | null;
  impersonatedUserId: string | null;
  startImpersonation: (userId: string, userEmail: string) => Promise<void>;
  stopImpersonation: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType>({
  user: null,
  session: null,
  loading: true,
  isAgent: false,
  isAdmin: false,
  isPartner: false,
  userRole: null,
  signOut: async () => {},
  impersonating: false,
  impersonatedUser: null,
  impersonatedUserId: null,
  startImpersonation: async () => {},
  stopImpersonation: async () => {},
});

export const useAuth = () => useContext(AuthContext);

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);
  const [isAgent, setIsAgent] = useState(false);
  const [isAdmin, setIsAdmin] = useState(false);
  const [isPartner, setIsPartner] = useState(false);
  const [userRole, setUserRole] = useState<'user' | 'agent' | 'admin' | 'partner' | null>(null);
  const [rolesFetched, setRolesFetched] = useState(false);
  const lastFetchedUserId = useRef<string | null>(null);
  const [impersonating, setImpersonating] = useState(false);
  const [impersonatedUser, setImpersonatedUser] = useState<string | null>(null);
  const [impersonatedUserId, setImpersonatedUserId] = useState<string | null>(null);

  useEffect(() => {
    const savedEmail = sessionStorage.getItem('admin_email');
    const savedId = sessionStorage.getItem('admin_impersonated_id');
    if (savedEmail) {
      setImpersonating(true);
      setImpersonatedUser(savedEmail);
    }
    if (savedId) {
      setImpersonatedUserId(savedId);
    }
  }, []);

  const startImpersonation = async (userId: string, userEmail: string) => {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) return;
    // Tokens stored in-memory only — never persisted to sessionStorage
    sessionStorage.setItem('admin_email', userEmail);
    sessionStorage.setItem('admin_impersonated_id', userId);
    setImpersonating(true);
    setImpersonatedUser(userEmail);
    setImpersonatedUserId(userId);
  };

  const stopImpersonation = async () => {
    await supabase.auth.signOut();
    window.location.href = '/admin/login';
    setImpersonating(false);
    setImpersonatedUser(null);
    setImpersonatedUserId(null);
  };

  const applyRoles = useCallback((roles: string[]) => {
    console.log('[Auth] applyRoles:', roles);
    setIsAdmin(roles.includes('admin'));
    setIsAgent(roles.includes('agent') || roles.includes('admin'));
    setIsPartner(roles.includes('partner'));
    setUserRole(
      roles.includes('admin') ? 'admin' : roles.includes('agent') ? 'agent' : roles.includes('partner') ? 'partner' : 'user'
    );
  }, []);

  const clearRoles = useCallback(() => {
    lastFetchedUserId.current = null;
    setIsAgent(false);
    setIsAdmin(false);
    setIsPartner(false);
    setUserRole(null);
    setRolesFetched(false);
  }, []);

  // Fetch roles
  useEffect(() => {
    if (!user) {
      clearRoles();
      return;
    }
    // Same user with roles already fetched — skip to avoid role flicker on navigation
    if (lastFetchedUserId.current === user.id && rolesFetched) return;

    let cancelled = false;
    const doFetch = async () => {
      lastFetchedUserId.current = user.id;
      console.log('[Auth] fetchRoles for:', user.id);
      try {
        const { data } = await supabase.from('user_roles').select('role').eq('user_id', user.id);
        if (cancelled) return;
        
        const roles = data?.map((r) => r.role) || [];
        applyRoles(roles);
      } catch (err) {
        console.error('[Auth] fetchRoles error:', err);
      } finally {
        if (!cancelled) {
          setRolesFetched(true);
          setLoading(false);
        }
      }
    };
    doFetch();
    return () => { cancelled = true; };
  }, [user, applyRoles, clearRoles, rolesFetched]);

  // Auth listener
  useEffect(() => {
    const timeout = setTimeout(() => {
      setLoading((prev) => {
        if (prev) console.warn('[Auth] Timed out, forcing loading=false');
        return false;
      });
    }, 8000);

    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (_event, session) => {
        console.log('[Auth] onAuthStateChange event:', _event, 'user:', session?.user?.id ?? 'none');

        // Explicit sign-out — clear everything
        if (_event === 'SIGNED_OUT') {
          setSession(null);
          setUser(null);
          clearRoles();
          setLoading(false);
          return;
        }

        // Silent token refresh or initial session load — update session
        // without resetting roles or triggering loading spinner
        if (_event === 'TOKEN_REFRESHED' || _event === 'INITIAL_SESSION') {
          setSession(session);
          setUser(session?.user ?? null);
          if (!session?.user) setLoading(false);
          return;
        }

        // Genuine new sign-in — re-fetch roles only if different user
        if (_event === 'SIGNED_IN' && session?.user) {
          const isNewUser = lastFetchedUserId.current !== session.user.id;
          if (isNewUser) {
            lastFetchedUserId.current = null;
            setRolesFetched(false);
            setLoading(true);
          }
          // Clean up email confirmation hash from URL
          const hash = window.location.hash;
          const params = new URLSearchParams(hash.replace('#', '?'));
          const type = params.get('type');
          if (type === 'signup' || type === 'email') {
            window.history.replaceState({}, '', window.location.pathname);
          }
        }

        setSession(session);
        setUser(session?.user ?? null);
        if (!session?.user) setLoading(false);
      }
    );

    supabase.auth.getSession().then(({ data: { session } }) => {
      console.log('[Auth] getSession result, user:', session?.user?.id ?? 'none');
      setSession(session);
      setUser(session?.user ?? null);
      if (!session?.user) setLoading(false);
    }).catch((err) => {
      console.error('[Auth] getSession failed:', err);
      setLoading(false);
    });

    return () => {
      clearTimeout(timeout);
      subscription.unsubscribe();
    };
  }, []);

  const signOut = async () => {
    clearRoles();
    setUser(null);
    setSession(null);
    try {
      const { error } = await supabase.auth.signOut();
      if (error) {
        console.error('[Auth] signOut error:', error);
        try {
        const storageKey = `sb-${import.meta.env.VITE_SUPABASE_PROJECT_ID}-auth-token`;
          localStorage.removeItem(storageKey);
        } catch (e) { /* ignore */ }
      }
    } catch (err) {
      console.error('[Auth] signOut failed:', err);
      try {
        const storageKey = `sb-${import.meta.env.VITE_SUPABASE_PROJECT_ID}-auth-token`;
          localStorage.removeItem(storageKey);
      } catch (e) { /* ignore */ }
    }
  };

  return (
    <AuthContext.Provider value={{
      user, session, loading, isAgent, isAdmin, isPartner, userRole, signOut,
      impersonating, impersonatedUser, impersonatedUserId, startImpersonation, stopImpersonation,
    }}>
      {children}
    </AuthContext.Provider>
  );
};
