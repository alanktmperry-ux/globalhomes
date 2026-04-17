import { useEffect, useMemo, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { useAgentId } from '@/features/crm/hooks/useAgentId';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Plus, Loader2, Mail, X, FileText } from 'lucide-react';
import { toast } from 'sonner';
import { format, parseISO, startOfMonth, endOfMonth, subMonths } from 'date-fns';
import DashboardHeader from './DashboardHeader';

const AUD = new Intl.NumberFormat('en-AU', { style: 'currency', currency: 'AUD', minimumFractionDigits: 2 });

type Property = { id: string; address: string; suburb: string | null; owner_email: string | null; owner_name: string | null };
type Statement = {
  id: string;
  property_id: string;
  period_start: string;
  period_end: string;
  gross_rent_aud: number;
  management_fee_aud: number;
  maintenance_costs_aud: number;
  other_deductions_aud: number;
  net_amount_aud: number;
  emailed_to_owner: boolean;
  created_at: string;
  properties?: { address: string };
};
type OtherDeduction = { label: string; amount: number };

export default function OwnerStatementsPage() {
  const agentId = useAgentId();
  const [properties, setProperties] = useState<Property[]>([]);
  const [statements, setStatements] = useState<Statement[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreate, setShowCreate] = useState(false);
  const [saving, setSaving] = useState(false);

  const lastMonth = subMonths(new Date(), 1);
  const [form, setForm] = useState({
    property_id: '',
    period_start: format(startOfMonth(lastMonth), 'yyyy-MM-dd'),
    period_end: format(endOfMonth(lastMonth), 'yyyy-MM-dd'),
    gross_rent_aud: 0,
    management_fee_aud: 0,
    maintenance_costs_aud: 0,
    notes: '',
  });
  const [otherDeductions, setOtherDeductions] = useState<OtherDeduction[]>([]);

  const otherTotal = useMemo(() => otherDeductions.reduce((s, d) => s + Number(d.amount || 0), 0), [otherDeductions]);
  const netAmount = useMemo(
    () => Number(form.gross_rent_aud || 0) - Number(form.management_fee_aud || 0) - Number(form.maintenance_costs_aud || 0) - otherTotal,
    [form, otherTotal]
  );

  useEffect(() => {
    if (!agentId) return;
    (async () => {
      setLoading(true);
      const [{ data: props }, { data: stmts }] = await Promise.all([
        supabase.from('properties').select('id, address, suburb, owner_email, owner_name').eq('agent_id', agentId).order('address'),
        supabase.from('owner_statements' as any).select('*, properties(address)').eq('agent_id', agentId).order('created_at', { ascending: false }),
      ]);
      setProperties((props as any) || []);
      setStatements((stmts as any) || []);
      setLoading(false);
    })();
  }, [agentId]);

  // Auto-suggest mgmt fee = 8.8% of gross
  useEffect(() => {
    if (form.gross_rent_aud > 0 && form.management_fee_aud === 0) {
      setForm((f) => ({ ...f, management_fee_aud: Math.round(Number(f.gross_rent_aud) * 0.088 * 100) / 100 }));
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [form.gross_rent_aud]);

  const save = async (alsoEmail: boolean) => {
    if (!form.property_id) { toast.error('Select a property'); return; }
    if (!agentId) return;
    setSaving(true);
    const { data, error } = await supabase
      .from('owner_statements' as any)
      .insert({
        property_id: form.property_id,
        agent_id: agentId,
        period_start: form.period_start,
        period_end: form.period_end,
        gross_rent_aud: form.gross_rent_aud,
        management_fee_aud: form.management_fee_aud,
        maintenance_costs_aud: form.maintenance_costs_aud,
        other_deductions_aud: otherTotal,
        other_deductions_breakdown: otherDeductions as any,
        net_amount_aud: netAmount,
        statement_notes: form.notes || null,
      } as any)
      .select('*, properties(address)')
      .single();

    if (error || !data) { setSaving(false); toast.error('Could not save'); return; }

    if (alsoEmail) {
      const prop = properties.find((p) => p.id === form.property_id);
      if (!prop?.owner_email) { toast.warning('Statement saved, but owner has no email on file'); }
      else {
        try {
          const html = `
            <h2>Owner statement — ${prop.address}</h2>
            <p>Period: ${format(parseISO(form.period_start), 'd MMM yyyy')} – ${format(parseISO(form.period_end), 'd MMM yyyy')}</p>
            <table cellpadding="6" style="border-collapse:collapse">
              <tr><td>Gross rent collected</td><td style="text-align:right">${AUD.format(form.gross_rent_aud)}</td></tr>
              <tr><td>Management fee</td><td style="text-align:right">−${AUD.format(form.management_fee_aud)}</td></tr>
              <tr><td>Maintenance</td><td style="text-align:right">−${AUD.format(form.maintenance_costs_aud)}</td></tr>
              ${otherDeductions.map(d => `<tr><td>${d.label}</td><td style="text-align:right">−${AUD.format(Number(d.amount))}</td></tr>`).join('')}
              <tr style="border-top:1px solid #ccc;font-weight:bold"><td>Net to owner</td><td style="text-align:right">${AUD.format(netAmount)}</td></tr>
            </table>
            ${form.notes ? `<p>${form.notes}</p>` : ''}
          `;
          await supabase.functions.invoke('send-notification-email', {
            body: {
              to: prop.owner_email,
              subject: `Your owner statement for ${prop.address} — ${format(parseISO(form.period_start), 'MMM yyyy')}`,
              html,
            },
          });
          await supabase.from('owner_statements' as any).update({ emailed_to_owner: true, emailed_at: new Date().toISOString() } as any).eq('id', (data as any).id);
        } catch {/* ignore */}
      }
    }

    setStatements((s) => [data as any, ...s]);
    setShowCreate(false);
    setForm({
      property_id: '',
      period_start: format(startOfMonth(lastMonth), 'yyyy-MM-dd'),
      period_end: format(endOfMonth(lastMonth), 'yyyy-MM-dd'),
      gross_rent_aud: 0,
      management_fee_aud: 0,
      maintenance_costs_aud: 0,
      notes: '',
    });
    setOtherDeductions([]);
    setSaving(false);
    toast.success(alsoEmail ? 'Statement saved & emailed to owner' : 'Statement saved');
  };

  return (
    <div className="space-y-4">
      <DashboardHeader title="Owner Statements" subtitle="Generate and send monthly financial statements to owners." />

      <div className="flex justify-end">
        <Button onClick={() => setShowCreate(true)}><Plus size={14} className="mr-1" /> Create statement</Button>
      </div>

      <Card>
        <CardContent className="p-0">
          {loading ? (
            <div className="p-8 flex justify-center"><Loader2 className="animate-spin h-5 w-5 text-muted-foreground" /></div>
          ) : statements.length === 0 ? (
            <div className="p-8 text-center text-sm text-muted-foreground">
              <FileText className="h-8 w-8 mx-auto mb-2 text-muted-foreground/60" />
              No statements yet — create one to get started.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Property</TableHead>
                    <TableHead>Period</TableHead>
                    <TableHead className="text-right">Gross rent</TableHead>
                    <TableHead className="text-right">Net</TableHead>
                    <TableHead>Emailed</TableHead>
                    <TableHead>Created</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {statements.map((s) => (
                    <TableRow key={s.id}>
                      <TableCell className="font-medium">{s.properties?.address || '—'}</TableCell>
                      <TableCell>{format(parseISO(s.period_start), 'MMM yyyy')}</TableCell>
                      <TableCell className="text-right">{AUD.format(Number(s.gross_rent_aud))}</TableCell>
                      <TableCell className="text-right font-medium">{AUD.format(Number(s.net_amount_aud))}</TableCell>
                      <TableCell>
                        {s.emailed_to_owner
                          ? <Badge className="bg-emerald-500/10 text-emerald-700">Sent</Badge>
                          : <Badge variant="outline">Not sent</Badge>}
                      </TableCell>
                      <TableCell className="text-xs text-muted-foreground">{format(parseISO(s.created_at), 'd MMM yyyy')}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      <Dialog open={showCreate} onOpenChange={setShowCreate}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader><DialogTitle>Create owner statement</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <div>
              <Label className="text-xs">Property</Label>
              <Select value={form.property_id} onValueChange={(v) => setForm({ ...form, property_id: v })}>
                <SelectTrigger><SelectValue placeholder="Select property" /></SelectTrigger>
                <SelectContent>{properties.map((p) => <SelectItem key={p.id} value={p.id}>{p.address}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div><Label className="text-xs">Period start</Label><Input type="date" value={form.period_start} onChange={(e) => setForm({ ...form, period_start: e.target.value })} /></div>
              <div><Label className="text-xs">Period end</Label><Input type="date" value={form.period_end} onChange={(e) => setForm({ ...form, period_end: e.target.value })} /></div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div><Label className="text-xs">Gross rent (AUD)</Label><Input type="number" step="0.01" value={form.gross_rent_aud} onChange={(e) => setForm({ ...form, gross_rent_aud: Number(e.target.value) })} /></div>
              <div><Label className="text-xs">Management fee (AUD)</Label><Input type="number" step="0.01" value={form.management_fee_aud} onChange={(e) => setForm({ ...form, management_fee_aud: Number(e.target.value) })} /><p className="text-[10px] text-muted-foreground mt-0.5">Suggested: 8.8% of gross</p></div>
              <div><Label className="text-xs">Maintenance costs (AUD)</Label><Input type="number" step="0.01" value={form.maintenance_costs_aud} onChange={(e) => setForm({ ...form, maintenance_costs_aud: Number(e.target.value) })} /></div>
            </div>

            <div>
              <div className="flex items-center justify-between mb-1">
                <Label className="text-xs">Other deductions</Label>
                <Button size="sm" variant="outline" onClick={() => setOtherDeductions([...otherDeductions, { label: '', amount: 0 }])}>
                  <Plus size={10} className="mr-1" /> Add
                </Button>
              </div>
              {otherDeductions.map((d, i) => (
                <div key={i} className="flex gap-2 mb-1.5">
                  <Input placeholder="Label (e.g. Council rates)" value={d.label} onChange={(e) => {
                    const next = [...otherDeductions]; next[i] = { ...next[i], label: e.target.value }; setOtherDeductions(next);
                  }} />
                  <Input type="number" step="0.01" placeholder="Amount" className="w-32" value={d.amount} onChange={(e) => {
                    const next = [...otherDeductions]; next[i] = { ...next[i], amount: Number(e.target.value) }; setOtherDeductions(next);
                  }} />
                  <Button size="icon" variant="ghost" onClick={() => setOtherDeductions(otherDeductions.filter((_, idx) => idx !== i))}>
                    <X size={14} />
                  </Button>
                </div>
              ))}
            </div>

            <div>
              <Label className="text-xs">Notes</Label>
              <Textarea rows={2} value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} />
            </div>

            <div className="bg-muted/40 rounded-md p-3 flex justify-between items-center">
              <span className="text-sm font-medium">Net to owner</span>
              <span className="text-2xl font-semibold">{AUD.format(netAmount)}</span>
            </div>
          </div>
          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => save(false)} disabled={saving}>
              {saving ? <Loader2 size={14} className="animate-spin mr-1" /> : null} Save
            </Button>
            <Button onClick={() => save(true)} disabled={saving}>
              {saving ? <Loader2 size={14} className="animate-spin mr-1" /> : <Mail size={14} className="mr-1" />}
              Save & email owner
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
