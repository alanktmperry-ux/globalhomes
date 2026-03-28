import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Users, Building2, BarChart3, Shield, ShieldAlert, Database, ArrowLeft, Loader2, Gamepad2, Zap, DollarSign, Megaphone, Landmark, TrendingUp, MessageSquare, FileText, UserCheck, Brain, ChevronRight } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/features/auth/AuthProvider';
import { toast } from 'sonner';
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
import GrowthFunnel from '@/features/admin/components/GrowthFunnel';
import SupportInbox from '@/features/admin/components/SupportInbox';
import AIInsights from '@/features/admin/components/AIInsights';
import PreLaunchChecklist from '@/features/admin/components/PreLaunchChecklist';

type Tab = 'command-centre' | 'agent-lifecycle' | 'compliance' | 'revenue' | 'comms' | 'partners' | 'growth' | 'support' | 'users' | 'listings' | 'roles' | 'database' | 'demo-requests' | 'reports' | 'ai-insights' | 'pre-launch';

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
  activeSubscriptions: number;
  trialAgents: number;
  trialsExpiringThisWeek: number;
  listingsPublished: number;
  listingsThisWeek: number;
  voiceSearches30d: number;
  voiceSearchesPrev30d: number;
  leadsToday: number;
  leads30d: number;
  avgViewsPerListing: number;
  boostRequestsPending: number;
  inactiveListings: number;
  listingsNoPhotos: number;
  agentsNoListings: number;
  topLanguages: { language: string; count: number }[];
}

const NavItem = ({
  id, label, icon: Icon, tab, setTab, badge,
}: {
  id: Tab; label: string; icon: any; tab: Tab; setTab: (t: Tab) => void; badge?: number;
}) => (
  <button
    onClick={() => setTab(id)}
    className={`relative w-full flex items-center gap-2.5 px-2.5 py-1.5 rounded-lg text-sm transition-colors text-left ${
      tab === id
        ? 'bg-primary text-primary-foreground font-medium'
        : 'text-muted-foreground hover:text-foreground hover:bg-accent'
    }`}
  >
    <Icon size={16} />
    {label}
    {badge != null && badge > 0 && (
      <span className="absolute right-2 min-w-[18px] h-[18px] flex items-center justify-center rounded-full bg-destructive text-destructive-foreground text-[10px] font-bold px-1">
        {badge}
      </span>
    )}
  </button>
);

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

    const agents = agentsFull.data || [];
    const activeSubscriptions = agents.filter((a) => a.is_subscribed).length;
    const trialAgents = agents.filter((a) => !a.is_subscribed).length;
    const trialsExpiringThisWeek = agents.filter((a) => {
      if (a.is_subscribed || !a.created_at) return false;
      const trialEnd = new Date(new Date(a.created_at).getTime() + 60 * 86400000);
      return trialEnd > now && trialEnd <= new Date(now.getTime() + 7 * 86400000);
    }).length;

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

    const agentsWithListings = new Set(allProps.map((p) => (p as any).agent_id).filter(Boolean));
    const agentsNoListings = agents.filter((a) => !agentsWithListings.has(a.id)).length;

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

  return (
    <div className="min-h-screen bg-background flex">

      {/* ── LEFT SIDEBAR ── */}
      <aside className="w-[220px] flex-shrink-0 border-r border-border bg-card/60 backdrop-blur-md flex flex-col sticky top-0 h-screen overflow-y-auto">

        {/* Header */}
        <div className="px-4 pt-5 pb-3 border-b border-border">
          <button onClick={() => navigate('/dashboard')} className="flex items-center gap-2 text-sm font-bold text-foreground hover:text-primary transition-colors">
            <Shield size={18} className="text-primary" />
            Admin
          </button>
          <p className="text-[10px] text-muted-foreground mt-0.5">Platform management</p>
        </div>

        {/* Nav */}
        <nav className="flex-1 px-2.5 py-3 space-y-4 text-sm">

          {/* HOME */}
          <div className="space-y-0.5">
            <p className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground/60 px-2.5 mb-1">Home</p>
            <NavItem id="command-centre" label="Command Centre" icon={Zap} tab={tab} setTab={setTab} />
          </div>

          {/* URGENT */}
          <div className="space-y-0.5">
            <p className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground/60 px-2.5 mb-1">Urgent</p>
            <NavItem id="demo-requests" label="Demo Requests" icon={Gamepad2} tab={tab} setTab={setTab} badge={pendingDemoCount} />
            <NavItem id="support" label="Support Inbox" icon={MessageSquare} tab={tab} setTab={setTab} />
          </div>

          {/* AGENTS */}
          <div className="space-y-0.5">
            <p className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground/60 px-2.5 mb-1">Agents</p>
            <NavItem id="agent-lifecycle" label="Agent Lifecycle" icon={Users} tab={tab} setTab={setTab} />
            <NavItem id="users" label="Users" icon={UserCheck} tab={tab} setTab={setTab} />
            <NavItem id="roles" label="Roles" icon={Shield} tab={tab} setTab={setTab} />
          </div>

          {/* PLATFORM */}
          <div className="space-y-0.5">
            <p className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground/60 px-2.5 mb-1">Platform</p>
            <NavItem id="listings" label="Listings" icon={Building2} tab={tab} setTab={setTab} />
            <NavItem id="revenue" label="Revenue & Billing" icon={DollarSign} tab={tab} setTab={setTab} />
            <NavItem id="growth" label="Growth Funnel" icon={TrendingUp} tab={tab} setTab={setTab} />
          </div>

          {/* ENGAGE */}
          <div className="space-y-0.5">
            <p className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground/60 px-2.5 mb-1">Engage</p>
            <NavItem id="comms" label="Communications" icon={Megaphone} tab={tab} setTab={setTab} />
            <NavItem id="partners" label="Partners" icon={Landmark} tab={tab} setTab={setTab} />
          </div>

          {/* COMPLIANCE */}
          <div className="space-y-0.5">
            <p className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground/60 px-2.5 mb-1">Compliance</p>
            <NavItem id="compliance" label="Compliance" icon={ShieldAlert} tab={tab} setTab={setTab} />
          </div>

          {/* AI */}
          <div className="space-y-0.5">
            <p className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground/60 px-2.5 mb-1">AI</p>
            <NavItem id="ai-insights" label="AI Insights" icon={Brain} tab={tab} setTab={setTab} />
          </div>

          {/* SYSTEM */}
          <div className="space-y-0.5">
            <p className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground/60 px-2.5 mb-1">System</p>
            <NavItem id="reports" label="Reports" icon={FileText} tab={tab} setTab={setTab} />
            <NavItem id="database" label="Database" icon={Database} tab={tab} setTab={setTab} />
          </div>

        </nav>

        {/* Footer */}
        <div className="px-4 py-3 border-t border-border">
          <button onClick={() => navigate('/dashboard')} className="flex items-center gap-2 text-xs text-muted-foreground hover:text-foreground transition-colors">
            <ArrowLeft size={14} /> Back to Dashboard
          </button>
        </div>

      </aside>

      {/* ── CONTENT AREA ── */}
      <main className="flex-1 min-w-0 overflow-y-auto">
        <div className="max-w-6xl mx-auto px-6 py-6">
          {loading && tab !== 'users' && tab !== 'database' && tab !== 'ai-insights' ? (
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
              {tab === 'partners' && <PartnerPerformance />}
              {tab === 'growth' && <GrowthFunnel />}
              {tab === 'support' && <SupportInbox />}
              {tab === 'users' && <AdminUsers />}
              {tab === 'listings' && <AdminListings properties={properties} onToggleActive={togglePropertyActive} onActivateBoost={activateBoost} />}
              {tab === 'roles' && <AdminRoles users={users} searchQuery={searchQuery} onSearchChange={setSearchQuery} onRoleChange={handleRoleChange} />}
              {tab === 'database' && <AdminDatabase />}
              {tab === 'demo-requests' && <AdminDemoRequests onPendingCountChange={setPendingDemoCount} />}
              {tab === 'reports' && <AdminReports isAdmin={true} />}
              {tab === 'ai-insights' && <AIInsights />}
            </>
          )}
        </div>
      </main>

    </div>
  );
};

export default AdminDashboard;
