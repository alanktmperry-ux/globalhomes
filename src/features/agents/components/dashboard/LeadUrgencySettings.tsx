import { useEffect, useState } from 'react';
import { Flame, Loader2 } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import { DEFAULT_THRESHOLDS } from '@/features/crm/lib/urgency';

/**
 * Configures Hot/Warm/Cool/Cold tier thresholds for the agency (or solo agent).
 * Hot = uncontacted (sticky), Warm = recent contact, Cool = mid, Cold = stale.
 */
export default function LeadUrgencySettings() {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [scope, setScope] = useState<{ agency_id: string | null; agent_id: string } | null>(null);
  const [canEdit, setCanEdit] = useState(false);
  const [warmHrs, setWarmHrs] = useState(DEFAULT_THRESHOLDS.warm_max_hours);
  const [coolDays, setCoolDays] = useState(DEFAULT_THRESHOLDS.cool_max_days);
  const [warnDays, setWarnDays] = useState(DEFAULT_THRESHOLDS.going_cold_warn_days);

  useEffect(() => {
    (async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { setLoading(false); return; }

      const { data: agent } = await supabase
        .from('agents')
        .select('id, agency_id, agency_role')
        .eq('user_id', user.id)
        .maybeSingle();
      if (!agent) { setLoading(false); return; }

      setScope({ agency_id: agent.agency_id, agent_id: agent.id });
      // Solo agents always edit their own; agency members need principal/admin
      setCanEdit(!agent.agency_id || ['principal', 'admin'].includes(agent.agency_role || ''));

      let row: any = null;
      if (agent.agency_id) {
        const { data } = await supabase
          .from('crm_urgency_settings' as any)
          .select('*')
          .eq('agency_id', agent.agency_id)
          .maybeSingle();
        row = data;
      } else {
        const { data } = await supabase
          .from('crm_urgency_settings' as any)
          .select('*')
          .eq('agent_id', agent.id)
          .is('agency_id', null)
          .maybeSingle();
        row = data;
      }

      if (row) {
        setWarmHrs(row.warm_max_hours);
        setCoolDays(row.cool_max_days);
        setWarnDays(row.going_cold_warn_days);
      }
      setLoading(false);
    })();
  }, []);

  const save = async () => {
    if (!scope || !canEdit) return;
    setSaving(true);
    const payload = {
      agency_id: scope.agency_id,
      agent_id: scope.agency_id ? null : scope.agent_id,
      warm_max_hours: warmHrs,
      cool_max_days: coolDays,
      going_cold_warn_days: warnDays,
    };
    const conflict = scope.agency_id ? 'agency_id' : 'agent_id';
    const { error } = await supabase
      .from('crm_urgency_settings' as any)
      .upsert(payload, { onConflict: conflict });
    setSaving(false);
    if (error) toast.error('Failed to save: ' + error.message);
    else toast.success('Lead urgency thresholds saved');
  };

  if (loading) {
    return (
      <div className="bg-card border border-border rounded-xl p-5 flex items-center gap-2 text-sm text-muted-foreground">
        <Loader2 size={14} className="animate-spin" /> Loading…
      </div>
    );
  }

  return (
    <div className="bg-card border border-border rounded-xl p-5 space-y-4">
      <div>
        <h3 className="font-display text-sm font-bold flex items-center gap-1.5">
          <Flame size={14} /> Lead Urgency Thresholds
        </h3>
        <p className="text-xs text-muted-foreground mt-1">
          Tune when leads escalate from Warm → Cool → Cold. <strong>Hot</strong> always means
          uncontacted leads — no threshold needed.
        </p>
      </div>

      <div className="grid sm:grid-cols-3 gap-3">
        <div>
          <Label className="text-xs">Warm window (hours)</Label>
          <Input
            type="number" min={1} max={168}
            value={warmHrs}
            onChange={e => setWarmHrs(Math.max(1, parseInt(e.target.value) || 1))}
            disabled={!canEdit}
            className="bg-secondary border-border"
          />
          <p className="text-[10px] text-muted-foreground mt-1">Contacted within this many hours</p>
        </div>
        <div>
          <Label className="text-xs">Cool window (days)</Label>
          <Input
            type="number" min={1} max={90}
            value={coolDays}
            onChange={e => setCoolDays(Math.max(1, parseInt(e.target.value) || 1))}
            disabled={!canEdit}
            className="bg-secondary border-border"
          />
          <p className="text-[10px] text-muted-foreground mt-1">Beyond this becomes Cold</p>
        </div>
        <div>
          <Label className="text-xs">Cold warning (days)</Label>
          <Input
            type="number" min={1} max={89}
            value={warnDays}
            onChange={e => setWarnDays(Math.max(1, parseInt(e.target.value) || 1))}
            disabled={!canEdit}
            className="bg-secondary border-border"
          />
          <p className="text-[10px] text-muted-foreground mt-1">Notify before going cold</p>
        </div>
      </div>

      {!canEdit && (
        <p className="text-xs text-muted-foreground italic">
          Only agency principals and admins can change these settings.
        </p>
      )}

      {canEdit && (
        <Button onClick={save} disabled={saving} size="sm">
          {saving ? <><Loader2 size={14} className="animate-spin mr-2" /> Saving…</> : 'Save thresholds'}
        </Button>
      )}
    </div>
  );
}
