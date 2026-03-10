import { createContext, useContext, useEffect, useState, useRef, useCallback, ReactNode } from 'react';
import { User, Session } from '@supabase/supabase-js';
import { supabase } from '@/integrations/supabase/client';

interface AuthContextType {
  user: User | null;
  session: Session | null;
  loading: boolean;
  isAgent: boolean;
  isAdmin: boolean;
  userRole: 'user' | 'agent' | 'admin' | null;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType>({
  user: null,
  session: null,
  loading: true,
  isAgent: false,
  isAdmin: false,
  userRole: null,
  signOut: async () => {},
});

export const useAuth = () => useContext(AuthContext);

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);
  const [isAgent, setIsAgent] = useState(false);
  const [isAdmin, setIsAdmin] = useState(false);
  const [userRole, setUserRole] = useState<'user' | 'agent' | 'admin' | null>(null);
  const lastFetchedUserId = useRef<string | null>(null);

  const applyRoles = useCallback((roles: string[]) => {
    setIsAdmin(roles.includes('admin'));
    setIsAgent(roles.includes('agent') || roles.includes('admin'));
    setUserRole(
      roles.includes('admin') ? 'admin' : roles.includes('agent') ? 'agent' : 'user'
    );
  }, []);

  const fetchRoles = useCallback(async (userId: string, force = false) => {
    // Skip if we already fetched for this user
    if (!force && lastFetchedUserId.current === userId) return;
    lastFetchedUserId.current = userId;

    const { data } = await supabase
      .from('user_roles')
      .select('role')
      .eq('user_id', userId);

    const roles = data?.map((r) => r.role) || [];
    applyRoles(roles);
  }, [applyRoles]);

  const clearRoles = useCallback(() => {
    lastFetchedUserId.current = null;
    setIsAgent(false);
    setIsAdmin(false);
    setUserRole(null);
  }, []);

  useEffect(() => {
    let initialSessionHandled = false;

    // Safety timeout: if auth never resolves, stop loading after 5 seconds
    const timeout = setTimeout(() => {
      if (loading) {
        console.warn('[Auth] Timed out waiting for auth state, forcing loading=false');
        setLoading(false);
      }
    }, 5000);

    // Set up auth listener FIRST
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (_event, session) => {
        console.log('[Auth] onAuthStateChange event:', _event, 'user:', session?.user?.id ?? 'none');
        
        // On new sign-in, set loading=true so ProtectedRoute waits for roles
        if (_event === 'SIGNED_IN' && session?.user) {
          setLoading(true);
        }
        
        setSession(session);
        setUser(session?.user ?? null);

        if (session?.user) {
          try {
            await fetchRoles(session.user.id);
          } catch (err) {
            console.error('[Auth] fetchRoles error in listener:', err);
          }
        } else {
          clearRoles();
        }

        setLoading(false);
        initialSessionHandled = true;
      }
    );

    // Then get initial session
    supabase.auth.getSession().then(async ({ data: { session } }) => {
      console.log('[Auth] getSession result, user:', session?.user?.id ?? 'none');
      // Only handle if onAuthStateChange hasn't fired yet
      if (!initialSessionHandled) {
        setSession(session);
        setUser(session?.user ?? null);
        if (session?.user) {
          try {
            await fetchRoles(session.user.id);
          } catch (err) {
            console.error('[Auth] fetchRoles error in getSession:', err);
          }
        }
        setLoading(false);
      }
    }).catch((err) => {
      console.error('[Auth] getSession failed:', err);
      setLoading(false);
    });

    return () => {
      clearTimeout(timeout);
      subscription.unsubscribe();
    };
  }, [fetchRoles, clearRoles]);

  const signOut = async () => {
    // Always clear local state first for instant UI feedback
    clearRoles();
    setUser(null);
    setSession(null);
    
    try {
      const { error } = await supabase.auth.signOut();
      if (error) {
        console.error('[Auth] signOut error:', error);
        // If signOut fails, force-clear localStorage to prevent zombie sessions
        try {
          const storageKey = `sb-${import.meta.env.VITE_SUPABASE_PROJECT_ID || 'ngrkbohpmkzjonaofgbb'}-auth-token`;
          localStorage.removeItem(storageKey);
        } catch (storageErr) {
          console.error('[Auth] localStorage cleanup failed:', storageErr);
        }
      }
    } catch (err) {
      console.error('[Auth] signOut failed:', err);
      // Force-clear localStorage to prevent zombie sessions
      try {
        const storageKey = `sb-${import.meta.env.VITE_SUPABASE_PROJECT_ID || 'ngrkbohpmkzjonaofgbb'}-auth-token`;
        localStorage.removeItem(storageKey);
      } catch (storageErr) {
        console.error('[Auth] localStorage cleanup failed:', storageErr);
      }
    }
  };

  return (
    <AuthContext.Provider value={{ user, session, loading, isAgent, isAdmin, userRole, signOut }}>
      {children}
    </AuthContext.Provider>
  );
};
