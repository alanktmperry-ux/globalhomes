/**
 * AdminBrokers.tsx
 * Admin view to approve, deactivate, and manually add brokers in the partner network.
 */

import { useEffect, useState, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { toast } from 'sonner';
import {
  Loader2,
  Check,
  X,
  Plus,
  Mail,
  MapPin,
  Building2,
  CheckCircle2,
  Users,
} from 'lucide-react';

type Broker = Record<string, any>;

const STATE_OPTIONS = ['NSW', 'VIC', 'QLD', 'SA', 'WA', 'ACT', 'TAS', 'NT'];
const SPECIALTY_OPTIONS = [
  'Residential home loans',
  'Investment property',
  'Refinancing',
  'First home buyer',
  'Self-employed / low-doc',
  'Commercial',
  'Construction',
  'Foreign buyer / FIRB',
  'SMSF',
];
const LANGUAGE_OPTIONS = [
  'English', 'Mandarin', 'Cantonese', 'Vietnamese', 'Hindi',
  'Arabic', 'Korean', 'Japanese', 'Tamil', 'Punjabi', 'Bengali',
];

async function sendBrokerLoginLink(email: string) {
  const { error } = await supabase.auth.signInWithOtp({
    email: email.toLowerCase(),
    options: {
      emailRedirectTo: window.location.origin + '/broker/portal',
      shouldCreateUser: true,
    },
  });
  return error;
}

interface RevenueStats {
  totalSettled: number;
  totalReferralFees: number;
  totalPlatformFees: number;
  thisMonthSettled: number;
}

const AUD = (n: number) =>
  new Intl.NumberFormat('en-AU', {
    style: 'currency',
    currency: 'AUD',
    maximumFractionDigits: 0,
  }).format(n || 0);

export default function AdminBrokers() {
  const [pending, setPending] = useState<Broker[]>([]);
  const [active, setActive] = useState<Broker[]>([]);
  const [settledLeads, setSettledLeads] = useState(0);
  const [revenue, setRevenue] = useState<RevenueStats>({
    totalSettled: 0,
    totalReferralFees: 0,
    totalPlatformFees: 0,
    thisMonthSettled: 0,
  });
  const [loading, setLoading] = useState(true);
  const [rejectingId, setRejectingId] = useState<string | null>(null);
  const [rejectReason, setRejectReason] = useState('');
  const [busyId, setBusyId] = useState<string | null>(null);
  const [addOpen, setAddOpen] = useState(false);

  const fetchAll = useCallback(async () => {
    setLoading(true);
    const [pendingRes, activeRes, settledRes, settledRowsRes] = await Promise.all([
      (supabase.from('brokers') as any)
        .select('*')
        .eq('is_active', false)
        .order('created_at', { ascending: true }),
      (supabase.from('brokers') as any)
        .select('*')
        .eq('is_active', true)
        .order('name', { ascending: true }),
      supabase
        .from('referral_leads')
        .select('id', { count: 'exact', head: true })
        .eq('status', 'settled'),
      (supabase.from('referral_leads') as any)
        .select('id, status, referral_fee_amount, platform_fee_amount, settled_at')
        .eq('status', 'settled'),
    ]);
    setPending(((pendingRes.data ?? []) as any[]) || []);
    setActive(((activeRes.data ?? []) as any[]) || []);
    setSettledLeads(settledRes.count || 0);

    const rows = (settledRowsRes.data ?? []) as any[];
    const now = new Date();
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
    const totalReferralFees = rows.reduce(
      (s, r) => s + (Number(r.referral_fee_amount) || 0),
      0,
    );
    const totalPlatformFees = rows.reduce(
      (s, r) => s + (Number(r.platform_fee_amount) || 0),
      0,
    );
    const thisMonthSettled = rows.filter(
      (r) => r.settled_at && new Date(r.settled_at) >= monthStart,
    ).length;
    setRevenue({
      totalSettled: rows.length,
      totalReferralFees,
      totalPlatformFees,
      thisMonthSettled,
    });

    setLoading(false);
  }, []);

  useEffect(() => {
    fetchAll();
  }, [fetchAll]);

  const handleApprove = async (broker: Broker) => {
    setBusyId(broker.id);
    const { error } = await (supabase.from('brokers') as any)
      .update({ is_active: true, approval_status: 'approved' } as any)
      .eq('id', broker.id);

    if (error) {
      toast.error(`Could not approve: ${error.message}`);
      setBusyId(null);
      return;
    }

    const otpErr = await sendBrokerLoginLink(broker.email);
    if (otpErr) {
      toast.warning(`Approved, but login link failed: ${otpErr.message}`);
    } else {
      toast.success(`Broker approved — login link sent to ${broker.email}`);
    }
    setBusyId(null);
    fetchAll();
  };

  const handleReject = async (broker: Broker) => {
    setBusyId(broker.id);
    const { error } = await (supabase.from('brokers') as any)
      .update({
        approval_status: 'rejected',
        rejection_reason: rejectReason.trim() || null,
      } as any)
      .eq('id', broker.id);
    setBusyId(null);
    if (error) {
      toast.error(`Could not reject: ${error.message}`);
      return;
    }
    toast('Application rejected');
    setRejectingId(null);
    setRejectReason('');
    fetchAll();
  };

  const handleDeactivate = async (broker: Broker) => {
    if (!confirm(`Deactivate ${broker.name}? They will lose portal access.`)) return;
    setBusyId(broker.id);
    const { error } = await (supabase.from('brokers') as any)
      .update({ is_active: false } as any)
      .eq('id', broker.id);
    setBusyId(null);
    if (error) {
      toast.error(`Could not deactivate: ${error.message}`);
      return;
    }
    toast('Broker deactivated');
    fetchAll();
  };

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Brokers</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Approve broker applications and manage the partner network.
          </p>
        </div>
        <Button onClick={() => setAddOpen(true)}>
          <Plus size={16} className="mr-2" />
          Add broker manually
        </Button>
      </div>

      {/* Summary */}
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
        <SummaryCard
          icon={<Users size={16} />}
          label="Active brokers"
          value={active.length}
        />
        <SummaryCard
          icon={<CheckCircle2 size={16} />}
          label="Settled referrals"
          value={settledLeads}
        />
        <SummaryCard
          icon={<Building2 size={16} />}
          label="Pending applications"
          value={pending.length}
        />
      </div>

      {loading ? (
        <div className="flex justify-center py-20">
          <Loader2 className="animate-spin text-primary" size={28} />
        </div>
      ) : (
        <Tabs defaultValue="pending">
          <TabsList>
            <TabsTrigger value="pending">
              Pending {pending.length > 0 && (
                <span className="ml-1.5 px-1.5 py-0.5 rounded-full bg-destructive text-destructive-foreground text-[10px] font-bold">
                  {pending.length}
                </span>
              )}
            </TabsTrigger>
            <TabsTrigger value="active">Active ({active.length})</TabsTrigger>
          </TabsList>

          <TabsContent value="pending" className="mt-4">
            {pending.length === 0 ? (
              <EmptyState text="No pending broker applications." />
            ) : (
              <div className="space-y-3">
                {pending.map((b) => (
                  <PendingCard
                    key={b.id}
                    broker={b}
                    busy={busyId === b.id}
                    rejecting={rejectingId === b.id}
                    rejectReason={rejectReason}
                    onApprove={() => handleApprove(b)}
                    onStartReject={() => {
                      setRejectingId(b.id);
                      setRejectReason('');
                    }}
                    onCancelReject={() => {
                      setRejectingId(null);
                      setRejectReason('');
                    }}
                    onChangeReason={setRejectReason}
                    onConfirmReject={() => handleReject(b)}
                  />
                ))}
              </div>
            )}
          </TabsContent>

          <TabsContent value="active" className="mt-4 space-y-6">
            {active.length === 0 ? (
              <EmptyState text="No active brokers yet." />
            ) : (
              <ActiveTable
                brokers={active}
                busyId={busyId}
                onDeactivate={handleDeactivate}
              />
            )}

            <div>
              <h2 className="text-sm font-bold uppercase tracking-wider text-muted-foreground mb-3">
                Revenue
              </h2>
              <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
                <KpiCard label="Total Settlements" value={String(revenue.totalSettled)} />
                <KpiCard label="Agent Fees Paid" value={AUD(revenue.totalReferralFees)} />
                <KpiCard
                  label="ListHQ Platform Fees"
                  value={AUD(revenue.totalPlatformFees)}
                  helper="(platform fee tracking coming soon)"
                />
                <KpiCard label="Settled This Month" value={String(revenue.thisMonthSettled)} />
              </div>
            </div>
          </TabsContent>
        </Tabs>
      )}

      <AddBrokerModal
        open={addOpen}
        onClose={() => setAddOpen(false)}
        onCreated={fetchAll}
      />
    </div>
  );
}

/* ───────── Sub-components ───────── */

function SummaryCard({
  icon, label, value,
}: { icon: React.ReactNode; label: string; value: number }) {
  return (
    <div className="rounded-lg border border-border bg-card p-3">
      <div className="flex items-center gap-1.5 text-muted-foreground text-xs">
        {icon}
        <span>{label}</span>
      </div>
      <p className="text-2xl font-bold text-foreground mt-1">{value}</p>
    </div>
  );
}

function KpiCard({
  label, value, helper,
}: { label: string; value: string; helper?: string }) {
  return (
    <div className="rounded-lg border border-border bg-card p-3">
      <p className="text-xs text-muted-foreground">{label}</p>
      <p className="text-2xl font-bold text-foreground mt-1">{value}</p>
      {helper && (
        <p className="text-[10px] text-muted-foreground mt-1">{helper}</p>
      )}
    </div>
  );
}

function EmptyState({ text }: { text: string }) {
  return (
    <div className="text-center py-12 text-sm text-muted-foreground border border-dashed border-border rounded-lg">
      {text}
    </div>
  );
}

function PendingCard({
  broker, busy, rejecting, rejectReason,
  onApprove, onStartReject, onCancelReject, onChangeReason, onConfirmReject,
}: {
  broker: Broker;
  busy: boolean;
  rejecting: boolean;
  rejectReason: string;
  onApprove: () => void;
  onStartReject: () => void;
  onCancelReject: () => void;
  onChangeReason: (v: string) => void;
  onConfirmReject: () => void;
}) {
  const submitted = broker.created_at
    ? new Date(broker.created_at).toLocaleDateString('en-AU', {
        day: 'numeric', month: 'short', year: 'numeric',
      })
    : '—';

  return (
    <div className="rounded-xl border border-border bg-card p-4">
      <div className="flex items-start justify-between gap-3 flex-wrap">
        <div className="min-w-0">
          <h3 className="font-semibold text-foreground truncate">
            {broker.full_name || broker.name}
          </h3>
          <p className="text-sm text-muted-foreground">{broker.company || '—'}</p>
          <div className="flex flex-wrap gap-x-4 gap-y-1 mt-2 text-xs text-muted-foreground">
            <span>ACL: <span className="font-mono text-foreground">{broker.acl_number || '—'}</span></span>
            <span className="flex items-center gap-1">
              <MapPin size={12} />
              {[broker.suburb, broker.state].filter(Boolean).join(', ') || '—'}
            </span>
            <a
              href={`mailto:${broker.email}`}
              className="flex items-center gap-1 hover:text-primary"
            >
              <Mail size={12} /> {broker.email}
            </a>
          </div>

          {Array.isArray(broker.languages) && broker.languages.length > 0 && (
            <div className="flex flex-wrap gap-1 mt-2">
              {broker.languages.map((l: string) => (
                <Badge key={l} variant="secondary" className="text-[10px]">{l}</Badge>
              ))}
            </div>
          )}

          {Array.isArray(broker.specialties) && broker.specialties.length > 0 && (
            <div className="flex flex-wrap gap-1 mt-1.5">
              {broker.specialties.map((s: string) => (
                <Badge key={s} variant="outline" className="text-[10px]">{s}</Badge>
              ))}
            </div>
          )}

          <p className="text-[11px] text-muted-foreground mt-2">Submitted {submitted}</p>
        </div>

        <div className="flex items-center gap-2 flex-shrink-0">
          <Button
            size="sm"
            onClick={onApprove}
            disabled={busy || rejecting}
            className="bg-green-600 hover:bg-green-700 text-white h-9"
          >
            {busy ? <Loader2 size={14} className="animate-spin" /> : <Check size={14} className="mr-1" />}
            Approve
          </Button>
          <Button
            size="sm"
            variant="destructive"
            onClick={onStartReject}
            disabled={busy || rejecting}
            className="h-9"
          >
            <X size={14} className="mr-1" /> Reject
          </Button>
        </div>
      </div>

      {rejecting && (
        <div className="mt-3 pt-3 border-t border-border flex flex-col sm:flex-row gap-2">
          <input
            type="text"
            placeholder="Reason for rejection (optional)"
            value={rejectReason}
            onChange={(e) => onChangeReason(e.target.value)}
            className="flex-1 border border-border rounded-md px-3 py-2 text-sm bg-background"
            autoFocus
          />
          <div className="flex gap-2">
            <Button size="sm" variant="ghost" onClick={onCancelReject}>Cancel</Button>
            <Button size="sm" variant="destructive" onClick={onConfirmReject} disabled={busy}>
              {busy ? <Loader2 size={14} className="animate-spin" /> : 'Confirm reject'}
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}

function ActiveTable({
  brokers, busyId, onDeactivate,
}: {
  brokers: Broker[];
  busyId: string | null;
  onDeactivate: (b: Broker) => void;
}) {
  return (
    <div className="overflow-x-auto rounded-xl border border-border bg-card">
      <table className="w-full text-sm">
        <thead className="bg-muted/40 text-xs uppercase tracking-wider text-muted-foreground">
          <tr>
            <th className="text-left px-3 py-2 font-medium">Name</th>
            <th className="text-left px-3 py-2 font-medium">Company</th>
            <th className="text-left px-3 py-2 font-medium">ACL</th>
            <th className="text-left px-3 py-2 font-medium">Languages</th>
            <th className="text-left px-3 py-2 font-medium">Suburb / State</th>
            <th className="text-left px-3 py-2 font-medium">Email</th>
            <th className="text-right px-3 py-2 font-medium">Action</th>
          </tr>
        </thead>
        <tbody>
          {brokers.map((b) => (
            <tr key={b.id} className="border-t border-border">
              <td className="px-3 py-2 font-medium text-foreground">{b.full_name || b.name}</td>
              <td className="px-3 py-2 text-muted-foreground">{b.company || '—'}</td>
              <td className="px-3 py-2 font-mono text-xs">{b.acl_number || '—'}</td>
              <td className="px-3 py-2 text-xs text-muted-foreground">
                {Array.isArray(b.languages) ? b.languages.slice(0, 3).join(', ') : '—'}
                {Array.isArray(b.languages) && b.languages.length > 3 && ` +${b.languages.length - 3}`}
              </td>
              <td className="px-3 py-2 text-muted-foreground">
                {[b.suburb, b.state].filter(Boolean).join(', ') || '—'}
              </td>
              <td className="px-3 py-2 text-muted-foreground">
                <a href={`mailto:${b.email}`} className="hover:text-primary">{b.email}</a>
              </td>
              <td className="px-3 py-2 text-right">
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => onDeactivate(b)}
                  disabled={busyId === b.id}
                >
                  {busyId === b.id ? <Loader2 size={14} className="animate-spin" /> : 'Deactivate'}
                </Button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

/* ───────── Add broker manually modal ───────── */

function AddBrokerModal({
  open, onClose, onCreated,
}: { open: boolean; onClose: () => void; onCreated: () => void }) {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [company, setCompany] = useState('');
  const [acl, setAcl] = useState('');
  const [suburb, setSuburb] = useState('');
  const [stateCode, setStateCode] = useState('');
  const [languages, setLanguages] = useState<string[]>([]);
  const [specialties, setSpecialties] = useState<string[]>([]);
  const [saving, setSaving] = useState(false);

  const isValidEmail = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
  const canSave =
    name.trim() && isValidEmail && company.trim() && acl.trim() &&
    suburb.trim() && stateCode && !saving;

  const toggle = (arr: string[], v: string) =>
    arr.includes(v) ? arr.filter((x) => x !== v) : [...arr, v];

  const reset = () => {
    setName(''); setEmail(''); setCompany(''); setAcl('');
    setSuburb(''); setStateCode(''); setLanguages([]); setSpecialties([]);
  };

  const handleSave = async () => {
    if (!canSave) return;
    setSaving(true);
    const payload = {
      name: name.trim(),
      full_name: name.trim(),
      email: email.trim().toLowerCase(),
      company: company.trim(),
      acl_number: acl.trim(),
      suburb: suburb.trim(),
      state: stateCode,
      languages,
      specialties,
      loan_types: specialties,
      is_active: true,
      approval_status: 'approved',
      agency_role: 'principal',
    };
    const { error } = await (supabase.from('brokers') as any).insert(payload as any);
    if (error) {
      toast.error(`Could not save: ${error.message}`);
      setSaving(false);
      return;
    }

    const otpErr = await sendBrokerLoginLink(payload.email);
    if (otpErr) {
      toast.warning(`Broker added, but login link failed: ${otpErr.message}`);
    } else {
      toast.success(`Broker added — login link sent to ${payload.email}`);
    }
    setSaving(false);
    reset();
    onClose();
    onCreated();
  };

  return (
    <Dialog open={open} onOpenChange={(o) => { if (!o) { reset(); onClose(); } }}>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Add broker manually</DialogTitle>
        </DialogHeader>

        <div className="space-y-3">
          <Field label="Full name" required>
            <input value={name} onChange={(e) => setName(e.target.value)} className={inputCls} />
          </Field>
          <Field label="Email" required>
            <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} className={inputCls} />
          </Field>
          <Field label="Company / brokerage" required>
            <input value={company} onChange={(e) => setCompany(e.target.value)} className={inputCls} />
          </Field>
          <Field label="ACL number" required>
            <input value={acl} onChange={(e) => setAcl(e.target.value)} className={inputCls} />
          </Field>
          <div className="grid grid-cols-2 gap-3">
            <Field label="Suburb" required>
              <input value={suburb} onChange={(e) => setSuburb(e.target.value)} className={inputCls} />
            </Field>
            <Field label="State" required>
              <select value={stateCode} onChange={(e) => setStateCode(e.target.value)} className={inputCls}>
                <option value="">Select…</option>
                {STATE_OPTIONS.map((s) => <option key={s} value={s}>{s}</option>)}
              </select>
            </Field>
          </div>
          <Field label="Languages">
            <div className="flex flex-wrap gap-1.5">
              {LANGUAGE_OPTIONS.map((l) => (
                <Chip key={l} active={languages.includes(l)} onClick={() => setLanguages((arr) => toggle(arr, l))}>
                  {l}
                </Chip>
              ))}
            </div>
          </Field>
          <Field label="Specialties">
            <div className="flex flex-wrap gap-1.5">
              {SPECIALTY_OPTIONS.map((s) => (
                <Chip key={s} active={specialties.includes(s)} onClick={() => setSpecialties((arr) => toggle(arr, s))}>
                  {s}
                </Chip>
              ))}
            </div>
          </Field>
        </div>

        <DialogFooter>
          <Button variant="ghost" onClick={() => { reset(); onClose(); }}>Cancel</Button>
          <Button onClick={handleSave} disabled={!canSave}>
            {saving ? <Loader2 size={14} className="animate-spin mr-2" /> : null}
            Save & send login link
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

const inputCls =
  'w-full border border-border rounded-md px-3 py-2 text-sm bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-primary';

function Field({
  label, required, children,
}: { label: string; required?: boolean; children: React.ReactNode }) {
  return (
    <div>
      <label className="block text-sm font-medium text-foreground mb-1">
        {label}{required && <span className="text-destructive ml-0.5">*</span>}
      </label>
      {children}
    </div>
  );
}

function Chip({
  active, onClick, children,
}: { active: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={
        'px-2.5 py-1 rounded-full border text-xs transition-colors min-h-9 ' +
        (active
          ? 'bg-primary text-primary-foreground border-primary'
          : 'bg-background text-foreground border-border hover:bg-muted')
      }
    >
      {children}
    </button>
  );
}
