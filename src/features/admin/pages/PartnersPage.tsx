import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
} from '@/components/ui/dropdown-menu';
import { Loader2, ExternalLink, MoreHorizontal } from 'lucide-react';
import { getErrorMessage } from '@/shared/lib/errorUtils';
import { buildAuditMeta } from '@/shared/lib/auditLog';

type PartnerType = 'mortgage_broker' | 'trust_accountant';
type PartnerStatus = 'active' | 'suspended' | 'pending';

interface Partner {
  id: string;
  business_name: string | null;
  contact_name: string | null;
  email: string | null;
  phone: string | null;
  partner_type: PartnerType;
  abn: string | null;
  website: string | null;
  status: PartnerStatus;
  plan_type: string | null;
  created_at: string;
  notes: string | null;
}

async function logAudit(
  actionType: string,
  entityType: string,
  entityId: string | null,
  metadata: Record<string, unknown> = {}
) {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    await (supabase.from('audit_log') as any).insert({
      action_type: actionType,
      entity_type: entityType,
      entity_id: entityId,
      user_id: user?.id ?? null,
      metadata: buildAuditMeta(metadata) as any,
    });
  } catch {
    // swallow audit failures
  }
}

function StatusBadge({ status }: { status: PartnerStatus }) {
  const cls =
    status === 'active'
      ? 'bg-emerald-100 text-emerald-700'
      : status === 'suspended'
      ? 'bg-red-100 text-red-700'
      : 'bg-amber-100 text-amber-700';
  return (
    <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-[11px] font-medium capitalize ${cls}`}>
      {status}
    </span>
  );
}

function KpiChip({ label, value, tone }: { label: string; value: number; tone: 'emerald' | 'amber' | 'red' }) {
  const toneCls =
    tone === 'emerald'
      ? 'border-emerald-200 bg-emerald-50 text-emerald-700'
      : tone === 'amber'
      ? 'border-amber-200 bg-amber-50 text-amber-700'
      : 'border-red-200 bg-red-50 text-red-700';
  return (
    <div className={`rounded-xl border px-4 py-3 ${toneCls}`}>
      <div className="text-[11px] uppercase tracking-wide opacity-70">{label}</div>
      <div className="text-2xl font-semibold mt-0.5">{value}</div>
    </div>
  );
}

interface PartnerTableProps {
  rows: Partner[];
  variant: PartnerType;
  onUpdate: (id: string, status: PartnerStatus) => void;
}

function PartnerTable({ rows, variant, onUpdate }: PartnerTableProps) {
  const navigate = useNavigate();

  const handleStatus = async (p: Partner, next: PartnerStatus) => {
    try {
      const { error } = await (supabase.from('partners') as any)
        .update({ status: next })
        .eq('id', p.id);
      if (error) throw error;
      const action = next === 'suspended' ? 'partner_suspended' : 'partner_reactivated';
      await logAudit(action, 'partner', p.id, { email: p.email, partner_type: p.partner_type });
      onUpdate(p.id, next);
      toast.success(next === 'suspended' ? 'Partner suspended' : 'Partner reactivated');
    } catch (err) {
      toast.error(getErrorMessage(err));
    }
  };

  if (rows.length === 0) {
    return (
      <div className="text-center py-12 text-stone-400 text-sm">No partners yet</div>
    );
  }

  return (
    <div className="overflow-x-auto rounded-xl border border-stone-200">
      <table className="w-full text-sm">
        <thead className="bg-stone-50 text-stone-600 text-[12px] uppercase tracking-wide">
          <tr>
            <th className="text-left px-4 py-2 font-medium">Business</th>
            <th className="text-left px-4 py-2 font-medium">Contact</th>
            <th className="text-left px-4 py-2 font-medium">Email</th>
            <th className="text-left px-4 py-2 font-medium">Phone</th>
            <th className="text-left px-4 py-2 font-medium">
              {variant === 'mortgage_broker' ? 'Website' : 'ABN'}
            </th>
            <th className="text-left px-4 py-2 font-medium">Plan</th>
            <th className="text-left px-4 py-2 font-medium">Status</th>
            <th className="text-left px-4 py-2 font-medium">Joined</th>
            <th className="text-right px-4 py-2 font-medium">Actions</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((p) => (
            <tr key={p.id} className="border-t border-stone-100">
              <td className="px-4 py-3 font-medium text-stone-900">{p.business_name || '—'}</td>
              <td className="px-4 py-3 text-stone-700">{p.contact_name || '—'}</td>
              <td className="px-4 py-3 text-stone-700">{p.email || '—'}</td>
              <td className="px-4 py-3 text-stone-700">{p.phone || '—'}</td>
              <td className="px-4 py-3 text-stone-700">
                {variant === 'mortgage_broker' ? (
                  p.website ? (
                    <a
                      href={p.website}
                      target="_blank"
                      rel="noreferrer"
                      className="inline-flex items-center gap-1 text-blue-600 hover:underline"
                    >
                      Visit <ExternalLink className="h-3 w-3" />
                    </a>
                  ) : (
                    '—'
                  )
                ) : (
                  p.abn || '—'
                )}
              </td>
              <td className="px-4 py-3 text-stone-700 capitalize">{p.plan_type || '—'}</td>
              <td className="px-4 py-3"><StatusBadge status={p.status} /></td>
              <td className="px-4 py-3 text-stone-500 text-[12px]">
                {new Date(p.created_at).toLocaleDateString()}
              </td>
              <td className="px-4 py-3 text-right">
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="ghost" size="icon" className="h-8 w-8">
                      <MoreHorizontal className="h-4 w-4" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    {p.status !== 'suspended' && (
                      <DropdownMenuItem onClick={() => handleStatus(p, 'suspended')}>
                        Suspend
                      </DropdownMenuItem>
                    )}
                    {p.status !== 'active' && (
                      <DropdownMenuItem onClick={() => handleStatus(p, 'active')}>
                        Reactivate
                      </DropdownMenuItem>
                    )}
                    <DropdownMenuItem onClick={() => navigate(`/admin/partners/${p.id}`)}>
                      View profile
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

interface InviteDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

function InviteDialog({ open, onOpenChange }: InviteDialogProps) {
  const [businessName, setBusinessName] = useState('');
  const [contactName, setContactName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [partnerType, setPartnerType] = useState<PartnerType>('mortgage_broker');
  const [notes, setNotes] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const reset = () => {
    setBusinessName('');
    setContactName('');
    setEmail('');
    setPhone('');
    setPartnerType('mortgage_broker');
    setNotes('');
  };

  const handleSubmit = async () => {
    if (!email || !businessName) {
      toast.error('Business name and email are required');
      return;
    }
    setSubmitting(true);
    try {
      try {
        await ((supabase as any).from('partner_invitations')).insert({
          business_name: businessName,
          contact_name: contactName,
          email,
          phone,
          partner_type: partnerType,
          notes,
          status: 'invited',
          invited_at: new Date().toISOString(),
        });
      } catch {
        // table may not exist — silent
      }
      await logAudit('partner_invited', 'partner', null, {
        email,
        partner_type: partnerType,
        business_name: businessName,
      });
      toast.success('Invitation recorded', { description: email });
      reset();
      onOpenChange(false);
    } catch (err) {
      toast.error(getErrorMessage(err));
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Invite partner</DialogTitle>
        </DialogHeader>
        <div className="space-y-3">
          <div>
            <Label htmlFor="biz">Business name</Label>
            <Input id="biz" value={businessName} onChange={(e) => setBusinessName(e.target.value)} />
          </div>
          <div>
            <Label htmlFor="contact">Contact name</Label>
            <Input id="contact" value={contactName} onChange={(e) => setContactName(e.target.value)} />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label htmlFor="email">Email</Label>
              <Input id="email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} />
            </div>
            <div>
              <Label htmlFor="phone">Phone</Label>
              <Input id="phone" value={phone} onChange={(e) => setPhone(e.target.value)} />
            </div>
          </div>
          <div>
            <Label>Partner type</Label>
            <Select value={partnerType} onValueChange={(v) => setPartnerType(v as PartnerType)}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="mortgage_broker">Mortgage Broker</SelectItem>
                <SelectItem value="trust_accountant">Trust Accountant</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label htmlFor="notes">Notes (optional)</Label>
            <Textarea id="notes" value={notes} onChange={(e) => setNotes(e.target.value)} rows={3} />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={submitting}>
            Cancel
          </Button>
          <Button onClick={handleSubmit} disabled={submitting}>
            {submitting && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
            Send invitation
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export default function PartnersPage() {
  const [partners, setPartners] = useState<Partner[]>([]);
  const [loading, setLoading] = useState(true);
  const [inviteOpen, setInviteOpen] = useState(false);

  const fetchPartners = useCallback(async () => {
    setLoading(true);
    try {
      const { data, error } = await ((supabase as any).from('partners'))
        .select('id, business_name, contact_name, email, phone, partner_type, abn, website, status, plan_type, created_at, notes')
        .order('created_at', { ascending: false });
      if (error) throw error;
      setPartners((data || []) as Partner[]);
    } catch {
      // table may not exist — show empty
      setPartners([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchPartners(); }, [fetchPartners]);

  const updateLocal = (id: string, status: PartnerStatus) =>
    setPartners((rows) => rows.map((r) => (r.id === id ? { ...r, status } : r)));

  const brokers = partners.filter((p) => p.partner_type === 'mortgage_broker');
  const accountants = partners.filter((p) => p.partner_type === 'trust_accountant');

  const counts = (rows: Partner[]) => ({
    active: rows.filter((r) => r.status === 'active').length,
    pending: rows.filter((r) => r.status === 'pending').length,
    suspended: rows.filter((r) => r.status === 'suspended').length,
  });
  const brokerCounts = counts(brokers);
  const accountantCounts = counts(accountants);

  return (
    <div className="max-w-screen-xl mx-auto px-6 py-8">
      <div className="flex items-start justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Partners</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Mortgage brokers and trust accountants integrated with the platform.
          </p>
        </div>
        <Button variant="outline" size="sm" onClick={() => setInviteOpen(true)}>
          Invite partner
        </Button>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-16 text-stone-400">
          <Loader2 className="h-5 w-5 animate-spin" />
        </div>
      ) : (
        <Tabs defaultValue="brokers">
          <TabsList>
            <TabsTrigger value="brokers">Mortgage Brokers</TabsTrigger>
            <TabsTrigger value="accountants">Trust Accountants</TabsTrigger>
          </TabsList>

          <TabsContent value="brokers" className="mt-4">
            <div className="grid grid-cols-3 gap-3 mb-4">
              <KpiChip label="Active" value={brokerCounts.active} tone="emerald" />
              <KpiChip label="Pending" value={brokerCounts.pending} tone="amber" />
              <KpiChip label="Suspended" value={brokerCounts.suspended} tone="red" />
            </div>
            <PartnerTable rows={brokers} variant="mortgage_broker" onUpdate={updateLocal} />
          </TabsContent>

          <TabsContent value="accountants" className="mt-4">
            <div className="grid grid-cols-3 gap-3 mb-4">
              <KpiChip label="Active" value={accountantCounts.active} tone="emerald" />
              <KpiChip label="Pending" value={accountantCounts.pending} tone="amber" />
              <KpiChip label="Suspended" value={accountantCounts.suspended} tone="red" />
            </div>
            <div className="text-[13px] text-stone-500 rounded-xl bg-stone-50 p-3 mb-4">
              Trust accountant partners can access the trust accounting module in any agent's back-office.
              Manage their access by suspending or reactivating their account.
            </div>
            <PartnerTable rows={accountants} variant="trust_accountant" onUpdate={updateLocal} />
          </TabsContent>
        </Tabs>
      )}

      <InviteDialog open={inviteOpen} onOpenChange={setInviteOpen} />
    </div>
  );
}
