import { useEffect, useMemo, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { toast } from 'sonner';
import { Droplet, Plus, Pencil, Trash2, FileCheck, DollarSign } from 'lucide-react';
import { format } from 'date-fns';

interface WaterBill {
  id: string;
  tenancy_id: string;
  period_start: string;
  period_end: string;
  start_reading: number;
  end_reading: number;
  usage_kl: number;
  rate_per_kl: number;
  supply_charge: number | null;
  usage_charge: number;
  total_amount: number;
  status: string;
  invoice_date: string | null;
  paid_date: string | null;
  notes: string | null;
}

interface Props {
  tenancyId: string;
  propertyState: string | null;
}

const AUD = new Intl.NumberFormat('en-AU', { style: 'currency', currency: 'AUD' });

const STATE_NOTE: Record<string, string> = {
  NSW: 'Tenants can be charged for water consumption if the property has a separate meter and is water efficient certified.',
  VIC: 'Tenants can be charged for water consumption (not supply charges) if separately metered.',
  QLD: 'Tenants can be charged for water consumption on properties with individual water meters.',
  WA: 'Tenants can be charged for water consumption costs (not supply charges).',
};

const emptyForm = {
  period_start: '',
  period_end: '',
  start_reading: '',
  end_reading: '',
  rate_per_kl: '3.00',
  supply_charge: '0',
  notes: '',
};

export default function WaterBillingPanel({ tenancyId, propertyState }: Props) {
  const [bills, setBills] = useState<WaterBill[]>([]);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<WaterBill | null>(null);
  const [form, setForm] = useState(emptyForm);
  const [saving, setSaving] = useState(false);
  const [deleteId, setDeleteId] = useState<string | null>(null);

  const stateNote =
    (propertyState && STATE_NOTE[propertyState.toUpperCase()]) ||
    'Check your state legislation regarding water charging eligibility.';

  const fetchBills = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from('water_bills' as any)
      .select('*')
      .eq('tenancy_id', tenancyId)
      .order('period_end', { ascending: false });
    if (error) {
      toast.error('Failed to load water bills');
    } else {
      setBills((data as any) || []);
    }
    setLoading(false);
  };

  useEffect(() => {
    fetchBills();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tenancyId]);

  const summary = useMemo(() => {
    let total = 0,
      paid = 0,
      outstanding = 0;
    for (const b of bills) {
      total += Number(b.total_amount) || 0;
      if (b.status === 'paid') paid += Number(b.total_amount) || 0;
      else if (b.status === 'invoiced') outstanding += Number(b.total_amount) || 0;
    }
    return { total, paid, outstanding };
  }, [bills]);

  const openAdd = () => {
    setEditing(null);
    setForm(emptyForm);
    setModalOpen(true);
  };

  const openEdit = (b: WaterBill) => {
    setEditing(b);
    setForm({
      period_start: b.period_start,
      period_end: b.period_end,
      start_reading: String(b.start_reading),
      end_reading: String(b.end_reading),
      rate_per_kl: String(b.rate_per_kl),
      supply_charge: String(b.supply_charge ?? 0),
      notes: b.notes ?? '',
    });
    setModalOpen(true);
  };

  const liveUsage = Math.max(
    0,
    (parseFloat(form.end_reading) || 0) - (parseFloat(form.start_reading) || 0),
  );
  const liveTotal =
    liveUsage * (parseFloat(form.rate_per_kl) || 0) + (parseFloat(form.supply_charge) || 0);

  const handleSave = async () => {
    if (!form.period_start || !form.period_end) {
      toast.error('Period start and end are required');
      return;
    }
    if (form.start_reading === '' || form.end_reading === '') {
      toast.error('Meter readings are required');
      return;
    }
    setSaving(true);
    const payload = {
      tenancy_id: tenancyId,
      period_start: form.period_start,
      period_end: form.period_end,
      start_reading: parseFloat(form.start_reading) || 0,
      end_reading: parseFloat(form.end_reading) || 0,
      rate_per_kl: parseFloat(form.rate_per_kl) || 0,
      supply_charge: parseFloat(form.supply_charge) || 0,
      notes: form.notes || null,
    };
    let error;
    if (editing) {
      ({ error } = await supabase.from('water_bills' as any).update(payload).eq('id', editing.id));
    } else {
      ({ error } = await supabase.from('water_bills' as any).insert(payload));
    }
    setSaving(false);
    if (error) {
      toast.error(error.message);
      return;
    }
    toast.success('Bill saved');
    setModalOpen(false);
    fetchBills();
  };

  const markStatus = async (b: WaterBill, status: 'invoiced' | 'paid') => {
    const updates: Record<string, any> = { status };
    if (status === 'invoiced') updates.invoice_date = new Date().toISOString().slice(0, 10);
    if (status === 'paid') updates.paid_date = new Date().toISOString().slice(0, 10);
    const { error } = await supabase.from('water_bills' as any).update(updates).eq('id', b.id);
    if (error) {
      toast.error(error.message);
      return;
    }
    toast.success(status === 'invoiced' ? 'Marked as invoiced' : 'Payment recorded');
    fetchBills();
  };

  const handleDelete = async () => {
    if (!deleteId) return;
    const { error } = await supabase.from('water_bills' as any).delete().eq('id', deleteId);
    setDeleteId(null);
    if (error) {
      toast.error(error.message);
      return;
    }
    toast.success('Bill deleted');
    fetchBills();
  };

  const StatusBadge = ({ status }: { status: string }) => {
    if (status === 'paid')
      return <Badge className="bg-green-100 text-green-800 hover:bg-green-100">Paid</Badge>;
    if (status === 'invoiced')
      return <Badge className="bg-amber-100 text-amber-800 hover:bg-amber-100">Invoiced</Badge>;
    return <Badge variant="secondary">Draft</Badge>;
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex items-start justify-between gap-4 flex-wrap">
          <div>
            <CardTitle className="flex items-center gap-2">
              <Droplet size={18} className="text-blue-500" />
              Water & Utility Billing
            </CardTitle>
            <p className="text-xs text-muted-foreground mt-1 max-w-xl">{stateNote}</p>
          </div>
          <Button size="sm" onClick={openAdd}>
            <Plus size={14} className="mr-1" /> Add Water Bill
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-3 gap-3 mb-4">
          <div className="rounded-lg border p-3">
            <p className="text-xs text-muted-foreground">Total Billed</p>
            <p className="text-lg font-semibold">{AUD.format(summary.total)}</p>
          </div>
          <div className="rounded-lg border p-3">
            <p className="text-xs text-muted-foreground">Outstanding</p>
            <p className="text-lg font-semibold text-amber-600">
              {AUD.format(summary.outstanding)}
            </p>
          </div>
          <div className="rounded-lg border p-3">
            <p className="text-xs text-muted-foreground">Paid</p>
            <p className="text-lg font-semibold text-green-600">{AUD.format(summary.paid)}</p>
          </div>
        </div>

        {loading ? (
          <p className="text-sm text-muted-foreground py-6 text-center">Loading…</p>
        ) : bills.length === 0 ? (
          <div className="text-center py-8 border-2 border-dashed rounded-lg">
            <Droplet className="mx-auto text-muted-foreground mb-2" size={28} />
            <p className="text-sm text-muted-foreground mb-3">No water bills recorded yet</p>
            <Button size="sm" variant="outline" onClick={openAdd}>
              <Plus size={14} className="mr-1" /> Add Water Bill
            </Button>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b text-left text-xs text-muted-foreground">
                  <th className="py-2 pr-3">Period</th>
                  <th className="py-2 pr-3">Usage (kL)</th>
                  <th className="py-2 pr-3">Rate</th>
                  <th className="py-2 pr-3">Supply</th>
                  <th className="py-2 pr-3">Total</th>
                  <th className="py-2 pr-3">Status</th>
                  <th className="py-2 pr-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody>
                {bills.map((b) => (
                  <tr key={b.id} className="border-b last:border-0">
                    <td className="py-2 pr-3">
                      {format(new Date(b.period_start), 'd MMM')} –{' '}
                      {format(new Date(b.period_end), 'd MMM yy')}
                    </td>
                    <td className="py-2 pr-3">{Number(b.usage_kl).toFixed(2)}</td>
                    <td className="py-2 pr-3">{AUD.format(Number(b.rate_per_kl))}</td>
                    <td className="py-2 pr-3">{AUD.format(Number(b.supply_charge ?? 0))}</td>
                    <td className="py-2 pr-3 font-medium">{AUD.format(Number(b.total_amount))}</td>
                    <td className="py-2 pr-3">
                      <StatusBadge status={b.status} />
                    </td>
                    <td className="py-2 pr-3">
                      <div className="flex gap-1 justify-end flex-wrap">
                        <Button size="sm" variant="ghost" onClick={() => openEdit(b)}>
                          <Pencil size={13} />
                        </Button>
                        {b.status === 'draft' && (
                          <Button
                            size="sm"
                            variant="ghost"
                            title="Mark Invoiced"
                            onClick={() => markStatus(b, 'invoiced')}
                          >
                            <FileCheck size={13} />
                          </Button>
                        )}
                        {b.status !== 'paid' && (
                          <Button
                            size="sm"
                            variant="ghost"
                            title="Mark Paid"
                            onClick={() => markStatus(b, 'paid')}
                          >
                            <DollarSign size={13} />
                          </Button>
                        )}
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => setDeleteId(b.id)}
                          className="text-destructive"
                        >
                          <Trash2 size={13} />
                        </Button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </CardContent>

      <Dialog open={modalOpen} onOpenChange={setModalOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>{editing ? 'Edit Water Bill' : 'Add Water Bill'}</DialogTitle>
          </DialogHeader>
          <div className="grid gap-3">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>Billing Period Start</Label>
                <Input
                  type="date"
                  value={form.period_start}
                  onChange={(e) => setForm((f) => ({ ...f, period_start: e.target.value }))}
                />
              </div>
              <div>
                <Label>Billing Period End</Label>
                <Input
                  type="date"
                  value={form.period_end}
                  onChange={(e) => setForm((f) => ({ ...f, period_end: e.target.value }))}
                />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>Start Reading (kL)</Label>
                <Input
                  type="number"
                  step="0.01"
                  value={form.start_reading}
                  onChange={(e) => setForm((f) => ({ ...f, start_reading: e.target.value }))}
                />
              </div>
              <div>
                <Label>End Reading (kL)</Label>
                <Input
                  type="number"
                  step="0.01"
                  value={form.end_reading}
                  onChange={(e) => setForm((f) => ({ ...f, end_reading: e.target.value }))}
                />
              </div>
            </div>
            <p className="text-xs text-muted-foreground">Usage: {liveUsage.toFixed(2)} kL</p>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>Rate per kL ($)</Label>
                <Input
                  type="number"
                  step="0.01"
                  value={form.rate_per_kl}
                  onChange={(e) => setForm((f) => ({ ...f, rate_per_kl: e.target.value }))}
                />
              </div>
              <div>
                <Label>Supply Charge ($)</Label>
                <Input
                  type="number"
                  step="0.01"
                  value={form.supply_charge}
                  onChange={(e) => setForm((f) => ({ ...f, supply_charge: e.target.value }))}
                />
              </div>
            </div>
            <div className="rounded-lg bg-muted p-3">
              <p className="text-sm font-semibold">
                Total to charge tenant: {AUD.format(liveTotal)}
              </p>
            </div>
            <div>
              <Label>Notes</Label>
              <Textarea
                rows={2}
                value={form.notes}
                onChange={(e) => setForm((f) => ({ ...f, notes: e.target.value }))}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setModalOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleSave} disabled={saving}>
              {saving ? 'Saving…' : 'Save Bill'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <AlertDialog open={!!deleteId} onOpenChange={(o) => !o && setDeleteId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete this water bill?</AlertDialogTitle>
            <AlertDialogDescription>This action cannot be undone.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete}>Delete</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </Card>
  );
}
