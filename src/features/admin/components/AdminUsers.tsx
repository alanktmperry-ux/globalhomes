import { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Search, Ban, Trash2, UserCheck, Loader2, Mail, Clock, Shield, Rocket, Eye, CheckSquare, Square, MinusSquare, UserCog, Settings, X, Check, Landmark, ShieldCheck } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/shared/hooks/use-toast';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { useAuth } from '@/features/auth/AuthProvider';
import { useNavigate } from 'react-router-dom';

interface AuthUser {
  id: string;
  email: string;
  created_at: string;
  last_sign_in_at: string | null;
  email_confirmed_at: string | null;
  banned_until: string | null;
  display_name: string;
  provider: string;
  user_type: 'agent' | 'seeker' | 'demo' | 'demo_request' | 'partner';
  is_partner_verified?: boolean;
  is_subscribed: boolean;
  plan_type: string | null;
  demo_status?: string;
  agency_name?: string;
}

const UserTypeBadge = ({ user }: { user: AuthUser }) => {
  if (user.user_type === 'demo_request') {
    const statusColor = user.demo_status === 'approved'
      ? 'bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border-emerald-500/30'
      : user.demo_status === 'redeemed'
        ? 'bg-sky-500/15 text-sky-600 dark:text-sky-400 border-sky-500/30'
        : 'bg-amber-500/15 text-amber-600 dark:text-amber-400 border-amber-500/30';
    return (
      <Badge variant="outline" className={`${statusColor} text-[10px] font-medium`}>
        <Eye className="h-2.5 w-2.5 mr-1" />
        Demo Request{user.demo_status ? ` · ${user.demo_status}` : ''}
      </Badge>
    );
  }
  if (user.user_type === 'demo') {
    return (
      <Badge variant="outline" className="bg-violet-500/15 text-violet-600 dark:text-violet-400 border-violet-500/30 text-[10px] font-medium">
        <Rocket className="h-2.5 w-2.5 mr-1" />
        Demo
      </Badge>
    );
  }
  if (user.user_type === 'partner') {
    return (
      <Badge variant="outline" className={`text-[10px] font-medium ${
        user.is_partner_verified
          ? 'bg-teal-500/15 text-teal-600 border-teal-500/30'
          : 'bg-amber-500/15 text-amber-600 border-amber-500/30'
      }`}>
        <Landmark className="h-2.5 w-2.5 mr-1" />
        {user.is_partner_verified ? 'Partner · Verified' : 'Partner · Pending'}
      </Badge>
    );
  }
  if (user.user_type === 'agent') {
    return (
      <Badge variant="outline" className="bg-primary/15 text-primary border-primary/30 text-[10px] font-medium">
        <Shield className="h-2.5 w-2.5 mr-1" />
        Agent
      </Badge>
    );
  }
  return (
    <Badge variant="outline" className="bg-secondary text-muted-foreground border-border text-[10px] font-medium">
      Seeker
    </Badge>
  );
};

const PlanBadge = ({ user }: { user: AuthUser }) => {
  if (user.user_type === 'demo' || user.user_type === 'demo_request') return null;
  if (!user.is_subscribed) return null;

  const plan = (user.plan_type || 'basic').toLowerCase();
  if (plan === 'pro' || plan === 'agency') {
    return (
      <Badge className="bg-gradient-to-r from-primary to-cyan-500 text-white border-0 text-[10px] font-semibold">
        {plan === 'agency' ? 'Agency Plan' : 'Pro Plan'}
      </Badge>
    );
  }
  return (
    <Badge variant="outline" className="bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border-emerald-500/30 text-[10px] font-medium">
      Standard
    </Badge>
  );
};

const AdminUsers = () => {
  const { toast } = useToast();
  const { startImpersonation } = useAuth();
  const navigate = useNavigate();
  const [users, setUsers] = useState<AuthUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [batchLoading, setBatchLoading] = useState(false);
  const [filterType, setFilterType] = useState<string>('all');
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [subModal, setSubModal] = useState<{ open: boolean; userId: string; email: string; currentPlan: string }>({ open: false, userId: '', email: '', currentPlan: 'demo' });
  const [subForm, setSubForm] = useState({ plan_type: 'demo', listing_limit: 3, seat_limit: 1, founding_member: false });
  const [savingSub, setSavingSub] = useState(false);

  const handleImpersonate = async (userId: string, userEmail: string) => {
    if (!confirm(`View the platform as ${userEmail}? You will see exactly what they see. An orange banner will let you exit.`)) return;
    await startImpersonation(userId, userEmail);
    navigate('/dashboard');
  };

  const handleOpenSubModal = (u: AuthUser) => {
    const plan = u.plan_type || 'demo';
    const limits: Record<string, { listings: number; seats: number }> = {
      demo: { listings: 3, seats: 1 },
      starter: { listings: 10, seats: 1 },
      pro: { listings: 9999, seats: 1 },
      agency: { listings: 9999, seats: 8 },
      enterprise: { listings: 9999, seats: 50 },
    };
    const def = limits[plan] || limits.demo;
    setSubForm({ plan_type: plan, listing_limit: def.listings, seat_limit: def.seats, founding_member: false });
    setSubModal({ open: true, userId: u.id, email: u.email, currentPlan: plan });
  };

  const handleSaveSub = async () => {
    setSavingSub(true);
    try {
      await callAdminApi('set_subscription', { user_id: subModal.userId, ...subForm });
      toast({ title: 'Subscription updated', description: `${subModal.email} is now on the ${subForm.plan_type} plan.` });
      setSubModal(m => ({ ...m, open: false }));
      fetchUsers();
    } catch (err: any) {
      toast({ title: 'Failed', description: err.message, variant: 'destructive' });
    }
    setSavingSub(false);
  };

  const handlePlanChange = (plan: string) => {
    const limits: Record<string, { listings: number; seats: number }> = {
      demo: { listings: 3, seats: 1 },
      starter: { listings: 10, seats: 1 },
      pro: { listings: 9999, seats: 1 },
      agency: { listings: 9999, seats: 8 },
      enterprise: { listings: 9999, seats: 50 },
    };
    const def = limits[plan] || limits.demo;
    setSubForm(f => ({ ...f, plan_type: plan, listing_limit: def.listings, seat_limit: def.seats }));
  };

  const getSession = useCallback(async () => {
    const { data: { session } } = await supabase.auth.getSession();
    return session;
  }, []);

  const callAdminApi = useCallback(async (action: string, body?: any) => {
    const session = await getSession();
    if (!session?.access_token) throw new Error('Session expired');
    const method = body ? 'POST' : 'GET';
    const response = await fetch(
      `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/admin-users?action=${action}`,
      {
        method,
        headers: {
          Authorization: `Bearer ${session.access_token}`,
          apikey: import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY,
          'Content-Type': 'application/json',
        },
        ...(body ? { body: JSON.stringify(body) } : {}),
      }
    );
    if (!response.ok) {
      const err = await response.json().catch(() => ({}));
      throw new Error(err.error || `HTTP ${response.status}`);
    }
    return response.json();
  }, [getSession]);

  const fetchUsers = async () => {
    setLoading(true);
    try {
      const data = await callAdminApi('list_users');
      setUsers(data.users || []);
      setSelected(new Set());
    } catch (err: any) {
      toast({ title: 'Failed to load users', description: err.message, variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchUsers(); }, []);

  const handleBan = async (userId: string, ban: boolean) => {
    if (userId.startsWith('demo-')) return;
    setActionLoading(userId);
    try {
      await callAdminApi('ban_user', { user_id: userId, ban });
      toast({ title: ban ? 'User banned' : 'User unbanned' });
    } catch (err: any) {
      toast({ title: 'Failed', description: err.message, variant: 'destructive' });
    }
    setActionLoading(null);
    fetchUsers();
  };

  const handleDelete = async (userId: string) => {
    const isDemoRequest = userId.startsWith('demo-');
    const confirmMsg = isDemoRequest
      ? 'Delete this demo request? This cannot be undone.'
      : 'Permanently delete this user and ALL their data? This cannot be undone.';
    if (!confirm(confirmMsg)) return;
    setActionLoading(userId);
    try {
      const action = isDemoRequest ? 'delete_demo_request' : 'delete_user';
      const bodyId = isDemoRequest ? userId.replace('demo-', '') : userId;
      await callAdminApi(action, { [isDemoRequest ? 'request_id' : 'user_id']: bodyId });
      toast({ title: isDemoRequest ? 'Demo request deleted.' : 'User and all data permanently deleted.' });
    } catch (err: any) {
      toast({ title: 'Failed', description: err.message, variant: 'destructive' });
    }
    setActionLoading(null);
    fetchUsers();
  };

  const handleVerifyPartner = async (userId: string, verify: boolean) => {
    setActionLoading(userId);
    try {
      await callAdminApi('verify_partner', { user_id: userId, verify });
      toast({
        title: verify ? 'Partner verified' : 'Partner unverified',
        description: verify
          ? 'They can now accept agency invitations.'
          : 'Their access has been suspended.',
      });
    } catch (err: any) {
      toast({ title: 'Failed', description: err.message, variant: 'destructive' });
    }
    setActionLoading(null);
    fetchUsers();
  };

  // Batch actions
  const handleBatchDelete = async () => {
    const count = selected.size;
    if (count === 0) return;
    if (!confirm(`Permanently delete ${count} selected user${count > 1 ? 's' : ''}? This cannot be undone.`)) return;
    setBatchLoading(true);
    let successCount = 0;
    let failCount = 0;

    for (const id of selected) {
      try {
        const isDemoRequest = id.startsWith('demo-');
        const action = isDemoRequest ? 'delete_demo_request' : 'delete_user';
        const bodyId = isDemoRequest ? id.replace('demo-', '') : id;
        await callAdminApi(action, { [isDemoRequest ? 'request_id' : 'user_id']: bodyId });
        successCount++;
      } catch {
        failCount++;
      }
    }

    toast({
      title: `Deleted ${successCount} user${successCount !== 1 ? 's' : ''}`,
      description: failCount > 0 ? `${failCount} failed.` : undefined,
      variant: failCount > 0 ? 'destructive' : 'default',
    });
    setBatchLoading(false);
    fetchUsers();
  };

  const handleBatchBan = async (ban: boolean) => {
    const authIds = Array.from(selected).filter(id => !id.startsWith('demo-'));
    if (authIds.length === 0) {
      toast({ title: 'No eligible users selected', description: 'Demo requests cannot be banned.', variant: 'destructive' });
      return;
    }
    if (!confirm(`${ban ? 'Ban' : 'Unban'} ${authIds.length} selected user${authIds.length > 1 ? 's' : ''}?`)) return;
    setBatchLoading(true);
    let successCount = 0;

    for (const id of authIds) {
      try {
        await callAdminApi('ban_user', { user_id: id, ban });
        successCount++;
      } catch { /* skip */ }
    }

    toast({ title: `${ban ? 'Banned' : 'Unbanned'} ${successCount} user${successCount !== 1 ? 's' : ''}` });
    setBatchLoading(false);
    fetchUsers();
  };

  // Selection helpers
  const toggleSelect = (id: string) => {
    setSelected(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const filtered = users
    .filter((u) => {
      if (filterType === 'all') return true;
      if (filterType === 'demo') return u.user_type === 'demo' || u.user_type === 'demo_request';
      if (filterType === 'agent') return u.user_type === 'agent';
      if (filterType === 'partner') return u.user_type === 'partner';
      if (filterType === 'seeker') return u.user_type === 'seeker';
      if (filterType === 'subscribed') return u.is_subscribed;
      return true;
    })
    .filter((u) =>
      (u.display_name || u.email || u.agency_name || '').toLowerCase().includes(searchQuery.toLowerCase())
    );

  const allFilteredSelected = filtered.length > 0 && filtered.every(u => selected.has(u.id));
  const someFilteredSelected = filtered.some(u => selected.has(u.id));

  const toggleSelectAll = () => {
    if (allFilteredSelected) {
      setSelected(prev => {
        const next = new Set(prev);
        filtered.forEach(u => next.delete(u.id));
        return next;
      });
    } else {
      setSelected(prev => {
        const next = new Set(prev);
        filtered.forEach(u => next.add(u.id));
        return next;
      });
    }
  };

  const demoCount = users.filter(u => u.user_type === 'demo' || u.user_type === 'demo_request').length;
  const agentCount = users.filter(u => u.user_type === 'agent').length;
  const partnerCount = users.filter(u => u.user_type === 'partner').length;
  const subscribedCount = users.filter(u => u.is_subscribed).length;

  if (loading) {
    return <div className="flex justify-center py-20"><Loader2 className="animate-spin text-primary" size={32} /></div>;
  }

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
      <div className="mb-4 flex flex-col sm:flex-row items-start sm:items-center gap-3">
        <div className="relative flex-1 max-w-sm">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
          <input
            type="text"
            placeholder="Search users..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-9 pr-4 py-2.5 rounded-xl bg-secondary text-foreground text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/30"
          />
        </div>
        <div className="flex items-center gap-1.5 flex-wrap">
          {[
            { key: 'all', label: `All (${users.length})` },
            { key: 'agent', label: `Agents (${agentCount})` },
            { key: 'partner', label: `Partners (${partnerCount})` },
            { key: 'demo', label: `Demo (${demoCount})` },
            { key: 'subscribed', label: `Subscribed (${subscribedCount})` },
          ].map(f => (
            <button
              key={f.key}
              onClick={() => setFilterType(f.key)}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                filterType === f.key
                  ? 'bg-primary text-primary-foreground'
                  : 'bg-secondary text-muted-foreground hover:text-foreground'
              }`}
            >
              {f.label}
            </button>
          ))}
        </div>
      </div>

      {/* Batch action bar */}
      <AnimatePresence>
        {selected.size > 0 && (
          <motion.div
            initial={{ opacity: 0, y: -8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            className="mb-3 flex items-center gap-2 px-4 py-2.5 rounded-xl bg-primary/10 border border-primary/20"
          >
            <span className="text-sm font-medium text-foreground">
              {selected.size} selected
            </span>
            <div className="flex-1" />
            {batchLoading ? (
              <Loader2 className="animate-spin text-primary" size={18} />
            ) : (
              <>
                <Button
                  size="sm"
                  variant="outline"
                  className="h-7 text-xs border-amber-500/30 text-amber-600 hover:bg-amber-500/10"
                  onClick={() => handleBatchBan(true)}
                >
                  <Ban className="h-3 w-3 mr-1" />
                  Ban
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  className="h-7 text-xs border-emerald-500/30 text-emerald-600 hover:bg-emerald-500/10"
                  onClick={() => handleBatchBan(false)}
                >
                  <UserCheck className="h-3 w-3 mr-1" />
                  Unban
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  className="h-7 text-xs border-red-500/30 text-red-600 hover:bg-red-500/10"
                  onClick={handleBatchDelete}
                >
                  <Trash2 className="h-3 w-3 mr-1" />
                  Delete
                </Button>
                <Button
                  size="sm"
                  variant="ghost"
                  className="h-7 text-xs text-muted-foreground"
                  onClick={() => setSelected(new Set())}
                >
                  Clear
                </Button>
              </>
            )}
          </motion.div>
        )}
      </AnimatePresence>

      <div className="bg-card border border-border rounded-xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border">
                <th className="w-10 p-3">
                  <button onClick={toggleSelectAll} className="text-muted-foreground hover:text-foreground transition-colors">
                    {allFilteredSelected ? (
                      <CheckSquare size={16} className="text-primary" />
                    ) : someFilteredSelected ? (
                      <MinusSquare size={16} className="text-primary" />
                    ) : (
                      <Square size={16} />
                    )}
                  </button>
                </th>
                <th className="text-left p-3 text-muted-foreground font-medium">User</th>
                <th className="text-left p-3 text-muted-foreground font-medium">Type</th>
                <th className="text-left p-3 text-muted-foreground font-medium hidden md:table-cell">Plan</th>
                <th className="text-left p-3 text-muted-foreground font-medium">Status</th>
                <th className="text-left p-3 text-muted-foreground font-medium hidden sm:table-cell">Last Active / Requested</th>
                <th className="text-left p-3 text-muted-foreground font-medium">Actions</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((u) => (
                <tr
                  key={u.id}
                  className={`border-b border-border last:border-0 transition-colors ${
                    selected.has(u.id) ? 'bg-primary/5' : 'hover:bg-accent/50'
                  }`}
                >
                  <td className="w-10 p-3">
                    <button onClick={() => toggleSelect(u.id)} className="text-muted-foreground hover:text-foreground transition-colors">
                      {selected.has(u.id) ? (
                        <CheckSquare size={16} className="text-primary" />
                      ) : (
                        <Square size={16} />
                      )}
                    </button>
                  </td>
                  <td className="p-3">
                    <p className="text-foreground font-medium">{u.display_name}</p>
                    <p className="text-xs text-muted-foreground flex items-center gap-1">
                      <Mail size={10} /> {u.email}
                    </p>
                    {u.agency_name && (
                      <p className="text-xs text-muted-foreground mt-0.5">{u.agency_name}</p>
                    )}
                  </td>
                  <td className="p-3">
                    <UserTypeBadge user={u} />
                  </td>
                  <td className="p-3 hidden md:table-cell">
                    <PlanBadge user={u} />
                    {!u.is_subscribed && u.user_type === 'agent' && (
                      <span className="text-xs text-muted-foreground">Free</span>
                    )}
                  </td>
                  <td className="p-3">
                    {u.user_type === 'demo_request' ? (
                      <span className="text-xs px-2 py-0.5 rounded-full bg-violet-500/20 text-violet-600 dark:text-violet-400 font-medium">
                        {u.demo_status || 'pending'}
                      </span>
                    ) : u.banned_until ? (
                      <span className="text-xs px-2 py-0.5 rounded-full bg-red-500/20 text-red-500 font-medium">Banned</span>
                    ) : u.email_confirmed_at ? (
                      <span className="text-xs px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-500 font-medium">Active</span>
                    ) : (
                      <span className="text-xs px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-500 font-medium">Unconfirmed</span>
                    )}
                  </td>
                  <td className="p-3 text-muted-foreground text-xs hidden sm:table-cell">
                    {u.user_type === 'demo_request' ? (
                      <span className="flex items-center gap-1">
                        <Clock size={10} /> {new Date(u.created_at).toLocaleDateString()}
                      </span>
                    ) : u.last_sign_in_at ? (
                      <span className="flex items-center gap-1">
                        <Clock size={10} /> {new Date(u.last_sign_in_at).toLocaleDateString()}
                      </span>
                    ) : '—'}
                  </td>
                  <td className="p-3">
                    {u.user_type === 'demo_request' ? (
                      <div className="flex gap-1.5">
                        {actionLoading === u.id ? (
                          <Loader2 className="animate-spin text-muted-foreground" size={16} />
                        ) : (
                          <>
                            <a
                              href={`mailto:${u.email}?subject=Your Global Homes Demo`}
                              className="p-1.5 rounded-lg bg-primary/10 text-primary hover:bg-primary/20 transition-colors inline-block"
                              title="Email"
                            >
                              <Mail size={14} />
                            </a>
                            <button
                              onClick={() => handleDelete(u.id)}
                              className="p-1.5 rounded-lg bg-red-500/10 text-red-500 hover:bg-red-500/20 transition-colors"
                              title="Delete demo request"
                            >
                              <Trash2 size={14} />
                            </button>
                          </>
                        )}
                      </div>
                    ) : u.user_type === 'agent' ? (
                      <div className="flex gap-1.5">
                        {actionLoading === u.id ? (
                          <Loader2 className="animate-spin text-muted-foreground" size={16} />
                        ) : (
                          <>
                            <button
                              onClick={() => handleOpenSubModal(u)}
                              className="p-1.5 rounded-lg bg-violet-500/10 text-violet-500 hover:bg-violet-500/20 transition-colors"
                              title="Manage subscription"
                            >
                              <Settings size={14} />
                            </button>
                            <button
                              onClick={() => handleImpersonate(u.id, u.email)}
                              className="p-1.5 rounded-lg bg-primary/10 text-primary hover:bg-primary/20 transition-colors"
                              title="Act as this user"
                            >
                              <UserCog size={14} />
                            </button>
                            <button
                              onClick={() => handleBan(u.id, !u.banned_until)}
                              className={`p-1.5 rounded-lg transition-colors ${
                                u.banned_until ? 'bg-emerald-500/10 text-emerald-500 hover:bg-emerald-500/20' : 'bg-amber-500/10 text-amber-500 hover:bg-amber-500/20'
                              }`}
                              title={u.banned_until ? 'Unban' : 'Ban'}
                            >
                              {u.banned_until ? <UserCheck size={14} /> : <Ban size={14} />}
                            </button>
                            <button
                              onClick={() => handleDelete(u.id)}
                              className="p-1.5 rounded-lg bg-red-500/10 text-red-500 hover:bg-red-500/20 transition-colors"
                              title="Delete user"
                            >
                              <Trash2 size={14} />
                            </button>
                          </>
                        )}
                      </div>
                    ) : (
                      <div className="flex gap-1.5">
                        {actionLoading === u.id ? (
                          <Loader2 className="animate-spin text-muted-foreground" size={16} />
                        ) : (
                          <>
                            <button
                              onClick={() => handleBan(u.id, !u.banned_until)}
                              className={`p-1.5 rounded-lg transition-colors ${
                                u.banned_until ? 'bg-emerald-500/10 text-emerald-500 hover:bg-emerald-500/20' : 'bg-amber-500/10 text-amber-500 hover:bg-amber-500/20'
                              }`}
                              title={u.banned_until ? 'Unban' : 'Ban'}
                            >
                              {u.banned_until ? <UserCheck size={14} /> : <Ban size={14} />}
                            </button>
                            <button
                              onClick={() => handleDelete(u.id)}
                              className="p-1.5 rounded-lg bg-red-500/10 text-red-500 hover:bg-red-500/20 transition-colors"
                              title="Delete user"
                            >
                              <Trash2 size={14} />
                            </button>
                          </>
                        )}
                      </div>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {filtered.length === 0 && (
          <p className="text-center py-8 text-muted-foreground text-sm">No users found</p>
        )}
      </div>

      <Dialog open={subModal.open} onOpenChange={(o) => setSubModal(m => ({ ...m, open: o }))}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Manage subscription</DialogTitle>
            <p className="text-sm text-muted-foreground">{subModal.email}</p>
          </DialogHeader>

          <div className="space-y-4 pt-2">
            <div className="space-y-1.5">
              <Label>Plan</Label>
              <Select value={subForm.plan_type} onValueChange={handlePlanChange}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="demo">Demo — 3 listings</SelectItem>
                  <SelectItem value="starter">Starter — $99/mo, 10 listings</SelectItem>
                  <SelectItem value="pro">Pro — $199/mo, unlimited</SelectItem>
                  <SelectItem value="agency">Agency — $399/mo, 8 seats</SelectItem>
                  <SelectItem value="enterprise">Enterprise — custom</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label>Listing limit</Label>
                <input
                  type="number"
                  value={subForm.listing_limit}
                  onChange={(e) => setSubForm(f => ({ ...f, listing_limit: parseInt(e.target.value) || 3 }))}
                  className="w-full h-9 px-3 text-sm border border-border rounded-lg bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-primary/30"
                />
              </div>
              <div className="space-y-1.5">
                <Label>Seat limit</Label>
                <input
                  type="number"
                  value={subForm.seat_limit}
                  onChange={(e) => setSubForm(f => ({ ...f, seat_limit: parseInt(e.target.value) || 1 }))}
                  className="w-full h-9 px-3 text-sm border border-border rounded-lg bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-primary/30"
                />
              </div>
            </div>

            <div className="flex items-center justify-between rounded-lg border border-border p-3">
              <div>
                <p className="text-sm font-medium text-foreground">Founding member</p>
                <p className="text-xs text-muted-foreground">Rate locked for life</p>
              </div>
              <Switch
                checked={subForm.founding_member}
                onCheckedChange={(v) => setSubForm(f => ({ ...f, founding_member: v }))}
              />
            </div>

            <div className="flex gap-2 pt-2">
              <Button onClick={handleSaveSub} disabled={savingSub} className="flex-1">
                {savingSub ? <><Loader2 className="h-4 w-4 animate-spin mr-1" /> Saving…</> : <><Check className="h-4 w-4 mr-1" /> Save changes</>}
              </Button>
              <Button variant="ghost" size="icon" onClick={() => setSubModal(m => ({ ...m, open: false }))}>
                <X size={16} />
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </motion.div>
  );
};

export default AdminUsers;
