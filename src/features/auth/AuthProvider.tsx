import { createContext, useContext, useEffect, useState, useRef, useCallback, ReactNode } from 'react';
import { User, Session } from '@supabase/supabase-js';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

const DEMO_EMAIL = 'demo-agent@globalhomes.app';
const DEMO_PASSWORD = 'DemoAgent2024!';

interface AuthContextType {
  user: User | null;
  session: Session | null;
  loading: boolean;
  isAgent: boolean;
  isAdmin: boolean;
  userRole: 'user' | 'agent' | 'admin' | null;
  signOut: () => Promise<void>;
  isDemoMode: boolean;
  demoSwitching: boolean;
  switchToDemo: () => Promise<void>;
  switchToLive: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType>({
  user: null,
  session: null,
  loading: true,
  isAgent: false,
  isAdmin: false,
  userRole: null,
  signOut: async () => {},
  isDemoMode: false,
  demoSwitching: false,
  switchToDemo: async () => {},
  switchToLive: async () => {},
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
  const [demoSwitching, setDemoSwitching] = useState(false);
  const lastFetchedUserId = useRef<string | null>(null);

  const isDemoMode = user?.email === DEMO_EMAIL;

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
  useEffect(() => {
    if (!user) {
      if (rolesFetched) clearRoles();
      return;
    }
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
        if (_event === 'SIGNED_IN' && session?.user) {
          lastFetchedUserId.current = null;
          setRolesFetched(false);
          setLoading(true);
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

  const switchToDemo = useCallback(async () => {
    setDemoSwitching(true);
    try {
      await supabase.functions.invoke('seed-demo-agent');
      await supabase.auth.signOut();
      const { error } = await supabase.auth.signInWithPassword({
        email: DEMO_EMAIL,
        password: DEMO_PASSWORD,
      });
      if (error) throw error;
      toast.success('Switched to Demo Agency');
    } catch (err: any) {
      toast.error('Could not enter demo mode: ' + err.message);
    } finally {
      setDemoSwitching(false);
    }
  }, []);

  const switchToLive = useCallback(async () => {
    setDemoSwitching(true);
    try {
      await supabase.auth.signOut();
      toast.success('Exited demo mode');
    } catch {
      // ignore
    } finally {
      setDemoSwitching(false);
    }
  }, []);

  return (
    <AuthContext.Provider value={{
      user, session, loading, isAgent, isAdmin, userRole, signOut,
      isDemoMode, demoSwitching, switchToDemo, switchToLive,
    }}>
      {children}
    </AuthContext.Provider>
  );
};
