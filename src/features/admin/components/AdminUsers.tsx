import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Search, Ban, Trash2, UserCheck, Loader2, Mail, Clock, Shield, Rocket, Eye } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/shared/hooks/use-toast';
import { Badge } from '@/components/ui/badge';

interface AuthUser {
  id: string;
  email: string;
  created_at: string;
  last_sign_in_at: string | null;
  email_confirmed_at: string | null;
  banned_until: string | null;
  display_name: string;
  provider: string;
  user_type: 'agent' | 'seeker' | 'demo' | 'demo_request';
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
  const [users, setUsers] = useState<AuthUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [filterType, setFilterType] = useState<string>('all');

  const fetchUsers = async () => {
    setLoading(true);
    const { data: { session } } = await supabase.auth.getSession();
    if (!session?.access_token) {
      toast({ title: 'Session expired', description: 'Please sign in again.', variant: 'destructive' });
      setLoading(false);
      return;
    }
    try {
      const response = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/admin-users?action=list_users`,
        { headers: { Authorization: `Bearer ${session.access_token}`, apikey: import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY } }
      );
      if (!response.ok) {
        const err = await response.json().catch(() => ({}));
        throw new Error(err.error || `HTTP ${response.status}`);
      }
      const data = await response.json();
      setUsers(data.users || []);
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
    const { data: { session } } = await supabase.auth.getSession();
    await fetch(
      `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/admin-users?action=ban_user`,
      {
        method: 'POST',
        headers: { Authorization: `Bearer ${session?.access_token}`, apikey: import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY, 'Content-Type': 'application/json' },
        body: JSON.stringify({ user_id: userId, ban }),
      }
    );
    toast({ title: ban ? 'User banned' : 'User unbanned' });
    setActionLoading(null);
    fetchUsers();
  };

  const handleDelete = async (userId: string) => {
    const isDemoRequest = userId.startsWith('demo-');
    const confirmMsg = isDemoRequest
      ? 'Delete this demo request? This cannot be undone.'
      : 'This will permanently delete this user AND all their data — properties, listings, leads, transactions, messages, and their agent/agency profile. This cannot be undone. Are you sure?';
    if (!confirm(confirmMsg)) return;
    if (!confirm('This will permanently delete this user AND all their data — properties, listings, leads, transactions, messages, and their agent/agency profile. This cannot be undone. Are you sure?')) return;
    setActionLoading(userId);
    const { data: { session } } = await supabase.auth.getSession();
    const action = isDemoRequest ? 'delete_demo_request' : 'delete_user';
    const bodyId = isDemoRequest ? userId.replace('demo-', '') : userId;
    await fetch(
      `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/admin-users?action=${action}`,
      {
        method: 'POST',
        headers: { Authorization: `Bearer ${session?.access_token}`, apikey: import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY, 'Content-Type': 'application/json' },
        body: JSON.stringify({ [isDemoRequest ? 'request_id' : 'user_id']: bodyId }),
      }
    );
    toast({ title: 'User and all associated data permanently deleted.' });
    setActionLoading(null);
    fetchUsers();
  };

  const filtered = users
    .filter((u) => {
      if (filterType === 'all') return true;
      if (filterType === 'demo') return u.user_type === 'demo' || u.user_type === 'demo_request';
      if (filterType === 'agent') return u.user_type === 'agent';
      if (filterType === 'seeker') return u.user_type === 'seeker';
      if (filterType === 'subscribed') return u.is_subscribed;
      return true;
    })
    .filter((u) =>
      (u.display_name || u.email || u.agency_name || '').toLowerCase().includes(searchQuery.toLowerCase())
    );

  const demoCount = users.filter(u => u.user_type === 'demo' || u.user_type === 'demo_request').length;
  const agentCount = users.filter(u => u.user_type === 'agent').length;
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

      <div className="bg-card border border-border rounded-xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border">
                <th className="text-left p-3 text-muted-foreground font-medium">User</th>
                <th className="text-left p-3 text-muted-foreground font-medium">Type</th>
                <th className="text-left p-3 text-muted-foreground font-medium hidden md:table-cell">Plan</th>
                <th className="text-left p-3 text-muted-foreground font-medium">Status</th>
                <th className="text-left p-3 text-muted-foreground font-medium hidden sm:table-cell">Last Sign In</th>
                <th className="text-left p-3 text-muted-foreground font-medium">Actions</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((u) => (
                <tr key={u.id} className="border-b border-border last:border-0 hover:bg-accent/50">
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
                    {u.last_sign_in_at ? (
                      <span className="flex items-center gap-1">
                        <Clock size={10} /> {new Date(u.last_sign_in_at).toLocaleDateString()}
                      </span>
                    ) : '—'}
                  </td>
                  <td className="p-3">
                    {u.user_type === 'demo_request' ? (
                      <a
                        href={`mailto:${u.email}?subject=Your Global Homes Demo`}
                        className="p-1.5 rounded-lg bg-primary/10 text-primary hover:bg-primary/20 transition-colors inline-block"
                        title="Email"
                      >
                        <Mail size={14} />
                      </a>
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
                              title={u.banned_until ? 'Unban user' : 'Ban user'}
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
    </motion.div>
  );
};

export default AdminUsers;
