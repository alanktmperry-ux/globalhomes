import { useState, useEffect, useCallback } from 'react';
import { usePartner } from './PartnerDashboardLayout';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/features/auth/AuthProvider';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Home, Building2, CheckCircle2, AlertTriangle, Clock, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import { format, parseISO, differenceInDays, addDays } from 'date-fns';

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
  status: string;
  properties: { address: string; suburb: string } | null;
}

interface RentPayment {
  tenancy_id: string;
  amount: number;
  period_to: string;
  status: string;
}

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

const PartnerRentRollPage = () => {
  const { activeAgency } = usePartner();
  const { user } = useAuth();
  const [tenancies, setTenancies] = useState<Tenancy[]>([]);
  const [payments, setPayments] = useState<RentPayment[]>([]);
  const [loading, setLoading] = useState(true);

  // Payment modal
  const [payTenancy, setPayTenancy] = useState<Tenancy | null>(null);
  const [payAmount, setPayAmount] = useState('');
  const [payDate, setPayDate] = useState(new Date().toISOString().split('T')[0]);
  const [payMethod, setPayMethod] = useState('bank_transfer');
  const [payNotes, setPayNotes] = useState('');
  const [saving, setSaving] = useState(false);

  const fetchData = useCallback(async () => {
    if (!activeAgency?.agentId) return;
    setLoading(true);

    const { data: t } = await supabase
      .from('tenancies')
      .select('*, properties(address, suburb)')
      .eq('agent_id', activeAgency.agentId)
      .eq('status', 'active')
      .order('lease_end', { ascending: true });

    const tenancyData = (t || []) as unknown as Tenancy[];
    setTenancies(tenancyData);

    if (tenancyData.length > 0) {
      const { data: p } = await supabase
        .from('rent_payments')
        .select('tenancy_id, amount, period_to, status')
        .in('tenancy_id', tenancyData.map(x => x.id))
        .order('period_to', { ascending: false });
      setPayments((p || []) as unknown as RentPayment[]);
    } else {
      setPayments([]);
    }
    setLoading(false);
  }, [activeAgency?.agentId]);

  useEffect(() => { fetchData(); }, [fetchData]);

  if (!activeAgency) {
    return (
      <div className="p-8 text-center text-muted-foreground">
        <Home size={32} className="mx-auto mb-3 opacity-30" />
        <p className="text-sm">Select a client agency from the sidebar to view their rent roll.</p>
      </div>
    );
  }

  const today = new Date();
  const totalWeeklyRent = tenancies.reduce((s, t) => s + toWeekly(t.rent_amount, t.rent_frequency), 0);

  const latestPaymentMap = new Map<string, RentPayment>();
  for (const p of payments) {
    if (!latestPaymentMap.has(p.tenancy_id)) latestPaymentMap.set(p.tenancy_id, p);
  }

  const getArrearsInfo = (t: Tenancy) => {
    const hasOverdue = payments.some(p => p.tenancy_id === t.id && p.status === 'overdue');
    const latest = latestPaymentMap.get(t.id);
    const periodEnd = latest ? new Date(latest.period_to) : null;
    const daysBehind = periodEnd ? differenceInDays(today, periodEnd) : 0;
    if (!hasOverdue && daysBehind <= 0) return { label: 'Current', days: 0 };
    if (daysBehind <= 7) return { label: '1–7 days', days: daysBehind };
    const weeklyRent = toWeekly(t.rent_amount, t.rent_frequency);
    const weeksOwed = Math.ceil(daysBehind / 7);
    return { label: `8+ days ($${(weeklyRent * weeksOwed).toFixed(0)})`, days: daysBehind };
  };

  const getNextDue = (t: Tenancy) => {
    const latest = latestPaymentMap.get(t.id);
    if (!latest) return format(parseISO(t.lease_start), 'dd MMM yyyy');
    return format(addDays(parseISO(latest.period_to), frequencyDays(t.rent_frequency)), 'dd MMM yyyy');
  };

  const overdueCount = tenancies.filter(t => getArrearsInfo(t).days > 0).length;

  const openPayment = (t: Tenancy) => {
    setPayTenancy(t);
    setPayAmount(String(t.rent_amount));
    setPayDate(new Date().toISOString().split('T')[0]);
    setPayMethod('bank_transfer');
    setPayNotes('');
  };

  const handleRecordPayment = async () => {
    if (!payTenancy || !activeAgency || !user) return;
    const amount = parseFloat(payAmount);
    if (isNaN(amount) || amount <= 0) { toast.error('Invalid amount'); return; }
    setSaving(true);

    const latest = latestPaymentMap.get(payTenancy.id);
    const periodFrom = latest ? addDays(parseISO(latest.period_to), 1).toISOString().split('T')[0] : payTenancy.lease_start;
    const periodTo = addDays(new Date(periodFrom), frequencyDays(payTenancy.rent_frequency) - 1).toISOString().split('T')[0];

    const { error } = await supabase.from('rent_payments').insert({
      tenancy_id: payTenancy.id,
      agent_id: activeAgency.agentId,
      amount,
      payment_date: payDate,
      period_from: periodFrom,
      period_to: periodTo,
      payment_method: payMethod,
      status: 'paid',
      notes: payNotes || null,
    } as any);

    if (error) {
      toast.error(error.message);
    } else {
      // Log activity
      const { data: membership } = await supabase.from('partner_members').select('partner_id').eq('user_id', user.id).maybeSingle();
      if (membership) {
        await supabase.from('partner_activity_log' as any).insert({
          partner_id: (membership as any).partner_id,
          agency_id: activeAgency.id,
          action_type: 'rent_payment_recorded',
          entity_type: 'rent_payments',
          description: `Recorded rent payment for ${payTenancy.tenant_name} — ${payTenancy.properties?.address || ''}`,
        });
      }
      toast.success('Payment recorded');
      setPayTenancy(null);
      fetchData();
    }
    setSaving(false);
  };

  const stats = [
    { label: 'Total Tenancies', value: tenancies.length, icon: Home },
    { label: 'Total Weekly Rent', value: `$${totalWeeklyRent.toFixed(0)}`, icon: CheckCircle2 },
    { label: 'In Arrears', value: overdueCount, icon: AlertTriangle },
  ];

  return (
    <div className="flex-1">
      <div className="px-6 pt-4 pb-2">
        <p className="text-xs text-muted-foreground flex items-center gap-1.5">
          <Building2 size={12} />
          Viewing: <span className="font-medium text-foreground">{activeAgency.name}</span>
        </p>
      </div>

      <div className="p-6 space-y-6">
        <h1 className="text-xl font-bold text-foreground">Rent Roll</h1>

        {loading ? (
          <div className="grid grid-cols-3 gap-4">
            {[1,2,3].map(i => <Skeleton key={i} className="h-24 rounded-lg" />)}
          </div>
        ) : (
          <>
            <div className="grid grid-cols-3 gap-4">
              {stats.map(s => (
                <Card key={s.label}>
                  <CardContent className="p-4 flex items-center gap-3">
                    <div className="p-2 rounded-lg bg-primary/10"><s.icon size={18} className="text-primary" /></div>
                    <div>
                      <p className="text-xs text-muted-foreground">{s.label}</p>
                      <p className="text-lg font-semibold text-foreground">{s.value}</p>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>

            <Card>
              <CardContent className="p-0">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Property</TableHead>
                      <TableHead>Tenant</TableHead>
                      <TableHead className="text-right">Weekly Rent</TableHead>
                      <TableHead>Next Due</TableHead>
                      <TableHead>Arrears</TableHead>
                      <TableHead>Lease End</TableHead>
                      <TableHead className="w-28"></TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {tenancies.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={7} className="text-center py-8 text-muted-foreground text-sm">
                          No active tenancies for this agency.
                        </TableCell>
                      </TableRow>
                    ) : (
                      tenancies.map(t => {
                        const arrears = getArrearsInfo(t);
                        return (
                          <TableRow key={t.id}>
                            <TableCell className="font-medium">
                              {t.properties?.address || '—'}
                              <span className="block text-xs text-muted-foreground">{t.properties?.suburb}</span>
                            </TableCell>
                            <TableCell>{t.tenant_name}</TableCell>
                            <TableCell className="text-right tabular-nums">${toWeekly(t.rent_amount, t.rent_frequency).toFixed(0)}</TableCell>
                            <TableCell className="text-sm">{getNextDue(t)}</TableCell>
                            <TableCell>
                              <Badge
                                variant={arrears.days === 0 ? 'default' : arrears.days <= 7 ? 'secondary' : 'destructive'}
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
                            <TableCell className="text-sm">{format(parseISO(t.lease_end), 'dd MMM yyyy')}</TableCell>
                            <TableCell>
                              <Button variant="outline" size="sm" onClick={() => openPayment(t)}>Record payment</Button>
                            </TableCell>
                          </TableRow>
                        );
                      })
                    )}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          </>
        )}
      </div>

      {/* Record Payment Dialog */}
      <Dialog open={!!payTenancy} onOpenChange={(o) => { if (!o) setPayTenancy(null); }}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Record Rent Payment</DialogTitle>
          </DialogHeader>
          {payTenancy && (
            <div className="space-y-3">
              <p className="text-sm text-muted-foreground">{payTenancy.tenant_name} — {payTenancy.properties?.address}</p>
              <div>
                <Label className="text-xs">Amount</Label>
                <Input type="number" step="0.01" value={payAmount} onChange={e => setPayAmount(e.target.value)} />
              </div>
              <div>
                <Label className="text-xs">Payment Date</Label>
                <Input type="date" value={payDate} onChange={e => setPayDate(e.target.value)} />
              </div>
              <div>
                <Label className="text-xs">Payment Method</Label>
                <Select value={payMethod} onValueChange={setPayMethod}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="bank_transfer">Bank Transfer</SelectItem>
                    <SelectItem value="cash">Cash</SelectItem>
                    <SelectItem value="cheque">Cheque</SelectItem>
                    <SelectItem value="bpay">BPAY</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label className="text-xs">Notes</Label>
                <Textarea value={payNotes} onChange={e => setPayNotes(e.target.value)} rows={2} />
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setPayTenancy(null)}>Cancel</Button>
            <Button onClick={handleRecordPayment} disabled={saving}>
              {saving ? <><Loader2 className="animate-spin mr-1" size={14} /> Saving…</> : 'Record Payment'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default PartnerRentRollPage;
