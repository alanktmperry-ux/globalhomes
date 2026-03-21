import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Users, Building2, BarChart3, Shield, Database, ArrowLeft, Loader2, Gamepad2 } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/features/auth/AuthProvider';
import { useToast } from '@/shared/hooks/use-toast';
import AdminOverview from '@/features/admin/components/AdminOverview';
import AdminUsers from '@/features/admin/components/AdminUsers';
import AdminListings from '@/features/admin/components/AdminListings';
import AdminRoles from '@/features/admin/components/AdminRoles';
import AdminDatabase from '@/features/admin/components/AdminDatabase';
import AdminDemoRequests from '@/features/admin/components/AdminDemoRequests';

type Tab = 'overview' | 'users' | 'listings' | 'roles' | 'database' | 'demo-requests';

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
  is_featured: boolean;
  featured_until: string | null;
  boost_tier: string | null;
  boost_requested_at: string | null;
  boost_requested_tier: string | null;
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
  const [pendingDemoCount, setPendingDemoCount] = useState(0);

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

    const { data: propData } = await supabase.from('properties').select('id, title, address, suburb, price_formatted, is_active, views, created_at, is_featured, featured_until, boost_tier, boost_requested_at, boost_requested_tier').order('created_at', { ascending: false }).limit(100);
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

  const activateBoost = async (id: string, tier: 'featured' | 'premier', days: number) => {
    const until = new Date();
    until.setDate(until.getDate() + days);
    const { error } = await supabase
      .from('properties')
      .update({
        is_featured: true,
        featured_until: until.toISOString(),
        boost_tier: tier,
        boost_requested_at: null,
        boost_requested_tier: null,
      } as any)
      .eq('id', id);
    if (!error) {
      // Send bell notification to agent
      const { data: propData } = await supabase
        .from('properties')
        .select('agent_id, address, suburb')
        .eq('id', id)
        .maybeSingle();

      if (propData?.agent_id) {
        await supabase.from('notifications').insert({
          agent_id: propData.agent_id,
          type: 'boost_activated',
          title: `⚡ Your ${tier} boost is live!`,
          message:
            `${propData.address} is now in the`
            + ` featured grid near`
            + ` ${propData.suburb}.`
            + ` Live for ${days} days.`,
          property_id: id,
        } as any);
      }

      toast({ title: `${tier} boost activated for ${days} days` });
      fetchData();
    }
  };

  if (authLoading || (!isAdmin && !authLoading)) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Loader2 className="animate-spin text-primary" size={32} />
      </div>
    );
  }

  const tabs: { id: Tab; label: string; icon: any; badge?: number }[] = [
    { id: 'overview', label: 'Overview', icon: BarChart3 },
    { id: 'users', label: 'Users', icon: Users },
    { id: 'listings', label: 'Listings', icon: Building2 },
    { id: 'roles', label: 'Roles', icon: Shield },
    { id: 'database', label: 'Database', icon: Database },
    { id: 'demo-requests', label: 'Demo Requests', icon: Gamepad2, badge: pendingDemoCount },
  ];

  return (
    <div className="min-h-screen bg-background">
      <header className="sticky top-0 z-30 bg-card/80 backdrop-blur-md border-b border-border">
        <div className="max-w-7xl mx-auto px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <button onClick={() => navigate('/dashboard')} className="w-9 h-9 rounded-xl bg-secondary flex items-center justify-center" title="Back to Dashboard">
              <ArrowLeft size={18} />
            </button>
            <div>
              <button onClick={() => navigate('/')} className="text-lg font-bold text-foreground flex items-center gap-2 hover:text-primary transition-colors">
                <Shield size={18} className="text-primary" /> Admin Dashboard
              </button>
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
              className={`relative flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium whitespace-nowrap transition-colors ${
                tab === t.id ? 'bg-primary text-primary-foreground' : 'bg-secondary text-muted-foreground hover:text-foreground'
              }`}
            >
              <t.icon size={16} />
              {t.label}
              {t.badge != null && t.badge > 0 && (
                <span className="absolute -top-1 -right-1 min-w-[18px] h-[18px] flex items-center justify-center rounded-full bg-destructive text-destructive-foreground text-[10px] font-bold px-1">
                  {t.badge}
                </span>
              )}
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
            {tab === 'listings' && <AdminListings properties={properties} onToggleActive={togglePropertyActive} onActivateBoost={activateBoost} />}
            {tab === 'roles' && <AdminRoles users={users} searchQuery={searchQuery} onSearchChange={setSearchQuery} onRoleChange={handleRoleChange} />}
            {tab === 'database' && <AdminDatabase />}
            {tab === 'demo-requests' && <AdminDemoRequests onPendingCountChange={setPendingDemoCount} />}
          </>
        )}
      </div>
    </div>
  );
};

export default AdminDashboard;
