import { useEffect, useMemo, useState } from 'react';
import { format } from 'date-fns';
import { CalendarIcon, Copy, FileText } from 'lucide-react';
import { toast } from 'sonner';
import DashboardHeader from './DashboardHeader';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from '@/components/ui/dialog';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Calendar } from '@/components/ui/calendar';
import {
  Tooltip, TooltipContent, TooltipProvider, TooltipTrigger,
} from '@/components/ui/tooltip';
import { cn } from '@/lib/utils';
import { supabase } from '@/integrations/supabase/client';
import { useCurrentAgent } from '@/features/agents/hooks/useCurrentAgent';

type IncreaseStatus = 'scheduled' | 'notice_sent' | 'active' | 'cancelled';

interface RentIncrease {
  id: string;
  tenancy_id: string;
  old_amount: number;
  new_amount: number;
  rent_frequency: string;
  effective_date: string;
  notice_sent_date: string | null;
  status: IncreaseStatus;
  notes: string | null;
  created_at: string;
}

interface PropertyRef {
  address?: string | null;
  suburb?: string | null;
  state?: string | null;
}

interface TenancyRow {
  id: string;
  tenant_name: string | null;
  tenant_email: string | null;
  rent_amount: number | null;
  rent_frequency: string | null;
  lease_start: string | null;
  lease_end: string | null;
  agent_id: string | null;
  properties?: PropertyRef | null;
}

interface RowItem extends TenancyRow {
  lastIncrease: RentIncrease | null;
  lastIncreaseDate: Date | null;
  monthsSinceIncrease: number;
  noticeDays: number;
  intervalMonths: number;
  eligibleFrom: Date;
  isEligible: boolean;
  earliestEffectiveDate: Date;
  state: string;
  actName: string;
}

const STATE_RULES: Record<string, { noticeDays: number; intervalMonths: number; act: string }> = {
  VIC: { noticeDays: 60, intervalMonths: 12, act: 'Residential Tenancies Act 1997 (Vic)' },
  NSW: { noticeDays: 60, intervalMonths: 12, act: 'Residential Tenancies Act 2010 (NSW)' },
  QLD: { noticeDays: 60, intervalMonths: 12, act: 'Residential Tenancies and Rooming Accommodation Act 2008 (Qld)' },
  WA: { noticeDays: 60, intervalMonths: 12, act: 'Residential Tenancies Act 1987 (WA)' },
  SA: { noticeDays: 60, intervalMonths: 12, act: 'Residential Tenancies Act 1995 (SA)' },
  ACT: { noticeDays: 56, intervalMonths: 12, act: 'Residential Tenancies Act 1997 (ACT)' },
  TAS: { noticeDays: 60, intervalMonths: 12, act: 'Residential Tenancy Act 1997 (Tas)' },
  NT: { noticeDays: 30, intervalMonths: 6, act: 'Residential Tenancies Act 1999 (NT)' },
};
const DEFAULT_RULE = { noticeDays: 60, intervalMonths: 12, act: 'Residential Tenancies Act' };

const STATUS_META: Record<IncreaseStatus | 'none', { label: string; className: string }> = {
  none: { label: 'No increases', className: 'bg-muted text-muted-foreground' },
  scheduled: { label: 'Scheduled', className: 'bg-blue-500/15 text-blue-700 border-blue-500/30' },
  notice_sent: { label: 'Notice sent', className: 'bg-amber-500/15 text-amber-700 border-amber-500/30' },
  active: { label: 'Active', className: 'bg-emerald-500/15 text-emerald-700 border-emerald-500/30' },
  cancelled: { label: 'Cancelled', className: 'bg-muted text-muted-foreground' },
};

const fmtMoney = (n: number) => `$${Math.round(n).toLocaleString()}`;
const addDays = (d: Date, days: number) => { const r = new Date(d); r.setDate(r.getDate() + days); return r; };
const addMonths = (d: Date, m: number) => { const r = new Date(d); r.setMonth(r.getMonth() + m); return r; };
const monthsBetween = (a: Date, b: Date) => Math.floor((b.getTime() - a.getTime()) / (30.44 * 86400000));
const fmtDate = (d: Date | string | null | undefined) => {
  if (!d) return '—';
  const dt = typeof d === 'string' ? new Date(d) : d;
  return dt.toLocaleDateString('en-AU', { day: 'numeric', month: 'short', year: 'numeric' });
};

const RentIncreasePage = () => {
  const { agent } = useCurrentAgent();
  const [loading, setLoading] = useState(true);
  const [rows, setRows] = useState<RowItem[]>([]);
  const [filter, setFilter] = useState<'all' | 'eligible' | 'scheduled' | 'increased_year'>('all');
  const [agentName, setAgentName] = useState('');
  const [agencyName, setAgencyName] = useState('');

  // Schedule modal
  const [scheduleFor, setScheduleFor] = useState<RowItem | null>(null);
  const [newRent, setNewRent] = useState<string>('');
  const [effectiveDate, setEffectiveDate] = useState<Date | undefined>();
  const [scheduleNotes, setScheduleNotes] = useState('');
  const [saving, setSaving] = useState(false);

  // Notice modal
  const [noticeFor, setNoticeFor] = useState<{ row: RowItem; increase: RentIncrease; toLine: string } | null>(null);

  const loadData = async () => {
    if (!agent?.id) return;
    setLoading(true);
    setAgentName(agent.name || '');
    setAgencyName((agent as any).agency_name || (agent as any).agency || '');

    const { data: tenancies, error } = await supabase
      .from('tenancies')
      .select(`
        id, tenant_name, tenant_email, rent_amount, rent_frequency, lease_start, lease_end, agent_id,
        properties:property_id ( address, suburb, state )
      `)
      .eq('agent_id', agent.id)
      .eq('status', 'active');

    if (error) {
      console.error('Failed to load tenancies', error);
      setLoading(false);
      return;
    }

    const tRows = (tenancies || []) as unknown as TenancyRow[];
    if (tRows.length === 0) {
      setRows([]);
      setLoading(false);
      return;
    }

    const { data: increases } = await supabase
      .from('rent_increases' as any)
      .select('*')
      .in('tenancy_id', tRows.map(t => t.id))
      .order('effective_date', { ascending: false });

    const incList = (increases || []) as unknown as RentIncrease[];
    const today = new Date();

    const items: RowItem[] = tRows.map(t => {
      const last = incList.find(i => i.tenancy_id === t.id) || null;
      const state = (t.properties?.state || '').toUpperCase();
      const rule = STATE_RULES[state] || DEFAULT_RULE;
      const lastDate = last ? new Date(last.effective_date) : null;
      const baseDate = lastDate || (t.lease_start ? new Date(t.lease_start) : today);
      const eligibleFrom = addMonths(baseDate, rule.intervalMonths);
      const isEligible = today >= eligibleFrom;
      const earliestEffectiveDate = addDays(today, rule.noticeDays);
      return {
        ...t,
        lastIncrease: last,
        lastIncreaseDate: lastDate,
        monthsSinceIncrease: monthsBetween(baseDate, today),
        noticeDays: rule.noticeDays,
        intervalMonths: rule.intervalMonths,
        eligibleFrom,
        isEligible,
        earliestEffectiveDate,
        state,
        actName: rule.act,
      };
    });

    setRows(items);
    setLoading(false);
  };

  useEffect(() => { loadData(); /* eslint-disable-next-line */ }, [agent?.id]);

  const filteredRows = useMemo(() => {
    if (filter === 'eligible') return rows.filter(r => r.isEligible);
    if (filter === 'scheduled') return rows.filter(r => r.lastIncrease?.status === 'scheduled');
    if (filter === 'increased_year') {
      const yearAgo = addMonths(new Date(), -12);
      return rows.filter(r => r.lastIncreaseDate && r.lastIncreaseDate >= yearAgo);
    }
    return rows;
  }, [rows, filter]);

  const summary = useMemo(() => ({
    total: rows.length,
    eligible: rows.filter(r => r.isEligible).length,
    scheduled: rows.filter(r => r.lastIncrease?.status === 'scheduled').length,
  }), [rows]);

  const openSchedule = (row: RowItem) => {
    setScheduleFor(row);
    setNewRent(String(row.rent_amount || ''));
    setEffectiveDate(addDays(new Date(), row.noticeDays + 7));
    setScheduleNotes('');
  };

  const submitSchedule = async () => {
    if (!scheduleFor || !effectiveDate || !newRent) return;
    setSaving(true);
    const { error } = await supabase.from('rent_increases' as any).insert({
      tenancy_id: scheduleFor.id,
      old_amount: Number(scheduleFor.rent_amount || 0),
      new_amount: Number(newRent),
      rent_frequency: scheduleFor.rent_frequency || 'weekly',
      effective_date: format(effectiveDate, 'yyyy-MM-dd'),
      status: 'scheduled',
      notes: scheduleNotes || null,
    });
    setSaving(false);
    if (error) {
      toast.error('Could not schedule increase');
      return;
    }
    toast.success('Increase scheduled');
    setScheduleFor(null);
    loadData();
  };

  const openNotice = async (row: RowItem, increase: RentIncrease) => {
    const { data: contacts } = await supabase
      .from('tenancy_contacts' as any)
      .select('name, contact_type')
      .eq('tenancy_id', row.id)
      .in('contact_type', ['primary_tenant', 'co_tenant']);
    const names: string[] = [];
    const primary = (contacts as any[] | null)?.find(c => c.contact_type === 'primary_tenant')?.name;
    if (primary) names.push(primary);
    else if (row.tenant_name) names.push(row.tenant_name);
    (contacts as any[] | null)?.filter(c => c.contact_type === 'co_tenant').forEach(c => names.push(c.name));
    const toLine = names.length > 0 ? names.join(' & ') : 'Tenant';
    setNoticeFor({ row, increase, toLine });
  };

  const buildNoticeText = (row: RowItem, inc: RentIncrease, toLine?: string) => {
    const propLine = [row.properties?.address, row.properties?.suburb, row.properties?.state].filter(Boolean).join(', ');
    return `Notice of Rent Increase

${row.actName}

Date: ${fmtDate(new Date())}

To: ${toLine || row.tenant_name || 'Tenant'}
Property: ${propLine || '—'}

This is to advise that your rent will increase as follows:

Current rent: ${fmtMoney(inc.old_amount)} per ${inc.rent_frequency}
New rent: ${fmtMoney(inc.new_amount)} per ${inc.rent_frequency}
Effective date: ${fmtDate(inc.effective_date)}

This notice is provided ${row.noticeDays} days in advance as required under ${row.actName}.

If you have any questions, please contact your property manager.

Regards,

${agentName || 'Property Manager'}
${agencyName || ''}`.trim();
  };

  const copyNotice = async () => {
    if (!noticeFor) return;
    try {
      await navigator.clipboard.writeText(buildNoticeText(noticeFor.row, noticeFor.increase, noticeFor.toLine));
      toast.success('Copied');
    } catch {
      toast.error('Could not copy');
    }
  };

  const markNoticeSent = async () => {
    if (!noticeFor) return;
    const today = format(new Date(), 'yyyy-MM-dd');
    const { error } = await supabase
      .from('rent_increases' as any)
      .update({ status: 'notice_sent', notice_sent_date: today })
      .eq('id', noticeFor.increase.id);
    if (error) {
      toast.error('Could not update notice');
      return;
    }
    toast.success('Notice marked as sent');
    setNoticeFor(null);
    loadData();
  };

  // Eligible-from cell rendering
  const renderEligibleFrom = (row: RowItem) => {
    if (row.isEligible) {
      return <Badge variant="outline" className="bg-emerald-500/15 text-emerald-700 border-emerald-500/30">Eligible now</Badge>;
    }
    const daysAway = Math.floor((row.eligibleFrom.getTime() - Date.now()) / 86400000);
    if (daysAway <= 30) {
      return <Badge variant="outline" className="bg-amber-500/15 text-amber-700 border-amber-500/30">Eligible {fmtDate(row.eligibleFrom)}</Badge>;
    }
    return <span className="text-muted-foreground text-sm">{fmtDate(row.eligibleFrom)}</span>;
  };

  // Schedule modal computed values
  const scheduleComputed = useMemo(() => {
    if (!scheduleFor || !effectiveDate || !newRent) return null;
    const oldAmt = Number(scheduleFor.rent_amount || 0);
    const newAmt = Number(newRent);
    const pctChange = oldAmt > 0 ? ((newAmt - oldAmt) / oldAmt) * 100 : 0;
    const noticeBy = addDays(effectiveDate, -scheduleFor.noticeDays);
    return {
      oldAmt, newAmt, pctChange, noticeBy,
      freq: scheduleFor.rent_frequency || 'weekly',
    };
  }, [scheduleFor, effectiveDate, newRent]);

  const minEffectiveDate = scheduleFor ? scheduleFor.earliestEffectiveDate : new Date();

  return (
    <div className="p-4 md:p-6 space-y-6">
      <DashboardHeader title="Rent Increases" subtitle="Manage rent reviews across your portfolio" />

      <Tabs value={filter} onValueChange={(v) => setFilter(v as any)}>
        <TabsList>
          <TabsTrigger value="all">All</TabsTrigger>
          <TabsTrigger value="eligible">Eligible Now</TabsTrigger>
          <TabsTrigger value="scheduled">Increase Scheduled</TabsTrigger>
          <TabsTrigger value="increased_year">Increased This Year</TabsTrigger>
        </TabsList>
      </Tabs>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <Card className="p-4">
          <div className="text-xs text-muted-foreground">Total Properties</div>
          <div className="text-2xl font-bold mt-1">{summary.total}</div>
        </Card>
        <Card className="p-4">
          <div className="text-xs text-muted-foreground">Eligible for Review</div>
          <div className="text-2xl font-bold mt-1 text-emerald-700">{summary.eligible}</div>
        </Card>
        <Card className="p-4">
          <div className="text-xs text-muted-foreground">Increases Scheduled</div>
          <div className="text-2xl font-bold mt-1 text-blue-700">{summary.scheduled}</div>
        </Card>
      </div>

      <Card className="overflow-hidden">
        {loading ? (
          <div className="p-10 text-center text-sm text-muted-foreground">Loading…</div>
        ) : filteredRows.length === 0 ? (
          <div className="p-10 text-center text-sm text-muted-foreground">No tenancies match this filter.</div>
        ) : (
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Tenant &amp; Property</TableHead>
                  <TableHead>Current Rent</TableHead>
                  <TableHead>Last Increase</TableHead>
                  <TableHead>Eligible From</TableHead>
                  <TableHead>Notice Required</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Action</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredRows.map(row => {
                  const status = (row.lastIncrease?.status || 'none') as IncreaseStatus | 'none';
                  const meta = STATUS_META[status];
                  const propLine = [row.properties?.address, row.properties?.suburb].filter(Boolean).join(', ');
                  return (
                    <TableRow key={row.id}>
                      <TableCell>
                        <div className="font-medium">{row.tenant_name || '—'}</div>
                        <div className="text-xs text-muted-foreground">{propLine || '—'}</div>
                      </TableCell>
                      <TableCell>
                        <div className="font-medium">{fmtMoney(Number(row.rent_amount || 0))}</div>
                        <div className="text-xs text-muted-foreground">per {row.rent_frequency || 'week'}</div>
                      </TableCell>
                      <TableCell className="text-sm">
                        {row.lastIncreaseDate ? fmtDate(row.lastIncreaseDate) : <span className="text-muted-foreground">—</span>}
                      </TableCell>
                      <TableCell>{renderEligibleFrom(row)}</TableCell>
                      <TableCell className="text-sm text-muted-foreground">{row.noticeDays} days</TableCell>
                      <TableCell>
                        <Badge variant="outline" className={meta.className}>{meta.label}</Badge>
                      </TableCell>
                      <TableCell className="text-right">
                        {row.lastIncrease?.status === 'scheduled' ? (
                          <Button size="sm" variant="outline" onClick={() => openNotice(row, row.lastIncrease!)} className="gap-1">
                            <FileText size={14} /> View Notice
                          </Button>
                        ) : row.isEligible ? (
                          <Button size="sm" onClick={() => openSchedule(row)}>Schedule Increase</Button>
                        ) : (
                          <TooltipProvider>
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <span className="inline-block">
                                  <Button size="sm" disabled>Schedule Increase</Button>
                                </span>
                              </TooltipTrigger>
                              <TooltipContent>Eligible from {fmtDate(row.eligibleFrom)}</TooltipContent>
                            </Tooltip>
                          </TooltipProvider>
                        )}
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </div>
        )}
      </Card>

      {/* Schedule Increase Modal */}
      <Dialog open={!!scheduleFor} onOpenChange={(o) => !o && setScheduleFor(null)}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Schedule Rent Increase — {scheduleFor?.properties?.address || ''}</DialogTitle>
          </DialogHeader>
          {scheduleFor && (
            <div className="space-y-4">
              <div>
                <label className="text-sm font-medium">New Rent</label>
                <Input
                  type="number"
                  value={newRent}
                  onChange={(e) => setNewRent(e.target.value)}
                  placeholder="e.g. 650"
                />
                <div className="text-xs text-muted-foreground mt-1">
                  Current: {fmtMoney(Number(scheduleFor.rent_amount || 0))} per {scheduleFor.rent_frequency || 'week'}
                </div>
              </div>

              <div>
                <label className="text-sm font-medium">Effective Date</label>
                <Popover>
                  <PopoverTrigger asChild>
                    <Button variant="outline" className={cn('w-full justify-start text-left font-normal', !effectiveDate && 'text-muted-foreground')}>
                      <CalendarIcon className="mr-2 h-4 w-4" />
                      {effectiveDate ? format(effectiveDate, 'PPP') : 'Pick a date'}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0" align="start">
                    <Calendar
                      mode="single"
                      selected={effectiveDate}
                      onSelect={setEffectiveDate}
                      disabled={(d) => d < minEffectiveDate}
                      initialFocus
                      className={cn('p-3 pointer-events-auto')}
                    />
                  </PopoverContent>
                </Popover>
                <div className="text-xs text-muted-foreground mt-1">
                  Earliest possible: {fmtDate(minEffectiveDate)}
                </div>
              </div>

              <div>
                <label className="text-sm font-medium">Notes (optional)</label>
                <Textarea value={scheduleNotes} onChange={(e) => setScheduleNotes(e.target.value)} rows={2} />
              </div>

              {scheduleComputed && (
                <div className="rounded-md border bg-muted/40 p-3 text-sm space-y-1">
                  <div>
                    <span className="font-medium">Increase:</span>{' '}
                    {fmtMoney(scheduleComputed.oldAmt)} → {fmtMoney(scheduleComputed.newAmt)} per {scheduleComputed.freq}{' '}
                    <span className={cn('font-medium', scheduleComputed.pctChange >= 0 ? 'text-emerald-700' : 'text-red-700')}>
                      ({scheduleComputed.pctChange >= 0 ? '+' : ''}{scheduleComputed.pctChange.toFixed(1)}%)
                    </span>
                  </div>
                  <div className="text-muted-foreground">
                    Notice must be sent by: <span className="font-medium text-foreground">{fmtDate(scheduleComputed.noticeBy)}</span> to meet the {scheduleFor.noticeDays}-day requirement
                  </div>
                  <div className="text-muted-foreground">
                    State: <span className="font-medium text-foreground">{scheduleFor.state || '—'}</span> — {scheduleFor.noticeDays} days notice required under {scheduleFor.actName}
                  </div>
                </div>
              )}
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setScheduleFor(null)}>Cancel</Button>
            <Button onClick={submitSchedule} disabled={saving || !newRent || !effectiveDate}>
              {saving ? 'Saving…' : 'Schedule Increase'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Notice Letter Modal */}
      <Dialog open={!!noticeFor} onOpenChange={(o) => !o && setNoticeFor(null)}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Notice of Rent Increase</DialogTitle>
            {noticeFor && (
              <div className="text-xs text-muted-foreground">
                {noticeFor.row.actName} · {noticeFor.row.noticeDays} days notice
              </div>
            )}
          </DialogHeader>
          {noticeFor && (
            <Textarea
              readOnly
              value={buildNoticeText(noticeFor.row, noticeFor.increase)}
              rows={20}
              className="font-mono text-xs"
            />
          )}
          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={copyNotice} className="gap-1">
              <Copy size={14} /> Copy Notice
            </Button>
            <Button onClick={markNoticeSent}>Mark Notice Sent</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default RentIncreasePage;
