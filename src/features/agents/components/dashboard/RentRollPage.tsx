import { useState, useEffect, useCallback, useMemo, Fragment } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Plus, Home, Loader2, AlertTriangle, CheckCircle2, Clock, ClipboardCheck, ChevronDown, ChevronUp, Calendar } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/features/auth/AuthProvider';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Calendar as CalendarComponent } from '@/components/ui/calendar';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';
import DashboardHeader from './DashboardHeader';
import { addDays, addMonths, differenceInDays, differenceInMonths, format, parseISO } from 'date-fns';
import { Textarea } from '@/components/ui/textarea';
import { Checkbox } from '@/components/ui/checkbox';

interface Tenancy {
  id: string;
  property_id: string;
  agent_id: string;
  tenant_name: string;
  tenant_email: string | null;
  tenant_phone: string | null;
  lease_start: string;
  lease_end: string;
  rent_amount: number;
  rent_frequency: string;
  bond_amount: number;
  management_fee_percent: number;
  status: string;
  notes: string | null;
  renewal_status?: string | null;
  properties: { address: string; suburb: string; state: string | null } | null;
}

interface Inspection {
  id: string;
  inspection_type: string;
  scheduled_date: string;
  status: string;
  conducted_date: string | null;
}

interface RentPayment {
  id: string;
  tenancy_id: string;
  amount: number;
  period_to: string;
  status: string;
}

interface PropertyOption {
  id: string;
  address: string;
  suburb: string;
}

interface PropertyInspection {
  id: string;
  tenancy_id: string;
  inspection_type: 'entry' | 'routine' | 'exit';
  scheduled_date: string;
  status: 'scheduled' | 'completed' | 'cancelled';
  notice_sent_at: string | null;
}

interface SuggestedInspection {
  type: 'entry' | 'routine' | 'exit';
  label: string;
  date: string;
  selected: boolean;
}

const BOND_AUTHORITIES = [
  'RTBA (VIC)',
  'NSW Fair Trading',
  'RTA (QLD)',
  'Consumer Protection WA',
  'CBS (SA)',
  'REIACT',
  'NTCAT',
] as const;

const BSB_REGEX = /^\d{3}-?\d{3}$/;

const toWeekly = (amount: number, freq: string): number => {
  if (freq === 'weekly') return amount;
  if (freq === 'fortnightly') return amount / 2;
  if (freq === 'monthly') return (amount * 12) / 52;
  return amount;
};

const frequencyDays = (freq: string): number => {
  if (freq === 'weekly') return 7;
  if (freq === 'fortnightly') return 14;
  return 30;
};

type TabKey = 'all' | 'arrears' | 'expiring' | 'renewals';

const RentRollPage = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const initialTab: TabKey = (() => {
    const f = searchParams.get('filter');
    if (f === 'arrears') return 'arrears';
    if (f === 'expiring') return 'expiring';
    if (f === 'renewals') return 'renewals';
    return 'all';
  })();
  const [activeTab, setActiveTab] = useState<TabKey>(initialTab);

  // Sync tab → URL filter param
  useEffect(() => {
    const current = searchParams.get('filter');
    const want = activeTab === 'all' ? null : activeTab;
    if (current === want) return;
    const next = new URLSearchParams(searchParams);
    if (want) next.set('filter', want); else next.delete('filter');
    setSearchParams(next, { replace: true });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeTab]);

  // Sync URL filter param → tab (e.g. when sidebar link clicked while already on page)
  useEffect(() => {
    const f = searchParams.get('filter');
    const next: TabKey = f === 'arrears' ? 'arrears' : f === 'expiring' ? 'expiring' : f === 'renewals' ? 'renewals' : 'all';
    if (next !== activeTab) setActiveTab(next);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchParams]);

  const [agentId, setAgentId] = useState<string | null>(null);
  const [tenancies, setTenancies] = useState<Tenancy[]>([]);
  const [payments, setPayments] = useState<RentPayment[]>([]);
  const [properties, setProperties] = useState<PropertyOption[]>([]);
  const [loading, setLoading] = useState(true);
  const [noAgent, setNoAgent] = useState(false);
  const [showAddModal, setShowAddModal] = useState(false);
  const [saving, setSaving] = useState(false);
  const [step, setStep] = useState(1);
  const [expandedTenancy, setExpandedTenancy] = useState<string | null>(null);
  const [inspections, setInspections] = useState<Record<string, Inspection[]>>({});
  const [loadingInspections, setLoadingInspections] = useState<string | null>(null);
  const [showScheduleModal, setShowScheduleModal] = useState<Tenancy | null>(null);
  const [scheduleForm, setScheduleForm] = useState({ inspection_type: 'routine', scheduled_date: undefined as Date | undefined, owner_name: '', owner_email: '', bond_lodgment_number: '' });
  const [scheduleSaving, setScheduleSaving] = useState(false);
  const [showBulkInspectionModal, setShowBulkInspectionModal] = useState(false);
  const [bulkInspectionTenancy, setBulkInspectionTenancy] = useState<Tenancy | null>(null);
  const [existingInspections, setExistingInspections] = useState<PropertyInspection[]>([]);
  const [suggestedInspections, setSuggestedInspections] = useState<SuggestedInspection[]>([]);
  const [inspectionNotes, setInspectionNotes] = useState('');
  const [loadingBulkInspections, setLoadingBulkInspections] = useState(false);
  const [savingBulkInspections, setSavingBulkInspections] = useState(false);
  const [bulkAgentName, setBulkAgentName] = useState('');

  const [form, setForm] = useState({
    property_id: '',
    tenant_name: '',
    tenant_email: '',
    tenant_phone: '',
    lease_start: '',
    lease_end: '',
    rent_amount: '',
    rent_frequency: 'weekly',
    bond_amount: '',
    bond_manual: false,
    bond_authority: '',
    bond_lodgement_number: '',
    management_fee_percent: '8.80',
    owner_name: '',
    owner_email: '',
    owner_bsb: '',
    owner_account_number: '',
  });

  const initialForm = {
    property_id: '', tenant_name: '', tenant_email: '', tenant_phone: '',
    lease_start: '', lease_end: '', rent_amount: '', rent_frequency: 'weekly',
    bond_amount: '', bond_manual: false, bond_authority: '', bond_lodgement_number: '',
    management_fee_percent: '8.80', owner_name: '', owner_email: '',
    owner_bsb: '', owner_account_number: '',
  };

  // --- Validation helpers ---
  const bondExceedsFourWeeks = useMemo(() => {
    const rent = parseFloat(form.rent_amount);
    const bond = parseFloat(form.bond_amount);
    if (!rent || !bond || rent <= 0) return false;
    return bond > rent * 4;
  }, [form.rent_amount, form.bond_amount]);

  const fourWeeksAmount = useMemo(() => {
    const rent = parseFloat(form.rent_amount);
    return rent > 0 ? (rent * 4).toFixed(2) : '0.00';
  }, [form.rent_amount]);

  const leaseDateError = useMemo(() => {
    if (!form.lease_start || !form.lease_end) return null;
    if (form.lease_end <= form.lease_start) return 'Lease end date must be after start date';
    return null;
  }, [form.lease_start, form.lease_end]);

  const bsbError = useMemo(() => {
    if (!form.owner_bsb) return null;
    if (!BSB_REGEX.test(form.owner_bsb)) return 'BSB must be 6 digits (e.g. 062-000)';
    return null;
  }, [form.owner_bsb]);

  const step2Valid = useMemo(() => {
    return !!(form.rent_amount && form.bond_amount && form.lease_start && form.lease_end && !leaseDateError);
  }, [form.rent_amount, form.bond_amount, form.lease_start, form.lease_end, leaseDateError]);

  const step3Valid = useMemo(() => {
    return !bsbError;
  }, [bsbError]);

  const fetchData = useCallback(async () => {
    if (!user) return;
    setLoading(true);

    const { data: agentData } = await supabase
      .from('agents')
      .select('id')
      .eq('user_id', user.id)
      .maybeSingle();

    if (!agentData) { setNoAgent(true); setLoading(false); return; }
    setAgentId(agentData.id);

    const [tenancyRes, paymentRes, propRes] = await Promise.all([
      supabase
        .from('tenancies')
        .select('*, properties(address, suburb, state)')
        .eq('agent_id', agentData.id)
        .order('lease_end', { ascending: true }),
      supabase
        .from('rent_payments')
        .select('id, tenancy_id, amount, period_to, status')
        .eq('agent_id', agentData.id)
        .order('period_to', { ascending: false }),
      supabase
        .from('properties')
        .select('id, address, suburb')
        .eq('agent_id', agentData.id)
        .in('listing_category', ['rent'])
        .order('address'),
    ]);

    if (tenancyRes.data) setTenancies(tenancyRes.data as unknown as Tenancy[]);
    if (paymentRes.data) setPayments(paymentRes.data as RentPayment[]);
    if (propRes.data) setProperties(propRes.data as PropertyOption[]);
    setLoading(false);
  }, [user]);

  useEffect(() => { fetchData(); }, [fetchData]);

  // Derive stats
  const activeTenancies = tenancies.filter(t => t.status === 'active');
  const today = new Date();

  const totalWeeklyRent = activeTenancies.reduce(
    (sum, t) => sum + toWeekly(t.rent_amount, t.rent_frequency), 0
  );

  const monthlyMgmtFees = activeTenancies.reduce(
    (sum, t) => sum + (toWeekly(t.rent_amount, t.rent_frequency) * (t.management_fee_percent / 100) * 4.33), 0
  );

  // Latest payment per tenancy
  const latestPaymentMap = new Map<string, RentPayment>();
  for (const p of payments) {
    if (!latestPaymentMap.has(p.tenancy_id)) {
      latestPaymentMap.set(p.tenancy_id, p);
    }
  }

  const getArrearsInfo = (t: Tenancy) => {
    const latest = latestPaymentMap.get(t.id);
    const periodEnd = latest ? new Date(latest.period_to) : null;
    const daysBehind = periodEnd ? differenceInDays(today, periodEnd) : 0;

    if (daysBehind <= 0) return { label: 'Current', variant: 'default' as const, days: 0, owed: 0 };

    const weeklyRent = toWeekly(t.rent_amount, t.rent_frequency);
    const weeksOwed = Math.ceil(daysBehind / 7);
    const owed = weeklyRent * weeksOwed;

    if (daysBehind <= 14) return { label: `${daysBehind}d ($${owed.toFixed(0)})`, variant: 'secondary' as const, days: daysBehind, owed };
    return { label: `${daysBehind}d ($${owed.toFixed(0)})`, variant: 'destructive' as const, days: daysBehind, owed };
  };

  // In arrears = latest payment period_to is >14 days ago
  const overdueCount = activeTenancies.filter(t => {
    const latest = latestPaymentMap.get(t.id);
    if (!latest) return false;
    return differenceInDays(today, new Date(latest.period_to)) > 14;
  }).length;

  // Filtered tenancies for current tab
  const displayedTenancies = useMemo(() => {
    if (activeTab === 'all') return activeTenancies;

    if (activeTab === 'arrears') {
      return activeTenancies
        .map(t => ({ t, info: getArrearsInfo(t) }))
        .filter(x => x.info.days > 0)
        .sort((a, b) => b.info.days - a.info.days)
        .map(x => x.t);
    }

    if (activeTab === 'expiring') {
      return activeTenancies
        .filter(t => {
          const days = differenceInDays(parseISO(t.lease_end), today);
          return days >= 0 && days <= 90;
        })
        .sort((a, b) => parseISO(a.lease_end).getTime() - parseISO(b.lease_end).getTime());
    }

    // renewals
    return activeTenancies
      .filter(t => {
        const days = differenceInDays(parseISO(t.lease_end), today);
        if (days < 0 || days > 90) return false;
        const rs = t.renewal_status;
        return !rs || rs === 'none' || rs === 'declined';
      })
      .sort((a, b) => parseISO(a.lease_end).getTime() - parseISO(b.lease_end).getTime());
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeTab, activeTenancies, payments]);

  // Arrears summary for arrears tab
  const arrearsSummary = useMemo(() => {
    const items = activeTenancies
      .map(t => ({ t, info: getArrearsInfo(t) }))
      .filter(x => x.info.days > 0);
    const totalOwed = items.reduce((s, x) => s + x.info.owed, 0);
    return { count: items.length, totalOwed };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeTenancies, payments]);

  const expiringCount = activeTenancies.filter(t => {
    const days = differenceInDays(parseISO(t.lease_end), today);
    return days >= 0 && days <= 90;
  }).length;

  const renewalsCount = activeTenancies.filter(t => {
    const days = differenceInDays(parseISO(t.lease_end), today);
    if (days < 0 || days > 90) return false;
    const rs = t.renewal_status;
    return !rs || rs === 'none' || rs === 'declined';
  }).length;


  const getNextDue = (t: Tenancy) => {
    const latest = latestPaymentMap.get(t.id);
    if (!latest) return format(parseISO(t.lease_start), 'dd MMM yyyy');
    return format(addDays(parseISO(latest.period_to), frequencyDays(t.rent_frequency)), 'dd MMM yyyy');
  };

  const fetchInspections = async (tenancyId: string) => {
    if (inspections[tenancyId]) return;
    setLoadingInspections(tenancyId);
    const { data } = await supabase
      .from('property_inspections')
      .select('id, inspection_type, scheduled_date, status, conducted_date')
      .eq('tenancy_id', tenancyId)
      .order('scheduled_date', { ascending: false });
    setInspections(prev => ({ ...prev, [tenancyId]: (data || []) as Inspection[] }));
    setLoadingInspections(null);
  };

  const toggleExpand = (tenancyId: string) => {
    if (expandedTenancy === tenancyId) {
      setExpandedTenancy(null);
    } else {
      setExpandedTenancy(tenancyId);
      fetchInspections(tenancyId);
    }
  };

  const getNoticePeriodWarning = (state: string | null | undefined, scheduledDate: Date | undefined): string | null => {
    if (!scheduledDate || !state) return null;
    const daysUntil = differenceInDays(scheduledDate, today);
    const s = state.toUpperCase();
    if (['NSW', 'WA', 'ACT', 'SA', 'TAS', 'NT'].includes(s) && daysUntil < 7) {
      return `${s} requires minimum 7 days notice. You've scheduled ${daysUntil} day(s) from today.`;
    }
    if (s === 'VIC' && daysUntil < 2) {
      return `VIC requires minimum 2 days notice. You've scheduled ${daysUntil} day(s) from today.`;
    }
    if (s === 'QLD' && daysUntil < 1) {
      return `QLD requires minimum 1 day notice.`;
    }
    return null;
  };

  const getFrequencyWarning = (state: string | null | undefined, tenancyId: string, type: string): string | null => {
    if (type !== 'routine' || !state) return null;
    const existing = inspections[tenancyId]?.filter(i => i.inspection_type === 'routine' && i.status !== 'cancelled') || [];
    if (existing.length === 0) return null;
    const latest = existing[0];
    const months = differenceInMonths(new Date(), parseISO(latest.scheduled_date));
    const s = state.toUpperCase();
    if (s === 'VIC' && months < 6) return 'VIC allows routine inspections max once per 6 months.';
    if (s === 'QLD' && months < 3) return 'QLD allows routine inspections max once per 3 months.';
    return null;
  };

  const handleScheduleInspection = async (navigateAfter: boolean) => {
    if (!showScheduleModal || !agentId || !scheduleForm.scheduled_date) return;
    setScheduleSaving(true);
    const { data, error } = await supabase.from('property_inspections').insert({
      tenancy_id: showScheduleModal.id,
      property_id: showScheduleModal.property_id,
      agent_id: agentId,
      inspection_type: scheduleForm.inspection_type,
      scheduled_date: format(scheduleForm.scheduled_date, 'yyyy-MM-dd'),
      owner_name: scheduleForm.owner_name || null,
      owner_email: scheduleForm.owner_email || null,
      bond_lodgment_number: scheduleForm.bond_lodgment_number || null,
    } as any).select('id').maybeSingle();
    setScheduleSaving(false);
    if (error) { toast.error(`Failed: ${error.message}`); return; }
    toast.success('Inspection scheduled');
    // Send tenant inspection notice email
    const tenancy = showScheduleModal;
    if (tenancy.tenant_email) {
      const { data: agentData } = await supabase.from('agents').select('name, phone').eq('id', agentId).maybeSingle();
      const addr = tenancy.properties?.address || 'your rental property';
      await supabase.functions.invoke('send-notification-email', {
        body: {
          type: 'inspection_notice',
          recipient_email: tenancy.tenant_email,
          recipient_name: tenancy.tenant_name,
          property_address: addr,
          inspection_type: scheduleForm.inspection_type,
          scheduled_date: format(scheduleForm.scheduled_date!, 'dd MMMM yyyy'),
          agent_name: agentData?.name || '',
          agent_phone: agentData?.phone || '',
        },
      }).catch(() => {});
    }
    // Refresh inspections for this tenancy
    setInspections(prev => { const copy = { ...prev }; delete copy[showScheduleModal.id]; return copy; });
    setShowScheduleModal(null);
    setScheduleForm({ inspection_type: 'routine', scheduled_date: undefined, owner_name: '', owner_email: '', bond_lodgment_number: '' });
    if (navigateAfter && data?.id) navigate(`/dashboard/inspection/${data.id}`);
  };

  const buildSuggestedSchedule = (leaseStart: string, leaseEnd: string): SuggestedInspection[] => {
    const start = parseISO(leaseStart);
    const end = parseISO(leaseEnd);
    const suggestions: SuggestedInspection[] = [
      { type: 'entry', label: 'Entry Inspection', date: leaseStart, selected: true },
      { type: 'routine', label: 'Routine — 3 months', date: format(addMonths(start, 3), 'yyyy-MM-dd'), selected: true },
    ];
    let nextDate = addMonths(start, 9);
    let routineCount = 2;
    while (nextDate < end) {
      suggestions.push({
        type: 'routine',
        label: `Routine — ${routineCount * 6} months`,
        date: format(nextDate, 'yyyy-MM-dd'),
        selected: true,
      });
      nextDate = addMonths(nextDate, 6);
      routineCount++;
    }
    suggestions.push({ type: 'exit', label: 'Exit Inspection', date: leaseEnd, selected: false });
    return suggestions;
  };

  const handleOpenBulkInspections = async (t: Tenancy) => {
    setBulkInspectionTenancy(t);
    setLoadingBulkInspections(true);
    setShowBulkInspectionModal(true);
    setInspectionNotes('');

    const { data: agent } = await supabase.from('agents').select('id, name').eq('user_id', user?.id || '').maybeSingle();
    if (agent) setBulkAgentName(agent.name || '');

    const { data: existing } = await supabase
      .from('property_inspections' as any)
      .select('*')
      .eq('tenancy_id', t.id)
      .order('scheduled_date', { ascending: true }) as any;

    setExistingInspections(existing || []);
    setSuggestedInspections(buildSuggestedSchedule(t.lease_start, t.lease_end));
    setLoadingBulkInspections(false);
  };

  const handleSaveBulkInspections = async () => {
    if (!bulkInspectionTenancy || !agentId) return;
    setSavingBulkInspections(true);
    const toCreate = suggestedInspections.filter(s => s.selected);
    const addr = bulkInspectionTenancy.properties?.address || 'the property';
    const fullAddr = `${addr}${bulkInspectionTenancy.properties?.suburb ? ', ' + bulkInspectionTenancy.properties.suburb : ''}`;
    const noticeDays = 7;

    for (const s of toCreate) {
      await supabase.from('property_inspections' as any).insert({
        tenancy_id: bulkInspectionTenancy.id,
        property_id: bulkInspectionTenancy.property_id,
        agent_id: agentId,
        inspection_type: s.type,
        scheduled_date: s.date,
        status: 'scheduled',
        notes: inspectionNotes || null,
        notice_sent_at: bulkInspectionTenancy.tenant_email ? new Date().toISOString() : null,
      } as any);

      if (bulkInspectionTenancy.tenant_email) {
        await supabase.functions.invoke('send-notification-email', {
          body: {
            type: 'inspection_notice',
            recipient_email: bulkInspectionTenancy.tenant_email,
            tenant_name: bulkInspectionTenancy.tenant_name,
            property_address: fullAddr,
            inspection_type: s.type,
            scheduled_date: format(parseISO(s.date), 'EEEE, d MMMM yyyy'),
            agent_name: bulkAgentName,
            notice_days: noticeDays,
          },
        });
      }
    }

    toast.success(`${toCreate.length} inspection${toCreate.length !== 1 ? 's' : ''} scheduled${bulkInspectionTenancy.tenant_email ? ' — tenant notified by email' : ''}`);
    setSavingBulkInspections(false);
    setShowBulkInspectionModal(false);
    setSuggestedInspections([]);
    // Refresh inline inspections if expanded
    setInspections(prev => { const copy = { ...prev }; delete copy[bulkInspectionTenancy.id]; return copy; });
  };

  const inspectionTypeBadge = (type: string) => {
    const colors: Record<string, string> = {
      entry: 'bg-blue-500/15 text-blue-700',
      routine: 'bg-violet-500/15 text-violet-700',
      exit: 'bg-orange-500/15 text-orange-700',
    };
    return <Badge className={cn('border-0 capitalize', colors[type] || 'bg-muted text-muted-foreground')}>{type}</Badge>;
  };

  const statusBadge = (status: string) => {
    const colors: Record<string, string> = {
      scheduled: 'bg-blue-500/15 text-blue-700',
      in_progress: 'bg-amber-500/15 text-amber-700',
      completed: 'bg-emerald-500/15 text-emerald-700',
      cancelled: 'bg-muted text-muted-foreground',
    };
    return <Badge className={cn('border-0 capitalize', colors[status] || 'bg-muted')}>{status.replace('_', ' ')}</Badge>;
  };

  const handleSubmit = async () => {
    if (!agentId || !form.property_id || !form.tenant_name || !form.lease_start || !form.lease_end || !form.rent_amount || !form.bond_amount) {
      toast.error('Please fill required fields');
      return;
    }
    if (leaseDateError) {
      toast.error(leaseDateError);
      return;
    }
    if (bsbError) {
      toast.error(bsbError);
      return;
    }

    setSaving(true);

    // Auto-link CRM contact by email if available
    let tenantContactId: string | null = null;
    if (form.tenant_email) {
      const { data: contactMatch } = await (supabase
        .from('contacts' as any)
        .select('id')
        .eq('agent_id', agentId)
        .eq('email', form.tenant_email.trim().toLowerCase())
        .maybeSingle() as any) as { data: { id: string } | null };
      if (contactMatch) tenantContactId = contactMatch.id;
    }

    const insertPayload = {
      agent_id: agentId,
      property_id: form.property_id,
      tenant_name: form.tenant_name,
      tenant_email: form.tenant_email || null,
      tenant_phone: form.tenant_phone || null,
      tenant_contact_id: tenantContactId,
      lease_start: form.lease_start,
      lease_end: form.lease_end,
      rent_amount: parseFloat(form.rent_amount),
      rent_frequency: form.rent_frequency,
      bond_amount: parseFloat(form.bond_amount),
      bond_authority: form.bond_authority || null,
      bond_lodgement_number: form.bond_lodgement_number || null,
      management_fee_percent: parseFloat(form.management_fee_percent),
      owner_name: form.owner_name || null,
      owner_email: form.owner_email || null,
      owner_bsb: form.owner_bsb || null,
      owner_account_number: form.owner_account_number || null,
    };
    const { error } = await supabase.from('tenancies').insert(insertPayload as any);
    setSaving(false);

    if (error) {
      toast.error(`Error creating tenancy — ${error.message}`);
    } else {
      toast.success('Tenancy created');
      setShowAddModal(false);
      setStep(1);
      setForm(initialForm);
      fetchData();
    }
  };

  const stats = [
    { label: 'Total Managed', value: activeTenancies.length, icon: Home },
    { label: 'Total Weekly Rent', value: `$${totalWeeklyRent.toFixed(0)}`, icon: CheckCircle2 },
    { label: 'In Arrears', value: overdueCount, icon: AlertTriangle },
    { label: 'Monthly Mgmt Fees', value: `$${monthlyMgmtFees.toFixed(0)}`, icon: Clock },
  ];

  return (
    <div className="space-y-6">
      <DashboardHeader
        title="Rent Roll"
        subtitle="Manage tenancies and rental income"
        actions={
          <Button size="sm" onClick={() => setShowAddModal(true)}>
            <Plus size={14} className="mr-1" /> Add Tenancy
          </Button>
        }
      />

      <div className="flex items-start gap-2 px-3 py-2 rounded-lg bg-amber-500/10 border border-amber-500/20">
        <AlertTriangle size={14} className="text-amber-600 shrink-0 mt-0.5" />
        <p className="text-xs text-amber-700 dark:text-amber-400 leading-relaxed">
          📋 Tenancy records are retained for 7 years in compliance with Australian tenancy law. Records cannot be deleted during this period.
        </p>
      </div>

      {loading ? (
        <div className="flex justify-center py-20"><Loader2 className="animate-spin text-primary" size={28} /></div>
      ) : noAgent ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-16 text-center">
            <Home size={40} className="text-muted-foreground mb-4" />
            <h3 className="text-lg font-semibold text-foreground mb-1">Agent profile required</h3>
            <p className="text-sm text-muted-foreground max-w-md">Set up your agent profile to manage tenancies and rental income.</p>
            <Button className="mt-4" onClick={() => navigate('/onboarding')}>Set Up Profile</Button>
          </CardContent>
        </Card>
      ) : (
        <>
          {/* Stats */}
          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
            className="grid grid-cols-2 lg:grid-cols-4 gap-4"
          >
            {stats.map((s, i) => (
              <motion.div
                key={s.label}
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5, delay: i * 0.08, ease: [0.16, 1, 0.3, 1] }}
              >
                <Card>
                  <CardContent className="p-4 flex items-center gap-3">
                    <div className="p-2 rounded-lg bg-primary/10">
                      <s.icon size={18} className="text-primary" />
                    </div>
                    <div>
                      <p className="text-xs text-muted-foreground">{s.label}</p>
                      <p className="text-lg font-semibold text-foreground">{s.value}</p>
                    </div>
                  </CardContent>
                </Card>
              </motion.div>
            ))}
          </motion.div>

          {/* Table */}
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.3, ease: [0.16, 1, 0.3, 1] }}
          >
            <Card>
              <CardContent className="p-0">
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Property</TableHead>
                        <TableHead>Tenant</TableHead>
                        <TableHead className="text-right">Weekly Rent</TableHead>
                        <TableHead>Next Due</TableHead>
                        <TableHead>Arrears</TableHead>
                        <TableHead>Lease End</TableHead>
                        <TableHead className="text-right">Mgmt %</TableHead>
                        <TableHead className="w-16"></TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {activeTenancies.length === 0 ? (
                        <TableRow>
                          <TableCell colSpan={8} className="text-center py-12 text-muted-foreground">
                            No active tenancies yet. Click "+ Add Tenancy" to get started.
                          </TableCell>
                        </TableRow>
                      ) : (
                        activeTenancies.map(t => {
                          const arrears = getArrearsInfo(t);
                          const leaseEnd = parseISO(t.lease_end);
                          const daysToEnd = differenceInDays(leaseEnd, today);
                          const expiringSoon = daysToEnd >= 0 && daysToEnd <= 60;

                          return (
                            <Fragment key={t.id}>
                            <TableRow className="hover:bg-accent/50">
                              <TableCell className="font-medium">
                                {t.properties?.address || '—'}
                                <span className="block text-xs text-muted-foreground">{t.properties?.suburb}</span>
                              </TableCell>
                              <TableCell>{t.tenant_name}</TableCell>
                              <TableCell className="text-right tabular-nums">${toWeekly(t.rent_amount, t.rent_frequency).toFixed(0)}</TableCell>
                              <TableCell className="text-sm">{getNextDue(t)}</TableCell>
                              <TableCell>
                                <Badge
                                  variant={arrears.variant}
                                  className={
                                    arrears.days === 0
                                      ? 'bg-emerald-500/15 text-emerald-700 dark:text-emerald-400 border-0'
                                      : arrears.days <= 7
                                      ? 'bg-amber-500/15 text-amber-700 dark:text-amber-400 border-0'
                                      : 'bg-red-500/15 text-red-700 dark:text-red-400 border-0'
                                  }
                                >
                                  {arrears.label}
                                </Badge>
                              </TableCell>
                              <TableCell>
                                <span className="text-sm">{format(leaseEnd, 'dd MMM yyyy')}</span>
                                {expiringSoon && (
                                  <Badge className="ml-2 bg-amber-500/15 text-amber-700 dark:text-amber-400 border-0 text-[10px]">
                                    Expiring soon
                                  </Badge>
                                )}
                              </TableCell>
                              <TableCell className="text-right tabular-nums">{t.management_fee_percent}%</TableCell>
                              <TableCell>
                                <div className="flex items-center gap-1 justify-end">
                                  <Button
                                    variant="outline"
                                    size="sm"
                                    className="text-[10px] h-7"
                                    onClick={(e) => { e.stopPropagation(); toggleExpand(t.id); }}
                                  >
                                    <ClipboardCheck size={12} className="mr-1" />
                                    Inspections
                                    {expandedTenancy === t.id ? <ChevronUp size={12} className="ml-1" /> : <ChevronDown size={12} className="ml-1" />}
                                  </Button>
                                  {expiringSoon && t.tenant_email && (
                                    <Button
                                      variant="outline"
                                      size="sm"
                                      className="text-[10px] h-7"
                                      onClick={async (e) => {
                                        e.stopPropagation();
                                        const addr = t.properties?.address || 'your property';
                                        try {
                                          await supabase.functions.invoke('send-notification-email', {
                                            body: {
                                              type: 'lease_expiry',
                                              recipient_email: t.tenant_email,
                                              recipient_name: t.tenant_name,
                                              property_address: addr,
                                              lease_end_date: format(leaseEnd, 'dd MMMM yyyy'),
                                              days_remaining: String(daysToEnd),
                                              agent_name: '',
                                              agent_phone: '',
                                            },
                                          });
                                          toast.success(`Expiry reminder sent to ${t.tenant_name}`);
                                        } catch {
                                          toast.error('Failed to send reminder');
                                        }
                                      }}
                                    >
                                      Notify
                                    </Button>
                                  )}
                                  {arrears.days > 0 && (
                                    <Button
                                      variant="outline"
                                      size="sm"
                                      className="text-[10px] h-7 border-red-300 text-red-600 hover:bg-red-50"
                                      onClick={async (e) => {
                                        e.stopPropagation();
                                        if (!t.tenant_email) {
                                          toast.error('No email address on file for this tenant');
                                          return;
                                        }
                                        const addr = t.properties?.address || 'your property';
                                        try {
                                          await supabase.functions.invoke('send-notification-email', {
                                            body: {
                                              type: 'arrears_chase',
                                              recipient_email: t.tenant_email,
                                              recipient_name: t.tenant_name,
                                              property_address: addr,
                                              amount_owed: `$${arrears.owed.toFixed(0)}`,
                                              agent_name: '',
                                              agent_phone: '',
                                            },
                                          });
                                          toast.success(`Arrears reminder sent to ${t.tenant_name}`);
                                        } catch {
                                          toast.error('Failed to send arrears reminder');
                                        }
                                      }}
                                    >
                                      Chase
                                    </Button>
                                  )}
                                  <Button
                                    variant="outline"
                                    size="sm"
                                    className="text-[10px] h-7"
                                    onClick={(e) => { e.stopPropagation(); handleOpenBulkInspections(t); }}
                                  >
                                    <Calendar size={12} className="mr-1" /> Schedule All
                                  </Button>
                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    onClick={() => navigate(`/dashboard/tenancies/${t.id}`)}
                                  >
                                    View
                                  </Button>
                                </div>
                              </TableCell>
                            </TableRow>
                            {expandedTenancy === t.id && (
                              <TableRow>
                                <TableCell colSpan={8} className="bg-muted/30 p-4">
                                  <div className="space-y-3">
                                    <div className="flex items-center justify-between">
                                      <h4 className="text-sm font-semibold text-foreground">Inspection History</h4>
                                      <Button size="sm" variant="outline" onClick={() => {
                                        setShowScheduleModal(t);
                                        setScheduleForm({ inspection_type: 'routine', scheduled_date: undefined, owner_name: '', owner_email: '', bond_lodgment_number: '' });
                                      }}>
                                        <Calendar size={12} className="mr-1" /> Schedule Inspection
                                      </Button>
                                    </div>
                                    {loadingInspections === t.id ? (
                                      <div className="flex justify-center py-4"><Loader2 className="animate-spin text-primary" size={18} /></div>
                                    ) : (inspections[t.id]?.length || 0) === 0 ? (
                                      <p className="text-xs text-muted-foreground py-2">No inspections recorded for this tenancy.</p>
                                    ) : (
                                      <div className="space-y-2">
                                        {inspections[t.id]?.map(insp => (
                                          <div key={insp.id} className="flex items-center justify-between rounded-lg border bg-background p-3">
                                            <div className="flex items-center gap-3">
                                              {inspectionTypeBadge(insp.inspection_type)}
                                              <span className="text-sm">{format(parseISO(insp.scheduled_date), 'dd MMM yyyy')}</span>
                                              {statusBadge(insp.status)}
                                            </div>
                                            <Button
                                              size="sm"
                                              variant={insp.status === 'completed' ? 'outline' : 'default'}
                                              onClick={() => navigate(`/dashboard/inspection/${insp.id}`)}
                                            >
                                              {insp.status === 'in_progress' ? 'Continue Report' : insp.status === 'completed' ? 'View Report' : 'Start Report'}
                                            </Button>
                                          </div>
                                        ))}
                                      </div>
                                    )}
                                  </div>
                                </TableCell>
                              </TableRow>
                            )}
                            </Fragment>
                          );
                        })
                      )}
                    </TableBody>
                  </Table>
                </div>
              </CardContent>
            </Card>
          </motion.div>
        </>
      )}

      <Dialog open={showAddModal} onOpenChange={(open) => { setShowAddModal(open); if (!open) setStep(1); }}>
        <DialogContent className="max-w-lg max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Add Tenancy — Step {step} of 3</DialogTitle>
          </DialogHeader>

          {/* Step indicators */}
          <div className="flex items-center gap-2 mb-2">
            {[1, 2, 3].map(s => (
              <div key={s} className={`h-1.5 flex-1 rounded-full ${s <= step ? 'bg-primary' : 'bg-muted'}`} />
            ))}
          </div>

          {step === 1 && (
            <div className="grid gap-4 py-2">
              <div>
                <Label>Property (Rental) *</Label>
                <Select value={form.property_id} onValueChange={v => setForm(f => ({ ...f, property_id: v }))}>
                  <SelectTrigger><SelectValue placeholder="Select rental property" /></SelectTrigger>
                  <SelectContent>
                    {properties.map(p => (
                      <SelectItem key={p.id} value={p.id}>{p.address}, {p.suburb}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {properties.length === 0 && (
                  <p className="text-xs text-muted-foreground mt-1">No rental properties found. Add a listing with category "Rent" first.</p>
                )}
              </div>
              <div>
                <Label>Tenant Name *</Label>
                <Input value={form.tenant_name} onChange={e => setForm(f => ({ ...f, tenant_name: e.target.value }))} />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div><Label>Tenant Email</Label><Input type="email" value={form.tenant_email} onChange={e => setForm(f => ({ ...f, tenant_email: e.target.value }))} /></div>
                <div><Label>Tenant Phone</Label><Input value={form.tenant_phone} onChange={e => setForm(f => ({ ...f, tenant_phone: e.target.value }))} /></div>
              </div>
              <Button
                onClick={() => setStep(2)}
                disabled={!form.property_id || !form.tenant_name}
              >
                Next →
              </Button>
            </div>
          )}

          {step === 2 && (
            <div className="grid gap-4 py-2">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label>Weekly Rent *</Label>
                  <Input
                    type="number"
                    step="0.01"
                    placeholder="e.g. 550"
                    value={form.rent_amount}
                    onChange={e => {
                      const val = e.target.value;
                      setForm(f => ({
                        ...f,
                        rent_amount: val,
                        rent_frequency: 'weekly',
                        bond_amount: !f.bond_manual && val ? (parseFloat(val) * 4).toFixed(2) : f.bond_amount,
                      }));
                    }}
                  />
                </div>
                <div>
                  <Label>Bond Amount *</Label>
                  <Input
                    type="number"
                    step="0.01"
                    value={form.bond_amount}
                    onChange={e => setForm(f => ({ ...f, bond_amount: e.target.value, bond_manual: true }))}
                  />
                  {form.bond_manual && form.rent_amount && (
                    <button
                      type="button"
                      className="text-xs text-primary mt-1 hover:underline"
                      onClick={() => setForm(f => ({ ...f, bond_amount: (parseFloat(f.rent_amount || '0') * 4).toFixed(2), bond_manual: false }))}
                    >
                      Reset to 4 weeks
                    </button>
                  )}
                  {bondExceedsFourWeeks && (
                    <p className="text-xs text-amber-600 dark:text-amber-400 mt-1">
                      ⚠️ Bond exceeds 4 weeks rent (${fourWeeksAmount}). Confirm this is correct.
                    </p>
                  )}
                </div>
              </div>

              {/* Bond Authority & Lodgement */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label>Bond Authority</Label>
                  <Select value={form.bond_authority} onValueChange={v => setForm(f => ({ ...f, bond_authority: v }))}>
                    <SelectTrigger><SelectValue placeholder="Select authority" /></SelectTrigger>
                    <SelectContent>
                      {BOND_AUTHORITIES.map(auth => (
                        <SelectItem key={auth} value={auth}>{auth}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label>Bond Lodgement Ref</Label>
                  <Input
                    value={form.bond_lodgement_number}
                    onChange={e => setForm(f => ({ ...f, bond_lodgement_number: e.target.value }))}
                    placeholder="e.g. BL-2024-123456"
                  />
                  <p className="text-[10px] text-muted-foreground mt-0.5">Enter the reference number from the bond authority receipt</p>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label>Lease Start *</Label>
                  <Input type="date" value={form.lease_start} onChange={e => setForm(f => ({ ...f, lease_start: e.target.value }))} />
                </div>
                <div>
                  <Label>Lease End *</Label>
                  <Input type="date" value={form.lease_end} onChange={e => setForm(f => ({ ...f, lease_end: e.target.value }))} />
                  {leaseDateError && (
                    <p className="text-xs text-destructive mt-1">{leaseDateError}</p>
                  )}
                </div>
              </div>
              <div>
                <Label>Management Fee % (AU standard 8.8%)</Label>
                <Input type="number" step="0.01" value={form.management_fee_percent} onChange={e => setForm(f => ({ ...f, management_fee_percent: e.target.value }))} />
                {(() => {
                  const v = parseFloat(form.management_fee_percent);
                  if (v <= 0) return <p className="text-xs text-destructive mt-1">Management fee cannot be zero or negative.</p>;
                  if (v < 5) return <p className="text-xs text-yellow-600 dark:text-yellow-400 mt-1">Below typical AU range (5–15%). Confirm with landlord.</p>;
                  if (v > 15) return <p className="text-xs text-yellow-600 dark:text-yellow-400 mt-1">Above typical AU range. Confirm this is correct.</p>;
                  return null;
                })()}
              </div>
              <div className="flex gap-2 mt-1">
                <Button variant="outline" onClick={() => setStep(1)}>← Back</Button>
                <Button
                  className="flex-1"
                  onClick={() => setStep(3)}
                  disabled={!step2Valid}
                >
                  Next →
                </Button>
              </div>
            </div>
          )}

          {step === 3 && (() => {
            const prop = properties.find(p => p.id === form.property_id);
            const weeklyRent = parseFloat(form.rent_amount || '0');
            const bond = parseFloat(form.bond_amount || '0');
            const mgmt = parseFloat(form.management_fee_percent || '0');
            return (
              <div className="grid gap-3 py-2">
                <p className="text-sm font-medium text-foreground">Owner / Payment Details</p>
                <div className="grid grid-cols-2 gap-3">
                  <div><Label>Owner Name</Label><Input value={form.owner_name} onChange={e => setForm(f => ({ ...f, owner_name: e.target.value }))} /></div>
                  <div><Label>Owner Email</Label><Input type="email" value={form.owner_email} onChange={e => setForm(f => ({ ...f, owner_email: e.target.value }))} /></div>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <Label>Owner BSB</Label>
                    <Input
                      value={form.owner_bsb}
                      onChange={e => setForm(f => ({ ...f, owner_bsb: e.target.value }))}
                      placeholder="e.g. 062-000"
                    />
                    {bsbError && <p className="text-xs text-destructive mt-1">{bsbError}</p>}
                  </div>
                  <div>
                    <Label>Account Number</Label>
                    <Input value={form.owner_account_number} onChange={e => setForm(f => ({ ...f, owner_account_number: e.target.value }))} placeholder="e.g. 12345678" />
                  </div>
                </div>

                <p className="text-sm font-medium text-foreground mt-3">Confirm Details</p>
                <div className="rounded-lg border bg-muted/30 p-4 text-sm space-y-2">
                  <div className="flex justify-between"><span className="text-muted-foreground">Property</span><span className="font-medium">{prop ? `${prop.address}, ${prop.suburb}` : '—'}</span></div>
                  <div className="flex justify-between"><span className="text-muted-foreground">Tenant</span><span className="font-medium">{form.tenant_name}</span></div>
                  {form.tenant_email && <div className="flex justify-between"><span className="text-muted-foreground">Email</span><span>{form.tenant_email}</span></div>}
                  {form.tenant_phone && <div className="flex justify-between"><span className="text-muted-foreground">Phone</span><span>{form.tenant_phone}</span></div>}
                  <div className="border-t my-2" />
                  <div className="flex justify-between"><span className="text-muted-foreground">Weekly Rent</span><span className="font-medium">${weeklyRent.toFixed(2)}</span></div>
                  <div className="flex justify-between"><span className="text-muted-foreground">Bond</span><span>${bond.toFixed(2)} ({(bond / (weeklyRent || 1)).toFixed(1)} weeks)</span></div>
                  {form.bond_authority && <div className="flex justify-between"><span className="text-muted-foreground">Bond Authority</span><span>{form.bond_authority}</span></div>}
                  {form.bond_lodgement_number && <div className="flex justify-between"><span className="text-muted-foreground">Bond Ref</span><span>{form.bond_lodgement_number}</span></div>}
                  <div className="flex justify-between"><span className="text-muted-foreground">Lease</span><span>{form.lease_start} → {form.lease_end}</span></div>
                  <div className="flex justify-between"><span className="text-muted-foreground">Management %</span><span>{mgmt}%</span></div>
                  {form.owner_name && <div className="flex justify-between"><span className="text-muted-foreground">Owner</span><span>{form.owner_name}</span></div>}
                </div>

                {bondExceedsFourWeeks && (
                  <div className="flex items-start gap-2 px-3 py-2 rounded-lg bg-amber-500/10 border border-amber-500/20">
                    <AlertTriangle size={14} className="text-amber-600 shrink-0 mt-0.5" />
                    <p className="text-xs text-amber-700 dark:text-amber-400">Bond exceeds 4 weeks rent (${fourWeeksAmount}). Please confirm this is intentional.</p>
                  </div>
                )}

                <div className="flex gap-2 mt-1">
                  <Button variant="outline" onClick={() => setStep(2)}>← Back</Button>
                  <Button className="flex-1" onClick={handleSubmit} disabled={saving || !step3Valid}>
                    {saving ? <Loader2 className="animate-spin mr-2" size={14} /> : null}
                    Create Tenancy
                  </Button>
                </div>
              </div>
            );
          })()}
        </DialogContent>
      </Dialog>

      {/* Schedule Inspection Modal */}
      <Dialog open={!!showScheduleModal} onOpenChange={(open) => { if (!open) setShowScheduleModal(null); }}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Schedule Inspection</DialogTitle>
          </DialogHeader>
          <div className="grid gap-4 py-2">
            <div>
              <Label>Property</Label>
              <p className="text-sm text-muted-foreground">{showScheduleModal?.properties?.address}, {showScheduleModal?.properties?.suburb}</p>
            </div>
            <div>
              <Label>Inspection Type *</Label>
              <Select value={scheduleForm.inspection_type} onValueChange={v => setScheduleForm(f => ({ ...f, inspection_type: v }))}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="entry">Entry</SelectItem>
                  <SelectItem value="routine">Routine</SelectItem>
                  <SelectItem value="exit">Exit</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Scheduled Date *</Label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button variant="outline" className={cn('w-full justify-start text-left font-normal', !scheduleForm.scheduled_date && 'text-muted-foreground')}>
                    <Calendar size={14} className="mr-2" />
                    {scheduleForm.scheduled_date ? format(scheduleForm.scheduled_date, 'PPP') : 'Pick a date'}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  <CalendarComponent
                    mode="single"
                    selected={scheduleForm.scheduled_date}
                    onSelect={d => setScheduleForm(f => ({ ...f, scheduled_date: d || undefined }))}
                    disabled={d => d < today}
                    initialFocus
                    className="p-3 pointer-events-auto"
                  />
                </PopoverContent>
              </Popover>
              {(() => {
                const noticeWarn = getNoticePeriodWarning(showScheduleModal?.properties?.state, scheduleForm.scheduled_date);
                const freqWarn = showScheduleModal ? getFrequencyWarning(showScheduleModal.properties?.state, showScheduleModal.id, scheduleForm.inspection_type) : null;
                return (
                  <>
                    {noticeWarn && (
                      <div className="flex items-start gap-2 mt-2 px-3 py-2 rounded-lg bg-amber-500/10 border border-amber-500/20">
                        <AlertTriangle size={12} className="text-amber-600 shrink-0 mt-0.5" />
                        <p className="text-xs text-amber-700">{noticeWarn}</p>
                      </div>
                    )}
                    {freqWarn && (
                      <div className="flex items-start gap-2 mt-2 px-3 py-2 rounded-lg bg-amber-500/10 border border-amber-500/20">
                        <AlertTriangle size={12} className="text-amber-600 shrink-0 mt-0.5" />
                        <p className="text-xs text-amber-700">{freqWarn}</p>
                      </div>
                    )}
                  </>
                );
              })()}
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div><Label>Owner Name</Label><Input value={scheduleForm.owner_name} onChange={e => setScheduleForm(f => ({ ...f, owner_name: e.target.value }))} /></div>
              <div><Label>Owner Email</Label><Input type="email" value={scheduleForm.owner_email} onChange={e => setScheduleForm(f => ({ ...f, owner_email: e.target.value }))} /></div>
            </div>
            {scheduleForm.inspection_type === 'exit' && (
              <div>
                <Label>Bond Lodgment Number</Label>
                <Input value={scheduleForm.bond_lodgment_number} onChange={e => setScheduleForm(f => ({ ...f, bond_lodgment_number: e.target.value }))} placeholder="e.g. BL-2024-123456" />
              </div>
            )}
            <div className="flex gap-2 mt-2">
              <Button variant="outline" className="flex-1" onClick={() => handleScheduleInspection(false)} disabled={scheduleSaving || !scheduleForm.scheduled_date}>
                {scheduleSaving ? <Loader2 className="animate-spin mr-1" size={14} /> : null}
                Schedule for Later
              </Button>
              <Button className="flex-1" onClick={() => handleScheduleInspection(true)} disabled={scheduleSaving || !scheduleForm.scheduled_date}>
                {scheduleSaving ? <Loader2 className="animate-spin mr-1" size={14} /> : null}
                Start Report Now
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Bulk Inspection Scheduling Modal */}
      <Dialog open={showBulkInspectionModal} onOpenChange={(open) => { if (!open) setShowBulkInspectionModal(false); }}>
        <DialogContent className="max-w-lg max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Routine Inspections — {bulkInspectionTenancy?.properties?.address}</DialogTitle>
          </DialogHeader>

          {loadingBulkInspections ? (
            <div className="flex justify-center py-8"><Loader2 className="animate-spin text-primary" size={24} /></div>
          ) : (
            <div className="space-y-4">
              {/* Australian standard notice */}
              <div className="flex items-start gap-2 px-3 py-2 rounded-lg bg-primary/5 border border-primary/10">
                <AlertTriangle size={14} className="text-primary shrink-0 mt-0.5" />
                <p className="text-xs text-muted-foreground leading-relaxed">
                  AU Standard: Entry inspection on move-in, routine at 3 months, then every 6 months thereafter. 7 days minimum notice required (VIC: 48 hrs, QLD: 24 hrs). Dates can be adjusted before saving.
                </p>
              </div>

              {/* Existing inspections */}
              {existingInspections.length > 0 && (
                <div className="space-y-2">
                  <p className="text-sm font-semibold text-foreground">Existing Schedule</p>
                  <div className="space-y-1">
                    {existingInspections.map(ins => (
                      <div key={ins.id} className="flex items-center justify-between rounded-lg border bg-muted/30 p-2 text-sm">
                        <div className="flex items-center gap-2">
                          <span className="capitalize font-medium">{ins.inspection_type} Inspection</span>
                          <span className="text-muted-foreground">{format(parseISO(ins.scheduled_date), 'd MMM yyyy')}</span>
                        </div>
                        <Badge variant="outline" className="text-[10px] capitalize">{ins.status}</Badge>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Suggested inspections to add */}
              <div className="space-y-2">
                <p className="text-sm font-semibold text-foreground">
                  {existingInspections.length > 0 ? 'Add More Inspections' : 'Suggested Inspection Schedule'}
                </p>
                <div className="space-y-2">
                  {suggestedInspections.map((s, i) => (
                    <div key={i} className="flex items-center gap-3 rounded-lg border p-2">
                      <input
                        type="checkbox"
                        checked={s.selected}
                        onChange={(e) => setSuggestedInspections(prev => prev.map((x, xi) => xi === i ? { ...x, selected: (e.target as HTMLInputElement).checked } : x))}
                        className="h-4 w-4 rounded"
                      />
                      <div className="flex-1 flex items-center gap-2">
                        <span className="text-sm font-medium min-w-[140px]">{s.label}</span>
                        <Input
                          type="date"
                          value={s.date}
                          onChange={(e) => setSuggestedInspections(prev => prev.map((x, xi) => xi === i ? { ...x, date: e.target.value } : x))}
                          className="h-7 text-xs"
                          disabled={!s.selected}
                        />
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Notes */}
              <div>
                <Label className="text-sm">Notes (optional — appears on all selected inspections)</Label>
                <Textarea
                  value={inspectionNotes}
                  onChange={(e) => setInspectionNotes(e.target.value)}
                  placeholder="e.g. Please ensure back gate is unlocked"
                  className="mt-1 text-sm h-16 resize-none"
                />
              </div>

              {/* Tenant notice info */}
              {bulkInspectionTenancy?.tenant_email ? (
                <p className="text-xs text-emerald-600 dark:text-emerald-400">
                  ✓ Inspection notice emails will be sent to {bulkInspectionTenancy.tenant_email} for each selected inspection.
                </p>
              ) : (
                <p className="text-xs text-amber-600 dark:text-amber-400">
                  ⚠️ No tenant email on record — inspections will be saved but no email notice will be sent.
                </p>
              )}

              <div className="flex gap-2">
                <Button variant="outline" className="flex-1" onClick={() => setShowBulkInspectionModal(false)}>Cancel</Button>
                <Button
                  className="flex-1"
                  onClick={handleSaveBulkInspections}
                  disabled={savingBulkInspections || suggestedInspections.filter(s => s.selected).length === 0}
                >
                  {savingBulkInspections ? <Loader2 className="animate-spin mr-2" size={14} /> : null}
                  Save {suggestedInspections.filter(s => s.selected).length} Inspection{suggestedInspections.filter(s => s.selected).length !== 1 ? 's' : ''}
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default RentRollPage;
