import { useEffect, useMemo, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/features/auth/AuthProvider';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Plus, Trash2, Loader2, AlertTriangle, Play } from 'lucide-react';
import { toast } from 'sonner';
import { format } from 'date-fns';
import { logAction } from '@/shared/lib/auditLog';

type TriggerType =
  | 'lead_going_cold'
  | 'hot_lead_new'
  | 'inspection_followup'
  | 'appraisal_followup'
  | 'under_offer_stale'
  | 'settlement_reminder';

type ActionType = 'notify_agent' | 'suggest_template' | 'create_task' | 'set_next_action';

type Rule = {
  id: string;
  agency_id: string;
  name: string;
  trigger_type: TriggerType;
  conditions: Record<string, any>;
  action_type: ActionType;
  action_config: Record<string, any>;
  is_active: boolean;
  source_data_available: boolean;
  created_at: string;
};

type LogRow = {
  id: string;
  rule_id: string;
  target_id: string;
  target_type: string;
  fired_at: string;
  action_taken: string | null;
  error_msg: string | null;
};

const TRIGGER_LABELS: Record<TriggerType, string> = {
  hot_lead_new: 'Hot lead arrives',
  lead_going_cold: 'Lead going cold',
  inspection_followup: 'Inspection follow-up',
  appraisal_followup: 'Appraisal follow-up',
  under_offer_stale: 'Under Offer stale',
  settlement_reminder: 'Settlement reminder',
};

const SOURCE_UNAVAILABLE: Partial<Record<TriggerType, string>> = {
  inspection_followup: 'Requires open-home attendance tracking — currently no agents marking attendance.',
  appraisal_followup: 'Requires appraisals table — not yet built.',
  settlement_reminder: 'Requires properties.settlement_date — not yet built.',
};

const TRIGGER_ORDER: TriggerType[] = [
  'hot_lead_new',
  'lead_going_cold',
  'inspection_followup',
  'under_offer_stale',
  'appraisal_followup',
  'settlement_reminder',
];

export default function AgencyAutomationsPage() {
  const { user } = useAuth();
  const [agencyId, setAgencyId] = useState<string | null>(null);
  const [agentId, setAgentId] = useState<string | null>(null);
  const [isAdmin, setIsAdmin] = useState(false);
  const [rules, setRules] = useState<Rule[]>([]);
  const [log, setLog] = useState<LogRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [running, setRunning] = useState(false);
  const [addOpen, setAddOpen] = useState(false);

  // load agency/role
  useEffect(() => {
    if (!user) return;
    (async () => {
      const { data: agent } = await supabase
        .from('agents')
        .select('id, agency_id')
        .eq('user_id', user.id)
        .maybeSingle();
      if (!agent?.agency_id) { setLoading(false); return; }
      setAgentId(agent.id);
      setAgencyId(agent.agency_id);
      const { data: member } = await supabase
        .from('agency_members')
        .select('role')
        .eq('agency_id', agent.agency_id)
        .eq('user_id', user.id)
        .maybeSingle();
      setIsAdmin(['owner', 'admin', 'principal'].includes(member?.role ?? ''));
    })();
  }, [user]);

  const fetchAll = async () => {
    if (!agencyId) return;
    setLoading(true);
    const [{ data: r }, { data: l }] = await Promise.all([
      supabase.from('automation_rules').select('*').eq('agency_id', agencyId).order('trigger_type'),
      supabase.from('automation_log').select('*').eq('agency_id', agencyId).order('fired_at', { ascending: false }).limit(30),
    ]);
    setRules((r as any) ?? []);
    setLog((l as any) ?? []);
    setLoading(false);
  };

  useEffect(() => { fetchAll(); }, [agencyId]);

  const grouped = useMemo(() => {
    const m = new Map<TriggerType, Rule[]>();
    for (const r of rules) {
      if (!m.has(r.trigger_type)) m.set(r.trigger_type, []);
      m.get(r.trigger_type)!.push(r);
    }
    return m;
  }, [rules]);

  const toggleActive = async (rule: Rule, next: boolean) => {
    if (!isAdmin) { toast.error('Admin only'); return; }
    if (next && !rule.source_data_available) {
      toast.error('Source data not yet available for this trigger');
      return;
    }
    setRules((prev) => prev.map((x) => (x.id === rule.id ? { ...x, is_active: next } : x)));
    const { error } = await supabase.from('automation_rules').update({ is_active: next }).eq('id', rule.id);
    if (error) {
      toast.error('Update failed');
      setRules((prev) => prev.map((x) => (x.id === rule.id ? { ...x, is_active: !next } : x)));
      return;
    }
    if (user) {
      logAction({
        agencyId, agentId, userId: user.id,
        actionType: next ? 'rule_enabled' : 'rule_disabled',
        entityType: 'automation_rule', entityId: rule.id,
        description: `${next ? 'Enabled' : 'Disabled'} rule: ${rule.name}`,
      });
    }
  };

  const deleteRule = async (rule: Rule) => {
    if (!isAdmin) return;
    if (!confirm(`Delete rule "${rule.name}"?`)) return;
    const { error } = await supabase.from('automation_rules').delete().eq('id', rule.id);
    if (error) { toast.error('Delete failed'); return; }
    if (user) {
      logAction({
        agencyId, agentId, userId: user.id,
        actionType: 'rule_deleted', entityType: 'automation_rule', entityId: rule.id,
        description: `Deleted rule: ${rule.name}`,
      });
    }
    fetchAll();
  };

  const runNow = async () => {
    setRunning(true);
    const { data, error } = await supabase.functions.invoke('run-automation-rules', { body: {} });
    setRunning(false);
    if (error) { toast.error(error.message); return; }
    const summary = (data as any)?.summary ?? {};
    const totalFired = Object.values(summary).reduce((s: number, x: any) => s + (x?.fired ?? 0), 0);
    toast.success(`Run complete — ${totalFired} action${totalFired === 1 ? '' : 's'} fired`);
    fetchAll();
  };

  if (!user) return <div className="p-6">Sign in required.</div>;
  if (!agencyId) return <div className="p-6 text-sm text-muted-foreground">Not part of an agency.</div>;

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold">Agency automations</h1>
          <p className="text-sm text-muted-foreground">
            Rule-based triggers that watch your CRM and fire actions automatically. Runs every 15 minutes.
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={runNow} disabled={running}>
            {running ? <Loader2 className="h-4 w-4 animate-spin" /> : <Play className="h-4 w-4" />}
            Run now
          </Button>
          {isAdmin && (
            <Button size="sm" onClick={() => setAddOpen(true)}>
              <Plus className="h-4 w-4" /> Add rule
            </Button>
          )}
        </div>
      </div>

      {!isAdmin && (
        <Card><CardContent className="p-4 text-sm text-muted-foreground">
          You're viewing in read-only mode. Owner/admin/principal can edit rules.
        </CardContent></Card>
      )}

      {TRIGGER_ORDER.map((trig) => {
        const list = grouped.get(trig) ?? [];
        if (list.length === 0) return null;
        return (
          <Card key={trig}>
            <CardHeader>
              <div className="flex items-center justify-between gap-3">
                <CardTitle className="text-lg">{TRIGGER_LABELS[trig]}</CardTitle>
                {SOURCE_UNAVAILABLE[trig] && (
                  <Badge variant="outline" className="gap-1 text-amber-700 border-amber-300">
                    <AlertTriangle className="h-3 w-3" /> Source data unavailable
                  </Badge>
                )}
              </div>
              {SOURCE_UNAVAILABLE[trig] && (
                <p className="text-xs text-muted-foreground mt-1">{SOURCE_UNAVAILABLE[trig]}</p>
              )}
            </CardHeader>
            <CardContent>
              {loading ? (
                <div className="text-sm text-muted-foreground">Loading…</div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Rule</TableHead>
                      <TableHead className="w-[180px]">Action</TableHead>
                      <TableHead className="w-[260px]">Conditions</TableHead>
                      <TableHead className="w-[80px]">Active</TableHead>
                      {isAdmin && <TableHead className="w-[60px]" />}
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {list.map((rule) => (
                      <TableRow key={rule.id}>
                        <TableCell className="font-medium">{rule.name}</TableCell>
                        <TableCell>
                          <Badge variant="secondary">{rule.action_type.replace('_', ' ')}</Badge>
                          <div className="text-xs text-muted-foreground mt-1">
                            {rule.action_config?.recipient && `→ ${rule.action_config.recipient}`}
                            {rule.action_config?.channel && ` · ${rule.action_config.channel}`}
                          </div>
                        </TableCell>
                        <TableCell className="text-xs font-mono text-muted-foreground">
                          {Object.entries(rule.conditions ?? {}).map(([k, v]) => (
                            <div key={k}>{k}: {Array.isArray(v) ? v.join(',') : String(v)}</div>
                          ))}
                        </TableCell>
                        <TableCell>
                          <Switch
                            checked={rule.is_active}
                            onCheckedChange={(v) => toggleActive(rule, v)}
                            disabled={!isAdmin || (!rule.source_data_available && !rule.is_active)}
                          />
                        </TableCell>
                        {isAdmin && (
                          <TableCell>
                            <Button variant="ghost" size="icon" onClick={() => deleteRule(rule)}>
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </TableCell>
                        )}
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
        <CardHeader><CardTitle className="text-lg">Recent firings</CardTitle></CardHeader>
        <CardContent>
          {log.length === 0 ? (
            <div className="text-sm text-muted-foreground">No firings yet.</div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Rule</TableHead>
                  <TableHead>Target</TableHead>
                  <TableHead>Action</TableHead>
                  <TableHead className="w-[160px]">When</TableHead>
                  <TableHead>Error</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {log.map((row) => {
                  const rule = rules.find((r) => r.id === row.rule_id);
                  return (
                    <TableRow key={row.id}>
                      <TableCell className="text-sm">{rule?.name ?? row.rule_id.slice(0, 8)}</TableCell>
                      <TableCell className="text-xs text-muted-foreground">{row.target_type}: {row.target_id.slice(0, 8)}</TableCell>
                      <TableCell className="text-sm">{row.action_taken ?? '—'}</TableCell>
                      <TableCell className="text-xs text-muted-foreground">{format(new Date(row.fired_at), 'd MMM, h:mm a')}</TableCell>
                      <TableCell className="text-xs text-destructive">{row.error_msg ?? ''}</TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {addOpen && agencyId && user && (
        <AddRuleDialog
          agencyId={agencyId}
          userId={user.id}
          agentId={agentId}
          onClose={() => setAddOpen(false)}
          onSaved={() => { setAddOpen(false); fetchAll(); }}
        />
      )}
    </div>
  );
}

function AddRuleDialog({
  agencyId, userId, agentId, onClose, onSaved,
}: { agencyId: string; userId: string; agentId: string | null; onClose: () => void; onSaved: () => void }) {
  const [name, setName] = useState('');
  const [trigger, setTrigger] = useState<TriggerType>('hot_lead_new');
  const [action, setAction] = useState<ActionType>('notify_agent');
  const [conditions, setConditions] = useState('{}');
  const [actionConfig, setActionConfig] = useState('{"channel":"in_app","recipient":"assigned"}');
  const [saving, setSaving] = useState(false);

  const save = async () => {
    let cond: any, cfg: any;
    try { cond = JSON.parse(conditions); cfg = JSON.parse(actionConfig); }
    catch { toast.error('Invalid JSON in conditions or action_config'); return; }

    setSaving(true);
    const sourceUnavailable = ['inspection_followup', 'appraisal_followup', 'settlement_reminder'].includes(trigger);
    const { data, error } = await supabase.from('automation_rules').insert({
      agency_id: agencyId,
      name: name || `${TRIGGER_LABELS[trigger]} rule`,
      trigger_type: trigger,
      conditions: cond,
      action_type: action,
      action_config: cfg,
      is_active: !sourceUnavailable,
      source_data_available: !sourceUnavailable,
      created_by: userId,
    }).select().maybeSingle();
    setSaving(false);
    if (error) { toast.error(error.message); return; }
    logAction({
      agencyId, agentId, userId,
      actionType: 'rule_created', entityType: 'automation_rule', entityId: data?.id,
      description: `Created rule: ${name}`,
    });
    toast.success('Rule created');
    onSaved();
  };

  return (
    <Dialog open onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-xl">
        <DialogHeader><DialogTitle>New automation rule</DialogTitle></DialogHeader>
        <div className="space-y-3">
          <div>
            <label className="text-sm font-medium">Name</label>
            <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. New buyer leads → notify Sarah" />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-sm font-medium">Trigger</label>
              <Select value={trigger} onValueChange={(v) => setTrigger(v as TriggerType)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {TRIGGER_ORDER.map((t) => (
                    <SelectItem key={t} value={t}>
                      {TRIGGER_LABELS[t]}{SOURCE_UNAVAILABLE[t] ? ' (source unavailable)' : ''}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <label className="text-sm font-medium">Action</label>
              <Select value={action} onValueChange={(v) => setAction(v as ActionType)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="notify_agent">Notify agent</SelectItem>
                  <SelectItem value="suggest_template">Suggest template</SelectItem>
                  <SelectItem value="create_task">Create task</SelectItem>
                  <SelectItem value="set_next_action">Set next action</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <div>
            <label className="text-sm font-medium">Conditions (JSON)</label>
            <Textarea value={conditions} onChange={(e) => setConditions(e.target.value)} rows={3} className="font-mono text-xs" />
          </div>
          <div>
            <label className="text-sm font-medium">Action config (JSON)</label>
            <Textarea value={actionConfig} onChange={(e) => setActionConfig(e.target.value)} rows={3} className="font-mono text-xs" />
          </div>
          {SOURCE_UNAVAILABLE[trigger] && (
            <div className="text-xs text-amber-700 bg-amber-50 border border-amber-200 rounded p-2">
              ⚠️ {SOURCE_UNAVAILABLE[trigger]} The rule will be created in disabled state.
            </div>
          )}
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Cancel</Button>
          <Button onClick={save} disabled={saving}>
            {saving && <Loader2 className="h-4 w-4 animate-spin" />} Save
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
