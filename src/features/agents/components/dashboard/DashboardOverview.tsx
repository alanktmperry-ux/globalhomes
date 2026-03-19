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

const DEMO_PIPELINE_DATA = [
  { month: 'Apr', deals: 3, value: 128000 },
  { month: 'May', deals: 4, value: 156000 },
  { month: 'Jun', deals: 2, value: 94000 },
  { month: 'Jul', deals: 5, value: 185000 },
  { month: 'Aug', deals: 3, value: 112000 },
  { month: 'Sep', deals: 4, value: 148000 },
  { month: 'Oct', deals: 6, value: 210000 },
  { month: 'Nov', deals: 3, value: 125000 },
  { month: 'Dec', deals: 4, value: 164000 },
  { month: 'Jan', deals: 5, value: 192000 },
  { month: 'Feb', deals: 4, value: 155000 },
  { month: 'Mar', deals: 7, value: 380000 },
];

const URGENCY_CONFIG = {
  hot: { icon: <Flame size={12} />, color: 'bg-destructive/15 text-destructive', label: 'Hot' },
  warm: { icon: <Thermometer size={12} />, color: 'bg-primary/15 text-primary', label: 'Warm' },
  cold: { icon: <Snowflake size={12} />, color: 'bg-muted text-muted-foreground', label: 'Cold' },
};

const MOCK_MATCHES = [
  { id: '1', transcript: '3 bed house in Berwick with pool under $900k', buyerLocation: 'Melbourne CBD', urgency: 'hot' as const, time: '12 min ago', matchedListing: '42 Panorama Drive', intentScore: 92 },
  { id: '2', transcript: 'Investment property near train station, 2 bed apartment', buyerLocation: 'Sydney (relocating)', urgency: 'warm' as const, time: '1h ago', matchedListing: '15 Station Street', intentScore: 65 },
  { id: '3', transcript: 'Looking for land in officer area, 600sqm minimum', buyerLocation: 'Pakenham', urgency: 'cold' as const, time: '3h ago', matchedListing: 'Lot 12 Officer South', intentScore: 30 },
];

const DashboardOverview = () => {
  const { listings, isMockData } = useAgentListings();
  const { user, isDemoMode } = useAuth();
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
    if (!user || isDemoMode) return;
    supabase
      .from('contacts')
      .select('id', { count: 'exact', head: true })
      .eq('created_by', user.id)
      .then(({ count }) => setActiveContacts(count || 0));
  }, [user, isDemoMode]);

  // Fetch trust balance
  useEffect(() => {
    if (!user || isDemoMode) return;
    supabase
      .from('agents')
      .select('id')
      .eq('user_id', user.id)
      .single()
      .then(({ data: agent }) => {
        if (!agent) return;
        supabase
          .from('trust_transactions')
          .select('amount, transaction_type')
          .eq('agent_id', agent.id)
          .then((res: any) => {
            const rows = res.data as { amount: number; transaction_type: string }[] | null;
            if (!rows) return;
            const balance = rows.reduce((sum: number, t) => {
              return sum + (t.transaction_type === 'deposit' ? Number(t.amount) : -Number(t.amount));
            }, 0);
            setTrustBalance(Math.max(0, balance));
          });
      });
  }, [user, isDemoMode]);

  // Fetch unresponded leads (status='new', older than 5 min)
  useEffect(() => {
    if (!user || isDemoMode) return;
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
  }, [user, isDemoMode]);

  // Fetch pipeline data from activities (entity_type='property', action='sold')
  useEffect(() => {
    if (!user || isDemoMode) return;
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
  }, [user, isDemoMode]);

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
    if (!user || isDemoMode) return;
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
  }, [user, isDemoMode]);

  // GCI values — demo-aware; real users start at 0
  const gciActual = isDemoMode ? 1250000 : 0;
  const gciBudgeted = isDemoMode ? 1800000 : 0;
  const gciPotential = isDemoMode ? 2200000 : 0;
  const gciPercent = gciBudgeted > 0 ? Math.round((gciActual / gciBudgeted) * 100) : 0;

  // Stats row - Australian CRM focus
  const unrespondedValue = isDemoMode ? 2 : unrespondedLeads;

  // Reputation score with trend
  const repScore = DEMO_REPUTATION.total;
  const lastMonthKey = 'gh_rep_last_month';
  const lastMonth = parseInt(localStorage.getItem(lastMonthKey) || '0', 10);
  const repTrend = lastMonth === 0 ? 'neutral' : repScore > lastMonth ? 'up' : repScore < lastMonth ? 'down' : 'neutral';
  useEffect(() => { localStorage.setItem(lastMonthKey, String(repScore)); }, [repScore]);
  const repColors = getScoreColor(repScore);

  const stats = [
    { label: 'Tasks Due', value: String(isDemoMode ? 5 : tasksDue), icon: <CheckSquare size={16} />, color: 'text-destructive', link: '/dashboard/contacts' },
    { label: 'Active Contacts', value: isDemoMode ? '62' : String(activeContacts), icon: <Users size={16} />, color: 'text-primary', link: '/dashboard/contacts' },
    { label: 'Appraisals This Month', value: isDemoMode ? '9' : '0', icon: <ClipboardList size={16} />, color: 'text-success', link: '/dashboard/listings' },
    { label: 'Sales This Month', value: AUD.format(isDemoMode ? 1250000 : 0), icon: <DollarSign size={16} />, color: 'text-primary', link: '/dashboard/reports' },
    { label: 'Trust Balance', value: AUD.format(isDemoMode ? 47230 : trustBalance), icon: <Landmark size={16} />, color: 'text-success', link: '/dashboard/trust' },
    { label: 'Unresponded Leads', value: String(unrespondedValue), icon: <Zap size={16} />, color: unrespondedValue > 0 ? 'text-destructive' : 'text-success', link: '/dashboard/leads' },
  ];

  return (
    <div>
      <DashboardHeader title="Dashboard" subtitle={isDemoMode ? "South Yarra Demo Agency" : "Welcome back, Agent"} />

      <div className="p-4 sm:p-6 space-y-6 max-w-7xl">
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
          {(() => {
            const DEMO_INSPECTIONS = [
              { address: '42 Panorama Drive, Berwick', time: '10:00 AM', propertyId: '1' },
              { address: '15 Station St, Narre Warren', time: '12:30 PM', propertyId: '2' },
              { address: '8 Ocean View Rd, Brighton', time: '2:00 PM', propertyId: '3' },
            ];
            const inspections = isDemoMode ? DEMO_INSPECTIONS : todayInspections;
            if (inspections.length === 0) {
              return (
                <p className="text-sm text-muted-foreground py-4 text-center">No inspections scheduled for today</p>
              );
            }
            return (
              <div className="space-y-2">
                {inspections.map((insp, i) => (
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
            );
          })()}
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
          <div className="space-y-3">
            {MOCK_MATCHES.map((m) => {
              const u = URGENCY_CONFIG[m.urgency];
              const tier = getIntentTier(m.intentScore);
              return (
                <div key={m.id} className="border border-border rounded-lg p-3">
                  <div className="flex items-center gap-2 mb-1">
                    <Badge className={`${u.color} text-[10px] gap-0.5 border-0`}>
                      {u.icon} {u.label}
                    </Badge>
                    <TooltipProvider>
                      <UiTooltip>
                        <TooltipTrigger asChild>
                          <Badge className={`${tier.className} text-[10px] gap-0.5 border-0 cursor-help`}>{tier.label} {m.intentScore}</Badge>
                        </TooltipTrigger>
                        <TooltipContent><p className="text-xs max-w-[200px]">{INTENT_TOOLTIP}</p></TooltipContent>
                      </UiTooltip>
                    </TooltipProvider>
                    <span className="text-[10px] text-muted-foreground">{m.time}</span>
                  </div>
                  <p className="text-xs font-medium truncate">"{m.transcript}"</p>
                  <p className="text-[10px] text-muted-foreground mt-0.5">
                    📍 {m.buyerLocation} → <strong>{m.matchedListing}</strong>
                  </p>
                  <div className="flex items-center gap-1.5 mt-2">
                    <Button size="sm" variant="outline" className="text-[10px] h-6 px-2 gap-1">
                      <Phone size={10} /> Call
                    </Button>
                    <Button size="sm" variant="outline" className="text-[10px] h-6 px-2 gap-1">
                      <Send size={10} /> Info
                    </Button>
                    <Button size="sm" className="text-[10px] h-6 px-2 gap-1">
                      <Sparkles size={10} /> AI Reply
                    </Button>
                  </div>
                </div>
              );
            })}
          </div>
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
                {[
                  { id: '1', thumb: 'https://images.unsplash.com/photo-1600596542815-ffad4c1539a9?w=80&h=60&fit=crop', address: '42 Panorama Drive, Berwick', status: 'whisper', views: 24, voiceInquiries: 3, qualifiedLeads: 2, daysListed: 4 },
                  { id: '2', thumb: 'https://images.unsplash.com/photo-1600585154340-be6161a56a0c?w=80&h=60&fit=crop', address: '15 Station St, Narre Warren', status: 'coming-soon', views: 67, voiceInquiries: 8, qualifiedLeads: 5, daysListed: 11 },
                  { id: '3', thumb: 'https://images.unsplash.com/photo-1600607687939-ce8a6c25118c?w=80&h=60&fit=crop', address: '8 Ocean View Rd, Brighton', status: 'public', views: 142, voiceInquiries: 12, qualifiedLeads: 7, daysListed: 18 },
                ].map((l) => {
                  const daysColor = l.daysListed < 7 ? 'text-success' : l.daysListed < 15 ? 'text-primary' : 'text-destructive';
                  const statusLabel = l.status === 'whisper' ? '🤫 Whisper' : l.status === 'coming-soon' ? '🔜 Soon' : '🟢 Live';
                  return (
                    <tr key={l.id} className="border-b border-border last:border-0 hover:bg-accent/30 transition-colors">
                      <td className="p-3">
                        <div className="flex items-center gap-2">
                          <img src={l.thumb} alt="" className="w-10 h-8 rounded-md object-cover shrink-0" />
                          <span className="text-xs font-medium truncate max-w-[180px]">{l.address}</span>
                        </div>
                      </td>
                      <td className="p-3"><span className="text-[10px] font-semibold">{statusLabel}</span></td>
                      <td className="p-3 text-center font-medium">{l.views}</td>
                      <td className="p-3 text-center font-medium">{l.voiceInquiries}</td>
                      <td className="p-3 text-center font-medium">{l.qualifiedLeads}</td>
                      <td className={`p-3 text-center font-bold ${daysColor}`}>{l.daysListed}</td>
                      <td className="p-3 text-right">
                        <div className="flex items-center justify-end gap-1">
                          <Button size="sm" variant="ghost" className="text-[10px] h-6 px-2">Edit</Button>
                          <Button size="sm" variant="ghost" className="text-[10px] h-6 px-2">Boost</Button>
                          <Button size="sm" variant="ghost" className="text-[10px] h-6 px-2 text-success">Sold</Button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
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
            <div className="space-y-3">
              {[
                { text: 'Called Sarah M. re: 42 Panorama Dr appraisal', time: 'Today, 2:15 PM' },
                { text: 'New lead: John D. enquired about 15 Station St', time: 'Today, 11:30 AM' },
                { text: 'Listing 8 Ocean View Rd marked as Under Contract', time: 'Yesterday, 4:00 PM' },
                { text: 'Inspection scheduled: 22 Park Ave, Saturday 10am', time: 'Yesterday, 9:45 AM' },
                { text: 'Commission invoice #1042 paid — $12,500', time: '10/03/2026' },
              ].map((a, i) => (
                <div key={i} className="flex items-start gap-3 text-sm">
                  <div className="w-2 h-2 rounded-full bg-primary mt-1.5 shrink-0" />
                  <div className="flex-1 min-w-0">
                    <p className="text-xs">{a.text}</p>
                    <p className="text-[10px] text-muted-foreground">{a.time}</p>
                  </div>
                </div>
              ))}
            </div>
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
                <Progress value={Math.round((gciPotential / gciPotential) * 100)} className="h-3 opacity-50" />
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
              {!isDemoMode && pipelineEmpty && (
                <div className="absolute inset-0 flex items-center justify-center z-10">
                  <p className="text-sm text-muted-foreground bg-card/80 backdrop-blur-sm px-3 py-1.5 rounded-lg">No completed sales yet</p>
                </div>
              )}
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={isDemoMode ? DEMO_PIPELINE_DATA : pipelineData}>
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
