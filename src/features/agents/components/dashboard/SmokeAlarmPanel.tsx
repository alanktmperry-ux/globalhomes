import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import { format, parseISO, addMonths, differenceInDays } from 'date-fns';
import { Loader2, Plus, ShieldAlert, ShieldCheck, ChevronDown, AlertTriangle, Flame } from 'lucide-react';

interface SmokeAlarmRecord {
  id: string;
  service_date: string;
  next_service_due: string;
  alarm_type: string | null;
  alarm_count: number;
  compliance_status: string;
  certificate_number: string | null;
  technician_name: string | null;
  technician_company: string | null;
  notes: string | null;
}

const ALARM_TYPES = [
  { value: 'photoelectric', label: 'Photoelectric' },
  { value: 'ionisation', label: 'Ionisation' },
  { value: 'hardwired', label: 'Hardwired' },
  { value: 'hardwired_battery_backup', label: 'Hardwired + Battery Backup' },
  { value: 'battery', label: 'Battery' },
];
const ALARM_LABEL: Record<string, string> = Object.fromEntries(ALARM_TYPES.map(a => [a.value, a.label]));

const STATUS_COLORS: Record<string, string> = {
  compliant: 'bg-emerald-500/15 text-emerald-700',
  non_compliant: 'bg-red-500/15 text-red-700',
  requires_attention: 'bg-amber-500/15 text-amber-700',
};
const STATUS_LABEL: Record<string, string> = {
  compliant: 'Compliant',
  non_compliant: 'Non-Compliant',
  requires_attention: 'Requires Attention',
};

const STATE_INFO: Record<string, string> = {
  QLD: 'Queensland law requires interconnected photoelectric smoke alarms and a compliance certificate for each new tenancy since January 2022.',
  VIC: 'Landlords must ensure smoke alarms are in working order. Annual testing is recommended.',
  NSW: 'Landlords must test and clean smoke alarms or have them tested annually.',
};
const DEFAULT_INFO = 'Landlords are responsible for ensuring smoke alarms are installed and in working order at the start of each tenancy.';

interface Props {
  propertyId: string;
  propertyState: string | null;
  agentId: string;
}

const SmokeAlarmPanel = ({ propertyId, propertyState, agentId }: Props) => {
  const stateUpper = propertyState?.toUpperCase() || null;
  const isQLD = stateUpper === 'QLD';
  const infoText = (stateUpper && STATE_INFO[stateUpper]) || DEFAULT_INFO;

  const [loading, setLoading] = useState(true);
  const [records, setRecords] = useState<SmokeAlarmRecord[]>([]);
  const [showAdd, setShowAdd] = useState(false);
  const [historyOpen, setHistoryOpen] = useState(false);
  const [saving, setSaving] = useState(false);

  const [form, setForm] = useState({
    service_date: format(new Date(), 'yyyy-MM-dd'),
    alarm_type: 'photoelectric',
    alarm_count: 1,
    next_service_due: format(addMonths(new Date(), 12), 'yyyy-MM-dd'),
    compliance_status: 'compliant',
    certificate_number: '',
    technician_name: '',
    technician_company: '',
    notes: '',
  });

  const fetchRecords = useCallback(async () => {
    setLoading(true);
    const { data } = await supabase
      .from('smoke_alarm_records')
      .select('*')
      .eq('property_id', propertyId)
      .order('service_date', { ascending: false });
    setRecords((data || []) as SmokeAlarmRecord[]);
    setLoading(false);
  }, [propertyId]);

  useEffect(() => { fetchRecords(); }, [fetchRecords]);

  // Auto-update next_service_due when service_date changes
  const handleServiceDateChange = (val: string) => {
    setForm(prev => ({
      ...prev,
      service_date: val,
      next_service_due: val ? format(addMonths(parseISO(val), 12), 'yyyy-MM-dd') : prev.next_service_due,
    }));
  };

  const saveRecord = async () => {
    if (!form.service_date || !form.next_service_due) {
      toast.error('Service date and next due date required');
      return;
    }
    if (isQLD && !form.certificate_number.trim()) {
      toast.error('QLD requires a compliance certificate number');
      return;
    }
    setSaving(true);
    const { error } = await supabase.from('smoke_alarm_records').insert({
      property_id: propertyId,
      agent_id: agentId,
      service_date: form.service_date,
      next_service_due: form.next_service_due,
      alarm_type: form.alarm_type,
      alarm_count: form.alarm_count || 1,
      compliance_status: form.compliance_status,
      certificate_number: form.certificate_number || null,
      technician_name: form.technician_name || null,
      technician_company: form.technician_company || null,
      notes: form.notes || null,
    } as any);
    setSaving(false);
    if (error) { toast.error('Failed to save'); return; }
    toast.success('Service record saved');
    setShowAdd(false);
    setForm({
      service_date: format(new Date(), 'yyyy-MM-dd'),
      alarm_type: 'photoelectric',
      alarm_count: 1,
      next_service_due: format(addMonths(new Date(), 12), 'yyyy-MM-dd'),
      compliance_status: 'compliant',
      certificate_number: '',
      technician_name: '',
      technician_company: '',
      notes: '',
    });
    fetchRecords();
  };

  const latest = records[0];
  const today = new Date();
  const daysToNext = latest ? differenceInDays(parseISO(latest.next_service_due), today) : null;
  const isOverdue = daysToNext !== null && daysToNext < 0;
  const isDueSoon = daysToNext !== null && daysToNext >= 0 && daysToNext <= 60;

  const dueColor = isOverdue ? 'text-red-700' : isDueSoon ? 'text-amber-700' : 'text-emerald-700';

  return (
    <Card>
      <CardContent className="p-4 space-y-4">
        <div className="flex items-start justify-between gap-2 flex-wrap">
          <div className="flex items-center gap-2">
            <Flame size={16} className="text-orange-600" />
            <h2 className="text-sm font-semibold">Smoke Alarm Compliance</h2>
          </div>
          <Button size="sm" variant="outline" onClick={() => setShowAdd(true)}>
            <Plus size={14} className="mr-1" /> Add Service Record
          </Button>
        </div>

        {/* State info */}
        <div className="flex items-start gap-2 px-3 py-2 rounded-lg bg-amber-500/10 border border-amber-500/20">
          <AlertTriangle size={14} className="text-amber-600 shrink-0 mt-0.5" />
          <p className="text-xs text-amber-800">{infoText}</p>
        </div>

        {loading ? (
          <div className="flex justify-center py-6"><Loader2 className="animate-spin text-primary" size={20} /></div>
        ) : !latest ? (
          <p className="text-sm text-muted-foreground py-4 text-center">No service records yet.</p>
        ) : (
          <>
            {isOverdue && (
              <div className="flex items-start gap-2 px-3 py-2 rounded-lg bg-red-500/10 border border-red-500/20">
                <ShieldAlert size={14} className="text-red-600 shrink-0 mt-0.5" />
                <p className="text-xs text-red-700 font-medium">
                  Smoke alarm service is overdue — last serviced {Math.abs(differenceInDays(today, parseISO(latest.service_date)))} days ago
                </p>
              </div>
            )}

            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 text-sm">
              <div>
                <p className="text-xs text-muted-foreground">Last Serviced</p>
                <p className="font-medium">{format(parseISO(latest.service_date), 'dd MMM yyyy')}</p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Next Due</p>
                <p className={cn('font-medium', dueColor)}>
                  {format(parseISO(latest.next_service_due), 'dd MMM yyyy')}
                </p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Status</p>
                <Badge className={cn('border-0', STATUS_COLORS[latest.compliance_status] || 'bg-muted')}>
                  {STATUS_LABEL[latest.compliance_status] || latest.compliance_status}
                </Badge>
              </div>
              {latest.certificate_number && (
                <div>
                  <p className="text-xs text-muted-foreground">Certificate</p>
                  <p className="font-medium text-xs">{latest.certificate_number}</p>
                </div>
              )}
              {(latest.technician_name || latest.technician_company) && (
                <div className="col-span-2">
                  <p className="text-xs text-muted-foreground">Technician</p>
                  <p className="text-xs">
                    {[latest.technician_name, latest.technician_company].filter(Boolean).join(' · ')}
                  </p>
                </div>
              )}
            </div>

            {records.length > 1 && (
              <Collapsible open={historyOpen} onOpenChange={setHistoryOpen}>
                <CollapsibleTrigger asChild>
                  <Button variant="ghost" size="sm" className="w-full justify-between">
                    <span className="text-xs">Service History ({records.length - 1} previous)</span>
                    <ChevronDown size={14} className={cn('transition-transform', historyOpen && 'rotate-180')} />
                  </Button>
                </CollapsibleTrigger>
                <CollapsibleContent>
                  <div className="overflow-x-auto -mx-4 sm:mx-0">
                    <table className="w-full text-xs min-w-[560px]">
                      <thead>
                        <tr className="border-b border-border text-muted-foreground">
                          <th className="text-left font-medium py-2 px-2">Date</th>
                          <th className="text-left font-medium py-2 px-2">Type</th>
                          <th className="text-left font-medium py-2 px-2">Count</th>
                          <th className="text-left font-medium py-2 px-2">Status</th>
                          <th className="text-left font-medium py-2 px-2">Certificate</th>
                          <th className="text-left font-medium py-2 px-2">Technician</th>
                        </tr>
                      </thead>
                      <tbody>
                        {records.slice(1).map(r => (
                          <tr key={r.id} className="border-b border-border/50">
                            <td className="py-2 px-2">{format(parseISO(r.service_date), 'dd MMM yyyy')}</td>
                            <td className="py-2 px-2">{r.alarm_type ? ALARM_LABEL[r.alarm_type] : '—'}</td>
                            <td className="py-2 px-2">{r.alarm_count}</td>
                            <td className="py-2 px-2">
                              <Badge className={cn('border-0 text-[10px]', STATUS_COLORS[r.compliance_status] || 'bg-muted')}>
                                {STATUS_LABEL[r.compliance_status] || r.compliance_status}
                              </Badge>
                            </td>
                            <td className="py-2 px-2">{r.certificate_number || '—'}</td>
                            <td className="py-2 px-2">{[r.technician_name, r.technician_company].filter(Boolean).join(' · ') || '—'}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </CollapsibleContent>
              </Collapsible>
            )}
          </>
        )}

        {/* Add modal */}
        <Dialog open={showAdd} onOpenChange={setShowAdd}>
          <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
            <DialogHeader><DialogTitle>Record Smoke Alarm Service</DialogTitle></DialogHeader>
            <div className="space-y-3">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label className="text-xs">Service Date *</Label>
                  <Input type="date" value={form.service_date} onChange={e => handleServiceDateChange(e.target.value)} />
                </div>
                <div>
                  <Label className="text-xs">Next Service Due *</Label>
                  <Input type="date" value={form.next_service_due} onChange={e => setForm({ ...form, next_service_due: e.target.value })} />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label className="text-xs">Alarm Type</Label>
                  <Select value={form.alarm_type} onValueChange={v => setForm({ ...form, alarm_type: v })}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {ALARM_TYPES.map(a => <SelectItem key={a.value} value={a.value}>{a.label}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label className="text-xs">Number of Alarms</Label>
                  <Input type="number" min={1} value={form.alarm_count} onChange={e => setForm({ ...form, alarm_count: parseInt(e.target.value) || 1 })} />
                </div>
              </div>

              <div>
                <Label className="text-xs">Compliance Status</Label>
                <Select value={form.compliance_status} onValueChange={v => setForm({ ...form, compliance_status: v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="compliant">Compliant</SelectItem>
                    <SelectItem value="non_compliant">Non-Compliant</SelectItem>
                    <SelectItem value="requires_attention">Requires Attention</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label className="text-xs">
                  {isQLD ? 'QLD Compliance Certificate Number (required for new tenancies)' : 'Certificate / Reference Number (optional)'}
                </Label>
                <Input value={form.certificate_number} onChange={e => setForm({ ...form, certificate_number: e.target.value })} />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label className="text-xs">Technician Name</Label>
                  <Input value={form.technician_name} onChange={e => setForm({ ...form, technician_name: e.target.value })} />
                </div>
                <div>
                  <Label className="text-xs">Technician Company</Label>
                  <Input value={form.technician_company} onChange={e => setForm({ ...form, technician_company: e.target.value })} />
                </div>
              </div>

              <div>
                <Label className="text-xs">Notes</Label>
                <Textarea rows={3} value={form.notes} onChange={e => setForm({ ...form, notes: e.target.value })} />
              </div>
            </div>
            <DialogFooter>
              <Button variant="ghost" onClick={() => setShowAdd(false)} disabled={saving}>Cancel</Button>
              <Button onClick={saveRecord} disabled={saving}>
                {saving ? <Loader2 className="animate-spin mr-1" size={14} /> : <ShieldCheck size={14} className="mr-1" />}
                Save Record
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </CardContent>
    </Card>
  );
};

export default SmokeAlarmPanel;
