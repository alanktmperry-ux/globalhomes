import { createContext, useContext, useEffect, useState, useRef, useCallback, ReactNode } from 'react';
import { User, Session } from '@supabase/supabase-js';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { buildAuditMeta } from '@/shared/lib/auditLog';

interface AuthContextType {
  user: User | null;
  session: Session | null;
  loading: boolean;
  isAgent: boolean;
  isAdmin: boolean;
  isPartner: boolean;
  isSupport: boolean;
  isPrincipal: boolean;
  userRole: 'user' | 'agent' | 'admin' | 'partner' | 'support' | null;
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
  isSupport: false,
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
  const [isSupport, setIsSupport] = useState(false);
  const [isPrincipal, setIsPrincipal] = useState(false);
  const [userRole, setUserRole] = useState<'user' | 'agent' | 'admin' | 'partner' | 'support' | null>(null);
  const [agencyRole, setAgencyRole] = useState<string | null>(null);
  const [agencyId, setAgencyId] = useState<string | null>(null);
  const [rolesFetched, setRolesFetched] = useState(false);
  const lastFetchedUserId = useRef<string | null>(null);
  const isFetching = useRef(false);
  const [impersonating, setImpersonating] = useState(false);
  const [impersonatedUser, setImpersonatedUser] = useState<string | null>(null);
  const [impersonatedUserId, setImpersonatedUserId] = useState<string | null>(null);
  const [impersonationSessionId, setImpersonationSessionId] = useState<string | null>(null);

  // Load active impersonation session from Supabase (server-side, can't be tampered with via DevTools)
  useEffect(() => {
    if (!user || !isAdmin) {
      setImpersonating(false);
      setImpersonatedUser(null);
      setImpersonatedUserId(null);
      setImpersonationSessionId(null);
      return;
    }
    let cancelled = false;
    (async () => {
      const nowIso = new Date().toISOString();
      const { data, error } = await (supabase as any)
        .from('admin_impersonation_sessions')
        .select('id, impersonated_user_id, impersonated_email, expires_at')
        .eq('admin_id', user.id)
        .gt('expires_at', nowIso)
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle();
      if (cancelled) return;
      if (error) {
        console.error('[Auth] failed to load impersonation session:', error);
        return;
      }
      if (data) {
        setImpersonating(true);
        setImpersonatedUser(data.impersonated_email ?? null);
        setImpersonatedUserId(data.impersonated_user_id);
        setImpersonationSessionId(data.id);
      }

      // Cleanup any expired rows for this admin
      await (supabase as any)
        .from('admin_impersonation_sessions')
        .delete()
        .eq('admin_id', user.id)
        .lt('expires_at', nowIso);
    })();
    return () => { cancelled = true; };
  }, [user, isAdmin]);

  const startImpersonation = async (userId: string, userEmail: string) => {
    if (!isAdmin || !user) return;
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) return;

    // Audit log MUST succeed before impersonation proceeds
    try {
      const { error: auditError } = await supabase.from('audit_log').insert({
        user_id: user.id,
        action_type: 'admin_start_impersonation',
        entity_type: 'user',
        entity_id: userId,
        description: 'Admin started impersonation session',
        metadata: buildAuditMeta({ impersonated_email: userEmail }),
      } as any);
      if (auditError) throw auditError;
    } catch (err) {
      console.error('impersonation audit log failed:', err);
      toast.error('Impersonation blocked — audit log could not be recorded. Please try again.');
      return;
    }

    // Persist impersonation session server-side (1 hour TTL set by table default)
    const { data: sessionRow, error: insertError } = await (supabase as any)
      .from('admin_impersonation_sessions')
      .insert({
        admin_id: user.id,
        impersonated_user_id: userId,
        impersonated_email: userEmail,
        expires_at: new Date(Date.now() + 60 * 60 * 1000).toISOString(),
      })
      .select('id')
      .maybeSingle();

    if (insertError || !sessionRow) {
      console.error('impersonation session insert failed:', insertError);
      toast.error('Impersonation blocked — session could not be created.');
      return;
    }

    setImpersonationSessionId(sessionRow.id);
    setImpersonating(true);
    setImpersonatedUser(userEmail);
    setImpersonatedUserId(userId);
  };

  const stopImpersonation = async () => {
    const { error: auditError } = await supabase.from('audit_log').insert({
      user_id: user?.id ?? null,
      action_type: 'admin_stop_impersonation',
      entity_type: 'user',
      entity_id: impersonatedUserId ?? null,
      description: 'Admin ended impersonation session',
      metadata: buildAuditMeta({}),
    } as any);
    if (auditError) {
      console.error('impersonation audit log:', auditError);
      toast.error('Warning: could not log impersonation exit');
    }

    // Remove the server-side session row
    if (user) {
      await (supabase as any)
        .from('admin_impersonation_sessions')
        .delete()
        .eq('admin_id', user.id);
    }

    setImpersonationSessionId(null);
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
    setIsSupport(roles.includes('support'));
    setIsPrincipal(roles.includes('principal') || hasAdmin);
    setUserRole(
      hasAdmin ? 'admin' : roles.includes('agent') ? 'agent' : roles.includes('partner') ? 'partner' : roles.includes('support') ? 'support' : 'user'
    );
  }, []);

  const clearRoles = useCallback(() => {
    lastFetchedUserId.current = null;
    setIsAgent(false);
    setIsAdmin(false);
    setIsPartner(false);
    setIsSupport(false);
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
    const [rolesResult, agentResult] = await Promise.all([
      supabase.from('user_roles').select('role').eq('user_id', user.id),
      supabase.from('agents').select('id, agency_role, agency_id, approval_status').eq('user_id', user.id).maybeSingle(),
    ]);
    const roles = rolesResult.data?.map((r) => r.role) || [];
    const agentData = agentResult.data;
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
        const [rolesResult, agentResult] = await Promise.all([
          supabase.from('user_roles').select('role').eq('user_id', user.id),
          supabase
            .from('agents')
            .select('id, agency_role, agency_id, approval_status')
            .eq('user_id', user.id)
            .maybeSingle(),
        ]);
        if (cancelled) return;

        const { data } = rolesResult;
        const roles = data?.map((r) => r.role) || [];

        // Fallback: if no agent role, check agents table — only honour it when approved
        const { data: agentData } = agentResult;
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
        const onAuthPage = [
          '/',
          '/login',
          '/auth',
          '/agent-auth',
          '/agents/login',
          '/auth/confirm',
          '/auth/callback',
        ].includes(path);
        if (isAgentUser && onAuthPage && sessionStorage.getItem('post_login_redirected') !== '1') {
          sessionStorage.setItem('post_login_redirected', '1');
          const returnTo = new URLSearchParams(window.location.search).get('return_to');
          const destination = returnTo && returnTo.startsWith('/') ? returnTo : '/dashboard';
          window.location.replace(destination);
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
    }, 3000);

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
    // Clear any active impersonation rows for this admin
    if (user) {
      try {
        await (supabase as any)
          .from('admin_impersonation_sessions')
          .delete()
          .eq('admin_id', user.id);
      } catch (e) { /* non-fatal */ }
    }
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
      user, session, loading, isAgent, isAdmin, isPartner, isSupport, isPrincipal, userRole,
      agencyRole, agencyId, signOut, refreshRoles,
      impersonating, impersonatedUser, impersonatedUserId, startImpersonation, stopImpersonation,
    }}>
      {children}
    </AuthContext.Provider>
  );
};
