import { useEffect, useMemo, useState } from 'react';
import { HandCoins, Plus, Loader2, Info } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/features/auth/AuthProvider';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Card } from '@/components/ui/card';
import {
  Sheet, SheetContent, SheetDescription, SheetFooter, SheetHeader, SheetTitle, SheetTrigger,
} from '@/components/ui/sheet';
import { toast } from 'sonner';
import { format } from 'date-fns';

interface ReferralLead {
  id: string;
  buyer_name: string | null;
  buyer_email: string | null;
  buyer_phone: string | null;
  estimated_loan_amount: number | null;
  property_url: string | null;
  notes: string | null;
  status: string;
  created_at: string;
  referral_fee_amount: number | null;
}

const fmtAUD = (n: number) =>
  new Intl.NumberFormat('en-AU', { style: 'currency', currency: 'AUD', maximumFractionDigits: 0 }).format(n);

const statusVariant = (s: string): 'default' | 'secondary' | 'outline' => {
  if (s === 'settled') return 'default';
  if (s === 'new' || s === 'assigned' || s === 'contacted') return 'secondary';
  return 'outline';
};

export default function BrokerReferralsPage() {
  const { user } = useAuth();
  const [agentId, setAgentId] = useState<string | null>(null);
  const [leads, setLeads] = useState<ReferralLead[]>([]);
  const [loading, setLoading] = useState(true);
  const [open, setOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  // Form state
  const [buyerName, setBuyerName] = useState('');
  const [buyerEmail, setBuyerEmail] = useState('');
  const [buyerPhone, setBuyerPhone] = useState('');
  const [loanAmount, setLoanAmount] = useState('');
  const [propertyAddress, setPropertyAddress] = useState('');
  const [notes, setNotes] = useState('');

  // Load current agent id
  useEffect(() => {
    if (!user) return;
    supabase
      .from('agents')
      .select('id')
      .eq('user_id', user.id)
      .maybeSingle()
      .then(({ data }) => setAgentId(data?.id ?? null));
  }, [user]);

  const refresh = async (id: string) => {
    setLoading(true);
    const { data, error } = await supabase
      .from('referral_leads')
      .select('id, buyer_name, buyer_email, buyer_phone, estimated_loan_amount, property_url, notes, status, created_at, referral_fee_amount')
      .eq('referral_agent_id', id)
      .order('created_at', { ascending: false });
    if (error) {
      console.error(error);
      toast.error('Failed to load referrals');
    } else {
      setLeads((data ?? []) as ReferralLead[]);
    }
    setLoading(false);
  };

  useEffect(() => {
    if (agentId) refresh(agentId);
  }, [agentId]);

  const stats = useMemo(() => {
    const total = leads.length;
    const pending = leads.filter(l => l.status !== 'settled' && l.status !== 'lost' && l.status !== 'cancelled').length;
    const settled = leads.filter(l => l.status === 'settled').length;
    const earnings = leads.reduce((sum, l) => sum + (Number(l.referral_fee_amount) || 0), 0);
    return { total, pending, settled, earnings };
  }, [leads]);

  const resetForm = () => {
    setBuyerName(''); setBuyerEmail(''); setBuyerPhone('');
    setLoanAmount(''); setPropertyAddress(''); setNotes('');
  };

  const handleSubmit = async () => {
    if (!agentId) { toast.error('Agent profile not found'); return; }
    if (!buyerName.trim() || !buyerEmail.trim()) {
      toast.error('Buyer name and email are required');
      return;
    }
    setSubmitting(true);

    // Auto-assign first active broker
    const { data: broker } = await supabase
      .from('brokers')
      .select('id')
      .eq('is_active', true)
      .order('created_at', { ascending: true })
      .limit(1)
      .maybeSingle();

    const referredByCode = `agent_${agentId.slice(0, 8)}`;

    const { error } = await supabase.from('referral_leads').insert({
      buyer_name: buyerName.trim(),
      buyer_email: buyerEmail.trim(),
      buyer_phone: buyerPhone.trim() || null,
      estimated_loan_amount: loanAmount ? Number(loanAmount) : null,
      property_url: propertyAddress.trim() || null,
      notes: notes.trim() || null,
      status: 'new',
      referral_agent_id: agentId,
      referred_by_code: referredByCode,
      assigned_broker_id: broker?.id ?? null,
    });

    setSubmitting(false);
    if (error) {
      console.error(error);
      toast.error(error.message || 'Failed to log referral');
      return;
    }
    toast.success('Referral logged');
    resetForm();
    setOpen(false);
    refresh(agentId);
  };

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <HandCoins className="h-6 w-6 text-primary" />
            Broker Referrals
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            Refer your buyers to a mortgage broker and earn a share of the commission.
          </p>
        </div>

        <Sheet open={open} onOpenChange={setOpen}>
          <SheetTrigger asChild>
            <Button className="gap-2">
              <Plus className="h-4 w-4" /> Log new referral
            </Button>
          </SheetTrigger>
          <SheetContent side="right" className="w-full sm:max-w-md overflow-y-auto">
            <SheetHeader>
              <SheetTitle>Log a broker referral</SheetTitle>
              <SheetDescription>
                Send your buyer's details to our partner broker network.
              </SheetDescription>
            </SheetHeader>

            <div className="space-y-4 py-6">
              <div className="space-y-2">
                <Label htmlFor="buyer_name">Buyer name *</Label>
                <Input id="buyer_name" value={buyerName} onChange={(e) => setBuyerName(e.target.value)} maxLength={120} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="buyer_email">Buyer email *</Label>
                <Input id="buyer_email" type="email" value={buyerEmail} onChange={(e) => setBuyerEmail(e.target.value)} maxLength={255} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="buyer_phone">Buyer phone</Label>
                <Input id="buyer_phone" value={buyerPhone} onChange={(e) => setBuyerPhone(e.target.value)} maxLength={40} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="loan">Estimated loan amount (AUD)</Label>
                <Input id="loan" type="number" inputMode="numeric" min={0}
                  value={loanAmount} onChange={(e) => setLoanAmount(e.target.value)} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="prop">Property address or URL</Label>
                <Input id="prop" value={propertyAddress} onChange={(e) => setPropertyAddress(e.target.value)} maxLength={500} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="notes">Notes</Label>
                <Textarea id="notes" value={notes} onChange={(e) => setNotes(e.target.value)} rows={3} maxLength={1000} />
              </div>
            </div>

            <SheetFooter>
              <Button variant="outline" onClick={() => setOpen(false)} disabled={submitting}>Cancel</Button>
              <Button onClick={handleSubmit} disabled={submitting}>
                {submitting && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                Submit referral
              </Button>
            </SheetFooter>
          </SheetContent>
        </Sheet>
      </div>

      {/* Info banner */}
      <div className="flex items-start gap-3 rounded-lg border border-primary/20 bg-primary/5 p-4">
        <Info className="h-4 w-4 text-primary mt-0.5 shrink-0" />
        <p className="text-sm text-foreground">
          Every settled referral earns you a share of the broker commission.
          Average return: <strong>$1,200–$2,400</strong> per settled loan.
        </p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <Card className="p-4">
          <div className="text-xs text-muted-foreground">Total referrals</div>
          <div className="text-2xl font-bold mt-1">{stats.total}</div>
        </Card>
        <Card className="p-4">
          <div className="text-xs text-muted-foreground">Pending</div>
          <div className="text-2xl font-bold mt-1">{stats.pending}</div>
        </Card>
        <Card className="p-4">
          <div className="text-xs text-muted-foreground">Settled</div>
          <div className="text-2xl font-bold mt-1 text-emerald-600">{stats.settled}</div>
        </Card>
        <Card className="p-4">
          <div className="text-xs text-muted-foreground">Estimated earnings</div>
          <div className="text-2xl font-bold mt-1 text-primary">{fmtAUD(stats.earnings)}</div>
        </Card>
      </div>

      {/* Table */}
      <Card>
        <div className="p-4 border-b">
          <h2 className="font-semibold">Your referrals</h2>
        </div>
        {loading ? (
          <div className="p-8 flex items-center justify-center text-muted-foreground">
            <Loader2 className="h-5 w-5 animate-spin mr-2" /> Loading…
          </div>
        ) : leads.length === 0 ? (
          <div className="p-8 text-center text-sm text-muted-foreground">
            No referrals yet. Log your first one to start earning.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-muted/40 text-xs uppercase text-muted-foreground">
                <tr>
                  <th className="text-left p-3">Buyer</th>
                  <th className="text-left p-3">Loan amount</th>
                  <th className="text-left p-3">Status</th>
                  <th className="text-left p-3">Logged</th>
                  <th className="text-right p-3">Est. commission</th>
                </tr>
              </thead>
              <tbody>
                {leads.map((l) => {
                  const loan = Number(l.estimated_loan_amount) || 0;
                  const estCommission = loan * 0.003 * 0.25;
                  return (
                    <tr key={l.id} className="border-t">
                      <td className="p-3">
                        <div className="font-medium">{l.buyer_name || '—'}</div>
                        <div className="text-xs text-muted-foreground">{l.buyer_email}</div>
                      </td>
                      <td className="p-3">{loan ? fmtAUD(loan) : '—'}</td>
                      <td className="p-3">
                        <Badge variant={statusVariant(l.status)} className="capitalize">{l.status}</Badge>
                      </td>
                      <td className="p-3 text-muted-foreground">
                        {format(new Date(l.created_at), 'd MMM yyyy')}
                      </td>
                      <td className="p-3 text-right font-medium text-primary">
                        {loan ? fmtAUD(estCommission) : '—'}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </Card>
    </div>
  );
}
