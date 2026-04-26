import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Loader2 } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { dispatchNotification } from '@/shared/lib/notify';
import { useAuth } from '@/features/auth/AuthProvider';
import { toast } from 'sonner';
import { buildAuditMeta } from '@/shared/lib/auditLog';
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
import LegalComplianceChecklist from '@/features/admin/components/LegalComplianceChecklist';
import PressOutreachPage from '@/features/admin/components/PressOutreachPage';
import PreApprovalReview from '@/features/admin/components/PreApprovalReview';
import AgentApprovalQueue from '@/features/admin/components/AgentApprovalQueue';
import ListingModerationQueue from '@/features/admin/components/ListingModerationQueue';
import AdminSidebar, { type AdminTab } from '@/features/admin/components/AdminSidebar';

type Tab = AdminTab;

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
  const [pendingApprovalCount, setPendingApprovalCount] = useState(0);
  const [pendingModerationCount, setPendingModerationCount] = useState(0);
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

    const signInMap = new Map<string, string | null>();
    try {
      const { callAdminFunction } = await import('@/features/admin/lib/adminApi');
      const adminData = await callAdminFunction('list_users');
      (adminData?.users || []).forEach((u: any) => {
        signInMap.set(u.id, u.last_sign_in_at || null);
      });
    } catch {}

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

  const logAdminAction = async (propertyId: string, actionName: string) => {
    const { error: auditError } = await supabase.from('audit_log').insert({
      user_id: user?.id ?? null,
      action_type: 'admin_property_action',
      entity_type: 'property',
      entity_id: propertyId,
      description: `Admin ${actionName} property`,
      metadata: buildAuditMeta({ action: actionName, admin_email: user?.email }),
    });
    if (auditError) console.error('[AdminDashboard] audit log failed:', auditError);
  };

  const togglePropertyActive = async (propId: string, isActive: boolean) => {
    const { error } = await supabase.from('properties').update({ is_active: !isActive }).eq('id', propId);
    if (!error) {
      await logAdminAction(propId, isActive ? 'deactivated' : 'activated');
    }
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
      await logAdminAction(id, `boost_approved_${tier}`);

      const { data: propData } = await supabase
        .from('properties')
        .select('agent_id, address, suburb')
        .eq('id', id)
        .maybeSingle();

      if (propData?.agent_id) {
        await dispatchNotification({
          agent_id: propData.agent_id,
          event_key: 'listing_approved',
          type: 'boost_activated',
          title: `⚡ Your ${tier} boost is live!`,
          message: `${propData.address} is now in the featured grid near ${propData.suburb}. Live for ${days} days.`,
          property_id: id,
        });
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
    <div className="min-h-screen bg-background flex flex-col md:flex-row">

      <AdminSidebar tab={tab} setTab={setTab} pendingDemoCount={pendingDemoCount} pendingApprovalCount={pendingApprovalCount} pendingModerationCount={pendingModerationCount} />

      {/* ── CONTENT AREA ── */}
      <main className="flex-1 min-w-0 overflow-y-auto">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 py-6">
          {loading && tab !== 'users' && tab !== 'database' && tab !== 'ai-insights' ? (
            <div className="flex justify-center py-20">
              <Loader2 className="animate-spin text-primary" size={32} />
            </div>
          ) : (
            <>
              {tab === 'command-centre' && <CommandCentre />}
              {tab === 'agent-approval' && <AgentApprovalQueue onPendingCountChange={setPendingApprovalCount} />}
              {tab === 'listing-review' && <ListingModerationQueue onPendingCountChange={setPendingModerationCount} />}
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
              {tab === 'pre-launch' && <PreLaunchChecklist />}
              {tab === 'legal-compliance' && <LegalComplianceChecklist />}
              {tab === 'press-outreach' && <PressOutreachPage />}
              {tab === 'pre-approval-review' && <PreApprovalReview />}
            </>
          )}
        </div>
      </main>

    </div>
  );
};

export default AdminDashboard;
