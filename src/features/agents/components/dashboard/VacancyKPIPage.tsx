import { useEffect, useState, useCallback, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/features/auth/AuthProvider';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Loader2, Home, AlertTriangle, Clock, TrendingDown, Activity, Flag, Plus } from 'lucide-react';
import { format, differenceInDays, addDays } from 'date-fns';

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

const weeklyRent = (t: Pick<Tenancy, 'rent_amount' | 'rent_frequency'>) => {
  const a = Number(t.rent_amount || 0);
  if (t.rent_frequency === 'fortnightly') return a / 2;
  if (t.rent_frequency === 'monthly') return (a * 12) / 52;
  return a;
};

const fmtAUD = (n: number) =>
  new Intl.NumberFormat('en-AU', { style: 'currency', currency: 'AUD', maximumFractionDigits: 0 }).format(n);

const VacancyKPIPage = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [agentId, setAgentId] = useState<string | null>(null);
  const [tenancies, setTenancies] = useState<Tenancy[]>([]);
  const [events, setEvents] = useState<VacancyEvent[]>([]);
  const [propertyMap, setPropertyMap] = useState<Record<string, string>>({});

  const fetchData = useCallback(async () => {
    if (!user) return;
    setLoading(true);
    const { data: agent } = await supabase.from('agents').select('id').eq('user_id', user.id).maybeSingle();
    if (!agent) { setLoading(false); return; }
    setAgentId(agent.id);

    const { data: ts } = await supabase
      .from('tenancies')
      .select('id, property_id, status, lease_start, lease_end, rent_amount, rent_frequency, tenant_name, actual_vacate_date, re_let_date, days_to_re_let, vacancy_loss_aud, properties:property_id(id, address, suburb, is_active)')
      .eq('agent_id', agent.id);

    const list: Tenancy[] = (ts || []).map((t: any) => ({
      ...t,
      property: t.properties,
    }));
    setTenancies(list);

    const map: Record<string, string> = {};
    list.forEach(t => { if (t.property) map[t.property_id] = `${t.property.address}, ${t.property.suburb}`; });
    setPropertyMap(map);

    const { data: ev } = await supabase
      .from('vacancy_events' as any)
      .select('id, event_type, event_date, notes, property_id')
      .eq('agent_id', agent.id)
      .order('event_date', { ascending: false })
      .limit(20);
    setEvents((ev as any) || []);

    setLoading(false);
  }, [user]);

  useEffect(() => { fetchData(); }, [fetchData]);

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

    // Add ongoing loss from currently vacant
    const ongoingLoss = vacant.reduce((s, t) => {
      const vacateDate = t.actual_vacate_date ? new Date(t.actual_vacate_date) :
        (t.lease_end ? new Date(t.lease_end) : today);
      const days = Math.max(0, differenceInDays(today, vacateDate));
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

  if (loading) {
    return (
      <div className="flex-1 flex items-center justify-center p-12">
        <Loader2 className="animate-spin text-muted-foreground" size={28} />
      </div>
    );
  }

  if (!agentId) {
    return <div className="p-8 text-muted-foreground">Agent profile not found.</div>;
  }

  return (
    <div className="flex-1 p-6 lg:p-10 max-w-7xl space-y-8">
      <div>
        <h1 className="font-display text-2xl font-bold text-foreground mb-1">Vacancy KPIs</h1>
        <p className="text-sm text-muted-foreground">Real-time vacancy performance across your portfolio.</p>
      </div>

      {/* KPI cards */}
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

      {/* Timeline */}
      <Card>
        <CardContent className="p-5">
          <h2 className="font-display text-lg font-bold text-foreground mb-4">Next 90 Days</h2>
          <Timeline tenancies={tenancies.filter(t => ['active','vacating','ended','pending'].includes(t.status))} />
        </CardContent>
      </Card>

      {/* Active vacancies */}
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
                    .map(t => {
                      const vacateDate = t.actual_vacate_date ? new Date(t.actual_vacate_date) :
                        (t.lease_end ? new Date(t.lease_end) : new Date());
                      const daysVacant = Math.max(0, differenceInDays(new Date(), vacateDate));
                      const wr = weeklyRent(t);
                      const lossToDate = (daysVacant * wr) / 7;
                      return { t, vacateDate, daysVacant, wr, lossToDate };
                    })
                    .sort((a, b) => b.daysVacant - a.daysVacant)
                    .map(({ t, vacateDate, daysVacant, wr, lossToDate }) => (
                      <TableRow key={t.id}>
                        <TableCell className="font-medium">{propertyMap[t.property_id] || '—'}</TableCell>
                        <TableCell><Badge variant="destructive">Vacant</Badge></TableCell>
                        <TableCell className="text-sm">{format(vacateDate, 'dd/MM/yyyy')}</TableCell>
                        <TableCell className={daysVacant > 14 ? 'text-red-600 font-semibold' : ''}>
                          {daysVacant}
                        </TableCell>
                        <TableCell className="text-red-600">{fmtAUD(wr)}</TableCell>
                        <TableCell className="text-red-600 font-medium">{fmtAUD(lossToDate)}</TableCell>
                        <TableCell>
                          <Badge variant={t.property?.is_active ? 'default' : 'outline'}>
                            {t.property?.is_active ? 'Yes' : 'No'}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          {t.property?.is_active ? (
                            <Button size="sm" variant="outline" onClick={() => navigate(`/dashboard/listings`)}>
                              View
                            </Button>
                          ) : (
                            <Button size="sm" onClick={() => navigate(`/dashboard/listings/new`, {
                              state: { type: 'rental', prefill_property_id: t.property_id },
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

      {/* Upcoming vacancies */}
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
                  {upcoming.map(t => {
                    const days = differenceInDays(new Date(t.lease_end!), new Date());
                    const tone = days < 30 ? 'text-red-600' : days < 60 ? 'text-amber-600' : 'text-emerald-600';
                    const firstName = (t.tenant_name || '—').split(' ')[0];
                    return (
                      <TableRow key={t.id}>
                        <TableCell className="font-medium">{propertyMap[t.property_id] || '—'}</TableCell>
                        <TableCell>{firstName}</TableCell>
                        <TableCell>{format(new Date(t.lease_end!), 'dd/MM/yyyy')}</TableCell>
                        <TableCell className={`${tone} font-semibold`}>{days} days</TableCell>
                        <TableCell>
                          <Badge variant={t.status === 'vacating' ? 'destructive' : 'secondary'}>
                            {t.status === 'vacating' ? 'Notice given' : 'Active'}
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

      {/* Re-let performance */}
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
                  {reletHistory.map(t => {
                    const days = t.days_to_re_let!;
                    const perf = days < 14 ? { label: 'Excellent', tone: 'bg-emerald-500/15 text-emerald-700' } :
                                 days <= 21 ? { label: 'Good', tone: 'bg-blue-500/15 text-blue-700' } :
                                 days <= 35 ? { label: 'Average', tone: 'bg-amber-500/15 text-amber-700' } :
                                              { label: 'Poor', tone: 'bg-red-500/15 text-red-700' };
                    return (
                      <TableRow key={t.id}>
                        <TableCell className="font-medium">{propertyMap[t.property_id] || '—'}</TableCell>
                        <TableCell>{t.actual_vacate_date ? format(new Date(t.actual_vacate_date), 'dd/MM/yyyy') : '—'}</TableCell>
                        <TableCell>{format(new Date(t.re_let_date!), 'dd/MM/yyyy')}</TableCell>
                        <TableCell>{days}</TableCell>
                        <TableCell>{fmtAUD(Number(t.vacancy_loss_aud || 0))}</TableCell>
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

      {/* Event log */}
      <section>
        <h2 className="font-display text-lg font-bold text-foreground mb-3">Vacancy Event Log</h2>
        <Card>
          <CardContent className="p-0">
            {events.length === 0 ? (
              <p className="p-6 text-sm text-muted-foreground text-center">No vacancy events recorded yet.</p>
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
    </div>
  );
};

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
  const colWidth = 8; // px per day

  if (tenancies.length === 0) {
    return <p className="text-sm text-muted-foreground text-center py-6">No tenancies to display.</p>;
  }

  return (
    <div className="overflow-x-auto">
      <div style={{ minWidth: `${200 + days * colWidth}px` }}>
        {/* Header */}
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
        {/* Rows */}
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
                {/* today line */}
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

export default VacancyKPIPage;
