import { useState, useEffect, useCallback, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Plus, Home, Loader2, AlertTriangle, CheckCircle2, Clock } from 'lucide-react';
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
import { toast } from 'sonner';
import DashboardHeader from './DashboardHeader';
import { addDays, differenceInDays, format, parseISO } from 'date-fns';

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
  properties: { address: string; suburb: string } | null;
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

const RentRollPage = () => {
  const { user } = useAuth();
  const navigate = useNavigate();

  const [agentId, setAgentId] = useState<string | null>(null);
  const [tenancies, setTenancies] = useState<Tenancy[]>([]);
  const [payments, setPayments] = useState<RentPayment[]>([]);
  const [properties, setProperties] = useState<PropertyOption[]>([]);
  const [loading, setLoading] = useState(true);
  const [noAgent, setNoAgent] = useState(false);
  const [showAddModal, setShowAddModal] = useState(false);
  const [saving, setSaving] = useState(false);
  const [step, setStep] = useState(1);

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
        .select('*, properties(address, suburb)')
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

  const getNextDue = (t: Tenancy) => {
    const latest = latestPaymentMap.get(t.id);
    if (!latest) return format(parseISO(t.lease_start), 'dd MMM yyyy');
    return format(addDays(parseISO(latest.period_to), frequencyDays(t.rent_frequency)), 'dd MMM yyyy');
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
                            <TableRow key={t.id} className="hover:bg-accent/50">
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
                                  {expiringSoon && t.tenant_email && (
                                    <Button
                                      variant="outline"
                                      size="sm"
                                      className="text-[10px] h-7"
                                      onClick={async (e) => {
                                        e.stopPropagation();
                                        const addr = t.properties?.address || 'your property';
                                        try {
                                          const { data: agent } = await supabase.from('agents').select('id').eq('user_id', user?.id || '').maybeSingle();
                                          if (!agent) return;
                                          await supabase.functions.invoke('send-notification-email', {
                                            body: {
                                              agent_id: agent.id,
                                              type: 'lease_expiry',
                                              title: `Lease expiry reminder — ${addr}`,
                                              message: `Hi ${t.tenant_name}, this is a reminder that your lease for ${addr} expires on ${format(leaseEnd, 'dd MMM yyyy')} (${daysToEnd} days from now). Please contact us to discuss your renewal options.`,
                                              recipient_email: t.tenant_email,
                                              lead_name: t.tenant_name,
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
                                          const { data: agent } = await supabase.from('agents').select('id').eq('user_id', user?.id || '').maybeSingle();
                                          if (!agent) return;
                                          await supabase.functions.invoke('send-notification-email', {
                                            body: {
                                              agent_id: agent.id,
                                              type: 'arrears_reminder',
                                              title: `Rent arrears notice — ${addr}`,
                                              message: `Hi ${t.tenant_name}, our records show your rent is ${arrears.days} days overdue with an outstanding balance of approximately $${arrears.owed.toFixed(0)}. Please arrange payment immediately or contact us to discuss. If you believe this is an error, please disregard this message.`,
                                              recipient_email: t.tenant_email,
                                              lead_name: t.tenant_name,
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
                                  )
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
    </div>
  );
};

export default RentRollPage;
