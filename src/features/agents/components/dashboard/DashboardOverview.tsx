import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import {
  CheckSquare, Users, ClipboardList, DollarSign, Landmark,
  Mic, Phone, Send, Calendar, CalendarDays, Flame, Thermometer, Snowflake, Sparkles, Eye,
  TrendingUp, Zap, MessageSquare, Activity, Shield, ArrowUp, ArrowDown, Minus, AlertTriangle, Mail,
  X, Check, Circle, ChevronRight,
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Tooltip as UiTooltip, TooltipTrigger, TooltipContent, TooltipProvider } from '@/components/ui/tooltip';
import DashboardHeader from './DashboardHeader';
import { getIntentTier, INTENT_TOOLTIP } from '@/features/agents/lib/intentScore';
import { DEMO_REPUTATION, getScoreColor } from '@/features/agents/utils/reputationScore';
import { useAgentListings } from '@/features/agents/hooks/useAgentListings';
import { useAuth } from '@/features/auth/AuthProvider';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip as RechartsTooltip, CartesianGrid } from 'recharts';
import { toast } from 'sonner';
import { differenceInDays } from 'date-fns';

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

const DashboardOverview = () => {
  const { listings } = useAgentListings();
  const { user } = useAuth();
  const navigate = useNavigate();
  const [tasksDue, setTasksDue] = useState(0);
  const [unrespondedLeads, setUnrespondedLeads] = useState(0);
  const [activeContacts, setActiveContacts] = useState(0);
  const [trustBalance, setTrustBalance] = useState(0);
  const [recentActivities, setRecentActivities] = useState<any[]>([]);
  const [todayInspections, setTodayInspections] = useState<{ address: string; time: string; propertyId: string }[]>([]);
  const [pipelineData, setPipelineData] = useState(buildEmptyMonths());
  const [pipelineEmpty, setPipelineEmpty] = useState(true);
  const [arrearsTenancies, setArrearsTenancies] = useState<any[]>([]);
  const [sendingReminder, setSendingReminder] = useState<string | null>(null);
  const [reportsDue, setReportsDue] = useState<any[]>([]);
  const [sendingReport, setSendingReport] = useState<string | null>(null);

  // Onboarding checklist state
  const [onboardingDismissed, setOnboardingDismissed] = useState(() =>
    localStorage.getItem('listhq-onboarding-dismissed') === 'true'
  );
  const [onboardingAgent, setOnboardingAgent] = useState<{
    name?: string; avatar_url?: string; bio?: string; agency_id?: string; stripe_customer_id?: string;
  } | null>(null);
  const [onboardingHasListing, setOnboardingHasListing] = useState(false);
  const [onboardingStep5, setOnboardingStep5] = useState(() =>
    localStorage.getItem('listhq-onboarding-step5') === 'true'
  );

  // Fetch onboarding agent data
  useEffect(() => {
    if (!user || onboardingDismissed) return;
    const fetchOnboarding = async () => {
      const { data: agent } = await supabase
        .from('agents')
        .select('name, avatar_url, bio, agency_id, stripe_customer_id')
        .eq('user_id', user.id)
        .maybeSingle();
      setOnboardingAgent(agent);
      const { count } = await supabase
        .from('properties')
        .select('id', { count: 'exact', head: true })
        .eq('agent_id', (agent as any)?.id ?? '');
      setOnboardingHasListing((count || 0) > 0);
    };
    fetchOnboarding();
  }, [user, onboardingDismissed]);

  // Fetch tasks due today
  useEffect(() => {
    if (!user) return;
    const today = new Date().toISOString().split('T')[0];
    supabase
      .from('tasks')
      .select('id', { count: 'exact', head: true })
      .or(`user_id.eq.${user.id},assigned_to.eq.${user.id}`)
      .eq('status', 'pending')
      .lte('due_date', today)
      .then(({ count }) => setTasksDue(count || 0));
  }, [user]);

  // Fetch active contacts count
  useEffect(() => {
    if (!user) return;
    supabase
      .from('contacts')
      .select('id', { count: 'exact', head: true })
      .eq('created_by', user.id)
      .then(({ count }) => setActiveContacts(count || 0));
  }, [user]);

  // Fetch trust balance
  useEffect(() => {
    if (!user) return;
    const fetchTrust = async () => {
      const { data: agent } = await supabase
        .from('agents').select('id').eq('user_id', user.id).single();
      if (!agent) return;
      const { data } = await (supabase as any)
        .from('trust_transactions').select('amount, transaction_type').eq('agent_id', agent.id);
      if (!data) return;
      const balance = (data as { amount: number; transaction_type: string }[]).reduce((sum: number, t) => {
        return sum + (t.transaction_type === 'deposit' ? Number(t.amount) : -Number(t.amount));
      }, 0);
      setTrustBalance(Math.max(0, balance));
    };
    fetchTrust();
  }, [user]);

  // Fetch unresponded leads (status='new', older than 5 min)
  useEffect(() => {
    if (!user) return;
    const fiveMinAgo = new Date(Date.now() - 5 * 60 * 1000).toISOString();
    supabase
      .from('agents')
      .select('id')
      .eq('user_id', user.id)
      .single()
      .then(({ data: agent }) => {
        if (!agent) return;
        supabase
          .from('leads')
          .select('id', { count: 'exact', head: true })
          .eq('agent_id', agent.id)
          .eq('status', 'new')
          .lt('created_at', fiveMinAgo)
          .then(({ count }) => setUnrespondedLeads(count || 0));
      });
  }, [user]);

  // Fetch pipeline data from activities (entity_type='property', action='sold')
  useEffect(() => {
    if (!user) return;
    const now = new Date();
    const twelveMonthsAgo = new Date(now.getFullYear(), now.getMonth() - 11, 1).toISOString();
    supabase
      .from('activities')
      .select('created_at, metadata')
      .eq('user_id', user.id)
      .eq('entity_type', 'property')
      .eq('action', 'sold')
      .gte('created_at', twelveMonthsAgo)
      .then(({ data }) => {
        const months = buildEmptyMonths();
        if (data && data.length > 0) {
          const monthMap = new Map(months.map((m, i) => [i, m]));
          const baseDate = new Date(now.getFullYear(), now.getMonth() - 11, 1);
          data.forEach((row) => {
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
      });
  }, [user]);

  // Fetch recent activities
  useEffect(() => {
    if (!user) return;
    supabase
      .from('activities')
      .select('*')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })
      .limit(5)
      .then(({ data }) => setRecentActivities(data || []));
  }, [user]);

  // Fetch today's inspections from properties with inspection_times JSONB
  useEffect(() => {
    if (!user) return;
    const todayStr = new Date().toISOString().split('T')[0];
    supabase
      .from('properties')
      .select('id, address, inspection_times')
      .eq('is_active', true)
      .not('inspection_times', 'eq', '[]')
      .then(({ data }) => {
        if (!data) return;
        const inspections: { address: string; time: string; propertyId: string }[] = [];
        data.forEach((prop) => {
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
      });
  }, [user]);

  // Fetch arrears tenancies
  useEffect(() => {
    if (!user) return;
    const fetchArrears = async () => {
      const { data: agent } = await supabase
        .from('agents').select('id').eq('user_id', user.id).single();
      if (!agent) return;

      const { data: tenancies } = await supabase
        .from('tenancies')
        .select('*, properties(address, suburb)')
        .eq('agent_id', agent.id)
        .eq('status', 'active');
      if (!tenancies || tenancies.length === 0) return;

      const tenancyIds = tenancies.map(t => t.id);
      const { data: payments } = await supabase
        .from('rent_payments')
        .select('*')
        .in('tenancy_id', tenancyIds)
        .order('payment_date', { ascending: false });

      const today = new Date();
      const overdue: any[] = [];

      for (const t of tenancies) {
        const tenancyPayments = (payments || []).filter(p => p.tenancy_id === t.id);
        const latest = tenancyPayments[0];
        if (!latest) {
          // No payments at all — check if lease started more than 3 days ago
          const leaseStart = new Date(t.lease_start);
          const daysSinceStart = differenceInDays(today, leaseStart);
          if (daysSinceStart > 3) {
            overdue.push({ ...t, daysOverdue: daysSinceStart, amountOwed: Number(t.rent_amount) });
          }
          continue;
        }
        const periodEnd = new Date(latest.period_to);
        const daysOverdue = differenceInDays(today, periodEnd);
        if (daysOverdue > 3 && latest.status !== 'paid') {
          overdue.push({ ...t, daysOverdue, amountOwed: Number(t.rent_amount) });
        }
      }
      setArrearsTenancies(overdue);
    };
    fetchArrears();
  }, [user]);

  // Fetch listings with no vendor report in the last 7 days
  useEffect(() => {
    if (!user) return;
    const fetchReportsDue = async () => {
      const { data: agent } = await supabase
        .from('agents')
        .select('id')
        .eq('user_id', user.id)
        .single();
      if (!agent) return;

      const { data: props } = await supabase
        .from('properties')
        .select('id, address, suburb, views, contact_clicks, listed_date, vendor_name, vendor_email')
        .eq('agent_id', agent.id)
        .eq('status', 'public')
        .eq('is_active', true);
      if (!props || props.length === 0) return;

      const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();
      const { data: recentReports } = await supabase
        .from('vendor_reports')
        .select('property_id, sent_at')
        .eq('agent_id', agent.id)
        .gte('sent_at', sevenDaysAgo);

      const recentPropertyIds = new Set((recentReports || []).map(r => r.property_id));
      const due = props.filter(p => !recentPropertyIds.has(p.id) && p.vendor_email);
      setReportsDue(due);
    };
    fetchReportsDue();
  }, [user]);

  const handleSendReminder = async (tenancy: any) => {
    setSendingReminder(tenancy.id);
    try {
      const address = tenancy.properties?.address || 'your property';
      const res = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/send-notification-email`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${(await supabase.auth.getSession()).data.session?.access_token}` },
          body: JSON.stringify({
            to: tenancy.tenant_email,
            subject: 'Rent overdue reminder',
            body: `Dear ${tenancy.tenant_name}, your rent for ${address} is overdue. Please arrange payment at your earliest convenience. Thank you.`,
          }),
        }
      );
      if (!res.ok) throw new Error('Failed to send');
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

  // Reputation score with trend — new users start at 0
  const repScore = 0;
  const lastMonthKey = 'gh_rep_last_month';
  const lastMonth = parseInt(localStorage.getItem(lastMonthKey) || '0', 10);
  const repTrend = lastMonth === 0 ? 'neutral' : repScore > lastMonth ? 'up' : repScore < lastMonth ? 'down' : 'neutral';
  useEffect(() => { localStorage.setItem(lastMonthKey, String(repScore)); }, [repScore]);
  const repColors = getScoreColor(repScore);

  const stats = [
    { label: 'Tasks Due', value: String(tasksDue), icon: <CheckSquare size={16} />, color: 'text-destructive', link: '/dashboard/contacts' },
    { label: 'Active Contacts', value: String(activeContacts), icon: <Users size={16} />, color: 'text-primary', link: '/dashboard/contacts' },
    { label: 'Appraisals This Month', value: '0', icon: <ClipboardList size={16} />, color: 'text-success', link: '/dashboard/listings' },
    { label: 'Sales This Month', value: AUD.format(0), icon: <DollarSign size={16} />, color: 'text-primary', link: '/dashboard/reports' },
    { label: 'Trust Balance', value: AUD.format(trustBalance), icon: <Landmark size={16} />, color: 'text-success', link: '/dashboard/trust' },
    { label: 'Unresponded Leads', value: String(unrespondedValue), icon: <Zap size={16} />, color: unrespondedValue > 0 ? 'text-destructive' : 'text-success', link: '/dashboard/leads' },
  ];

  return (
    <div>
      <DashboardHeader title="Dashboard" subtitle="Welcome back, Agent" />

      <div className="p-4 sm:p-6 space-y-6 max-w-7xl">
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

        {/* Stats Row */}
        <div className="grid grid-cols-2 lg:grid-cols-7 gap-3">
          {stats.map((s) => (
            <motion.div
              key={s.label}
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              onClick={() => navigate(s.link)}
              className="bg-card border border-border rounded-xl p-4 cursor-pointer hover:border-primary/50 hover:shadow-md transition-all"
            >
              <div className="flex items-center gap-1.5 text-muted-foreground mb-1">
                <span className={s.color}>{s.icon}</span>
                <span className="text-xs">{s.label}</span>
              </div>
              <p className="font-display text-2xl font-extrabold">{s.value}</p>
            </motion.div>
          ))}
          {/* Reputation Score stat */}
          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            onClick={() => navigate(`/agent/me`)}
            className={`bg-card border border-border rounded-xl p-4 cursor-pointer hover:border-primary/50 hover:shadow-md transition-all`}
          >
            <div className="flex items-center gap-1.5 text-muted-foreground mb-1">
              <span className={repColors.text}><Shield size={16} /></span>
              <span className="text-xs">Reputation</span>
            </div>
            <div className="flex items-center gap-1.5">
              <p className={`font-display text-2xl font-extrabold ${repColors.text}`}>{repScore}</p>
              <span className="text-xs text-muted-foreground">/100</span>
              {repTrend === 'up' && <ArrowUp size={14} className="text-green-500" />}
              {repTrend === 'down' && <ArrowDown size={14} className="text-red-500" />}
              {repTrend === 'neutral' && <Minus size={14} className="text-muted-foreground" />}
            </div>
          </motion.div>
        </div>

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
                <div key={t.id} className="flex items-center justify-between border border-border rounded-lg p-3">
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-medium truncate">{t.tenant_name}</p>
                    <p className="text-[10px] text-muted-foreground truncate">{t.properties?.address}{t.properties?.suburb ? `, ${t.properties.suburb}` : ''}</p>
                    <p className="text-[10px] text-destructive font-medium mt-0.5">{t.daysOverdue} days overdue · {AUD.format(t.amountOwed)} owed</p>
                  </div>
                  <div className="flex gap-1.5 ml-2 shrink-0">
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
                  className="flex items-center justify-between border border-border rounded-lg p-3"
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
                  <div className="flex gap-1.5 ml-2 shrink-0">
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

        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.05 }}
          className="bg-card border border-border rounded-xl p-5"
        >
          <h3 className="font-display text-sm font-bold mb-4 flex items-center gap-2">
            <CalendarDays size={16} className="text-primary" /> Today's Inspections
          </h3>
          {todayInspections.length === 0 ? (
            <p className="text-sm text-muted-foreground py-4 text-center">No inspections scheduled for today</p>
          ) : (
            <div className="space-y-2">
              {todayInspections.map((insp, i) => (
                <div key={i} className="flex items-center justify-between border border-border rounded-lg p-3">
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-medium truncate">{insp.address}</p>
                    <p className="text-[10px] text-muted-foreground mt-0.5">🕐 {insp.time}</p>
                  </div>
                  <Button
                    size="sm"
                    variant="outline"
                    className="text-[10px] h-6 px-2 shrink-0 ml-2"
                    onClick={() => navigate(`/dashboard/listings/${insp.propertyId}`)}
                  >
                    View Listing
                  </Button>
                </div>
              ))}
            </div>
          )}
        </motion.div>

        {/* Today's Voice Matches */}
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="bg-card border border-border rounded-xl p-5"
        >
          <h3 className="font-display text-sm font-bold mb-4 flex items-center gap-2">
            <Mic size={16} className="text-success" /> Today's Voice Matches
          </h3>
          <p className="text-sm text-muted-foreground py-4 text-center">No voice matches yet</p>
        </motion.div>

        {/* Listing Performance */}
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
                    No listings yet — <button onClick={() => navigate('/dashboard/listings/new')} className="text-primary underline underline-offset-2">create your first listing</button>
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </section>

        {/* Recent Activity */}
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="bg-card border border-border rounded-xl p-5"
        >
          <h3 className="font-display text-sm font-bold mb-4 flex items-center gap-2">
            <Activity size={16} className="text-success" /> Recent Activity
          </h3>
          {recentActivities.length > 0 ? (
            <div className="space-y-3">
              {recentActivities.map((a) => (
                <div key={a.id} className="flex items-start gap-3 text-sm">
                  <div className="w-2 h-2 rounded-full bg-primary mt-1.5 shrink-0" />
                  <div className="flex-1 min-w-0">
                    <p className="text-xs">{a.description || a.action}</p>
                    <p className="text-[10px] text-muted-foreground">{AU_DATE(a.created_at)}</p>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-sm text-muted-foreground py-4 text-center">No recent activity</p>
          )}
        </motion.div>

        {/* GCI Gauge + Pipeline Chart row */}
        <div className="grid lg:grid-cols-2 gap-4">
          {/* GCI Gauge */}
          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.25 }}
            className="bg-card border border-border rounded-xl p-5"
          >
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

          {/* Pipeline Chart */}
          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
            className="bg-card border border-border rounded-xl p-5"
          >
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
        </div>
      </div>
    </div>
  );
};

export default DashboardOverview;
