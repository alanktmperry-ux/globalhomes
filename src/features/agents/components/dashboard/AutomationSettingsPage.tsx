import { useEffect, useMemo, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAgentId } from '@/features/crm/hooks/useAgentId';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Mail, Play, Pencil, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import { format } from 'date-fns';

type Rule = {
  id: string;
  agent_id: string;
  rule_type: 'arrears_sequence' | 'lease_renewal_notice' | 'inspection_entry_notice' | 'maintenance_update';
  trigger_day: number | null;
  trigger_event: string | null;
  channel: string;
  template_subject: string | null;
  template_body: string | null;
  is_active: boolean;
};

type LogEntry = {
  id: string;
  recipient_email: string | null;
  subject: string | null;
  sent_at: string;
  status: 'sent' | 'failed' | 'skipped';
};

const SECTIONS: { key: Rule['rule_type']; title: string; subtitle: string; mergeFields: string[] }[] = [
  {
    key: 'arrears_sequence',
    title: 'Arrears reminders',
    subtitle: 'Sent automatically when a tenant falls X days behind on rent.',
    mergeFields: ['tenant_name', 'property_address', 'amount_overdue', 'days_overdue', 'agent_name', 'agent_phone'],
  },
  {
    key: 'lease_renewal_notice',
    title: 'Lease renewal notices',
    subtitle: 'Triggered as the lease end date approaches.',
    mergeFields: ['tenant_name', 'property_address', 'lease_end_date', 'agent_name', 'agent_phone'],
  },
  {
    key: 'inspection_entry_notice',
    title: 'Inspection entry notices',
    subtitle: 'Sent ahead of scheduled property inspections.',
    mergeFields: ['tenant_name', 'property_address', 'inspection_date', 'inspection_time', 'agent_name', 'agent_phone'],
  },
  {
    key: 'maintenance_update',
    title: 'Maintenance status updates',
    subtitle: 'Fired automatically when a maintenance job changes status.',
    mergeFields: ['tenant_name', 'property_address', 'job_title', 'agent_name', 'agent_phone'],
  },
];

function triggerLabel(rule: Rule): string {
  if (rule.rule_type === 'arrears_sequence') return `Day ${rule.trigger_day} overdue`;
  if (rule.rule_type === 'lease_renewal_notice') return `${rule.trigger_day} days before lease end`;
  if (rule.rule_type === 'inspection_entry_notice')
    return rule.trigger_day === 1 ? '24 hours before' : `${rule.trigger_day} days before`;
  if (rule.rule_type === 'maintenance_update')
    return `On status: ${rule.trigger_event?.replace('_', ' ') ?? '—'}`;
  return '—';
}

const AutomationSettingsPage = () => {
  const agentId = useAgentId();
  const [rules, setRules] = useState<Rule[]>([]);
  const [log, setLog] = useState<LogEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [running, setRunning] = useState<string | null>(null);
  const [editing, setEditing] = useState<Rule | null>(null);
  const [editSubject, setEditSubject] = useState('');
  const [editBody, setEditBody] = useState('');
  const [savingEdit, setSavingEdit] = useState(false);

  const fetchAll = async () => {
    if (!agentId) return;
    setLoading(true);
    const [{ data: r }, { data: l }] = await Promise.all([
      supabase.from('pm_automation_rules' as any).select('*').eq('agent_id', agentId).order('rule_type').order('trigger_day', { nullsFirst: false }),
      supabase.from('pm_automation_log' as any).select('id, recipient_email, subject, sent_at, status').eq('agent_id', agentId).order('sent_at', { ascending: false }).limit(20),
    ]);
    setRules((r as any) ?? []);
    setLog((l as any) ?? []);
    setLoading(false);
  };

  useEffect(() => { fetchAll(); }, [agentId]);

  const grouped = useMemo(() => {
    const map = new Map<string, Rule[]>();
    for (const r of rules) {
      if (!map.has(r.rule_type)) map.set(r.rule_type, []);
      map.get(r.rule_type)!.push(r);
    }
    return map;
  }, [rules]);

  const toggleActive = async (rule: Rule, next: boolean) => {
    setRules((prev) => prev.map((x) => (x.id === rule.id ? { ...x, is_active: next } : x)));
    const { error } = await supabase.from('pm_automation_rules' as any).update({ is_active: next }).eq('id', rule.id);
    if (error) {
      toast.error('Could not update rule');
      setRules((prev) => prev.map((x) => (x.id === rule.id ? { ...x, is_active: !next } : x)));
    }
  };

  const openEdit = (rule: Rule) => {
    setEditing(rule);
    setEditSubject(rule.template_subject ?? '');
    setEditBody(rule.template_body ?? '');
  };

  const saveEdit = async () => {
    if (!editing) return;
    setSavingEdit(true);
    const { error } = await supabase
      .from('pm_automation_rules' as any)
      .update({ template_subject: editSubject, template_body: editBody })
      .eq('id', editing.id);
    setSavingEdit(false);
    if (error) { toast.error('Save failed'); return; }
    toast.success('Template saved');
    setEditing(null);
    fetchAll();
  };

  const runNow = async (ruleType: Rule['rule_type']) => {
    if (ruleType === 'maintenance_update') {
      toast.info('Maintenance updates fire automatically when a job status changes.');
      return;
    }
    setRunning(ruleType);
    const { data, error } = await supabase.functions.invoke('run-pm-automations', {
      body: { rule_type: ruleType, agent_id: agentId },
    });
    setRunning(null);
    if (error) { toast.error(error.message); return; }
    const processed = (data as any)?.result?.processed ?? 0;
    toast.success(processed > 0 ? `Sent ${processed} email${processed === 1 ? '' : 's'}` : 'No matching tenancies right now');
    fetchAll();
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Automation</h1>
        <p className="text-sm text-muted-foreground">
          Multi-step communication sequences for property management. Toggle individual steps on or off, edit templates, or run a sequence now to test.
        </p>
      </div>

      {SECTIONS.map((section) => {
        const sectionRules = (grouped.get(section.key) ?? []).sort(
          (a, b) => (a.trigger_day ?? 0) - (b.trigger_day ?? 0),
        );
        return (
          <Card key={section.key}>
            <CardHeader className="flex flex-row items-start justify-between gap-4">
              <div>
                <CardTitle className="text-lg">{section.title}</CardTitle>
                <p className="text-sm text-muted-foreground mt-1">{section.subtitle}</p>
              </div>
              <Button
                variant="outline"
                size="sm"
                onClick={() => runNow(section.key)}
                disabled={running === section.key}
              >
                {running === section.key ? <Loader2 className="h-4 w-4 animate-spin" /> : <Play className="h-4 w-4" />}
                Run now
              </Button>
            </CardHeader>
            <CardContent>
              {loading ? (
                <div className="text-sm text-muted-foreground">Loading…</div>
              ) : sectionRules.length === 0 ? (
                <div className="text-sm text-muted-foreground">No rules yet.</div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="w-[220px]">Trigger</TableHead>
                      <TableHead className="w-[100px]">Channel</TableHead>
                      <TableHead>Subject</TableHead>
                      <TableHead className="w-[80px]">Active</TableHead>
                      <TableHead className="w-[120px] text-right">Edit</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {sectionRules.map((rule) => (
                      <TableRow key={rule.id}>
                        <TableCell className="font-medium">{triggerLabel(rule)}</TableCell>
                        <TableCell>
                          <Badge variant="secondary" className="gap-1"><Mail className="h-3 w-3" />Email</Badge>
                        </TableCell>
                        <TableCell className="max-w-[360px] truncate">{rule.template_subject}</TableCell>
                        <TableCell>
                          <Switch checked={rule.is_active} onCheckedChange={(v) => toggleActive(rule, v)} />
                        </TableCell>
                        <TableCell className="text-right">
                          <Button variant="ghost" size="sm" onClick={() => openEdit(rule)}>
                            <Pencil className="h-4 w-4" /> Edit
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        );
      })}

      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Recent sends</CardTitle>
          <p className="text-sm text-muted-foreground">Last 20 automated emails.</p>
        </CardHeader>
        <CardContent>
          {log.length === 0 ? (
            <div className="text-sm text-muted-foreground">Nothing sent yet.</div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Recipient</TableHead>
                  <TableHead>Subject</TableHead>
                  <TableHead className="w-[180px]">Sent</TableHead>
                  <TableHead className="w-[100px]">Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {log.map((row) => (
                  <TableRow key={row.id}>
                    <TableCell className="text-sm">{row.recipient_email}</TableCell>
                    <TableCell className="text-sm max-w-[360px] truncate">{row.subject}</TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                      {format(new Date(row.sent_at), 'd MMM, h:mm a')}
                    </TableCell>
                    <TableCell>
                      <Badge
                        variant={row.status === 'sent' ? 'default' : row.status === 'failed' ? 'destructive' : 'secondary'}
                        className={row.status === 'sent' ? 'bg-emerald-600 hover:bg-emerald-600' : ''}
                      >
                        {row.status}
                      </Badge>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      <Dialog open={!!editing} onOpenChange={(o) => !o && setEditing(null)}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Edit template — {editing && triggerLabel(editing)}</DialogTitle>
          </DialogHeader>
          {editing && (
            <div className="space-y-4">
              <div>
                <label className="text-sm font-medium">Subject</label>
                <Input value={editSubject} onChange={(e) => setEditSubject(e.target.value)} className="mt-1" />
              </div>
              <div>
                <label className="text-sm font-medium">Body</label>
                <Textarea
                  value={editBody}
                  onChange={(e) => setEditBody(e.target.value)}
                  rows={12}
                  className="mt-1 font-mono text-sm"
                />
              </div>
              <div className="text-xs text-muted-foreground">
                <span className="font-semibold">Available merge fields:</span>{' '}
                {SECTIONS.find((s) => s.key === editing.rule_type)?.mergeFields.map((f) => `{${f}}`).join(', ')}
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditing(null)}>Cancel</Button>
            <Button onClick={saveEdit} disabled={savingEdit}>
              {savingEdit && <Loader2 className="h-4 w-4 animate-spin" />} Save
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default AutomationSettingsPage;
