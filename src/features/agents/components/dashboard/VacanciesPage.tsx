import { useEffect, useMemo, useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { useAgentId } from '@/features/crm/hooks/useAgentId';
import { useAuth } from '@/features/auth/AuthProvider';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Loader2, Home, AlertTriangle, Plus, BarChart2, Clock, TrendingDown, Activity, Flag } from 'lucide-react';
import { toast } from 'sonner';
import { format, parseISO, differenceInDays, addDays } from 'date-fns';
import DashboardHeader from './DashboardHeader';
import { useTranslation } from '@/shared/lib/i18n';

interface T {
  id: string;
  property_id: string;
  tenant_name: string;
  status: string;
  lease_end: string;
  rent_amount: number;
  rent_frequency: string;
  vacancy_status: string | null;
  vacate_date: string | null;
  renewal_status: string | null;
  property_address?: string;
}

interface Tenancy {
  id: string;
  property_id: string;
  status: string;
  lease_start: string;
  lease_end: string | null;
  rent_amount: number;
  rent_frequency: string;
  tenant_name: string | null;
  actual_vacate_date: string | null;
  re_let_date: string | null;
  days_to_re_let: number | null;
  vacancy_loss_aud: number | null;
  property?: { id: string; address: string; suburb: string; is_active: boolean };
}

interface VacancyEvent {
  id: string;
  event_type: string;
  event_date: string;
  notes: string | null;
  property_id: string | null;
}

const vacancyBadge = (s: string | null) => {
  const v = s || 'occupied';
  const map: Record<string,string> = {
    occupied: 'bg-emerald-500/15 text-emerald-700',
    notice_given: 'bg-blue-500/15 text-blue-700',
    vacating: 'bg-amber-500/15 text-amber-700',
    vacant: 'bg-red-500/15 text-red-700',
    re_listed: 'bg-blue-500/15 text-blue-700',
    re_let: 'bg-emerald-500/15 text-emerald-700',
  };
  return <Badge className={`border-0 ${map[v] || ''}`}>{v.replace('_',' ')}</Badge>;
};

const renewalBadge = (s: string | null) => {
  if (!s || s === 'none') return null;
  const map: Record<string,string> = {
    offered: 'bg-blue-500/15 text-blue-700',
    accepted: 'bg-emerald-500/15 text-emerald-700',
    declined: 'bg-red-500/15 text-red-700',
  };
  return <Badge className={`border-0 text-[10px] ${map[s] || ''}`}>renewal: {s}</Badge>;
};

const weeklyRent = (t: Pick<Tenancy, 'rent_amount' | 'rent_frequency'>) => {
  const a = Number(t.rent_amount || 0);
  if (t.rent_frequency === 'fortnightly') return a / 2;
  if (t.rent_frequency === 'monthly') return (a * 12) / 52;
  return a;
};

const fmtAUD = (n: number) =>
  new Intl.NumberFormat('en-AU', { style: 'currency', currency: 'AUD', maximumFractionDigits: 0 }).format(n);

export default function VacanciesPage() {
  const { t: tx } = useTranslation();
  const agentId = useAgentId();
  const { user } = useAuth();
  const navigate = useNavigate();
  const [list, setList] = useState<T[]>([]);
  const [loading, setLoading] = useState(true);

  // notice dialog
  const [noticeFor, setNoticeFor] = useState<T | null>(null);
  const [vacateDate, setVacateDate] = useState('');

  // KPI tab state
  const [tenancies, setTenancies] = useState<Tenancy[]>([]);
  const [events, setEvents] = useState<VacancyEvent[]>([]);
  const [propertyMap, setPropertyMap] = useState<Record<string, string>>({});
  const [showAddEvent, setShowAddEvent] = useState(false);
  const [eventForm, setEventForm] = useState({ event_type: 'listed', property_id: '', event_date: format(new Date(), 'yyyy-MM-dd'), notes: '' });
  const [savingEvent, setSavingEvent] = useState(false);

  const load = async () => {
    if (!agentId) return;
    setLoading(true);
    const { data } = await supabase
      .from('tenancies')
      .select('id, property_id, tenant_name, status, lease_end, rent_amount, rent_frequency, vacancy_status, vacate_date, renewal_status, properties:property_id(address, suburb)')
      .eq('agent_id', agentId);
    const today = Date.now();
    const filtered = (data || [])
      .map((t: any) => ({
        ...t,
        property_address: t.properties ? `${t.properties.address}, ${t.properties.suburb}` : '—',
      }))
      .filter((t: T) => {
        const v = t.vacancy_status;
        if (v && v !== 'occupied') return true;
        if (t.lease_end) {
          const days = (parseISO(t.lease_end).getTime() - today) / 86400000;
          return days <= 60;
        }
        return false;
      });
    setList(filtered);
    setLoading(false);
  };

  useEffect(() => { load(); }, [agentId]);

  const fetchKpiData = useCallback(async () => {
    if (!agentId) return;
    const { data: ts } = await supabase
      .from('tenancies')
      .select('id, property_id, status, lease_start, lease_end, rent_amount, rent_frequency, tenant_name, actual_vacate_date, re_let_date, days_to_re_let, vacancy_loss_aud, properties:property_id(id, address, suburb, is_active)')
      .eq('agent_id', agentId);

    const tList: Tenancy[] = (ts || []).map((t: any) => ({ ...t, property: t.properties }));
    setTenancies(tList);

    const map: Record<string, string> = {};
    tList.forEach(t => { if (t.property) map[t.property_id] = `${t.property.address}, ${t.property.suburb}`; });
    setPropertyMap(map);

    const { data: ev } = await supabase
      .from('vacancy_events' as any)
      .select('id, event_type, event_date, notes, property_id')
      .eq('agent_id', agentId)
      .order('event_date', { ascending: false })
      .limit(20);
    setEvents((ev as any) || []);
  }, [agentId]);

  useEffect(() => { fetchKpiData(); }, [fetchKpiData]);

  const setVacancyStatus = async (t: T, vacancy_status: string, extra: any = {}) => {
    const { error } = await supabase.from('tenancies').update({ vacancy_status, ...extra } as any).eq('id', t.id);
    if (error) { toast.error('Could not update'); return; }
    toast.success('Status updated');
    load();
  };

  const submitNotice = async () => {
    if (!noticeFor) return;
    if (vacateDate) {
      const days = Math.ceil((new Date(vacateDate).getTime() - new Date().setHours(0,0,0,0)) / 86400000);
      if (days < 60) {
        toast.error('Vacate date must be at least 60 days from today — required under Australian tenancy law (NSW/VIC/QLD). Check your state legislation for the exact requirement.');
        return;
      }
    }
    await setVacancyStatus(noticeFor, 'notice_given', { vacate_date: vacateDate || null });
    setNoticeFor(null); setVacateDate('');
  };

  const handleAddEvent = async () => {
    if (!agentId || !eventForm.property_id) {
      toast.error('Please select a property');
      return;
    }
    setSavingEvent(true);
    const { error } = await supabase.from('vacancy_events' as any).insert({
      agent_id: agentId,
      property_id: eventForm.property_id,
      event_type: eventForm.event_type,
      event_date: eventForm.event_date,
      notes: eventForm.notes || null,
    });
    setSavingEvent(false);
    if (error) { toast.error(error.message); return; }
    toast.success('Vacancy event recorded');
    setShowAddEvent(false);
    setEventForm({ event_type: 'listed', property_id: '', event_date: format(new Date(), 'yyyy-MM-dd'), notes: '' });
    fetchKpiData();
  };

  const summary = useMemo(() => {
    const today = new Date();
    return {
      vacant: list.filter(t => t.vacancy_status === 'vacant').length,
      vacatingThisMonth: list.filter(t => t.vacate_date && parseISO(t.vacate_date).getMonth() === today.getMonth() && parseISO(t.vacate_date).getFullYear() === today.getFullYear()).length,
      noticeGiven: list.filter(t => t.vacancy_status === 'notice_given').length,
    };
  }, [list]);

  const kpis = useMemo(() => {
    const today = new Date();
    const totalManaged = tenancies.length;
    const vacant = tenancies.filter(t => t.status === 'ended' && !t.re_let_date);
    const vacating = tenancies.filter(t => {
      if (t.status !== 'vacating') return false;
      if (!t.lease_end) return true;
      return differenceInDays(new Date(t.lease_end), today) <= 30;
    });
    const noticeGiven = tenancies.filter(t => t.status === 'vacating');

    const yearAgo = addDays(today, -365);
    const reletWithDays = tenancies.filter(t =>
      t.re_let_date && t.days_to_re_let != null && new Date(t.re_let_date) >= yearAgo);
    const avgReLet = reletWithDays.length
      ? Math.round(reletWithDays.reduce((s, t) => s + (t.days_to_re_let || 0), 0) / reletWithDays.length)
      : null;

    const monthStart = new Date(today.getFullYear(), today.getMonth(), 1);
    const lossThisMonth = tenancies
      .filter(t => t.re_let_date && new Date(t.re_let_date) >= monthStart)
      .reduce((s, t) => s + Number(t.vacancy_loss_aud || 0), 0);

    const ongoingLoss = vacant.reduce((s, t) => {
      const vacateDateD = t.actual_vacate_date ? new Date(t.actual_vacate_date) :
        (t.lease_end ? new Date(t.lease_end) : today);
      const days = Math.max(0, differenceInDays(today, vacateDateD));
      return s + (days * weeklyRent(t)) / 7;
    }, 0);

    const totalLossMonth = lossThisMonth + ongoingLoss;
    const occupancy = totalManaged > 0 ? ((totalManaged - vacant.length) / totalManaged) * 100 : 100;

    return {
      vacantCount: vacant.length,
      vacatingCount: vacating.length,
      noticeCount: noticeGiven.length,
      avgReLet,
      lossThisMonth: totalLossMonth,
      occupancy,
      vacantList: vacant,
      vacatingList: vacating,
    };
  }, [tenancies]);

  const upcoming = useMemo(() => {
    const today = new Date();
    return tenancies
      .filter(t => t.status === 'active' || t.status === 'vacating')
      .filter(t => t.lease_end && differenceInDays(new Date(t.lease_end), today) <= 90 && differenceInDays(new Date(t.lease_end), today) >= 0)
      .sort((a, b) => new Date(a.lease_end!).getTime() - new Date(b.lease_end!).getTime());
  }, [tenancies]);

  const reletHistory = useMemo(() => {
    const yearAgo = addDays(new Date(), -365);
    return tenancies
      .filter(t => t.re_let_date && new Date(t.re_let_date) >= yearAgo && t.days_to_re_let != null)
      .sort((a, b) => new Date(b.re_let_date!).getTime() - new Date(a.re_let_date!).getTime());
  }, [tenancies]);

  const reletStats = useMemo(() => {
    if (reletHistory.length === 0) return null;
    const days = reletHistory.map(t => t.days_to_re_let!);
    const losses = reletHistory.reduce((s, t) => s + Number(t.vacancy_loss_aud || 0), 0);
    return {
      best: Math.min(...days),
      worst: Math.max(...days),
      avg: Math.round(days.reduce((s, d) => s + d, 0) / days.length),
      totalLoss: losses,
    };
  }, [reletHistory]);

  if (!agentId || loading) return <div className="flex justify-center py-16"><Loader2 className="animate-spin text-primary"/></div>;

  return (
    <div className="space-y-4">
      <nav className="text-sm text-muted-foreground mb-2">
        <span>Dashboard</span>
        <span className="mx-2">→</span>
        <span className="font-medium text-foreground">Vacancies</span>
      </nav>
      <DashboardHeader title="Vacancies" subtitle="Vacate notices, KPIs and re-let performance." />

      <Tabs defaultValue="vacancies" className="w-full">
        <TabsList>
          <TabsTrigger value="vacancies" className="gap-1.5"><Home size={14}/> Vacancies</TabsTrigger>
          <TabsTrigger value="kpi" className="gap-1.5"><BarChart2 size={14}/> KPI Dashboard</TabsTrigger>
        </TabsList>

        <TabsContent value="vacancies" className="space-y-4 mt-4">
          <div className="grid grid-cols-3 gap-3">
            <Card><CardContent className="p-4"><p className="text-xs text-muted-foreground">Currently Vacant</p><p className={`text-2xl font-bold ${summary.vacant > 0 ? 'text-red-600' : 'text-emerald-600'}`}>{summary.vacant}</p></CardContent></Card>
            <Card><CardContent className="p-4"><p className="text-xs text-muted-foreground">Vacating This Month</p><p className="text-2xl font-bold text-amber-600">{summary.vacatingThisMonth}</p></CardContent></Card>
            <Card><CardContent className="p-4"><p className="text-xs text-muted-foreground">Notices Given</p><p className="text-2xl font-bold text-blue-600">{summary.noticeGiven}</p></CardContent></Card>
          </div>

          <Card>
            <CardContent className="p-0">
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Property</TableHead>
                      <TableHead>Tenant</TableHead>
                      <TableHead>Lease End</TableHead>
                      <TableHead>Days</TableHead>
                      <TableHead>Vacancy</TableHead>
                      <TableHead>Renewal</TableHead>
                      <TableHead className="w-64">Action</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {list.length === 0 ? (
                      <TableRow><TableCell colSpan={7} className="text-center py-10 text-muted-foreground"><Home size={20} className="mx-auto mb-2 opacity-40"/>No vacancies or upcoming lease ends.</TableCell></TableRow>
                    ) : list.map(t => {
                      const days = t.lease_end ? differenceInDays(parseISO(t.lease_end), new Date()) : null;
                      const v = t.vacancy_status || 'occupied';
                      const firstName = (t.tenant_name || '').split(' ')[0];
                      return (
                        <TableRow key={t.id} className="cursor-pointer hover:bg-accent/30" onClick={() => navigate(`/dashboard/tenancies/${t.id}`)}>
                          <TableCell className="text-sm font-medium">{t.property_address}</TableCell>
                          <TableCell className="text-sm">{firstName || '—'}</TableCell>
                          <TableCell className="text-xs">{t.lease_end ? format(parseISO(t.lease_end), 'd MMM yyyy') : '—'}</TableCell>
                          <TableCell className={`text-xs font-medium ${days != null && days < 14 ? 'text-red-600' : days != null && days < 30 ? 'text-amber-600' : 'text-muted-foreground'}`}>
                            {days != null ? `${days}d` : '—'}
                          </TableCell>
                          <TableCell>{vacancyBadge(t.vacancy_status)}</TableCell>
                          <TableCell>{renewalBadge(t.renewal_status) || <span className="text-xs text-muted-foreground">—</span>}</TableCell>
                          <TableCell onClick={(e) => e.stopPropagation()}>
                            <div className="flex flex-wrap gap-1">
                              {(v === 'occupied' && (t.renewal_status === 'declined' || !t.renewal_status || t.renewal_status === 'none') && days != null && days < 60) && (
                                <Button size="sm" variant="outline" className="h-7 text-xs" onClick={() => { setNoticeFor(t); setVacateDate(t.lease_end || ''); }}>Mark notice given</Button>
                              )}
                              {v === 'notice_given' && (
                                <Button size="sm" variant="outline" className="h-7 text-xs" onClick={() => setVacancyStatus(t, 'vacating')}>Confirm vacating</Button>
                              )}
                              {(v === 'vacating' || v === 'vacant') && (
                                <>
                                  <Button size="sm" variant="outline" className="h-7 text-xs" onClick={() => navigate(`/pocket-listing?type=rent&prefill=${t.property_id}`)}>
                                    <Plus size={11} className="mr-1"/>Create listing
                                  </Button>
                                  {v === 'vacating' && (
                                    <Button size="sm" variant="outline" className="h-7 text-xs" onClick={() => setVacancyStatus(t, 'vacant', { actual_vacate_date: new Date().toISOString().slice(0,10) })}>Mark vacant</Button>
                                  )}
                                </>
                              )}
                              {v === 're_listed' && (
                                <Button size="sm" variant="outline" className="h-7 text-xs" onClick={() => setVacancyStatus(t, 're_let', { re_let_date: new Date().toISOString().slice(0,10) })}>Mark re-let</Button>
                              )}
                            </div>
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="kpi" className="space-y-6 mt-4">
          <div className="flex items-center justify-end">
            <Button onClick={() => setShowAddEvent(true)} className="flex items-center gap-1.5">
              <Plus size={16} /> Log Event
            </Button>
          </div>

          <div className="grid grid-cols-2 lg:grid-cols-6 gap-4">
            <KpiCard label="Currently Vacant" value={kpis.vacantCount} icon={Home}
              tone={kpis.vacantCount > 0 ? 'red' : 'green'} />
            <KpiCard label="Vacating This Month" value={kpis.vacatingCount} icon={Clock} tone="amber" />
            <KpiCard label="Notices Given" value={kpis.noticeCount} icon={Flag} tone="blue" />
            <KpiCard label="Avg Days to Re-let" value={kpis.avgReLet ?? '—'} icon={Activity}
              tone={kpis.avgReLet == null ? 'neutral' : kpis.avgReLet < 21 ? 'green' : kpis.avgReLet <= 35 ? 'amber' : 'red'}
              suffix={kpis.avgReLet != null ? ' days' : ''} />
            <KpiCard label="Vacancy Loss (Month)" value={fmtAUD(kpis.lossThisMonth)} icon={TrendingDown} tone="red" />
            <KpiCard label="Occupancy Rate" value={`${kpis.occupancy.toFixed(1)}%`} icon={Home}
              tone={kpis.occupancy > 95 ? 'green' : kpis.occupancy >= 90 ? 'amber' : 'red'} />
          </div>

          <Card>
            <CardContent className="p-5">
              <h2 className="font-display text-lg font-bold text-foreground mb-4">Next 90 Days</h2>
              <Timeline tenancies={tenancies.filter(t => ['active','vacating','ended','pending'].includes(t.status))} />
            </CardContent>
          </Card>

          <section>
            <h2 className="font-display text-lg font-bold text-foreground mb-3 flex items-center gap-2">
              <AlertTriangle className="text-red-500" size={18} /> Active Vacancies
            </h2>
            <Card>
              <CardContent className="p-0">
                {kpis.vacantList.length === 0 ? (
                  <p className="p-6 text-sm text-muted-foreground text-center">No vacant properties.</p>
                ) : (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Property</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead>Vacant Since</TableHead>
                        <TableHead>Days Vacant</TableHead>
                        <TableHead>Weekly Rent</TableHead>
                        <TableHead>Loss to Date</TableHead>
                        <TableHead>Re-listed</TableHead>
                        <TableHead></TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {kpis.vacantList
                        .map(tn => {
                          const vacateD = tn.actual_vacate_date ? new Date(tn.actual_vacate_date) :
                            (tn.lease_end ? new Date(tn.lease_end) : new Date());
                          const daysVacant = Math.max(0, differenceInDays(new Date(), vacateD));
                          const wr = weeklyRent(tn);
                          const lossToDate = (daysVacant * wr) / 7;
                          return { tn, vacateD, daysVacant, wr, lossToDate };
                        })
                        .sort((a, b) => b.daysVacant - a.daysVacant)
                        .map(({ tn, vacateD, daysVacant, wr, lossToDate }) => (
                          <TableRow key={tn.id}>
                            <TableCell className="font-medium">{propertyMap[tn.property_id] || '—'}</TableCell>
                            <TableCell><Badge variant="destructive">Vacant</Badge></TableCell>
                            <TableCell className="text-sm">{format(vacateD, 'dd/MM/yyyy')}</TableCell>
                            <TableCell className={daysVacant > 14 ? 'text-red-600 font-semibold' : ''}>
                              {daysVacant}
                            </TableCell>
                            <TableCell className="text-red-600">{fmtAUD(wr)}</TableCell>
                            <TableCell className="text-red-600 font-medium">{fmtAUD(lossToDate)}</TableCell>
                            <TableCell>
                              <Badge variant={tn.property?.is_active ? 'default' : 'outline'}>
                                {tn.property?.is_active ? 'Yes' : 'No'}
                              </Badge>
                            </TableCell>
                            <TableCell>
                              {tn.property?.is_active ? (
                                <Button size="sm" variant="outline" onClick={() => navigate(`/dashboard/listings`)}>
                                  View
                                </Button>
                              ) : (
                                <Button size="sm" onClick={() => navigate(`/dashboard/listings/new`, {
                                  state: { type: 'rental', prefill_property_id: tn.property_id },
                                })}>
                                  <Plus size={14} className="mr-1" /> Create Listing
                                </Button>
                              )}
                            </TableCell>
                          </TableRow>
                        ))}
                    </TableBody>
                  </Table>
                )}
              </CardContent>
            </Card>
          </section>

          <section>
            <h2 className="font-display text-lg font-bold text-foreground mb-3 flex items-center gap-2">
              <Clock className="text-amber-500" size={18} /> Upcoming Vacancies (Next 90 Days)
            </h2>
            <Card>
              <CardContent className="p-0">
                {upcoming.length === 0 ? (
                  <p className="p-6 text-sm text-muted-foreground text-center">No upcoming lease ends.</p>
                ) : (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Property</TableHead>
                        <TableHead>Tenant</TableHead>
                        <TableHead>Lease End</TableHead>
                        <TableHead>Days Remaining</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead></TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {upcoming.map(tn => {
                        const days = differenceInDays(new Date(tn.lease_end!), new Date());
                        const tone = days < 30 ? 'text-red-600' : days < 60 ? 'text-amber-600' : 'text-emerald-600';
                        const firstName = (tn.tenant_name || '—').split(' ')[0];
                        return (
                          <TableRow key={tn.id}>
                            <TableCell className="font-medium">{propertyMap[tn.property_id] || '—'}</TableCell>
                            <TableCell>{firstName}</TableCell>
                            <TableCell>{format(new Date(tn.lease_end!), 'dd/MM/yyyy')}</TableCell>
                            <TableCell className={`${tone} font-semibold`}>{days} days</TableCell>
                            <TableCell>
                              <Badge variant={tn.status === 'vacating' ? 'destructive' : 'secondary'}>
                                {tn.status === 'vacating' ? 'Notice given' : 'Active'}
                              </Badge>
                            </TableCell>
                            <TableCell>
                              <Button size="sm" variant="outline" onClick={() => navigate('/dashboard/rent-roll')}>
                                Manage
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
          </section>

          <section>
            <h2 className="font-display text-lg font-bold text-foreground mb-3 flex items-center gap-2">
              <Activity className="text-primary" size={18} /> Re-let Performance (Last 12 Months)
            </h2>
            <Card>
              <CardContent className="p-0">
                {reletHistory.length === 0 ? (
                  <p className="p-6 text-sm text-muted-foreground text-center">No re-let history yet.</p>
                ) : (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Property</TableHead>
                        <TableHead>Vacate Date</TableHead>
                        <TableHead>Re-let Date</TableHead>
                        <TableHead>Days Vacant</TableHead>
                        <TableHead>Vacancy Loss</TableHead>
                        <TableHead>Performance</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {reletHistory.map(tn => {
                        const days = tn.days_to_re_let!;
                        const perf = days < 14 ? { label: 'Excellent', tone: 'bg-emerald-500/15 text-emerald-700' } :
                                     days <= 21 ? { label: 'Good', tone: 'bg-blue-500/15 text-blue-700' } :
                                     days <= 35 ? { label: 'Average', tone: 'bg-amber-500/15 text-amber-700' } :
                                                  { label: 'Poor', tone: 'bg-red-500/15 text-red-700' };
                        return (
                          <TableRow key={tn.id}>
                            <TableCell className="font-medium">{propertyMap[tn.property_id] || '—'}</TableCell>
                            <TableCell>{tn.actual_vacate_date ? format(new Date(tn.actual_vacate_date), 'dd/MM/yyyy') : '—'}</TableCell>
                            <TableCell>{format(new Date(tn.re_let_date!), 'dd/MM/yyyy')}</TableCell>
                            <TableCell>{days}</TableCell>
                            <TableCell>{fmtAUD(Number(tn.vacancy_loss_aud || 0))}</TableCell>
                            <TableCell><Badge className={perf.tone}>{perf.label}</Badge></TableCell>
                          </TableRow>
                        );
                      })}
                    </TableBody>
                  </Table>
                )}
              </CardContent>
            </Card>
            {reletStats && (
              <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mt-3">
                <StatPill label="Best Re-let" value={`${reletStats.best} days`} />
                <StatPill label="Worst" value={`${reletStats.worst} days`} />
                <StatPill label="Average" value={`${reletStats.avg} days`} />
                <StatPill label="Total Loss (Year)" value={fmtAUD(reletStats.totalLoss)} />
              </div>
            )}
          </section>

          <section>
            <h2 className="font-display text-lg font-bold text-foreground mb-3">Vacancy Event Log</h2>
            <Card>
              <CardContent className="p-0">
                {events.length === 0 ? (
                  <p className="p-6 text-sm text-muted-foreground text-center">No vacancy events logged yet. Use Log Event to track your vacancy pipeline.</p>
                ) : (
                  <div className="divide-y divide-border">
                    {events.map(e => (
                      <div key={e.id} className="px-4 py-3 flex items-center gap-3">
                        <Badge variant="outline" className="capitalize">{e.event_type.replace(/_/g, ' ')}</Badge>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium truncate">{e.property_id ? propertyMap[e.property_id] || 'Property' : 'Property'}</p>
                          {e.notes && <p className="text-xs text-muted-foreground truncate">{e.notes}</p>}
                        </div>
                        <p className="text-xs text-muted-foreground shrink-0">{format(new Date(e.event_date), 'dd/MM/yyyy')}</p>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </section>
        </TabsContent>
      </Tabs>

      <Dialog open={!!noticeFor} onOpenChange={o => !o && setNoticeFor(null)}>
        <DialogContent className="max-w-sm">
          <DialogHeader><DialogTitle>Tenant gave notice</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <div>
              <Label className="text-xs">Vacate date</Label>
              <Input type="date" value={vacateDate} onChange={e => setVacateDate(e.target.value)} />
              <p className="mt-2 text-xs rounded-md border border-amber-200 bg-amber-50 text-amber-900 px-2.5 py-2 leading-relaxed">
                Minimum 60 days notice required. NSW: 90 days end-of-term · VIC: 60 days · QLD: 60 days. Always confirm with your state legislation.
              </p>
            </div>
            <p className="text-xs text-muted-foreground flex items-start gap-1.5"><AlertTriangle size={12} className="mt-0.5 text-amber-600"/>This sets vacancy status to <strong>notice given</strong>.</p>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setNoticeFor(null)}>Discard</Button>
            <Button onClick={submitNotice}>Save</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={showAddEvent} onOpenChange={setShowAddEvent}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Log Vacancy Event</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-1.5">
              <Label>Event Type *</Label>
              <Select value={eventForm.event_type} onValueChange={(v) => setEventForm(f => ({ ...f, event_type: v }))}>
                <SelectTrigger><SelectValue placeholder="Select event type" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="listed">Listed</SelectItem>
                  <SelectItem value="inspection_held">Inspection Held</SelectItem>
                  <SelectItem value="application_received">Application Received</SelectItem>
                  <SelectItem value="application_approved">Application Approved</SelectItem>
                  <SelectItem value="re_let">Re-let</SelectItem>
                  <SelectItem value="vacant">Vacant</SelectItem>
                  <SelectItem value="other">Other</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label>Property</Label>
              <Select value={eventForm.property_id} onValueChange={(v) => setEventForm(f => ({ ...f, property_id: v }))}>
                <SelectTrigger><SelectValue placeholder="Select property (optional)" /></SelectTrigger>
                <SelectContent>
                  {Object.entries(propertyMap).map(([id, addr]) => (
                    <SelectItem key={id} value={id}>{addr}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label>Event Date *</Label>
              <Input type="date" value={eventForm.event_date} onChange={(e) => setEventForm(f => ({ ...f, event_date: e.target.value }))} />
            </div>
            <div className="space-y-1.5">
              <Label>Notes</Label>
              <Textarea value={eventForm.notes} onChange={(e) => setEventForm(f => ({ ...f, notes: e.target.value }))} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowAddEvent(false)}>Cancel</Button>
            <Button onClick={handleAddEvent} disabled={savingEvent}>
              {savingEvent ? <Loader2 size={14} className="animate-spin mr-1" /> : null}
              Save Event
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

const KpiCard = ({ label, value, icon: Icon, tone, suffix }: {
  label: string; value: string | number; icon: any; tone: 'red'|'amber'|'green'|'blue'|'neutral'; suffix?: string;
}) => {
  const tones: Record<string, string> = {
    red: 'bg-red-500/10 text-red-600',
    amber: 'bg-amber-500/10 text-amber-600',
    green: 'bg-emerald-500/10 text-emerald-600',
    blue: 'bg-blue-500/10 text-blue-600',
    neutral: 'bg-muted text-muted-foreground',
  };
  return (
    <Card>
      <CardContent className="p-4">
        <div className="flex items-center justify-between mb-2">
          <p className="text-xs text-muted-foreground">{label}</p>
          <div className={`p-1.5 rounded-lg ${tones[tone]}`}><Icon size={14} /></div>
        </div>
        <p className="text-xl font-bold text-foreground">{value}{suffix}</p>
      </CardContent>
    </Card>
  );
};

const StatPill = ({ label, value }: { label: string; value: string }) => (
  <Card><CardContent className="p-3">
    <p className="text-xs text-muted-foreground">{label}</p>
    <p className="text-base font-semibold text-foreground">{value}</p>
  </CardContent></Card>
);

const Timeline = ({ tenancies }: { tenancies: Tenancy[] }) => {
  const today = new Date();
  const days = 90;
  const colWidth = 8;

  if (tenancies.length === 0) {
    return <p className="text-sm text-muted-foreground text-center py-6">No tenancies to display.</p>;
  }

  return (
    <div className="overflow-x-auto">
      <div style={{ minWidth: `${200 + days * colWidth}px` }}>
        <div className="flex border-b border-border pb-2 mb-2 sticky top-0 bg-card">
          <div className="w-[200px] shrink-0 text-xs font-semibold text-muted-foreground">Property</div>
          <div className="relative flex-1" style={{ height: '20px' }}>
            {[0, 30, 60, 90].map(d => (
              <div key={d} className="absolute text-[10px] text-muted-foreground" style={{ left: `${d * colWidth}px` }}>
                +{d}d
              </div>
            ))}
          </div>
        </div>
        {tenancies.slice(0, 25).map(t => {
          const leaseEnd = t.lease_end ? new Date(t.lease_end) : null;
          const leaseEndDay = leaseEnd ? differenceInDays(leaseEnd, today) : null;
          const isVacant = t.status === 'ended' && !t.re_let_date;

          let segments: { start: number; end: number; color: string }[] = [];
          if (isVacant) {
            segments = [{ start: 0, end: days, color: 'bg-red-500/70' }];
          } else if (t.status === 'vacating') {
            const cut = leaseEndDay != null ? Math.min(Math.max(leaseEndDay, 0), days) : days;
            segments = [
              { start: 0, end: cut, color: 'bg-amber-500/70' },
              { start: cut, end: days, color: 'bg-red-500/40' },
            ];
          } else if (t.status === 'active') {
            const cut = leaseEndDay != null && leaseEndDay >= 0 ? Math.min(leaseEndDay, days) : days;
            segments = [{ start: 0, end: cut, color: 'bg-emerald-500/70' }];
            if (cut < days) segments.push({ start: cut, end: days, color: 'bg-red-500/30' });
          } else if (t.status === 'pending') {
            segments = [{ start: 0, end: days, color: 'bg-blue-500/60' }];
          }

          return (
            <div key={t.id} className="flex items-center py-1.5 border-b border-border/50 last:border-0">
              <div className="w-[200px] shrink-0 pr-2 text-xs truncate">
                {t.property?.address || 'Unknown'}
              </div>
              <div className="relative" style={{ height: '20px', width: `${days * colWidth}px` }}>
                <div className="absolute top-0 bottom-0 w-px bg-foreground/40 z-10" style={{ left: '0px' }} />
                {segments.map((s, i) => (
                  <div key={i}
                    className={`absolute top-1 bottom-1 ${s.color} rounded-sm`}
                    style={{ left: `${s.start * colWidth}px`, width: `${(s.end - s.start) * colWidth}px` }}
                  />
                ))}
                {leaseEndDay != null && leaseEndDay >= 0 && leaseEndDay <= days && (
                  <Flag size={10} className="absolute top-0.5 text-foreground" style={{ left: `${leaseEndDay * colWidth - 4}px` }} />
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
