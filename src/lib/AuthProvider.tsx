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
  const [rolesFetched, setRolesFetched] = useState(false);
  const lastFetchedUserId = useRef<string | null>(null);

  const applyRoles = useCallback((roles: string[]) => {
    console.log('[Auth] applyRoles:', roles);
    setIsAdmin(roles.includes('admin'));
    setIsAgent(roles.includes('agent') || roles.includes('admin'));
    setUserRole(
      roles.includes('admin') ? 'admin' : roles.includes('agent') ? 'agent' : 'user'
    );
  }, []);

  const clearRoles = useCallback(() => {
    lastFetchedUserId.current = null;
    setIsAgent(false);
    setIsAdmin(false);
    setUserRole(null);
    setRolesFetched(false);
  }, []);

  // Fetch roles in a SEPARATE effect, not inside onAuthStateChange
  // This avoids the Supabase deadlock where async DB calls inside the auth callback hang
  useEffect(() => {
    if (!user) {
      if (rolesFetched) clearRoles();
      return;
    }

    // Skip if already fetched for this user
    if (lastFetchedUserId.current === user.id) return;

    let cancelled = false;

    const doFetch = async () => {
      lastFetchedUserId.current = user.id;
      console.log('[Auth] fetchRoles for:', user.id);

      try {
        const { data, error } = await supabase
          .from('user_roles')
          .select('role')
          .eq('user_id', user.id);

        if (cancelled) return;
        console.log('[Auth] fetchRoles result:', { data, error });

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

  // Auth listener — only sets user/session state, NO async DB calls
  useEffect(() => {
    // Safety timeout
    const timeout = setTimeout(() => {
      setLoading((prev) => {
        if (prev) console.warn('[Auth] Timed out, forcing loading=false');
        return false;
      });
    }, 8000);

    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (_event, session) => {
        console.log('[Auth] onAuthStateChange event:', _event, 'user:', session?.user?.id ?? 'none');

        if (_event === 'SIGNED_IN' && session?.user) {
          // Reset so the role-fetch effect runs for this user
          lastFetchedUserId.current = null;
          setRolesFetched(false);
          setLoading(true);
        }

        setSession(session);
        setUser(session?.user ?? null);

        if (!session?.user) {
          setLoading(false);
        }
      }
    );

    // Initial session
    supabase.auth.getSession().then(({ data: { session } }) => {
      console.log('[Auth] getSession result, user:', session?.user?.id ?? 'none');
      setSession(session);
      setUser(session?.user ?? null);
      if (!session?.user) {
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
          const storageKey = `sb-${import.meta.env.VITE_SUPABASE_PROJECT_ID || 'ngrkbohpmkzjonaofgbb'}-auth-token`;
          localStorage.removeItem(storageKey);
        } catch (e) { /* ignore */ }
      }
    } catch (err) {
      console.error('[Auth] signOut failed:', err);
      try {
        const storageKey = `sb-${import.meta.env.VITE_SUPABASE_PROJECT_ID || 'ngrkbohpmkzjonaofgbb'}-auth-token`;
        localStorage.removeItem(storageKey);
      } catch (e) { /* ignore */ }
    }
  };

  return (
    <AuthContext.Provider value={{ user, session, loading, isAgent, isAdmin, userRole, signOut }}>
      {children}
    </AuthContext.Provider>
  );
};
