import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Users, Building2, BarChart3, Shield, Database, ArrowLeft, Loader2 } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/lib/AuthProvider';
import { useToast } from '@/hooks/use-toast';
import AdminOverview from '@/components/admin/AdminOverview';
import AdminUsers from '@/components/admin/AdminUsers';
import AdminListings from '@/components/admin/AdminListings';
import AdminRoles from '@/components/admin/AdminRoles';
import AdminDatabase from '@/components/admin/AdminDatabase';

type Tab = 'overview' | 'users' | 'listings' | 'roles' | 'database';

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
          await supabase.from('agents').insert({ user_id: userId, name: userProfile?.display_name || 'Agent', email: userProfile?.email });
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

  if (authLoading || (!isAdmin && !authLoading)) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Loader2 className="animate-spin text-primary" size={32} />
      </div>
    );
  }

  const tabs: { id: Tab; label: string; icon: any }[] = [
    { id: 'overview', label: 'Overview', icon: BarChart3 },
    { id: 'users', label: 'Users', icon: Users },
    { id: 'listings', label: 'Listings', icon: Building2 },
    { id: 'roles', label: 'Roles', icon: Shield },
    { id: 'database', label: 'Database', icon: Database },
  ];

  return (
    <div className="min-h-screen bg-background">
      <header className="sticky top-0 z-30 bg-card/80 backdrop-blur-md border-b border-border">
        <div className="max-w-7xl mx-auto px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <button onClick={() => navigate('/')} className="w-9 h-9 rounded-xl bg-secondary flex items-center justify-center">
              <ArrowLeft size={18} />
            </button>
            <div>
              <h1 className="text-lg font-bold text-foreground flex items-center gap-2">
                <Shield size={18} className="text-primary" /> Admin Dashboard
              </h1>
              <p className="text-xs text-muted-foreground">Platform management & analytics</p>
            </div>
          </div>
        </div>
      </header>

      <div className="max-w-7xl mx-auto px-4 py-6">
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

        {loading && tab !== 'users' && tab !== 'database' ? (
          <div className="flex justify-center py-20">
            <Loader2 className="animate-spin text-primary" size={32} />
          </div>
        ) : (
          <>
            {tab === 'overview' && <AdminOverview stats={stats} users={users} />}
            {tab === 'users' && <AdminUsers />}
            {tab === 'listings' && <AdminListings properties={properties} onToggleActive={togglePropertyActive} />}
            {tab === 'roles' && <AdminRoles users={users} searchQuery={searchQuery} onSearchChange={setSearchQuery} onRoleChange={handleRoleChange} />}
            {tab === 'database' && <AdminDatabase />}
          </>
        )}
      </div>
    </div>
  );
};

export default AdminDashboard;
