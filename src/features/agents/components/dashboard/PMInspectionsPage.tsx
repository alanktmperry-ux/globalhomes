import { useEffect, useState, useMemo, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/features/auth/AuthProvider';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Checkbox } from '@/components/ui/checkbox';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from '@/components/ui/dialog';
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import {
  Popover, PopoverContent, PopoverTrigger,
} from '@/components/ui/popover';
import { Calendar } from '@/components/ui/calendar';
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table';
import { toast } from 'sonner';
import {
  CalendarDays, Plus, CheckCircle2, XCircle, Loader2, Mail,
  AlertTriangle, ExternalLink, CalendarIcon, Copy, ClipboardCheck, FileText, PlayCircle,
} from 'lucide-react';
import { format, parseISO, addDays, differenceInDays } from 'date-fns';
import DashboardHeader from './DashboardHeader';
import { cn } from '@/shared/lib/utils';

type InspectionType = 'entry' | 'routine' | 'exit';
type InspectionStatus = 'scheduled' | 'completed' | 'cancelled';

interface InspectionRow {
  id: string;
  tenancy_id: string | null;
  inspection_type: InspectionType;
  scheduled_date: string;
  conducted_date: string | null;
  status: InspectionStatus;
  notice_sent_at: string | null;
  overall_notes: string | null;
  tenant_disputed_at?: string | null;
  tenant_dispute_notes?: string | null;
  dispute_resolved_at?: string | null;
  tenancies?: {
    tenant_name: string | null;
    lease_start: string | null;
    lease_end: string | null;
    agent_id: string;
    properties?: {
      address: string | null;
      suburb: string | null;
      state: string | null;
    } | null;
  } | null;
}

interface ActiveTenancy {
  id: string;
  tenant_name: string | null;
  lease_start: string;
  lease_end: string | null;
  property_id: string;
  properties?: {
    address: string | null;
    suburb: string | null;
    state: string | null;
  } | null;
}

interface SuggestedInspection {
  tenancyId: string;
  tenantName: string;
  address: string;
  state: string;
  reason: string;
}

const TYPE_LABEL: Record<InspectionType, string> = {
  entry: 'Entry', routine: 'Routine', exit: 'Exit',
};
const TYPE_BADGE: Record<InspectionType, string> = {
  entry: 'bg-blue-500/15 text-blue-700 border-0',
  routine: 'bg-teal-500/15 text-teal-700 border-0',
  exit: 'bg-orange-500/15 text-orange-700 border-0',
};
const STATUS_LABEL: Record<InspectionStatus, string> = {
  scheduled: 'Scheduled', completed: 'Completed', cancelled: 'Cancelled',
};
const STATUS_BADGE: Record<InspectionStatus, string> = {
  scheduled: 'bg-slate-500/15 text-slate-700 border-0',
  completed: 'bg-emerald-500/15 text-emerald-700 border-0',
  cancelled: 'bg-red-500/15 text-red-700 border-0',
};

interface StateRule { noticeHours?: number; noticeDays?: number; maxPerYear: number; act: string; }
const STATE_RULES: Record<string, StateRule> = {
  VIC: { noticeHours: 24, maxPerYear: 4, act: 'Residential Tenancies Act 1997 (Vic)' },
  NSW: { noticeDays: 7, maxPerYear: 4, act: 'Residential Tenancies Act 2010 (NSW)' },
  QLD: { noticeHours: 24, maxPerYear: 4, act: 'Residential Tenancies and Rooming Accommodation Act 2008 (Qld)' },
  WA:  { noticeDays: 7, maxPerYear: 4, act: 'Residential Tenancies Act 1987 (WA)' },
  SA:  { noticeDays: 7, maxPerYear: 4, act: 'Residential Tenancies Act 1995 (SA)' },
  ACT: { noticeDays: 7, maxPerYear: 4, act: 'Residential Tenancies Act 1997 (ACT)' },
  TAS: { noticeHours: 24, maxPerYear: 4, act: 'Residential Tenancy Act 1997 (Tas)' },
  NT:  { noticeHours: 24, maxPerYear: 4, act: 'Residential Tenancies Act 1999 (NT)' },
};
const DEFAULT_RULE: StateRule = { noticeDays: 7, maxPerYear: 4, act: 'applicable residential tenancies legislation' };

const ruleFor = (state?: string | null): StateRule => {
  const s = (state || '').toUpperCase();
  return STATE_RULES[s] || DEFAULT_RULE;
};
const ruleNoticeText = (r: StateRule) =>
  r.noticeHours ? `${r.noticeHours}-hour` : `${r.noticeDays}-day`;
const ruleMinDate = (r: StateRule): Date => {
  const today = new Date();
  if (r.noticeHours) return addDays(today, Math.ceil(r.noticeHours / 24));
  return addDays(today, r.noticeDays || 7);
};

interface ScheduleForm {
  tenancy_id: string;
  inspection_type: InspectionType;
  scheduled_date?: Date;
  notes: string;
}
const emptySchedule = (): ScheduleForm => ({
  tenancy_id: '', inspection_type: 'routine', notes: '',
});

interface CompleteForm {
  conducted_date: Date;
  notes: string;
  condition: 'excellent' | 'good' | 'fair' | 'attention' | 'urgent';
  followUp: boolean;
}

const CONDITION_LABELS: Record<CompleteForm['condition'], string> = {
  excellent: 'Excellent',
  good: 'Good',
  fair: 'Fair',
  attention: 'Requires Attention',
  urgent: 'Urgent Issues',
};

type FilterTab = 'upcoming' | 'overdue' | 'completed' | 'due' | 'disputes';

export default function PMInspectionsPage() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [agentId, setAgentId] = useState<string | null>(null);
  const [agentName, setAgentName] = useState('');
  const [agencyName, setAgencyName] = useState('');
  const [loading, setLoading] = useState(true);
  const [inspections, setInspections] = useState<InspectionRow[]>([]);
  const [activeTenancies, setActiveTenancies] = useState<ActiveTenancy[]>([]);
  const [tab, setTab] = useState<FilterTab>('upcoming');

  const [scheduleForm, setScheduleForm] = useState<ScheduleForm | null>(null);
  const [savingSchedule, setSavingSchedule] = useState(false);

  const [noticeFor, setNoticeFor] = useState<InspectionRow | null>(null);
  const [savingNotice, setSavingNotice] = useState(false);

  const [completeFor, setCompleteFor] = useState<InspectionRow | null>(null);
  const [completeForm, setCompleteForm] = useState<CompleteForm>({
    conducted_date: new Date(), notes: '', condition: 'good', followUp: false,
  });
  const [savingComplete, setSavingComplete] = useState(false);

  const [cancelTarget, setCancelTarget] = useState<InspectionRow | null>(null);

  const [resolveFor, setResolveFor] = useState<InspectionRow | null>(null);
  const [resolveNotes, setResolveNotes] = useState('');
  const [savingResolve, setSavingResolve] = useState(false);

  const loadData = useCallback(async () => {
    if (!user) return;
    setLoading(true);
    const { data: agent } = await supabase
      .from('agents')
      .select('id, full_name, agency_name')
      .eq('user_id', user.id)
      .maybeSingle();
    if (!agent) { setLoading(false); return; }
    const aid = (agent as any).id as string;
    setAgentId(aid);
    setAgentName((agent as any).full_name || '');
    setAgencyName((agent as any).agency_name || '');

    const [insRes, tensRes] = await Promise.all([
      supabase
        .from('property_inspections')
        .select(`
          id, tenancy_id, inspection_type, scheduled_date, conducted_date, status, notice_sent_at, overall_notes,
          tenant_disputed_at, tenant_dispute_notes, dispute_resolved_at,
          tenancies!inner(
            tenant_name, lease_start, lease_end, agent_id,
            properties(address, suburb, state)
          )
        `)
        .eq('tenancies.agent_id', aid)
        .order('scheduled_date', { ascending: true }),
      supabase
        .from('tenancies')
        .select('id, tenant_name, lease_start, lease_end, property_id, properties(address, suburb, state)')
        .eq('agent_id', aid)
        .eq('status', 'active'),
    ]);

    if (insRes.error) toast.error('Could not load inspections');
    setInspections(((insRes.data as any) || []) as InspectionRow[]);
    setActiveTenancies(((tensRes.data as any) || []) as ActiveTenancy[]);
    setLoading(false);
  }, [user]);

  useEffect(() => { loadData(); }, [loadData]);

  // Suggested inspections
  const suggested = useMemo<SuggestedInspection[]>(() => {
    const today = new Date();
    const ninety = addDays(today, 90).toISOString().slice(0, 10);
    const todayStr = today.toISOString().slice(0, 10);
    const out: SuggestedInspection[] = [];

    for (const t of activeTenancies) {
      // Already has scheduled routine in next 90 days?
      const hasUpcomingRoutine = inspections.some(i =>
        i.tenancy_id === t.id &&
        i.inspection_type === 'routine' &&
        i.status === 'scheduled' &&
        i.scheduled_date >= todayStr &&
        i.scheduled_date <= ninety
      );
      if (hasUpcomingRoutine) continue;

      const completedRoutines = inspections
        .filter(i => i.tenancy_id === t.id && i.inspection_type === 'routine' && i.status === 'completed')
        .map(i => i.conducted_date || i.scheduled_date)
        .filter(Boolean) as string[];
      const lastRoutine = completedRoutines.sort().pop();

      const leaseAgeDays = differenceInDays(today, parseISO(t.lease_start));
      let reason = '';
      if (lastRoutine) {
        const days = differenceInDays(today, parseISO(lastRoutine));
        if (days >= 90) reason = `Last routine ${days} days ago`;
      } else if (leaseAgeDays >= 90) {
        reason = `No routine inspections — tenancy ${leaseAgeDays} days old`;
      }
      if (!reason) continue;

      out.push({
        tenancyId: t.id,
        tenantName: t.tenant_name || 'Tenant',
        address: [t.properties?.address, t.properties?.suburb].filter(Boolean).join(', ') || '—',
        state: (t.properties?.state || '').toUpperCase(),
        reason,
      });
    }
    return out;
  }, [activeTenancies, inspections]);

  // Vacating soon — tenancies ending within 60 days with no exit inspection yet
  const vacatingSoon = useMemo(() => {
    const today = new Date();
    const todayStr = today.toISOString().slice(0, 10);
    const sixty = addDays(today, 60).toISOString().slice(0, 10);
    return activeTenancies
      .filter(t => {
        if (!t.lease_end) return false;
        if (t.lease_end < todayStr || t.lease_end > sixty) return false;
        const hasExit = inspections.some(i =>
          i.tenancy_id === t.id &&
          i.inspection_type === 'exit' &&
          i.status !== 'cancelled'
        );
        return !hasExit;
      })
      .map(t => ({
        tenancyId: t.id,
        tenantName: t.tenant_name || 'Tenant',
        address: [t.properties?.address, t.properties?.suburb].filter(Boolean).join(', ') || '—',
        leaseEnd: t.lease_end as string,
        daysToEnd: differenceInDays(parseISO(t.lease_end as string), today),
      }))
      .sort((a, b) => a.daysToEnd - b.daysToEnd);
  }, [activeTenancies, inspections]);

  // Disputed (unresolved) inspections
  const disputed = useMemo(() => {
    return inspections.filter(i => !!i.tenant_disputed_at && !i.dispute_resolved_at);
  }, [inspections]);

  // Stats
  const stats = useMemo(() => {
    const today = new Date().toISOString().slice(0, 10);
    const in30 = addDays(new Date(), 30).toISOString().slice(0, 10);
    const last90 = addDays(new Date(), -90).toISOString().slice(0, 10);
    let upcoming = 0, overdue = 0, completedQuarter = 0;
    for (const i of inspections) {
      if (i.status === 'scheduled') {
        if (i.scheduled_date < today) overdue++;
        else if (i.scheduled_date <= in30) upcoming++;
      } else if (i.status === 'completed') {
        const d = i.conducted_date || i.scheduled_date;
        if (d && d >= last90) completedQuarter++;
      }
    }
    return { upcoming, overdue, completedQuarter, due: suggested.length, disputes: disputed.length };
  }, [inspections, suggested, disputed]);

  // Filtered list
  const filtered = useMemo(() => {
    const today = new Date().toISOString().slice(0, 10);
    if (tab === 'due' || tab === 'disputes') return [];
    return inspections.filter(i => {
      if (tab === 'upcoming') return i.status === 'scheduled' && i.scheduled_date >= today;
      if (tab === 'overdue') return i.status === 'scheduled' && i.scheduled_date < today;
      if (tab === 'completed') return i.status === 'completed';
      return true;
    });
  }, [inspections, tab]);

  const submitResolve = async () => {
    if (!resolveFor) return;
    setSavingResolve(true);
    const { error } = await supabase
      .from('property_inspections')
      .update({
        dispute_resolved_at: new Date().toISOString(),
        dispute_resolution_notes: resolveNotes.trim() || null,
      } as any)
      .eq('id', resolveFor.id);
    setSavingResolve(false);
    if (error) { toast.error('Could not mark resolved'); return; }
    toast.success('Dispute marked as resolved');
    setResolveFor(null);
    setResolveNotes('');
    loadData();
  };

  // Handlers
  const openSchedule = (tenancyId?: string) => {
    setScheduleForm({
      ...emptySchedule(),
      tenancy_id: tenancyId || '',
    });
  };

  const selectedTenancy = useMemo(() => {
    if (!scheduleForm?.tenancy_id) return null;
    return activeTenancies.find(t => t.id === scheduleForm.tenancy_id) || null;
  }, [scheduleForm, activeTenancies]);

  const selectedRule = useMemo(() => ruleFor(selectedTenancy?.properties?.state), [selectedTenancy]);
  const selectedMinDate = useMemo(() => ruleMinDate(selectedRule), [selectedRule]);

  const submitSchedule = async (opts: { startReport?: boolean } = {}) => {
    if (!scheduleForm || !agentId) return;
    if (!scheduleForm.tenancy_id) { toast.error('Select a tenancy'); return; }
    if (!scheduleForm.scheduled_date) { toast.error('Select a date'); return; }
    const t = activeTenancies.find(x => x.id === scheduleForm.tenancy_id);
    setSavingSchedule(true);
    const { data: inserted, error } = await supabase.from('property_inspections').insert({
      tenancy_id: scheduleForm.tenancy_id,
      property_id: t?.property_id,
      agent_id: agentId,
      inspection_type: scheduleForm.inspection_type,
      scheduled_date: format(scheduleForm.scheduled_date, 'yyyy-MM-dd'),
      status: 'scheduled',
      overall_notes: scheduleForm.notes.trim() || null,
    } as any).select('id').maybeSingle();
    setSavingSchedule(false);
    if (error || !inserted) { toast.error('Could not schedule inspection'); return; }
    toast.success('Inspection scheduled');
    setScheduleForm(null);
    if (opts.startReport) {
      navigate(`/dashboard/inspection/${(inserted as any).id}`);
      return;
    }
    loadData();
  };

  const scheduleAndStartFromSuggestion = async (s: SuggestedInspection) => {
    if (!agentId) return;
    const t = activeTenancies.find(x => x.id === s.tenancyId);
    if (!t) return;
    const r = ruleFor(t.properties?.state);
    const { data: inserted, error } = await supabase.from('property_inspections').insert({
      tenancy_id: t.id,
      property_id: t.property_id,
      agent_id: agentId,
      inspection_type: 'routine',
      scheduled_date: format(ruleMinDate(r), 'yyyy-MM-dd'),
      status: 'scheduled',
    } as any).select('id').maybeSingle();
    if (error || !inserted) { toast.error('Could not schedule inspection'); return; }
    navigate(`/dashboard/inspection/${(inserted as any).id}`);
  };

  const scheduleExitInspection = async (tenancyId: string, leaseEnd: string) => {
    if (!agentId) return;
    const t = activeTenancies.find(x => x.id === tenancyId);
    if (!t) return;
    const today = new Date();
    let scheduled = parseISO(leaseEnd);
    const threeBefore = addDays(scheduled, -3);
    if (threeBefore > today) scheduled = threeBefore;
    if (scheduled < today) scheduled = today;
    const { data: inserted, error } = await supabase.from('property_inspections').insert({
      tenancy_id: tenancyId,
      property_id: t.property_id,
      agent_id: agentId,
      inspection_type: 'exit',
      scheduled_date: format(scheduled, 'yyyy-MM-dd'),
      status: 'scheduled',
    } as any).select('id').maybeSingle();
    if (error || !inserted) { toast.error('Could not schedule exit inspection'); return; }
    navigate(`/dashboard/inspection/${(inserted as any).id}`);
  };

  // Notice
  const buildNoticeText = (i: InspectionRow): string => {
    const state = (i.tenancies?.properties?.state || '').toUpperCase();
    const r = ruleFor(state);
    const propLine = [i.tenancies?.properties?.address, i.tenancies?.properties?.suburb, state].filter(Boolean).join(', ');
    const dateStr = format(new Date(), 'd MMMM yyyy');
    const inspDate = format(parseISO(i.scheduled_date), 'EEEE, d MMMM yyyy');
    return `Notice of Property Inspection

${r.act}

Date: ${dateStr}

To: ${i.tenancies?.tenant_name || 'Tenant'}
Property: ${propLine || '—'}

This is to advise that a ${TYPE_LABEL[i.inspection_type].toLowerCase()} inspection will be conducted at the above property.

Date of inspection: ${inspDate}
Approximate time: [to be confirmed]

This notice is provided in accordance with the ${ruleNoticeText(r)} notice requirement under ${r.act}.

If this time is not suitable, please contact your property manager to arrange an alternative.

Regards,

${agentName || 'Property Manager'}
${agencyName || ''}`.trim();
  };

  const copyNotice = async () => {
    if (!noticeFor) return;
    try {
      await navigator.clipboard.writeText(buildNoticeText(noticeFor));
      toast.success('Copied to clipboard');
    } catch {
      toast.error('Could not copy');
    }
  };

  const markNoticeSent = async () => {
    if (!noticeFor) return;
    setSavingNotice(true);
    const { error } = await supabase
      .from('property_inspections')
      .update({ notice_sent_at: new Date().toISOString() } as any)
      .eq('id', noticeFor.id);
    setSavingNotice(false);
    if (error) { toast.error('Could not record notice'); return; }
    toast.success('Notice recorded');
    setNoticeFor(null);
    loadData();
  };

  // Complete
  const openComplete = (i: InspectionRow) => {
    setCompleteFor(i);
    setCompleteForm({ conducted_date: new Date(), notes: '', condition: 'good', followUp: false });
  };
  const submitComplete = async () => {
    if (!completeFor || !agentId) return;
    setSavingComplete(true);
    const noteParts = [
      completeForm.notes.trim(),
      `Overall condition: ${CONDITION_LABELS[completeForm.condition]}`,
    ].filter(Boolean);
    const { error: insErr } = await supabase
      .from('property_inspections')
      .update({
        status: 'completed',
        conducted_date: format(completeForm.conducted_date, 'yyyy-MM-dd'),
        overall_notes: noteParts.join('\n\n'),
      } as any)
      .eq('id', completeFor.id);
    if (insErr) {
      setSavingComplete(false);
      toast.error('Could not record inspection');
      return;
    }

    if (completeForm.followUp) {
      const addr = completeFor.tenancies?.properties?.address || 'property';
      // Need property_id to insert maintenance job — fetch from tenancy
      const { data: t } = await supabase
        .from('tenancies')
        .select('property_id')
        .eq('id', completeFor.tenancy_id || '')
        .maybeSingle();
      if (t?.property_id) {
        await supabase.from('maintenance_jobs').insert({
          tenancy_id: completeFor.tenancy_id,
          property_id: t.property_id,
          agent_id: agentId,
          reported_by: 'agent',
          title: `Follow-up from ${TYPE_LABEL[completeFor.inspection_type].toLowerCase()} inspection at ${addr}`,
          description: completeForm.notes.trim() || null,
          priority: 'routine',
          status: 'open',
        } as any);
      }
    }
    setSavingComplete(false);
    toast.success('Inspection recorded');
    setCompleteFor(null);
    loadData();
  };

  // Cancel
  const confirmCancel = async () => {
    if (!cancelTarget) return;
    const { error } = await supabase
      .from('property_inspections')
      .update({ status: 'cancelled' } as any)
      .eq('id', cancelTarget.id);
    if (error) { toast.error('Could not cancel'); return; }
    toast.success('Inspection cancelled');
    setCancelTarget(null);
    loadData();
  };

  const today = new Date().toISOString().slice(0, 10);

  return (
    <div className="min-h-screen bg-background">
      <DashboardHeader
        title="Routine Inspections"
        subtitle="Schedule, track and record property inspections"
      />

      <div className="px-4 sm:px-6 py-6 max-w-7xl mx-auto space-y-6">
        {/* Top bar */}
        <div className="flex items-center justify-between gap-3 flex-wrap">
          <Tabs value={tab} onValueChange={(v) => setTab(v as FilterTab)}>
            <TabsList>
              <TabsTrigger value="upcoming">Upcoming</TabsTrigger>
              <TabsTrigger value="overdue">Overdue</TabsTrigger>
              <TabsTrigger value="completed">Completed</TabsTrigger>
              <TabsTrigger value="due">Due for Inspection</TabsTrigger>
              <TabsTrigger value="disputes" className="relative">
                Disputes
                {stats.disputes > 0 && (
                  <span className="ml-2 inline-flex items-center justify-center min-w-[18px] h-[18px] rounded-full bg-red-600 text-white text-[10px] px-1.5">
                    {stats.disputes}
                  </span>
                )}
              </TabsTrigger>
            </TabsList>
          </Tabs>
          <Button onClick={() => openSchedule()}>
            <Plus size={14} className="mr-1.5" /> Schedule Inspection
          </Button>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <StatCard label="Upcoming (30d)" value={stats.upcoming} />
          <StatCard label="Overdue" value={stats.overdue} tone="red" />
          <StatCard label="Completed (90d)" value={stats.completedQuarter} tone="emerald" />
          <StatCard label="Properties Due" value={stats.due} tone="amber" />
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-16 text-muted-foreground">
            <Loader2 size={18} className="animate-spin mr-2" /> Loading inspections…
          </div>
        ) : tab === 'due' ? (
          <Card>
            <CardContent className="p-0">
              {suggested.length === 0 ? (
                <div className="py-12 text-center text-muted-foreground text-sm">
                  <ClipboardCheck className="mx-auto mb-2" size={28} />
                  No properties currently flagged as due for inspection.
                </div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Property</TableHead>
                      <TableHead>Tenant</TableHead>
                      <TableHead>State</TableHead>
                      <TableHead>Reason</TableHead>
                      <TableHead className="text-right">Action</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {suggested.map(s => (
                      <TableRow key={s.tenancyId}>
                        <TableCell className="font-medium text-sm">{s.address}</TableCell>
                        <TableCell className="text-sm">{s.tenantName}</TableCell>
                        <TableCell className="text-xs">{s.state || '—'}</TableCell>
                        <TableCell className="text-xs text-muted-foreground">{s.reason}</TableCell>
                        <TableCell className="text-right">
                          <Button size="sm" onClick={() => scheduleAndStartFromSuggestion(s)}>
                            Schedule & Start Report
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        ) : tab === 'disputes' ? (
          <Card>
            <CardContent className="p-0">
              {disputed.length === 0 ? (
                <div className="py-12 text-center text-muted-foreground text-sm">
                  <CheckCircle2 className="mx-auto mb-2 text-emerald-600" size={28} />
                  No unresolved tenant disputes.
                </div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Property</TableHead>
                      <TableHead>Tenant</TableHead>
                      <TableHead>Type</TableHead>
                      <TableHead>Inspection Date</TableHead>
                      <TableHead>Disputed On</TableHead>
                      <TableHead>Dispute Notes</TableHead>
                      <TableHead className="text-right">Action</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {disputed.map(i => {
                      const propAddr = [i.tenancies?.properties?.address, i.tenancies?.properties?.suburb].filter(Boolean).join(', ');
                      const fullNotes = i.tenant_dispute_notes || '';
                      const truncated = fullNotes.length > 80 ? `${fullNotes.slice(0, 80)}…` : fullNotes;
                      return (
                        <TableRow key={i.id}>
                          <TableCell className="font-medium text-sm">{propAddr || '—'}</TableCell>
                          <TableCell className="text-sm">{i.tenancies?.tenant_name || '—'}</TableCell>
                          <TableCell>
                            <Badge className={cn(TYPE_BADGE[i.inspection_type], 'text-[10px]')}>
                              {TYPE_LABEL[i.inspection_type]}
                            </Badge>
                          </TableCell>
                          <TableCell className="text-sm">
                            {format(parseISO(i.conducted_date || i.scheduled_date), 'd MMM yyyy')}
                          </TableCell>
                          <TableCell className="text-xs">
                            {i.tenant_disputed_at ? format(parseISO(i.tenant_disputed_at), 'd MMM yyyy') : '—'}
                          </TableCell>
                          <TableCell className="text-xs text-muted-foreground max-w-[280px]" title={fullNotes || undefined}>
                            {truncated || '—'}
                          </TableCell>
                          <TableCell className="text-right">
                            <Button
                              size="sm"
                              onClick={() => { setResolveFor(i); setResolveNotes(''); }}
                            >
                              <CheckCircle2 size={12} className="mr-1" /> Mark Resolved
                            </Button>
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        ) : (
          <Card>
            <CardContent className="p-0">
              {filtered.length === 0 ? (
                <div className="py-12 text-center text-muted-foreground text-sm">
                  <CalendarDays className="mx-auto mb-2" size={28} />
                  No inspections to show.
                </div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Property</TableHead>
                      <TableHead>Tenant</TableHead>
                      <TableHead>Type</TableHead>
                      <TableHead>Scheduled</TableHead>
                      <TableHead>Notice</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filtered.map(i => {
                      const propAddr = [i.tenancies?.properties?.address, i.tenancies?.properties?.suburb].filter(Boolean).join(', ');
                      const isOverdue = i.status === 'scheduled' && i.scheduled_date < today;
                      return (
                        <TableRow key={i.id}>
                          <TableCell className="font-medium text-sm">{propAddr || '—'}</TableCell>
                          <TableCell className="text-sm">{i.tenancies?.tenant_name || '—'}</TableCell>
                          <TableCell>
                            <Badge className={cn(TYPE_BADGE[i.inspection_type], 'text-[10px]')}>
                              {TYPE_LABEL[i.inspection_type]}
                            </Badge>
                          </TableCell>
                          <TableCell className="text-sm">
                            {format(parseISO(i.scheduled_date), 'd MMM yyyy')}
                          </TableCell>
                          <TableCell className="text-xs">
                            {i.notice_sent_at ? (
                              <span className="inline-flex items-center gap-1 text-emerald-700">
                                <CheckCircle2 size={12} />
                                {format(parseISO(i.notice_sent_at), 'd MMM')}
                              </span>
                            ) : i.status === 'scheduled' ? (
                              <button
                                onClick={() => setNoticeFor(i)}
                                className="text-amber-700 hover:underline inline-flex items-center gap-1"
                              >
                                <Mail size={12} /> Send Notice
                              </button>
                            ) : (
                              <span className="text-muted-foreground">—</span>
                            )}
                          </TableCell>
                          <TableCell>
                            {isOverdue ? (
                              <Badge className="bg-red-500/15 text-red-700 border-0 text-[10px]">
                                <AlertTriangle size={10} className="mr-1" /> Overdue
                              </Badge>
                            ) : (
                              <Badge className={cn(STATUS_BADGE[i.status], 'text-[10px]')}>
                                {STATUS_LABEL[i.status]}
                              </Badge>
                            )}
                          </TableCell>
                          <TableCell className="text-right">
                            <div className="flex justify-end flex-wrap gap-1">
                              {i.status === 'scheduled' && (
                                <Button size="sm" onClick={() => navigate(`/dashboard/inspection/${i.id}`)}>
                                  <PlayCircle size={12} className="mr-1" /> Start Report
                                </Button>
                              )}
                              {i.status === 'completed' && (
                                <Button size="sm" variant="outline" onClick={() => navigate(`/dashboard/inspection/${i.id}`)}>
                                  <FileText size={12} className="mr-1" /> View Report
                                </Button>
                              )}
                              {i.status === 'scheduled' && !i.notice_sent_at && (
                                <Button size="sm" variant="ghost" onClick={() => setNoticeFor(i)}>
                                  <Mail size={12} className="mr-1" /> Send Notice
                                </Button>
                              )}
                              {i.status === 'scheduled' && (
                                <Button size="sm" variant="ghost" className="text-red-700 hover:text-red-800" onClick={() => setCancelTarget(i)}>
                                  <XCircle size={12} className="mr-1" /> Cancel
                                </Button>
                              )}
                              {i.tenancy_id && (
                                <Button size="sm" variant="ghost" onClick={() => navigate(`/dashboard/tenancies/${i.tenancy_id}`)}>
                                  <ExternalLink size={12} className="mr-1" /> Tenancy
                                </Button>
                              )}
                            </div>
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        )}
      </div>

      {/* Schedule Modal */}
      <Dialog open={!!scheduleForm} onOpenChange={(o) => !o && setScheduleForm(null)}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Schedule Inspection</DialogTitle>
          </DialogHeader>
          {scheduleForm && (
            <div className="space-y-3">
              <div>
                <Label>Property / Tenancy *</Label>
                <Select
                  value={scheduleForm.tenancy_id}
                  onValueChange={(v) => setScheduleForm({ ...scheduleForm, tenancy_id: v, scheduled_date: undefined })}
                >
                  <SelectTrigger><SelectValue placeholder="Select tenancy" /></SelectTrigger>
                  <SelectContent>
                    {activeTenancies.map(t => (
                      <SelectItem key={t.id} value={t.id}>
                        {(t.tenant_name || 'Tenant')} — {t.properties?.address || 'Address'}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Inspection Type *</Label>
                <Select
                  value={scheduleForm.inspection_type}
                  onValueChange={(v) => setScheduleForm({ ...scheduleForm, inspection_type: v as InspectionType })}
                >
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="entry">Entry</SelectItem>
                    <SelectItem value="routine">Routine</SelectItem>
                    <SelectItem value="exit">Exit</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="flex flex-col">
                <Label>Scheduled Date *</Label>
                <Popover>
                  <PopoverTrigger asChild>
                    <Button
                      variant="outline"
                      className={cn(
                        'justify-start text-left font-normal mt-1',
                        !scheduleForm.scheduled_date && 'text-muted-foreground'
                      )}
                    >
                      <CalendarIcon className="mr-2 h-4 w-4" />
                      {scheduleForm.scheduled_date
                        ? format(scheduleForm.scheduled_date, 'd MMM yyyy')
                        : 'Pick a date'}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0" align="start">
                    <Calendar
                      mode="single"
                      selected={scheduleForm.scheduled_date}
                      onSelect={(d) => setScheduleForm({ ...scheduleForm, scheduled_date: d || undefined })}
                      disabled={(date) => selectedTenancy ? date < selectedMinDate : date < new Date()}
                      initialFocus
                      className={cn('p-3 pointer-events-auto')}
                    />
                  </PopoverContent>
                </Popover>
                {selectedTenancy && (
                  <p className="text-[11px] text-muted-foreground mt-1">
                    {(selectedTenancy.properties?.state || '').toUpperCase() || 'Default'} requires{' '}
                    {ruleNoticeText(selectedRule)} notice — earliest date:{' '}
                    {format(selectedMinDate, 'd MMM yyyy')}
                  </p>
                )}
              </div>
              <div>
                <Label>Notes</Label>
                <Textarea
                  rows={3}
                  value={scheduleForm.notes}
                  onChange={e => setScheduleForm({ ...scheduleForm, notes: e.target.value })}
                />
              </div>
            </div>
          )}
          <DialogFooter className="flex-col sm:flex-row gap-2">
            <Button variant="outline" onClick={() => setScheduleForm(null)} disabled={savingSchedule}>Cancel</Button>
            <Button variant="secondary" onClick={() => submitSchedule()} disabled={savingSchedule}>
              {savingSchedule && <Loader2 size={14} className="mr-1 animate-spin" />}
              Schedule Only
            </Button>
            <Button onClick={() => submitSchedule({ startReport: true })} disabled={savingSchedule}>
              {savingSchedule && <Loader2 size={14} className="mr-1 animate-spin" />}
              <PlayCircle size={14} className="mr-1" /> Schedule & Start Report
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Notice Modal */}
      <Dialog open={!!noticeFor} onOpenChange={(o) => !o && setNoticeFor(null)}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>
              Entry Notice — {noticeFor?.tenancies?.properties?.address || 'Property'}
            </DialogTitle>
          </DialogHeader>
          {noticeFor && (
            <Textarea
              readOnly
              rows={18}
              value={buildNoticeText(noticeFor)}
              className="font-mono text-xs"
            />
          )}
          <DialogFooter>
            <Button variant="outline" onClick={copyNotice}>
              <Copy size={14} className="mr-1.5" /> Copy Notice
            </Button>
            <Button onClick={markNoticeSent} disabled={savingNotice}>
              {savingNotice && <Loader2 size={14} className="mr-1 animate-spin" />}
              Mark Notice Sent
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Complete Modal */}
      <Dialog open={!!completeFor} onOpenChange={(o) => !o && setCompleteFor(null)}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Mark Inspection Complete</DialogTitle>
          </DialogHeader>
          {completeFor && (
            <div className="space-y-3">
              <div className="text-xs text-muted-foreground rounded-md bg-secondary/50 p-2">
                {TYPE_LABEL[completeFor.inspection_type]} inspection at{' '}
                {completeFor.tenancies?.properties?.address || 'property'}
              </div>
              <div className="flex flex-col">
                <Label>Conducted Date</Label>
                <Popover>
                  <PopoverTrigger asChild>
                    <Button
                      variant="outline"
                      className={cn('justify-start text-left font-normal mt-1')}
                    >
                      <CalendarIcon className="mr-2 h-4 w-4" />
                      {format(completeForm.conducted_date, 'd MMM yyyy')}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0" align="start">
                    <Calendar
                      mode="single"
                      selected={completeForm.conducted_date}
                      onSelect={(d) => d && setCompleteForm({ ...completeForm, conducted_date: d })}
                      disabled={(date) => date > new Date()}
                      initialFocus
                      className={cn('p-3 pointer-events-auto')}
                    />
                  </PopoverContent>
                </Popover>
              </div>
              <div>
                <Label>Overall Condition</Label>
                <Select
                  value={completeForm.condition}
                  onValueChange={(v) => setCompleteForm({ ...completeForm, condition: v as CompleteForm['condition'] })}
                >
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {(Object.keys(CONDITION_LABELS) as CompleteForm['condition'][]).map(k => (
                      <SelectItem key={k} value={k}>{CONDITION_LABELS[k]}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Inspection Notes</Label>
                <Textarea
                  rows={4}
                  value={completeForm.notes}
                  onChange={e => setCompleteForm({ ...completeForm, notes: e.target.value })}
                />
              </div>
              <label className="flex items-center gap-2 text-sm cursor-pointer">
                <Checkbox
                  checked={completeForm.followUp}
                  onCheckedChange={(v) => setCompleteForm({ ...completeForm, followUp: !!v })}
                />
                Follow-up required (creates a maintenance job)
              </label>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setCompleteFor(null)} disabled={savingComplete}>Cancel</Button>
            <Button onClick={submitComplete} disabled={savingComplete}>
              {savingComplete && <Loader2 size={14} className="mr-1 animate-spin" />}
              Record
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Resolve dispute modal */}
      <Dialog open={!!resolveFor} onOpenChange={(o) => !o && setResolveFor(null)}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Resolve Dispute</DialogTitle>
          </DialogHeader>
          {resolveFor && (
            <div className="space-y-3">
              <div className="text-xs text-muted-foreground rounded-md bg-secondary/50 p-2">
                {TYPE_LABEL[resolveFor.inspection_type]} inspection at{' '}
                {resolveFor.tenancies?.properties?.address || 'property'}
              </div>
              {resolveFor.tenant_dispute_notes && (
                <div className="rounded-md border border-red-200 bg-red-50 p-2 text-xs text-red-900 whitespace-pre-wrap">
                  <p className="font-medium mb-1">Tenant's concerns:</p>
                  {resolveFor.tenant_dispute_notes}
                </div>
              )}
              <div>
                <Label>Resolution Notes</Label>
                <Textarea
                  rows={4}
                  placeholder="What was agreed or actioned…"
                  value={resolveNotes}
                  onChange={e => setResolveNotes(e.target.value)}
                />
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setResolveFor(null)} disabled={savingResolve}>Cancel</Button>
            <Button onClick={submitResolve} disabled={savingResolve}>
              {savingResolve && <Loader2 size={14} className="mr-1 animate-spin" />}
              Mark Resolved
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Cancel confirm */}
      <AlertDialog open={!!cancelTarget} onOpenChange={(o) => !o && setCancelTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Cancel this inspection?</AlertDialogTitle>
            <AlertDialogDescription>
              The scheduled inspection will be marked as cancelled. You can schedule a new one anytime.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Keep</AlertDialogCancel>
            <AlertDialogAction onClick={confirmCancel} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
              Cancel Inspection
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

function StatCard({ label, value, tone }: { label: string; value: number; tone?: 'emerald' | 'amber' | 'red' }) {
  const toneClass =
    tone === 'emerald' ? 'text-emerald-700' :
    tone === 'amber' ? 'text-amber-700' :
    tone === 'red' ? 'text-red-700' :
    'text-foreground';
  return (
    <Card>
      <CardContent className="p-4">
        <div className="text-xs text-muted-foreground">{label}</div>
        <div className={cn('text-2xl font-semibold mt-1', toneClass)}>{value}</div>
      </CardContent>
    </Card>
  );
}
