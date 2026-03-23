import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Users, Building2, BarChart3, Shield, ShieldAlert, Database, ArrowLeft, Loader2, Gamepad2, Zap, DollarSign, Megaphone, Landmark } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/features/auth/AuthProvider';
import { toast } from 'sonner';
import AdminOverview from '@/features/admin/components/AdminOverview';
import AdminUsers from '@/features/admin/components/AdminUsers';
import AdminListings from '@/features/admin/components/AdminListings';
import AdminRoles from '@/features/admin/components/AdminRoles';
import AdminDatabase from '@/features/admin/components/AdminDatabase';
import AdminDemoRequests from '@/features/admin/components/AdminDemoRequests';
import AdminReports from '@/features/admin/components/AdminReports';
import CommandCentre from '@/features/admin/components/CommandCentre';
import AgentLifecycle from '@/features/admin/components/AgentLifecycle';
import ComplianceMonitor from '@/features/admin/components/ComplianceMonitor';
import RevenueBilling from '@/features/admin/components/RevenueBilling';
import CommsCentre from '@/features/admin/components/CommsCentre';
import PartnerPerformance from '@/features/admin/components/PartnerPerformance';

type Tab = 'command-centre' | 'agent-lifecycle' | 'compliance' | 'revenue' | 'comms' | 'partners' | 'overview' | 'users' | 'listings' | 'roles' | 'database' | 'demo-requests' | 'reports';

interface UserRow {
  id: string;
  email: string;
  created_at: string;
  display_name?: string;
  roles: string[];
  last_sign_in_at?: string | null;
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

export interface InsightsData {
  // Subscriptions
  activeSubscriptions: number;
  trialAgents: number;
  trialsExpiringThisWeek: number;
  // Platform activity
  listingsPublished: number;
  listingsThisWeek: number;
  voiceSearches30d: number;
  voiceSearchesPrev30d: number;
  leadsToday: number;
  leads30d: number;
  // Listing health
  avgViewsPerListing: number;
  boostRequestsPending: number;
  inactiveListings: number; // no views in 14 days
  listingsNoPhotos: number;
  // Needs attention
  agentsNoListings: number;
  // Voice search languages
  topLanguages: { language: string; count: number }[];
}

const AdminDashboard = () => {
  const navigate = useNavigate();
  const { user, isAdmin, loading: authLoading } = useAuth();
  const [tab, setTab] = useState<Tab>('command-centre');
  const [users, setUsers] = useState<UserRow[]>([]);
  const [properties, setProperties] = useState<PropertyRow[]>([]);
  const [stats, setStats] = useState({ totalUsers: 0, totalAgents: 0, totalListings: 0, totalLeads: 0, totalVoiceSearches: 0 });
  const [insights, setInsights] = useState<InsightsData | null>(null);
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

    const now = new Date();
    const day30ago = new Date(now.getTime() - 30 * 86400000).toISOString();
    const day60ago = new Date(now.getTime() - 60 * 86400000).toISOString();
    const day7ago = new Date(now.getTime() - 7 * 86400000).toISOString();
    const day14ago = new Date(now.getTime() - 14 * 86400000).toISOString();
    const todayStart = new Date(now.setHours(0, 0, 0, 0)).toISOString();

    const [
      profilesRes, agentsRes, propsRes, leadsRes, voiceRes,
      profileData, roleData,
      agentsFull, propsFull,
      voice30d, voicePrev30d,
      leadsToday, leads30d,
      voiceLang,
    ] = await Promise.all([
      supabase.from('profiles').select('id', { count: 'exact', head: true }),
      supabase.from('agents').select('id', { count: 'exact', head: true }),
      supabase.from('properties').select('id', { count: 'exact', head: true }),
      supabase.from('leads').select('id', { count: 'exact', head: true }),
      supabase.from('voice_searches').select('id', { count: 'exact', head: true }),
      supabase.from('profiles').select('user_id, display_name, created_at'),
      supabase.from('user_roles').select('user_id, role'),
      supabase.from('agents').select('id, user_id, is_subscribed, subscription_expires_at, onboarding_complete, agency_id, created_at'),
      supabase.from('properties').select('id, title, address, suburb, price_formatted, is_active, views, images, created_at, is_featured, featured_until, boost_tier, boost_requested_at, boost_requested_tier, agent_id, listed_date').order('created_at', { ascending: false }).limit(200),
      supabase.from('voice_searches').select('id', { count: 'exact', head: true }).gte('created_at', day30ago),
      supabase.from('voice_searches').select('id', { count: 'exact', head: true }).gte('created_at', day60ago).lt('created_at', day30ago),
      supabase.from('leads').select('id', { count: 'exact', head: true }).gte('created_at', todayStart),
      supabase.from('leads').select('id', { count: 'exact', head: true }).gte('created_at', day30ago),
      supabase.from('voice_searches').select('detected_language').gte('created_at', day30ago),
    ]);

    setStats({
      totalUsers: profilesRes.count || 0,
      totalAgents: agentsRes.count || 0,
      totalListings: propsRes.count || 0,
      totalLeads: leadsRes.count || 0,
      totalVoiceSearches: voiceRes.count || 0,
    });

    // Build user rows
    const roleMap = new Map<string, string[]>();
    roleData.data?.forEach((r) => {
      const existing = roleMap.get(r.user_id) || [];
      existing.push(r.role);
      roleMap.set(r.user_id, existing);
    });

    const { data: sessionData } = await supabase.auth.getSession();
    const signInMap = new Map<string, string | null>();
    const token = sessionData.session?.access_token;
    if (token) {
      try {
        const res = await fetch(
          `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/admin-users?action=list_users`,
          {
            headers: {
              Authorization: `Bearer ${token}`,
              'Content-Type': 'application/json',
            },
          }
        );
        if (res.ok) {
          const adminData = await res.json();
          (adminData.users || []).forEach((u: any) => {
            signInMap.set(u.id, u.last_sign_in_at || null);
          });
        }
      } catch {}
    }

    const userRows: UserRow[] = (profileData.data || []).map((p) => ({
      id: p.user_id,
      email: p.display_name || 'Unknown',
      created_at: p.created_at,
      display_name: p.display_name || undefined,
      roles: roleMap.get(p.user_id) || ['user'],
      last_sign_in_at: signInMap.get(p.user_id) ?? null,
    }));
    setUsers(userRows);

    const allProps = propsFull.data || [];
    setProperties(allProps as PropertyRow[]);

    // --- Build insights ---
    const agents = agentsFull.data || [];
    const agentIds = new Set(agents.map((a) => a.id));

    // Subscriptions
    const activeSubscriptions = agents.filter((a) => a.is_subscribed).length;
    const trialAgents = agents.filter((a) => !a.is_subscribed).length;
    const trialsExpiringThisWeek = agents.filter((a) => {
      if (a.is_subscribed || !a.created_at) return false;
      const trialEnd = new Date(new Date(a.created_at).getTime() + 60 * 86400000);
      return trialEnd > now && trialEnd <= new Date(now.getTime() + 7 * 86400000);
    }).length;

    // Listings
    const activeProps = allProps.filter((p) => p.is_active);
    const listingsThisWeek = allProps.filter((p) => p.created_at >= day7ago).length;
    const totalViews = activeProps.reduce((sum, p) => sum + (p.views || 0), 0);
    const avgViewsPerListing = activeProps.length > 0 ? Math.round(totalViews / activeProps.length) : 0;
    const boostRequestsPending = allProps.filter((p) => p.boost_requested_at && !p.is_featured).length;
    const inactiveListings = activeProps.filter((p) => (p.views || 0) === 0).length;
    const listingsNoPhotos = allProps.filter((p) => {
      const imgs = (p as any).images;
      return !imgs || imgs.length === 0;
    }).length;

    // Agents with no listings
    const agentsWithListings = new Set(allProps.map((p) => (p as any).agent_id).filter(Boolean));
    const agentsNoListings = agents.filter((a) => !agentsWithListings.has(a.id)).length;

    // Voice languages
    const langCount = new Map<string, number>();
    (voiceLang.data || []).forEach((v: any) => {
      const lang = v.detected_language || 'en';
      langCount.set(lang, (langCount.get(lang) || 0) + 1);
    });
    const langLabels: Record<string, string> = {
      en: 'English', zh: 'Mandarin', ar: 'Arabic',
      hi: 'Hindi', vi: 'Vietnamese', ko: 'Korean',
      ja: 'Japanese', es: 'Spanish', fr: 'French',
      it: 'Italian', pt: 'Portuguese', de: 'German',
    };
    const topLanguages = Array.from(langCount.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, 6)
      .map(([lang, count]) => ({ language: langLabels[lang] || lang.toUpperCase(), count }));

    setInsights({
      activeSubscriptions,
      trialAgents,
      trialsExpiringThisWeek,
      listingsPublished: activeProps.length,
      listingsThisWeek,
      voiceSearches30d: voice30d.count || 0,
      voiceSearchesPrev30d: voicePrev30d.count || 0,
      leadsToday: leadsToday.count || 0,
      leads30d: leads30d.count || 0,
      avgViewsPerListing,
      boostRequestsPending,
      inactiveListings,
      listingsNoPhotos,
      agentsNoListings,
      topLanguages,
    });

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
      toast(`Role "${role}" added`);
    } else {
      await supabase.from('user_roles').delete().eq('user_id', userId).eq('role', role as any);
      toast(`Role "${role}" removed`);
    }
    fetchData();
  };

  const togglePropertyActive = async (propId: string, isActive: boolean) => {
    await supabase.from('properties').update({ is_active: !isActive }).eq('id', propId);
    toast(isActive ? 'Listing deactivated' : 'Listing activated');
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
          message: `${propData.address} is now in the featured grid near ${propData.suburb}. Live for ${days} days.`,
          property_id: id,
        } as any);
      }

      toast(`${tier} boost activated for ${days} days`);
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
    { id: 'command-centre', label: 'Command Centre', icon: Zap },
    { id: 'agent-lifecycle', label: 'Agent Lifecycle', icon: Users },
    { id: 'compliance', label: 'Compliance', icon: ShieldAlert },
    { id: 'revenue', label: 'Revenue & Billing', icon: DollarSign },
    { id: 'comms', label: 'Communications', icon: Megaphone },
    { id: 'partners', label: 'Partners', icon: Landmark },
    { id: 'overview', label: 'Overview', icon: BarChart3 },
    { id: 'users', label: 'Users', icon: Users },
    { id: 'listings', label: 'Listings', icon: Building2 },
    { id: 'roles', label: 'Roles', icon: Shield },
    { id: 'database', label: 'Database', icon: Database },
    { id: 'demo-requests', label: 'Demo Requests', icon: Gamepad2, badge: pendingDemoCount },
    { id: 'reports', label: 'Reports', icon: BarChart3 },
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
            {tab === 'command-centre' && <CommandCentre />}
            {tab === 'agent-lifecycle' && <AgentLifecycle />}
            {tab === 'compliance' && <ComplianceMonitor />}
            {tab === 'revenue' && <RevenueBilling />}
            {tab === 'comms' && <CommsCentre />}
            {tab === 'overview' && <AdminOverview stats={stats} users={users} insights={insights} />}
            {tab === 'users' && <AdminUsers />}
            {tab === 'listings' && <AdminListings properties={properties} onToggleActive={togglePropertyActive} onActivateBoost={activateBoost} />}
            {tab === 'roles' && <AdminRoles users={users} searchQuery={searchQuery} onSearchChange={setSearchQuery} onRoleChange={handleRoleChange} />}
            {tab === 'database' && <AdminDatabase />}
            {tab === 'demo-requests' && <AdminDemoRequests onPendingCountChange={setPendingDemoCount} />}
            {tab === 'reports' && <AdminReports isAdmin={true} />}
          </>
        )}
      </div>
    </div>
  );
};

export default AdminDashboard;
