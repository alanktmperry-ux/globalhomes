import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Users, Building2, BarChart3, Shield, Search, ChevronDown, MoreVertical, ArrowLeft, Loader2 } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/lib/AuthProvider';
import { useToast } from '@/hooks/use-toast';

type Tab = 'overview' | 'users' | 'listings' | 'analytics' | 'roles';

interface UserRow {
  id: string;
  email: string;
  created_at: string;
  display_name?: string;
  roles: string[];
}

interface PropertyRow {
  id: string;
  title: string;
  address: string;
  suburb: string;
  price_formatted: string;
  is_active: boolean;
  views: number;
  created_at: string;
}

const AdminDashboard = () => {
  const navigate = useNavigate();
  const { user, isAdmin, loading: authLoading } = useAuth();
  const { toast } = useToast();
  const [tab, setTab] = useState<Tab>('overview');
  const [users, setUsers] = useState<UserRow[]>([]);
  const [properties, setProperties] = useState<PropertyRow[]>([]);
  const [stats, setStats] = useState({ totalUsers: 0, totalAgents: 0, totalListings: 0, totalLeads: 0, totalVoiceSearches: 0 });
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');

  useEffect(() => {
    if (!authLoading && (!user || !isAdmin)) {
      navigate('/login');
    }
  }, [authLoading, user, isAdmin, navigate]);

  useEffect(() => {
    if (isAdmin) fetchData();
  }, [isAdmin]);

  const fetchData = async () => {
    setLoading(true);

    // Fetch stats
    const [profilesRes, agentsRes, propsRes, leadsRes, voiceRes] = await Promise.all([
      supabase.from('profiles').select('id', { count: 'exact', head: true }),
      supabase.from('agents').select('id', { count: 'exact', head: true }),
      supabase.from('properties').select('id', { count: 'exact', head: true }),
      supabase.from('leads').select('id', { count: 'exact', head: true }),
      supabase.from('voice_searches').select('id', { count: 'exact', head: true }),
    ]);

    setStats({
      totalUsers: profilesRes.count || 0,
      totalAgents: agentsRes.count || 0,
      totalListings: propsRes.count || 0,
      totalLeads: leadsRes.count || 0,
      totalVoiceSearches: voiceRes.count || 0,
    });

    // Fetch profiles with roles
    const { data: profileData } = await supabase.from('profiles').select('user_id, display_name, created_at');
    const { data: roleData } = await supabase.from('user_roles').select('user_id, role');

    const roleMap = new Map<string, string[]>();
    roleData?.forEach((r) => {
      const existing = roleMap.get(r.user_id) || [];
      existing.push(r.role);
      roleMap.set(r.user_id, existing);
    });

    const userRows: UserRow[] = (profileData || []).map((p) => ({
      id: p.user_id,
      email: p.display_name || 'Unknown',
      created_at: p.created_at,
      display_name: p.display_name || undefined,
      roles: roleMap.get(p.user_id) || ['user'],
    }));
    setUsers(userRows);

    // Fetch properties
    const { data: propData } = await supabase.from('properties').select('id, title, address, suburb, price_formatted, is_active, views, created_at').order('created_at', { ascending: false }).limit(100);
    setProperties(propData || []);

    setLoading(false);
  };

  const handleRoleChange = async (userId: string, role: 'user' | 'agent' | 'admin', action: 'add' | 'remove') => {
    if (action === 'add') {
      await supabase.from('user_roles').insert({ user_id: userId, role: role as any });
      if (role === 'agent') {
        const userProfile = users.find((u) => u.id === userId);
        const { data: existing } = await supabase.from('agents').select('id').eq('user_id', userId).maybeSingle();
        if (!existing) {
          await supabase.from('agents').insert({
            user_id: userId,
            name: userProfile?.display_name || 'Agent',
            email: userProfile?.email,
          });
        }
      }
      toast({ title: `Role "${role}" added` });
    } else {
      await supabase.from('user_roles').delete().eq('user_id', userId).eq('role', role as any);
      toast({ title: `Role "${role}" removed` });
    }
    fetchData();
  };

  const togglePropertyActive = async (propId: string, isActive: boolean) => {
    await supabase.from('properties').update({ is_active: !isActive }).eq('id', propId);
    toast({ title: isActive ? 'Listing deactivated' : 'Listing activated' });
    fetchData();
  };

  const filteredUsers = users.filter((u) =>
    (u.display_name || u.email || '').toLowerCase().includes(searchQuery.toLowerCase())
  );

  if (authLoading || (!isAdmin && !authLoading)) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Loader2 className="animate-spin text-primary" size={32} />
      </div>
    );
  }

  const tabs: { id: Tab; label: string; icon: any }[] = [
    { id: 'overview', label: 'Overview', icon: BarChart3 },
    { id: 'users', label: 'Users & Agents', icon: Users },
    { id: 'listings', label: 'Listings', icon: Building2 },
    { id: 'roles', label: 'Manage Roles', icon: Shield },
  ];

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="sticky top-0 z-30 bg-card/80 backdrop-blur-md border-b border-border">
        <div className="max-w-7xl mx-auto px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <button onClick={() => navigate('/')} className="w-9 h-9 rounded-xl bg-secondary flex items-center justify-center">
              <ArrowLeft size={18} />
            </button>
            <div>
              <h1 className="font-display text-lg font-bold text-foreground flex items-center gap-2">
                <Shield size={18} className="text-primary" /> Admin Dashboard
              </h1>
              <p className="text-xs text-muted-foreground">Platform management & analytics</p>
            </div>
          </div>
        </div>
      </header>

      <div className="max-w-7xl mx-auto px-4 py-6">
        {/* Tabs */}
        <div className="flex gap-1 mb-6 overflow-x-auto pb-2">
          {tabs.map((t) => (
            <button
              key={t.id}
              onClick={() => setTab(t.id)}
              className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium whitespace-nowrap transition-colors ${
                tab === t.id ? 'bg-primary text-primary-foreground' : 'bg-secondary text-muted-foreground hover:text-foreground'
              }`}
            >
              <t.icon size={16} />
              {t.label}
            </button>
          ))}
        </div>

        {loading ? (
          <div className="flex justify-center py-20">
            <Loader2 className="animate-spin text-primary" size={32} />
          </div>
        ) : (
          <>
            {/* Overview */}
            {tab === 'overview' && (
              <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-6">
                <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
                  {[
                    { label: 'Total Users', value: stats.totalUsers, color: 'text-primary' },
                    { label: 'Agents', value: stats.totalAgents, color: 'text-emerald-400' },
                    { label: 'Listings', value: stats.totalListings, color: 'text-purple-400' },
                    { label: 'Leads', value: stats.totalLeads, color: 'text-amber-400' },
                    { label: 'Voice Searches', value: stats.totalVoiceSearches, color: 'text-cyan-400' },
                  ].map((s) => (
                    <div key={s.label} className="bg-card border border-border rounded-xl p-4">
                      <p className="text-xs text-muted-foreground mb-1">{s.label}</p>
                      <p className={`text-2xl font-bold ${s.color}`}>{s.value}</p>
                    </div>
                  ))}
                </div>

                <div className="bg-card border border-border rounded-xl p-5">
                  <h3 className="font-display font-semibold text-foreground mb-3">Recent Users</h3>
                  <div className="space-y-2">
                    {users.slice(0, 10).map((u) => (
                      <div key={u.id} className="flex items-center justify-between py-2 border-b border-border last:border-0">
                        <div>
                          <p className="text-sm font-medium text-foreground">{u.display_name || u.email}</p>
                          <p className="text-xs text-muted-foreground">{new Date(u.created_at).toLocaleDateString()}</p>
                        </div>
                        <div className="flex gap-1">
                          {u.roles.map((r) => (
                            <span key={r} className={`text-xs px-2 py-0.5 rounded-full font-medium ${
                              r === 'admin' ? 'bg-red-500/20 text-red-400' :
                              r === 'agent' ? 'bg-emerald-500/20 text-emerald-400' :
                              'bg-muted text-muted-foreground'
                            }`}>{r}</span>
                          ))}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </motion.div>
            )}

            {/* Users & Agents */}
            {tab === 'users' && (
              <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
                <div className="mb-4">
                  <div className="relative max-w-sm">
                    <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
                    <input
                      type="text"
                      placeholder="Search users..."
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      className="w-full pl-9 pr-4 py-2.5 rounded-xl bg-secondary text-foreground text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/30"
                    />
                  </div>
                </div>
                <div className="bg-card border border-border rounded-xl overflow-hidden">
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="border-b border-border">
                          <th className="text-left p-3 text-muted-foreground font-medium">Name</th>
                          <th className="text-left p-3 text-muted-foreground font-medium">Roles</th>
                          <th className="text-left p-3 text-muted-foreground font-medium">Joined</th>
                        </tr>
                      </thead>
                      <tbody>
                        {filteredUsers.map((u) => (
                          <tr key={u.id} className="border-b border-border last:border-0 hover:bg-accent/50">
                            <td className="p-3 text-foreground font-medium">{u.display_name || u.email}</td>
                            <td className="p-3">
                              <div className="flex gap-1">
                                {u.roles.map((r) => (
                                  <span key={r} className={`text-xs px-2 py-0.5 rounded-full font-medium ${
                                    r === 'admin' ? 'bg-red-500/20 text-red-400' :
                                    r === 'agent' ? 'bg-emerald-500/20 text-emerald-400' :
                                    'bg-muted text-muted-foreground'
                                  }`}>{r}</span>
                                ))}
                              </div>
                            </td>
                            <td className="p-3 text-muted-foreground">{new Date(u.created_at).toLocaleDateString()}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                  {filteredUsers.length === 0 && (
                    <p className="text-center py-8 text-muted-foreground text-sm">No users found</p>
                  )}
                </div>
              </motion.div>
            )}

            {/* Listings */}
            {tab === 'listings' && (
              <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
                <div className="bg-card border border-border rounded-xl overflow-hidden">
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="border-b border-border">
                          <th className="text-left p-3 text-muted-foreground font-medium">Property</th>
                          <th className="text-left p-3 text-muted-foreground font-medium">Price</th>
                          <th className="text-left p-3 text-muted-foreground font-medium">Views</th>
                          <th className="text-left p-3 text-muted-foreground font-medium">Status</th>
                          <th className="text-left p-3 text-muted-foreground font-medium">Actions</th>
                        </tr>
                      </thead>
                      <tbody>
                        {properties.map((p) => (
                          <tr key={p.id} className="border-b border-border last:border-0 hover:bg-accent/50">
                            <td className="p-3">
                              <p className="text-foreground font-medium">{p.title}</p>
                              <p className="text-xs text-muted-foreground">{p.address}, {p.suburb}</p>
                            </td>
                            <td className="p-3 text-foreground">{p.price_formatted}</td>
                            <td className="p-3 text-muted-foreground">{p.views}</td>
                            <td className="p-3">
                              <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${
                                p.is_active ? 'bg-emerald-500/20 text-emerald-400' : 'bg-red-500/20 text-red-400'
                              }`}>{p.is_active ? 'Active' : 'Inactive'}</span>
                            </td>
                            <td className="p-3">
                              <button
                                onClick={() => togglePropertyActive(p.id, p.is_active)}
                                className="text-xs px-3 py-1 rounded-lg bg-secondary text-foreground hover:bg-accent transition-colors"
                              >
                                {p.is_active ? 'Deactivate' : 'Activate'}
                              </button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                  {properties.length === 0 && (
                    <p className="text-center py-8 text-muted-foreground text-sm">No listings yet</p>
                  )}
                </div>
              </motion.div>
            )}

            {/* Manage Roles */}
            {tab === 'roles' && (
              <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
                <div className="mb-4">
                  <div className="relative max-w-sm">
                    <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
                    <input
                      type="text"
                      placeholder="Search users to manage roles..."
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      className="w-full pl-9 pr-4 py-2.5 rounded-xl bg-secondary text-foreground text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/30"
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  {filteredUsers.map((u) => (
                    <div key={u.id} className="bg-card border border-border rounded-xl p-4 flex flex-col sm:flex-row sm:items-center gap-3 justify-between">
                      <div>
                        <p className="text-sm font-medium text-foreground">{u.display_name || u.email}</p>
                        <p className="text-xs text-muted-foreground">ID: {u.id.slice(0, 8)}...</p>
                      </div>
                      <div className="flex flex-wrap gap-2">
                        {(['user', 'agent', 'admin'] as const).map((role) => {
                          const hasRole = u.roles.includes(role);
                          return (
                            <button
                              key={role}
                              onClick={() => handleRoleChange(u.id, role, hasRole ? 'remove' : 'add')}
                              className={`text-xs px-3 py-1.5 rounded-lg font-medium transition-colors ${
                                hasRole
                                  ? role === 'admin' ? 'bg-red-500/20 text-red-400 hover:bg-red-500/30' :
                                    role === 'agent' ? 'bg-emerald-500/20 text-emerald-400 hover:bg-emerald-500/30' :
                                    'bg-primary/20 text-primary hover:bg-primary/30'
                                  : 'bg-secondary text-muted-foreground hover:text-foreground'
                              }`}
                            >
                              {hasRole ? `✓ ${role}` : `+ ${role}`}
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  ))}
                </div>
              </motion.div>
            )}
          </>
        )}
      </div>
    </div>
  );
};

export default AdminDashboard;
