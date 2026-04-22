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
  isStrataManager: boolean;
  isPrincipal: boolean;
  userRole: 'user' | 'agent' | 'admin' | 'partner' | 'strata_manager' | null;
  agencyRole: string | null;
  agencyId: string | null;
  signOut: () => Promise<void>;
  refreshRoles: () => Promise<void>;
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
  isStrataManager: false,
  isPrincipal: false,
  userRole: null,
  agencyRole: null,
  agencyId: null,
  signOut: async () => {},
  refreshRoles: async () => {},
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
  const [isStrataManager, setIsStrataManager] = useState(false);
  const [isPrincipal, setIsPrincipal] = useState(false);
  const [userRole, setUserRole] = useState<'user' | 'agent' | 'admin' | 'partner' | 'strata_manager' | null>(null);
  const [agencyRole, setAgencyRole] = useState<string | null>(null);
  const [agencyId, setAgencyId] = useState<string | null>(null);
  const [rolesFetched, setRolesFetched] = useState(false);
  const lastFetchedUserId = useRef<string | null>(null);
  const isFetching = useRef(false);
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
    if (!isAdmin) return;
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) return;

    // Audit log MUST succeed before impersonation proceeds
    try {
      const { error: auditError } = await supabase.from('audit_log').insert({
        user_id: user?.id ?? null,
        action_type: 'admin_start_impersonation',
        entity_type: 'user',
        entity_id: userId,
        description: 'Admin started impersonation session',
        metadata: { impersonated_email: userEmail },
      } as any);
      if (auditError) throw auditError;
    } catch (err) {
      console.error('impersonation audit log failed:', err);
      toast.error('Impersonation blocked — audit log could not be recorded. Please try again.');
      return;
    }

    sessionStorage.setItem('admin_email', userEmail);
    sessionStorage.setItem('admin_impersonated_id', userId);
    setImpersonating(true);
    setImpersonatedUser(userEmail);
    setImpersonatedUserId(userId);
  };

  const stopImpersonation = async () => {
    supabase.from('audit_log').insert({
      user_id: user?.id ?? null,
      action_type: 'admin_stop_impersonation',
      entity_type: 'user',
      entity_id: impersonatedUserId ?? null,
      description: 'Admin ended impersonation session',
      metadata: {},
    } as any).then(({ error }: any) => { if (error) console.error('impersonation audit log:', error); });
    sessionStorage.removeItem('admin_email');
    sessionStorage.removeItem('admin_impersonated_id');
    setImpersonating(false);
    setImpersonatedUser(null);
    setImpersonatedUserId(null);
    window.location.href = '/admin';
  };

  const applyRoles = useCallback((roles: string[], _email?: string | null) => {
    const hasAdmin = roles.includes('admin');
    setIsAdmin(hasAdmin);
    setIsAgent(roles.includes('agent') || hasAdmin);
    setIsPartner(roles.includes('partner'));
    setIsStrataManager(roles.includes('strata_manager'));
    setIsPrincipal(roles.includes('principal') || hasAdmin);
    setUserRole(
      hasAdmin ? 'admin' : roles.includes('agent') ? 'agent' : roles.includes('partner') ? 'partner' : roles.includes('strata_manager') ? 'strata_manager' : 'user'
    );
  }, []);

  const clearRoles = useCallback(() => {
    lastFetchedUserId.current = null;
    setIsAgent(false);
    setIsAdmin(false);
    setIsPartner(false);
    setIsStrataManager(false);
    setIsPrincipal(false);
    setUserRole(null);
    setAgencyRole(null);
    setAgencyId(null);
    setRolesFetched(false);
  }, []);

  const refreshRoles = useCallback(async () => {
    if (!user) return;
    lastFetchedUserId.current = null;
    setRolesFetched(false);
    const { data } = await supabase.from('user_roles').select('role').eq('user_id', user.id);
    const roles = data?.map((r) => r.role) || [];
    const { data: agentData } = await supabase
      .from('agents')
      .select('id, agency_role, agency_id, approval_status')
      .eq('user_id', user.id)
      .maybeSingle();
    const isAdminUser = roles.includes('admin');
    const isApprovedAgent = !!agentData && ((agentData as any).approval_status === 'approved' || isAdminUser);
    // Only grant agent role if the agents row is approved (admins always pass)
    const filteredRoles = roles.filter((r) => !(r === 'agent' && agentData && !isApprovedAgent));
    if (isApprovedAgent && !filteredRoles.includes('agent')) filteredRoles.push('agent');
    applyRoles(filteredRoles, user.email);
    if (agentData) {
      setAgencyRole((agentData as any).agency_role || null);
      setAgencyId(agentData.agency_id || null);
      if (isApprovedAgent && ((agentData as any).agency_role === 'principal' || (agentData as any).agency_role === 'admin')) {
        setIsPrincipal(true);
      }
      if (isApprovedAgent && !roles.includes('agent') && !roles.includes('admin')) {
        await supabase.from('user_roles').upsert(
          { user_id: user.id, role: 'agent' as any },
          { onConflict: 'user_id,role' }
        );
      }
    }
    lastFetchedUserId.current = user.id;
    setRolesFetched(true);
  }, [user, applyRoles]);

  // Fetch roles
  useEffect(() => {
    if (!user) {
      clearRoles();
      return;
    }
    // Same user with roles already fetched — skip to avoid role flicker on navigation
    if (lastFetchedUserId.current === user.id && rolesFetched) return;

    if (isFetching.current) return;

    let cancelled = false;
    const doFetch = async () => {
      if (isFetching.current) return;
      isFetching.current = true;
      lastFetchedUserId.current = user.id;

      try {
        const { data } = await supabase.from('user_roles').select('role').eq('user_id', user.id);
        if (cancelled) return;
        
        const roles = data?.map((r) => r.role) || [];

        // Fallback: if no agent role, check agents table — only honour it when approved
        const { data: agentData } = await supabase
          .from('agents')
          .select('id, agency_role, agency_id, approval_status')
          .eq('user_id', user.id)
          .maybeSingle();
        if (cancelled) return;
        const isAdminUser = roles.includes('admin');
        const isApprovedAgent = !!agentData && ((agentData as any).approval_status === 'approved' || isAdminUser);
        // Strip any stale agent role if the agents row exists but isn't approved
        const filteredRoles = roles.filter((r) => !(r === 'agent' && agentData && !isApprovedAgent));
        if (isApprovedAgent && !filteredRoles.includes('agent')) {
          filteredRoles.push('agent');
          // Best-effort backfill of user_roles row
          supabase.from('user_roles').insert({ user_id: user.id, role: 'agent' as any })
            .then(({ error }) => { if (error && !String(error.message).includes('duplicate')) console.warn('[Auth] backfill user_roles:', error.message); });
        }
        applyRoles(filteredRoles, user.email);
        if (agentData) {
          setAgencyRole((agentData as any).agency_role || null);
          setAgencyId(agentData.agency_id || null);
          if (isApprovedAgent && ((agentData as any).agency_role === 'principal' || (agentData as any).agency_role === 'admin')) {
            setIsPrincipal(true);
          }
          if (isApprovedAgent && !roles.includes('agent') && !roles.includes('admin')) {
            await supabase.from('user_roles').upsert(
              { user_id: user.id, role: 'agent' as any },
              { onConflict: 'user_id,role' }
            );
          }
        }

        // Post-login redirect: only approved agents land on dashboard
        const isAgentUser = filteredRoles.includes('agent') || filteredRoles.includes('admin');
        const path = window.location.pathname;
        const onAuthPage = path === '/login' || path === '/auth' || path === '/agent-auth' || path === '/';
        if (isAgentUser && onAuthPage && sessionStorage.getItem('post_login_redirected') !== '1') {
          sessionStorage.setItem('post_login_redirected', '1');
          window.location.href = '/dashboard/rent-roll';
          return;
        }
      } catch (err) {
        console.error('[Auth] fetchRoles error:', err);
      } finally {
        isFetching.current = false;
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
        
        return false;
      });
    }, 8000);

    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (_event, session) => {
        

        // Explicit sign-out — only clear if there is no active session
        // (guards against spurious SIGNED_OUT from detectSessionInUrl on navigation)
        if (_event === 'SIGNED_OUT') {
          if (session) return; // session still valid, ignore
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

        // Request notification permission after login (non-intrusive delay)
        if (session?.user && 'Notification' in window && Notification.permission === 'default') {
          setTimeout(() => { Notification.requestPermission(); }, 5000);
        }
      }
    );

    supabase.auth.getSession().then(({ data: { session } }) => {
      
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
    sessionStorage.removeItem('post_login_redirected');
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
      user, session, loading, isAgent, isAdmin, isPartner, isStrataManager, isPrincipal, userRole,
      agencyRole, agencyId, signOut, refreshRoles,
      impersonating, impersonatedUser, impersonatedUserId, startImpersonation, stopImpersonation,
    }}>
      {children}
    </AuthContext.Provider>
  );
};
