import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Search, Ban, Trash2, UserCheck, Loader2, Mail, Clock, Shield } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

interface AuthUser {
  id: string;
  email: string;
  created_at: string;
  last_sign_in_at: string | null;
  email_confirmed_at: string | null;
  banned_until: string | null;
  display_name: string;
  provider: string;
}

const AdminUsers = () => {
  const { toast } = useToast();
  const [users, setUsers] = useState<AuthUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [actionLoading, setActionLoading] = useState<string | null>(null);

  const fetchUsers = async () => {
    setLoading(true);
    const { data: { session } } = await supabase.auth.getSession();
    const response = await fetch(
      `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/admin-users?action=list_users`,
      { headers: { Authorization: `Bearer ${session?.access_token}`, apikey: import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY } }
    );
    const data = await response.json();
    setUsers(data.users || []);
    setLoading(false);
  };

  useEffect(() => { fetchUsers(); }, []);

  const handleBan = async (userId: string, ban: boolean) => {
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
    if (!confirm('Are you sure you want to permanently delete this user?')) return;
    setActionLoading(userId);
    const { data: { session } } = await supabase.auth.getSession();
    await fetch(
      `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/admin-users?action=delete_user`,
      {
        method: 'POST',
        headers: { Authorization: `Bearer ${session?.access_token}`, apikey: import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY, 'Content-Type': 'application/json' },
        body: JSON.stringify({ user_id: userId }),
      }
    );
    toast({ title: 'User deleted' });
    setActionLoading(null);
    fetchUsers();
  };

  const filtered = users.filter((u) =>
    (u.display_name || u.email || '').toLowerCase().includes(searchQuery.toLowerCase())
  );

  if (loading) {
    return <div className="flex justify-center py-20"><Loader2 className="animate-spin text-primary" size={32} /></div>;
  }

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
      <div className="mb-4 flex items-center gap-3">
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
        <span className="text-xs text-muted-foreground">{users.length} total users</span>
      </div>

      <div className="bg-card border border-border rounded-xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border">
                <th className="text-left p-3 text-muted-foreground font-medium">User</th>
                <th className="text-left p-3 text-muted-foreground font-medium">Provider</th>
                <th className="text-left p-3 text-muted-foreground font-medium">Status</th>
                <th className="text-left p-3 text-muted-foreground font-medium">Last Sign In</th>
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
                  </td>
                  <td className="p-3">
                    <span className="text-xs px-2 py-0.5 rounded-full bg-secondary text-muted-foreground capitalize">{u.provider}</span>
                  </td>
                  <td className="p-3">
                    {u.banned_until ? (
                      <span className="text-xs px-2 py-0.5 rounded-full bg-red-500/20 text-red-500 font-medium">Banned</span>
                    ) : u.email_confirmed_at ? (
                      <span className="text-xs px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-500 font-medium">Active</span>
                    ) : (
                      <span className="text-xs px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-500 font-medium">Unconfirmed</span>
                    )}
                  </td>
                  <td className="p-3 text-muted-foreground text-xs">
                    {u.last_sign_in_at ? (
                      <span className="flex items-center gap-1">
                        <Clock size={10} /> {new Date(u.last_sign_in_at).toLocaleDateString()}
                      </span>
                    ) : 'Never'}
                  </td>
                  <td className="p-3">
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
