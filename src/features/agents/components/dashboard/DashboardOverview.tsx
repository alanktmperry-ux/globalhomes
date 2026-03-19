import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import {
  CheckSquare, Users, ClipboardList, DollarSign, Landmark,
  Mic, Phone, Send, Calendar, CalendarDays, Flame, Thermometer, Snowflake, Sparkles, Eye,
  TrendingUp, Zap, MessageSquare, Activity, Shield, ArrowUp, ArrowDown, Minus,
} from 'lucide-react';
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
            <h2 className="font-bold text-lg mb-1">Welcome to GlobalHomes 👋</h2>
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

        {/* Today's Inspections */}
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
