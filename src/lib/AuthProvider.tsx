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
    // Set up auth listener FIRST
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (_event, session) => {
        setSession(session);
        setUser(session?.user ?? null);

        if (session?.user) {
          await fetchRoles(session.user.id);
        } else {
          clearRoles();
        }

        setLoading(false);
      }
    );

    // Then get initial session
    supabase.auth.getSession().then(async ({ data: { session } }) => {
      setSession(session);
      setUser(session?.user ?? null);
      if (session?.user) {
        await fetchRoles(session.user.id);
      }
      setLoading(false);
    });

    return () => subscription.unsubscribe();
  }, [fetchRoles, clearRoles]);

  const signOut = async () => {
    await supabase.auth.signOut();
  };

  return (
    <AuthContext.Provider value={{ user, session, loading, isAgent, isAdmin, userRole, signOut }}>
      {children}
    </AuthContext.Provider>
  );
};
