import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import {
  CheckSquare, Users, ClipboardList, DollarSign, Landmark,
  Mic, Phone, Send, Calendar, CalendarDays, Flame, Thermometer, Snowflake, Sparkles, Eye,
  TrendingUp, Zap, MessageSquare, Activity, Shield, ArrowUp, ArrowDown, Minus, AlertTriangle, Mail,
  X, Check, Circle, ChevronRight, Clock,
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Tooltip as UiTooltip, TooltipTrigger, TooltipContent, TooltipProvider } from '@/components/ui/tooltip';
import DashboardHeader from './DashboardHeader';
import TodayPrioritiesPanel from './TodayPrioritiesPanel';
import { getIntentTier, INTENT_TOOLTIP } from '@/features/agents/lib/intentScore';
import { DEMO_REPUTATION, getScoreColor } from '@/features/agents/utils/reputationScore';
import { useAgentListings } from '@/features/agents/hooks/useAgentListings';
import { useAuth } from '@/features/auth/AuthProvider';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip as RechartsTooltip, CartesianGrid } from 'recharts';
import { toast } from 'sonner';
import { differenceInDays } from 'date-fns';
import { useDashboardLayout, CardKey, CardLayoutEntry, isStatTile } from '@/features/agents/hooks/useDashboardLayout';
import { CustomiseToolbar, CardEditChrome } from './DashboardCustomiseControls';
import { useAgentReputation, getReputationTier } from '@/features/agents/hooks/useAgentReputation';
import { ReputationExplainerModal } from './ReputationExplainerModal';
import { useResponseTimeStats, formatDuration, getResponseTimeColor } from '@/features/agents/hooks/useResponseTimeStats';
import { ResponseTimeModal } from './ResponseTimeModal';

// Australian currency formatter
const AUD = new Intl.NumberFormat('en-AU', { style: 'currency', currency: 'AUD', minimumFractionDigits: 0 });
const AU_DATE = (d: string) => {
  const date = new Date(d);
  return `${String(date.getDate()).padStart(2, '0')}/${String(date.getMonth() + 1).padStart(2, '0')}/${date.getFullYear()}`;
};

// Build empty 12-month skeleton
const buildEmptyMonths = () => {
  const months: { month: string; deals: number; value: number }[] = [];
  const now = new Date();
  for (let i = 11; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    months.push({ month: d.toLocaleString('en-AU', { month: 'short' }), deals: 0, value: 0 });
  }
  return months;
};

interface RecentActivity {
  id: string;
  description?: string;
  action?: string;
  created_at: string;
  entity_type?: string;
  entity_id?: string;
}

interface ArrearsTenancy {
  id: string;
  tenant_name?: string;
  tenant_email?: string;
  daysOverdue?: number;
  amountOwed?: number;
  properties?: { address?: string; suburb?: string } | null;
  [key: string]: unknown;
}

interface ReportDueListing {
  id: string;
  address?: string;
  suburb?: string;
  vendor_name?: string;
  views?: number;
  contact_clicks?: number;
  [key: string]: unknown;
}

const DashboardOverview = () => {
  const { listings } = useAgentListings();
  const { user } = useAuth();
  const navigate = useNavigate();
  const [tasksDue, setTasksDue] = useState(0);
  const [unrespondedLeads, setUnrespondedLeads] = useState(0);
  const [activeContacts, setActiveContacts] = useState(0);
  const [trustBalance, setTrustBalance] = useState(0);
  const [recentActivities, setRecentActivities] = useState<RecentActivity[]>([]);
  const [todayInspections, setTodayInspections] = useState<{ address: string; time: string; propertyId: string }[]>([]);
  const [pipelineData, setPipelineData] = useState(buildEmptyMonths());
  const [pipelineEmpty, setPipelineEmpty] = useState(true);
  const [arrearsTenancies, setArrearsTenancies] = useState<ArrearsTenancy[]>([]);
  const [sendingReminder, setSendingReminder] = useState<string | null>(null);
  const [reportsDue, setReportsDue] = useState<ReportDueListing[]>([]);
  const [sendingReport, setSendingReport] = useState<string | null>(null);
  const [agencyConnected, setAgencyConnected] = useState(false);
  const [agentId, setAgentId] = useState<string | null>(null);
  const [repModalOpen, setRepModalOpen] = useState(false);
  const [respModalOpen, setRespModalOpen] = useState(false);

  // Dashboard layout customisation
  const { layout, setLayoutLocal, save, reset, loaded: layoutLoaded } = useDashboardLayout();
  const [editMode, setEditMode] = useState(false);
  const [draftLayout, setDraftLayout] = useState<CardLayoutEntry[] | null>(null);
  const [isMobile, setIsMobile] = useState(false);
  useEffect(() => {
    const mq = window.matchMedia('(max-width: 767px)');
    const update = () => setIsMobile(mq.matches);
    update();
    mq.addEventListener('change', update);
    return () => mq.removeEventListener('change', update);
  }, []);
  const activeLayout = editMode && draftLayout ? draftLayout : layout;
  const isCardVisible = (k: CardKey) => {
    const e = activeLayout.find(en => en.card_key === k);
    return e ? e.is_visible : true;
  };
  const enterEdit = () => { setDraftLayout([...layout]); setEditMode(true); };
  const exitEdit = async () => {
    if (draftLayout) await save(draftLayout);
    setEditMode(false);
    setDraftLayout(null);
  };
  const resetEdit = () => {
    reset();
    setDraftLayout(null);
    setEditMode(false);
  };
  const renderCard = (key: CardKey, content: React.ReactNode) => {
    if (!isCardVisible(key) && !editMode) return null;
    if (editMode) {
      return (
        <CardEditChrome
          key={key}
          cardKey={key}
          layout={draftLayout ?? layout}
          onUpdate={setDraftLayout}
          isMobile={isMobile}
        >
          {content}
        </CardEditChrome>
      );
    }
    return <div key={key}>{content}</div>;
  };

  // Onboarding checklist state
  const [onboardingDismissed, setOnboardingDismissed] = useState(false);
  const [onboardingAgent, setOnboardingAgent] = useState<{
    name?: string; phone?: string; avatar_url?: string; bio?: string; agency_id?: string; stripe_customer_id?: string; onboarding_complete?: boolean;
  } | null>(null);
  const [onboardingHasListing, setOnboardingHasListing] = useState(false);
  const [onboardingSteps, setOnboardingSteps] = useState<Record<string, boolean>>({});

  const persistOnboardingStep = async (key: string) => {
    if (!user) return;
    const updated = { ...onboardingSteps, [key]: true };
    setOnboardingSteps(updated);
    await supabase
      .from('profiles')
      .update({ onboarding_steps_completed: updated } as any)
      .eq('user_id', user.id);
  };

  const dismissOnboarding = async () => {
    setOnboardingDismissed(true);
    if (!user) return;
    const updated = { ...onboardingSteps, dismissed: true };
    await supabase
      .from('profiles')
      .update({ onboarding_steps_completed: updated } as any)
      .eq('user_id', user.id);
  };

  // Consolidated dashboard data fetch — all queries in 2 parallel waves
  useEffect(() => {
    if (!user) return;
    let cancelled = false;

    const loadDashboard = async () => {
      const todayStr = new Date().toISOString().split('T')[0];
      const fiveMinAgo = new Date(Date.now() - 5 * 60 * 1000).toISOString();
      const sevenDaysAgo = new Date(Date.now() - 7 * 86400000).toISOString();
      const now = new Date();
      const twelveMonthsAgo = new Date(now.getFullYear(), now.getMonth() - 11, 1).toISOString();

      // Wave 1: profile + agent (need agent.id for everything else)
      const [profileRes, agentRes] = await Promise.all([
        supabase.from('profiles').select('onboarding_steps_completed').eq('user_id', user.id).maybeSingle(),
        supabase.from('agents')
          .select('id, name, phone, avatar_url, bio, agency_id, stripe_customer_id, onboarding_complete')
          .eq('user_id', user.id).maybeSingle(),
      ]);
      if (cancelled) return;

      const steps = ((profileRes.data as any)?.onboarding_steps_completed || {}) as Record<string, boolean>;
      setOnboardingSteps(steps);
      if (steps.dismissed) setOnboardingDismissed(true);
      setOnboardingAgent(agentRes.data);
      setAgencyConnected(agentRes.data?.onboarding_complete === true);

      const aId = agentRes.data?.id;
      if (!aId) {
        setOnboardingHasListing(false);
        return;
      }
      setAgentId(aId);

      // Wave 2: everything else in parallel
      const [
        listingCountRes, tasksRes, contactsRes, trustRes, leadsRes,
        activitiesRes, recentActivitiesRes, agentInspectionsRes,
        tenanciesRes, propertiesRes, vendorReportsRes,
      ] = await Promise.all([
        supabase.from('properties').select('id', { count: 'exact', head: true }).eq('agent_id', aId),
        supabase.from('tasks').select('id', { count: 'exact', head: true })
          .or(`user_id.eq.${user.id},assigned_to.eq.${user.id}`)
          .eq('status', 'pending').lte('due_date', todayStr),
        supabase.from('contacts').select('id', { count: 'exact', head: true }).eq('created_by', user.id),
        supabase.from('trust_account_balances_view' as any).select('current_balance').eq('agent_id', aId).maybeSingle(),
        supabase.from('leads').select('id', { count: 'exact', head: true })
          .eq('agent_id', aId).eq('status', 'new').lt('created_at', fiveMinAgo),
        supabase.from('activities').select('created_at, metadata')
          .eq('user_id', user.id).eq('entity_type', 'property').eq('action', 'sold')
          .gte('created_at', twelveMonthsAgo),
        supabase.from('activities').select('*').eq('user_id', user.id)
          .order('created_at', { ascending: false }).limit(5),
        // FIX: scope inspections to this agent only — was scanning every active property
        supabase.from('properties').select('id, address, inspection_times')
          .eq('agent_id', aId).eq('is_active', true).not('inspection_times', 'eq', '[]'),
        supabase.from('tenancies').select('*, properties(address, suburb)')
          .eq('agent_id', aId).eq('status', 'active'),
        supabase.from('properties')
          .select('id, address, suburb, views, contact_clicks, listed_date, vendor_name, vendor_email')
          .eq('agent_id', aId).eq('status', 'public').eq('is_active', true),
        supabase.from('vendor_reports').select('property_id, sent_at')
          .eq('agent_id', aId).gte('sent_at', sevenDaysAgo),
      ]);
      if (cancelled) return;

      setOnboardingHasListing((listingCountRes.count || 0) > 0);
      setTasksDue(tasksRes.count || 0);
      setActiveContacts(contactsRes.count || 0);
      if (trustRes.data) setTrustBalance(Math.max(0, Number((trustRes.data as any).current_balance) || 0));
      setUnrespondedLeads(leadsRes.count || 0);
      setRecentActivities(recentActivitiesRes.data || []);

      // Pipeline data
      const months = buildEmptyMonths();
      if (activitiesRes.data && activitiesRes.data.length > 0) {
        const monthMap = new Map(months.map((m, i) => [i, m]));
        const baseDate = new Date(now.getFullYear(), now.getMonth() - 11, 1);
        activitiesRes.data.forEach((row) => {
          const d = new Date(row.created_at);
          const idx = (d.getFullYear() - baseDate.getFullYear()) * 12 + (d.getMonth() - baseDate.getMonth());
          if (idx >= 0 && idx < 12) {
            const entry = monthMap.get(idx)!;
            entry.deals += 1;
            const val = (row.metadata as any)?.commission ?? (row.metadata as any)?.value ?? 0;
            entry.value += Number(val) || 0;
          }
        });
        setPipelineData(months);
        setPipelineEmpty(false);
      } else {
        setPipelineData(months);
        setPipelineEmpty(true);
      }

      // Today's inspections
      const inspections: { address: string; time: string; propertyId: string }[] = [];
      (agentInspectionsRes.data || []).forEach((prop) => {
        const times = prop.inspection_times as any[];
        if (!Array.isArray(times)) return;
        times.forEach((slot: any) => {
          const slotDate = typeof slot === 'string' ? slot : slot?.date || slot?.start;
          if (typeof slotDate === 'string' && slotDate.startsWith(todayStr)) {
            const d = new Date(slotDate);
            const timeStr = d.toLocaleTimeString('en-AU', { hour: 'numeric', minute: '2-digit', hour12: true });
            inspections.push({ address: prop.address, time: timeStr, propertyId: prop.id });
          }
        });
      });
      inspections.sort((a, b) => a.time.localeCompare(b.time));
      setTodayInspections(inspections);

      // Arrears (needs follow-up rent_payments query keyed off tenancy ids)
      const tenancies = tenanciesRes.data;
      if (tenancies && tenancies.length > 0) {
        const tenancyIds = tenancies.map((t: any) => t.id);
        const { data: payments } = await supabase
          .from('rent_payments').select('*').in('tenancy_id', tenancyIds)
          .order('payment_date', { ascending: false });
        if (cancelled) return;

        const overdue: any[] = [];
        for (const t of tenancies as any[]) {
          const tenancyPayments = (payments || []).filter((p: any) => p.tenancy_id === t.id);
          const latest = tenancyPayments[0];
          if (!latest) {
            const leaseStart = new Date(t.lease_start);
            const daysSinceStart = differenceInDays(now, leaseStart);
            if (daysSinceStart > 3) overdue.push({ ...t, daysOverdue: daysSinceStart, amountOwed: Number(t.rent_amount) });
            continue;
          }
          const periodEnd = new Date(latest.period_to);
          const daysOverdue = differenceInDays(now, periodEnd);
          if (daysOverdue > 3 && latest.status !== 'paid') {
            overdue.push({ ...t, daysOverdue, amountOwed: Number(t.rent_amount) });
          }
        }
        setArrearsTenancies(overdue);
      }

      // Reports due
      const props = propertiesRes.data;
      if (props && props.length > 0) {
        const recentPropertyIds = new Set((vendorReportsRes.data || []).map((r: any) => r.property_id));
        const due = props.filter((p: any) => !recentPropertyIds.has(p.id) && p.vendor_email);
        setReportsDue(due);
      }
    };

    loadDashboard();
    return () => { cancelled = true; };
  }, [user]);

  const handleSendReminder = async (tenancy: any) => {
    setSendingReminder(tenancy.id);
    try {
      const address = tenancy.properties?.address || 'your property';
      const { error } = await supabase.functions.invoke('send-notification-email', {
        body: {
          to: tenancy.tenant_email,
          subject: 'Rent overdue reminder',
          body: `Dear ${tenancy.tenant_name}, your rent for ${address} is overdue. Please arrange payment at your earliest convenience. Thank you.`,
        },
      });
      if (error) throw new Error('Failed to send');
      toast.success(`Reminder sent to ${tenancy.tenant_name}`);
    } catch {
      toast.error('Failed to send reminder');
    } finally {
      setSendingReminder(null);
    }
  };

  const handleQuickSendReport = async (prop: any) => {
    setSendingReport(prop.id);
    try {
      const { data: agent } = await supabase
        .from('agents')
        .select('id, name, agency')
        .eq('user_id', user?.id ?? '')
        .maybeSingle();

      const daysOnMarket = prop.listed_date
        ? differenceInDays(new Date(), new Date(prop.listed_date))
        : 0;
      const totalViews = prop.views || 0;
      const totalEnquiries = prop.contact_clicks || 0;

      const reportHtml = `<!DOCTYPE html>
<html><head><meta charset="utf-8"></head>
<body style="margin:0;padding:0;background:#f4f4f5;font-family:-apple-system,sans-serif;">
<div style="max-width:560px;margin:0 auto;padding:24px 16px;">
  <div style="background:#1a2744;border-radius:12px;padding:20px;text-align:center;margin-bottom:16px;">
    <div style="font-size:20px;font-weight:600;color:#fff;">ListHQ</div>
    <div style="font-size:11px;color:#94a3b8;margin-top:3px;">Vendor Campaign Report</div>
  </div>
  <div style="background:#fff;border-radius:12px;padding:20px;margin-bottom:16px;">
    <p style="font-size:14px;color:#333;margin:0 0 6px;">Hi ${prop.vendor_name},</p>
    <p style="font-size:13px;color:#555;line-height:1.6;margin:0 0 4px;">Here is your weekly update for <strong>${prop.address}, ${prop.suburb}</strong>.</p>
    <p style="font-size:12px;color:#888;margin:0;">Prepared by ${agent?.name || 'Your Agent'}${agent?.agency ? ` · ${agent.agency}` : ''}</p>
  </div>
  <table style="width:100%;border-collapse:separate;border-spacing:8px;margin-bottom:16px;">
    <tr>
      <td style="background:#fff;border-radius:10px;padding:14px;text-align:center;">
        <div style="font-size:24px;font-weight:600;color:#1a2744;">${totalViews.toLocaleString()}</div>
        <div style="font-size:11px;color:#888;margin-top:3px;">Total views</div>
      </td>
      <td style="background:#fff;border-radius:10px;padding:14px;text-align:center;">
        <div style="font-size:24px;font-weight:600;color:#1a2744;">${totalEnquiries}</div>
        <div style="font-size:11px;color:#888;margin-top:3px;">Enquiries</div>
      </td>
      <td style="background:#fff;border-radius:10px;padding:14px;text-align:center;">
        <div style="font-size:24px;font-weight:600;color:#1a2744;">${daysOnMarket}</div>
        <div style="font-size:11px;color:#888;margin-top:3px;">Days listed</div>
      </td>
    </tr>
  </table>
  <div style="text-align:center;padding:8px 0;">
    <p style="font-size:11px;color:#aaa;">Sent via ListHQ · Reply to this email with any questions.</p>
  </div>
</div></body></html>`;

      const { error } = await supabase.functions.invoke(
        'send-notification-email',
        {
          body: {
            to: prop.vendor_email,
            subject: `Weekly update — ${prop.address}`,
            html: reportHtml,
          },
        }
      );
      if (error) throw error;

      if (agent) {
        await supabase.from('vendor_reports').insert({
          property_id: prop.id,
          agent_id: agent.id,
          vendor_name: prop.vendor_name,
          vendor_email: prop.vendor_email,
          views_at_send: totalViews,
          enquiries_at_send: totalEnquiries,
          hot_leads_at_send: 0,
          days_on_market_at_send: daysOnMarket,
        });
      }

      setReportsDue(prev => prev.filter(p => p.id !== prop.id));
      toast.success(`Report sent to ${prop.vendor_name}`);
    } catch {
      toast.error('Failed to send report');
    } finally {
      setSendingReport(null);
    }
  };

  // GCI values — real data; new users start at 0
  const gciActual = 0;
  const gciBudgeted = 0;
  const gciPotential = 0;
  const gciPercent = gciBudgeted > 0 ? Math.round((gciActual / gciBudgeted) * 100) : 0;

  // Stats row - Australian CRM focus
  const unrespondedValue = unrespondedLeads;

  // Reputation score with tier + 30-day trend (real data via hook)
  const { score: repScore, trend: repTrend, breakdown: repBreakdown } = useAgentReputation(agentId);
  const repTier = getReputationTier(repScore);
  const repColors = getScoreColor(repScore);

  // Time-to-first-contact (median, 30 days)
  const respStats = useResponseTimeStats(agentId);
  const respColors = getResponseTimeColor(respStats.medianMinutes);


  const stats = [
    { label: 'Tasks Due', value: String(tasksDue), icon: <CheckSquare size={16} />, color: 'text-destructive', link: '/dashboard/contacts?tab=tasks' },
    { label: 'Active Contacts', value: String(activeContacts), icon: <Users size={16} />, color: 'text-primary', link: '/dashboard/contacts' },
    { label: 'Appraisals This Month', value: '0', icon: <ClipboardList size={16} />, color: 'text-success', link: '/dashboard/pipeline?stage=appraisal' },
    { label: 'Sales This Month', value: AUD.format(0), icon: <DollarSign size={16} />, color: 'text-primary', link: '/dashboard/performance' },
    { label: 'Trust Balance', value: AUD.format(trustBalance), icon: <Landmark size={16} />, color: 'text-success', link: '/dashboard/trust' },
    { label: 'Unresponded Leads', value: String(unrespondedValue), icon: <Zap size={16} />, color: unrespondedValue > 0 ? 'text-destructive' : 'text-success', link: '/dashboard/leads' },
  ];

  return (
    <div>
      <DashboardHeader
        title="Dashboard"
       subtitle={`Welcome back, ${(() => {
          const first = onboardingAgent?.name?.trim().split(/\s+/)[0];
          if (!first) return 'Agent';
          return first.charAt(0).toUpperCase() + first.slice(1).toLowerCase();
        })()}`}
      />

      <div className="p-4 sm:p-6 space-y-6 max-w-7xl">
        <div className="flex justify-end">
          <CustomiseToolbar
            editMode={editMode}
            onEnterEdit={enterEdit}
            onDone={exitEdit}
            onReset={resetEdit}
          />
        </div>
        {(() => { const isNewUser = !onboardingDismissed && listings.length === 0; return null; })()}
        <TodayPrioritiesPanel />
        {!onboardingDismissed && (() => {
          const step1 = !!(onboardingAgent?.name && onboardingAgent?.phone && onboardingAgent?.avatar_url && onboardingAgent?.bio);
          const step2 = onboardingHasListing || listings.length > 0;
          const step3 = agencyConnected;
          const step4 = !!onboardingAgent?.stripe_customer_id;
          const step5 = !!onboardingSteps.dashboard;
          const steps = [
            { label: 'Complete your profile', done: step1, link: '/dashboard/profile', key: 'profile' },
            { label: 'Add your first listing', done: step2, link: '/dashboard/listings', key: 'listing' },
            { label: 'Connect or create your agency', done: step3, link: '/dashboard/agencies', key: 'agency' },
            { label: 'Set up billing', done: step4, link: '/dashboard/billing', key: 'billing' },
            { label: 'Explore your dashboard', done: step5, link: '', key: 'dashboard', manual: true as const },
          ];
          const completed = steps.filter(s => s.done).length;
          if (completed === 5) {
            dismissOnboarding();
            return null;
          }
          return (
            <Card className="relative overflow-hidden bg-gradient-to-br from-primary/5 via-primary/3 to-transparent border-primary/20">
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-lg font-bold">Getting Started</CardTitle>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-7 w-7"
                    onClick={dismissOnboarding}
                  >
                    <X size={16} />
                  </Button>
                </div>
                <div className="flex items-center gap-3 mt-1">
                  <Progress value={(completed / 5) * 100} className="h-2 flex-1" />
                  <span className="text-xs font-medium text-muted-foreground whitespace-nowrap">{completed} of 5 steps complete</span>
                </div>
              </CardHeader>
              <CardContent className="pt-0 space-y-1">
                {steps.map((step, i) => (
                  <button
                    key={i}
                    onClick={() => {
                      if ('manual' in step && step.manual && !step.done) {
                        persistOnboardingStep('dashboard');
                      }
                      if (step.link) navigate(step.link);
                    }}
                    className="w-full flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm transition-colors hover:bg-primary/5 group text-left cursor-pointer"
                  >
                    {step.done ? (
                      <div className="h-5 w-5 rounded-full bg-primary flex items-center justify-center shrink-0">
                        <Check size={12} className="text-primary-foreground" />
                      </div>
                    ) : (
                      <Circle size={20} className="text-muted-foreground/40 shrink-0" />
                    )}
                    <span className={step.done ? 'line-through text-muted-foreground' : 'text-foreground font-medium'}>{step.label}</span>
                    <ChevronRight size={14} className="ml-auto text-muted-foreground/40 group-hover:text-primary transition-colors" />
                  </button>
                ))}
              </CardContent>
            </Card>
          );
        })()}

        {listings.length === 0 && (
          <div className="bg-primary/10 border border-primary/20 rounded-2xl p-5">
            <h2 className="font-bold text-lg mb-1">Welcome to ListHQ 👋</h2>
            <p className="text-sm text-muted-foreground mb-4">Your account is live. Here's how to get started:</p>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <button onClick={() => navigate('/dashboard/listings')} className="flex items-center gap-2 bg-background rounded-xl border border-border p-3 text-sm font-medium hover:border-primary/40 transition-colors text-left">
                <span className="text-xl">🏠</span><div><div className="font-semibold text-sm">Add your first listing</div><div className="text-xs text-muted-foreground">Upload a property</div></div>
              </button>
              <button onClick={() => navigate('/dashboard/profile')} className="flex items-center gap-2 bg-background rounded-xl border border-border p-3 text-sm font-medium hover:border-primary/40 transition-colors text-left">
                <span className="text-xl">👤</span><div><div className="font-semibold text-sm">Complete your profile</div><div className="text-xs text-muted-foreground">Build trust with buyers</div></div>
              </button>
              <button onClick={() => navigate('/dashboard/network')} className="flex items-center gap-2 bg-background rounded-xl border border-border p-3 text-sm font-medium hover:border-primary/40 transition-colors text-left">
                <span className="text-xl">🤝</span><div><div className="font-semibold text-sm">Explore the network</div><div className="text-xs text-muted-foreground">Find off-market deals</div></div>
              </button>
            </div>
          </div>
        )}

        {/* Stats Row — driven by layout */}
        {(() => {
          const tileMap: Record<string, { key: CardKey; render: () => React.ReactNode }> = {
            tasks_due: {
              key: 'tasks_due',
              render: () => (
                <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }}
                  onClick={() => !editMode && navigate('/dashboard/contacts?tab=tasks')}
                  className="relative bg-card border border-border rounded-xl p-4 cursor-pointer hover:ring-2 hover:ring-primary/20 hover:shadow-md transition-all">
                  <ChevronRight size={14} className="absolute top-2 right-2 text-muted-foreground" />
                  <div className="flex items-start gap-1.5 text-muted-foreground mb-1">
                    <span className="text-destructive shrink-0 mt-0.5"><CheckSquare size={16} /></span>
                    <span className="text-[11px] leading-tight">Tasks Due</span>
                  </div>
                  <p className="font-display text-2xl font-extrabold">{tasksDue}</p>
                </motion.div>
              ),
            },
            active_contacts: {
              key: 'active_contacts',
              render: () => (
                <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }}
                  onClick={() => !editMode && navigate('/dashboard/contacts')}
                  className="relative bg-card border border-border rounded-xl p-4 cursor-pointer hover:ring-2 hover:ring-primary/20 hover:shadow-md transition-all">
                  <ChevronRight size={14} className="absolute top-2 right-2 text-muted-foreground" />
                  <div className="flex items-start gap-1.5 text-muted-foreground mb-1">
                    <span className="text-primary shrink-0 mt-0.5"><Users size={16} /></span>
                    <span className="text-[11px] leading-tight">Active Contacts</span>
                  </div>
                  <p className="font-display text-2xl font-extrabold">{activeContacts}</p>
                </motion.div>
              ),
            },
            appraisals_month: {
              key: 'appraisals_month',
              render: () => (
                <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }}
                  onClick={() => !editMode && navigate('/dashboard/pipeline?stage=appraisal')}
                  className="relative bg-card border border-border rounded-xl p-4 cursor-pointer hover:ring-2 hover:ring-primary/20 hover:shadow-md transition-all">
                  <ChevronRight size={14} className="absolute top-2 right-2 text-muted-foreground" />
                  <div className="flex items-start gap-1.5 text-muted-foreground mb-1">
                    <span className="text-success shrink-0 mt-0.5"><ClipboardList size={16} /></span>
                    <span className="text-[11px] leading-tight">Appraisals This Month</span>
                  </div>
                  <p className="font-display text-2xl font-extrabold">0</p>
                </motion.div>
              ),
            },
            sales_month: {
              key: 'sales_month',
              render: () => (
                <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }}
                  onClick={() => !editMode && navigate('/dashboard/performance')}
                  className="relative bg-card border border-border rounded-xl p-4 cursor-pointer hover:ring-2 hover:ring-primary/20 hover:shadow-md transition-all">
                  <ChevronRight size={14} className="absolute top-2 right-2 text-muted-foreground" />
                  <div className="flex items-start gap-1.5 text-muted-foreground mb-1">
                    <span className="text-primary shrink-0 mt-0.5"><DollarSign size={16} /></span>
                    <span className="text-[11px] leading-tight">Sales This Month</span>
                  </div>
                  <p className="font-display text-2xl font-extrabold">{AUD.format(0)}</p>
                </motion.div>
              ),
            },
            trust_balance: {
              key: 'trust_balance',
              render: () => (
                <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }}
                  onClick={() => !editMode && navigate('/dashboard/trust')}
                  className="relative bg-card border border-border rounded-xl p-4 cursor-pointer hover:ring-2 hover:ring-primary/20 hover:shadow-md transition-all">
                  <ChevronRight size={14} className="absolute top-2 right-2 text-muted-foreground" />
                  <div className="flex items-start gap-1.5 text-muted-foreground mb-1">
                    <span className="text-success shrink-0 mt-0.5"><Landmark size={16} /></span>
                    <span className="text-[11px] leading-tight">Trust Balance</span>
                  </div>
                  <p className="font-display text-2xl font-extrabold">{AUD.format(trustBalance)}</p>
                </motion.div>
              ),
            },
            unresponded_leads: {
              key: 'unresponded_leads',
              render: () => (
                <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }}
                  onClick={() => !editMode && navigate('/dashboard/leads')}
                  className="relative bg-card border border-border rounded-xl p-4 cursor-pointer hover:ring-2 hover:ring-primary/20 hover:shadow-md transition-all">
                  <ChevronRight size={14} className="absolute top-2 right-2 text-muted-foreground" />
                  <div className="flex items-start gap-1.5 text-muted-foreground mb-1">
                    <span className={`${unrespondedValue > 0 ? 'text-destructive' : 'text-success'} shrink-0 mt-0.5`}><Zap size={16} /></span>
                    <span className="text-[11px] leading-tight">Unresponded Leads</span>
                  </div>
                  <p className="font-display text-2xl font-extrabold">{unrespondedValue}</p>
                </motion.div>
              ),
            },
            avg_response_time: {
              key: 'avg_response_time',
              render: () => (
                <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }}
                  onClick={() => !editMode && agentId && setRespModalOpen(true)}
                  className="relative bg-card border border-border rounded-xl p-4 cursor-pointer hover:ring-2 hover:ring-primary/20 hover:shadow-md transition-all">
                  <ChevronRight size={14} className="absolute top-2 right-2 text-muted-foreground" />
                  <div className="flex items-start gap-1.5 text-muted-foreground mb-1">
                    <span className={`${respColors.text} shrink-0 mt-0.5`}><Clock size={16} /></span>
                    <span className="text-[11px] leading-tight">Avg Response Time</span>
                  </div>
                  {respStats.medianMinutes == null ? (
                    <>
                      <p className="font-display text-2xl font-extrabold text-muted-foreground">—</p>
                      <p className="text-[10px] text-muted-foreground leading-tight">Tracks once leads arrive</p>
                    </>
                  ) : (
                    <div className="flex items-baseline gap-1">
                      <p className={`font-display text-2xl font-extrabold ${respColors.text}`}>{formatDuration(respStats.medianMinutes)}</p>
                      {respStats.trend === 'up' && <ArrowUp size={14} className="text-success ml-0.5" />}
                      {respStats.trend === 'down' && <ArrowDown size={14} className="text-destructive ml-0.5" />}
                      {respStats.trend === 'neutral' && <Minus size={14} className="text-muted-foreground ml-0.5" />}
                    </div>
                  )}
                </motion.div>
              ),
            },
            reputation_score: {
              key: 'reputation_score',
              render: () => (
                <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }}
                  onClick={() => !editMode && agentId && setRepModalOpen(true)}
                  className="relative bg-card border border-border rounded-xl p-4 cursor-pointer hover:ring-2 hover:ring-primary/20 hover:shadow-md transition-all">
                  <ChevronRight size={14} className="absolute top-2 right-2 text-muted-foreground" />
                  <div className="flex items-start gap-1.5 text-muted-foreground mb-1">
                    <span className={`${repColors.text} shrink-0 mt-0.5`}><Shield size={16} /></span>
                    <span className="text-[11px] leading-tight">Reputation</span>
                  </div>
                  <div className="flex items-baseline gap-1">
                    <p className={`font-display text-2xl font-extrabold ${repColors.text}`}>{repScore}</p>
                    <span className="text-xs text-muted-foreground">/100</span>
                    {repTrend === 'up' && <ArrowUp size={14} className="text-success ml-0.5" />}
                    {repTrend === 'down' && <ArrowDown size={14} className="text-destructive ml-0.5" />}
                    {repTrend === 'neutral' && <Minus size={14} className="text-muted-foreground ml-0.5" />}
                  </div>
                  <span className={`inline-block mt-1 text-[9px] font-semibold px-1.5 py-0.5 rounded ${repTier.bg} ${repTier.color}`}>
                    {repTier.tier}
                  </span>
                </motion.div>
              ),
            },
          };
          const orderedTiles = activeLayout
            .filter(e => isStatTile(e.card_key) && (e.is_visible || editMode))
            .map(e => tileMap[e.card_key])
            .filter(Boolean);
          return (
            <div className="grid grid-cols-4 lg:grid-cols-7 gap-2">
              {orderedTiles.map(t => (
                editMode ? (
                  <CardEditChrome key={t.key} cardKey={t.key} layout={draftLayout ?? layout} onUpdate={setDraftLayout} isMobile={isMobile}>
                    {t.render()}
                  </CardEditChrome>
                ) : (
                  <div key={t.key}>{t.render()}</div>
                )
              ))}
            </div>
          );
        })()}

        {/* Arrears Alert */}
        {arrearsTenancies.length > 0 && (
          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-card border border-border border-l-4 border-l-destructive rounded-xl p-5"
          >
            <h3 className="font-display text-sm font-bold mb-4 flex items-center gap-2">
              <AlertTriangle size={16} className="text-destructive" /> Rent Arrears
              <Badge variant="destructive" className="text-[10px] px-1.5 py-0 h-5">{arrearsTenancies.length}</Badge>
            </h3>
            <div className="space-y-2">
              {arrearsTenancies.map((t) => (
                <div
                  key={t.id}
                  onClick={() => navigate('/dashboard/rent-roll?filter=arrears')}
                  className="flex items-center justify-between border border-border rounded-lg p-3 cursor-pointer hover:ring-2 hover:ring-primary/20 hover:shadow-md transition-all"
                >
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-medium truncate">{t.tenant_name}</p>
                    <p className="text-[10px] text-muted-foreground truncate">{t.properties?.address}{t.properties?.suburb ? `, ${t.properties.suburb}` : ''}</p>
                    <p className="text-[10px] text-destructive font-medium mt-0.5">{t.daysOverdue} days overdue · {AUD.format(t.amountOwed)} owed</p>
                  </div>
                  <div className="flex gap-1.5 ml-2 shrink-0" onClick={(e) => e.stopPropagation()}>
                    <Button
                      size="sm"
                      variant="outline"
                      className="text-[10px] h-6 px-2"
                      onClick={() => navigate(`/dashboard/tenancies/${t.id}`)}
                    >
                      View
                    </Button>
                    {t.tenant_email && (
                      <Button
                        size="sm"
                        variant="destructive"
                        className="text-[10px] h-6 px-2"
                        disabled={sendingReminder === t.id}
                        onClick={() => handleSendReminder(t)}
                      >
                        <Send size={10} className="mr-1" />
                        {sendingReminder === t.id ? 'Sending...' : 'Remind'}
                      </Button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </motion.div>
        )}

        {reportsDue.length > 0 && (
          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-card border border-border border-l-4 border-l-primary rounded-xl p-5"
          >
            <h3 className="font-display text-sm font-bold mb-4 flex items-center gap-2">
              <Mail size={16} className="text-primary" />
              Vendor reports due
              <Badge className="text-[10px] px-1.5 py-0 h-5 bg-primary/15 text-primary border-0">
                {reportsDue.length}
              </Badge>
            </h3>
            <div className="space-y-2">
              {reportsDue.map((prop) => (
                <div
                  key={prop.id}
                  onClick={() => navigate('/dashboard/listings')}
                  className="flex items-center justify-between border border-border rounded-lg p-3 cursor-pointer hover:ring-2 hover:ring-primary/20 hover:shadow-md transition-all"
                >
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-medium truncate">
                      {prop.address}
                      {prop.suburb ? `, ${prop.suburb}` : ''}
                    </p>
                    <p className="text-[10px] text-muted-foreground mt-0.5">
                      {prop.vendor_name
                        ? `Vendor: ${prop.vendor_name}`
                        : 'No vendor name set'}
                      {' · '}
                      {prop.views || 0} views
                      {' · '}
                      {prop.contact_clicks || 0} enquiries
                    </p>
                  </div>
                  <div className="flex gap-1.5 ml-2 shrink-0" onClick={(e) => e.stopPropagation()}>
                    <Button
                      size="sm"
                      variant="outline"
                      className="text-[10px] h-6 px-2"
                      onClick={() =>
                        navigate(
                          `/dashboard/listings/${prop.id}?tab=marketing`
                        )
                      }
                    >
                      View
                    </Button>
                    <Button
                      size="sm"
                      className="text-[10px] h-6 px-2 bg-primary hover:bg-primary/90"
                      disabled={sendingReport === prop.id}
                      onClick={() => handleQuickSendReport(prop)}
                    >
                      <Send size={10} className="mr-1" />
                      {sendingReport === prop.id
                        ? 'Sending...'
                        : 'Send now'}
                    </Button>
                  </div>
                </div>
              ))}
            </div>
            <p className="text-[10px] text-muted-foreground mt-3">
              These listings have no vendor report sent in the last 7 days. Only listings with a vendor email on file are shown.
            </p>
          </motion.div>
        )}

        {/* Large cards — driven by layout */}
        {(() => {
          const largeCards: Record<string, React.ReactNode> = {
            todays_inspections: (
              <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.05 }}
                className="bg-card border border-border rounded-xl p-5">
                <h3 className="font-display text-sm font-bold mb-4 flex items-center gap-2">
                  <CalendarDays size={16} className="text-primary" /> Today's Inspections
                </h3>
                {todayInspections.length === 0 ? (
                  <p className="text-sm text-muted-foreground py-4 text-center">No inspections scheduled for today</p>
                ) : (
                  <div className="space-y-2">
                    {todayInspections.map((insp, i) => (
                      <div key={i} onClick={() => !editMode && navigate('/dashboard/inspection-mode')}
                        className="flex items-center justify-between border border-border rounded-lg p-3 cursor-pointer hover:ring-2 hover:ring-primary/20 hover:shadow-md transition-all">
                        <div className="flex-1 min-w-0">
                          <p className="text-xs font-medium truncate">{insp.address}</p>
                          <p className="text-[10px] text-muted-foreground mt-0.5">🕐 {insp.time}</p>
                        </div>
                        <Button size="sm" variant="outline" className="text-[10px] h-6 px-2 shrink-0 ml-2"
                          onClick={(e) => { e.stopPropagation(); if (!editMode) navigate(`/dashboard/listings/${insp.propertyId}`); }}>
                          View Listing
                        </Button>
                      </div>
                    ))}
                  </div>
                )}
              </motion.div>
            ),
            todays_voice_matches: (
              <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}
                className="bg-card border border-border rounded-xl p-5">
                <h3 className="font-display text-sm font-bold mb-4 flex items-center gap-2">
                  <Mic size={16} className="text-success" /> Today's Voice Matches
                </h3>
                <p className="text-sm text-muted-foreground py-4 text-center">No voice matches yet</p>
              </motion.div>
            ),
            listing_performance: (
              <section>
                <h2 className="font-display text-base font-bold mb-3 flex items-center gap-2">
                  <Eye size={16} className="text-primary" /> Listing Performance
                </h2>
                <div className="bg-card border border-border rounded-xl overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-border text-xs text-muted-foreground">
                        <th className="text-left p-3">Property</th>
                        <th className="text-left p-3">Status</th>
                        <th className="text-center p-3">Views</th>
                        <th className="text-center p-3">Voice</th>
                        <th className="text-center p-3">Leads</th>
                        <th className="text-center p-3">Days</th>
                        <th className="text-right p-3">Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      <tr>
                        <td colSpan={7} className="p-6 text-center text-sm text-muted-foreground">
                          No listings yet — <button onClick={() => !editMode && navigate('/dashboard/listings/new')} className="text-primary underline underline-offset-2">create your first listing</button>
                        </td>
                      </tr>
                    </tbody>
                  </table>
                </div>
              </section>
            ),
            recent_activity: (
              <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }}
                className="bg-card border border-border rounded-xl p-5">
                <h3 className="font-display text-sm font-bold mb-4 flex items-center gap-2">
                  <Activity size={16} className="text-success" /> Recent Activity
                </h3>
                {recentActivities.length > 0 ? (
                  <div className="space-y-3">
                    {recentActivities.map((a) => {
                      const isProperty = a.entity_type === 'property' && a.entity_id;
                      return (
                        <div key={a.id}
                          onClick={isProperty && !editMode ? () => navigate(`/dashboard/listings/${a.entity_id}`) : undefined}
                          className={`flex items-start gap-3 text-sm rounded-lg -mx-2 px-2 py-1 ${isProperty ? 'cursor-pointer hover:ring-2 hover:ring-primary/20 hover:shadow-md transition-all' : ''}`}>
                          <div className="w-2 h-2 rounded-full bg-primary mt-1.5 shrink-0" />
                          <div className="flex-1 min-w-0">
                            <p className="text-xs">{a.description || a.action}</p>
                            <p className="text-[10px] text-muted-foreground">{AU_DATE(a.created_at)}</p>
                          </div>
                          {isProperty && <ChevronRight size={14} className="text-muted-foreground shrink-0 mt-1" />}
                        </div>
                      );
                    })}
                  </div>
                ) : (
                  <p className="text-sm text-muted-foreground py-4 text-center">No recent activity</p>
                )}
              </motion.div>
            ),
            gci: (
              <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.25 }}
                className="bg-card border border-border rounded-xl p-5">
                <h3 className="font-display text-sm font-bold mb-4 flex items-center gap-2">
                  <DollarSign size={16} className="text-primary" /> GCI — Gross Commission Income
                </h3>
                <div className="space-y-3">
                  <div>
                    <div className="flex justify-between text-xs mb-1">
                      <span className="text-muted-foreground">Actual</span>
                      <span className="font-bold">{AUD.format(gciActual)}</span>
                    </div>
                    <Progress value={gciPercent} className="h-3" />
                  </div>
                  <div>
                    <div className="flex justify-between text-xs mb-1">
                      <span className="text-muted-foreground">Budgeted</span>
                      <span className="font-bold">{AUD.format(gciBudgeted)}</span>
                    </div>
                    <Progress value={100} className="h-3 opacity-30" />
                  </div>
                  <div>
                    <div className="flex justify-between text-xs mb-1">
                      <span className="text-muted-foreground">Potential (Pipeline)</span>
                      <span className="font-bold text-success">{AUD.format(gciPotential)}</span>
                    </div>
                    <Progress value={gciPotential > 0 ? 100 : 0} className="h-3 opacity-50" />
                  </div>
                  <p className="text-xs text-muted-foreground pt-2 border-t border-border">
                    You're at <strong className="text-primary">{gciPercent}%</strong> of your annual budget target
                  </p>
                </div>
              </motion.div>
            ),
            pipeline_12mo: (
              <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }}
                className="bg-card border border-border rounded-xl p-5">
                <h3 className="font-display text-sm font-bold mb-4 flex items-center gap-2">
                  <TrendingUp size={16} className="text-primary" /> Pipeline — 12 Month Deal Flow
                </h3>
                <div className="h-48 relative">
                  {pipelineEmpty && (
                    <div className="absolute inset-0 flex items-center justify-center z-10">
                      <p className="text-sm text-muted-foreground bg-card/80 backdrop-blur-sm px-3 py-1.5 rounded-lg">No completed sales yet</p>
                    </div>
                  )}
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={pipelineData}>
                      <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
                      <XAxis dataKey="month" tick={{ fontSize: 11 }} className="text-muted-foreground" />
                      <YAxis tick={{ fontSize: 11 }} tickFormatter={(v) => `$${v / 1000}k`} className="text-muted-foreground" />
                      <RechartsTooltip
                        formatter={(value: number) => [AUD.format(value), 'Commission']}
                        contentStyle={{ background: 'hsl(var(--card))', border: '1px solid hsl(var(--border))', borderRadius: '8px', fontSize: '12px' }}
                      />
                      <Bar dataKey="value" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </motion.div>
            ),
          };
          return activeLayout
            .filter(e => !isStatTile(e.card_key) && largeCards[e.card_key] && (e.is_visible || editMode))
            .map(e => renderCard(e.card_key, largeCards[e.card_key]));
        })()}
      </div>
      {agentId && (
        <ReputationExplainerModal agentId={agentId} open={repModalOpen} onOpenChange={setRepModalOpen} />
      )}
      {agentId && (
        <ResponseTimeModal agentId={agentId} open={respModalOpen} onOpenChange={setRespModalOpen} />
      )}
    </div>
  );
};

export default DashboardOverview;
