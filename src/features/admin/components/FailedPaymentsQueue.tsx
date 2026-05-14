import { useEffect, useState, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { AlertTriangle, RefreshCw, Mail, Loader2, CheckCircle2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';

interface FailingAgent {
  id: string;
  name: string;
  email: string;
  agency: string | null;
  payment_failed_at: string | null;
  dunning_stage: 'none' | 'day1' | 'day3' | 'day7' | 'day14_suspended';
  dunning_last_email_at: string | null;
  suspended_at: string | null;
}

const STAGE_LABEL: Record<string, { label: string; tone: string }> = {
  day1: { label: 'Day 1', tone: 'bg-amber-500/15 text-amber-700' },
  day3: { label: 'Day 3', tone: 'bg-orange-500/15 text-orange-700' },
  day7: { label: 'Day 7 — final notice', tone: 'bg-red-500/15 text-red-700' },
  day14_suspended: { label: 'Suspended', tone: 'bg-destructive/15 text-destructive' },
};

const fmtDays = (iso: string | null) => {
  if (!iso) return '—';
  const d = Math.floor((Date.now() - new Date(iso).getTime()) / 86400000);
  return d === 0 ? 'today' : `${d}d ago`;
};

const fmtDate = (iso: string | null) => {
  if (!iso) return '—';
  return new Date(iso).toLocaleDateString('en-AU', { day: '2-digit', month: 'short' });
};

export default function FailedPaymentsQueue() {
  const [agents, setAgents] = useState<FailingAgent[]>([]);
  const [loading, setLoading] = useState(true);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [processorRunning, setProcessorRunning] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from('agents')
      .select('id, name, email, agency, payment_failed_at, dunning_stage, dunning_last_email_at, suspended_at')
      .not('payment_failed_at', 'is', null)
      .neq('dunning_stage', 'none')
      .order('payment_failed_at', { ascending: true });

    if (error) {
      console.error('[FailedPaymentsQueue] load error', error);
      toast.error('Failed to load failing payments');
    } else {
      setAgents((data as FailingAgent[]) || []);
    }
    setLoading(false);
  }, []);

  useEffect(() => { load(); }, [load]);

  const runProcessor = async () => {
    setProcessorRunning(true);
    try {
      const { data, error } = await supabase.functions.invoke('dunning-processor', { method: 'POST' });
      if (error) throw error;
      toast.success(`Processor ran — ${data?.processed ?? 0} agents advanced`);
      await load();
    } catch (e) {
      toast.error(`Processor failed: ${(e as Error).message}`);
    } finally {
      setProcessorRunning(false);
    }
  };

  const resendEmail = async (agent: FailingAgent) => {
    setBusyId(agent.id);
    try {
      const stage = agent.dunning_stage === 'none' ? 'day1' : agent.dunning_stage;
      const { error } = await supabase.functions.invoke('send-dunning-email', {
        body: { agent_id: agent.id, stage },
      });
      if (error) throw error;
      toast.success(`Reminder sent to ${agent.email}`);
      await load();
    } catch (e) {
      toast.error(`Send failed: ${(e as Error).message}`);
    } finally {
      setBusyId(null);
    }
  };

  const markRestored = async (agent: FailingAgent) => {
    if (!confirm(`Mark ${agent.name} as restored? This clears dunning state and re-enables the account.`)) return;
    setBusyId(agent.id);
    try {
      const { error } = await supabase
        .from('agents')
        .update({
          payment_failed_at: null,
          dunning_stage: 'none',
          dunning_last_email_at: null,
          suspended_at: null,
          subscription_status: 'active',
          is_subscribed: true,
        })
        .eq('id', agent.id);
      if (error) throw error;
      await supabase.from('dunning_events').insert({
        agent_id: agent.id,
        event_type: 'manual_action',
        stage: agent.dunning_stage,
        details: { action: 'manual_restore' },
      });
      toast.success(`${agent.name} restored`);
      await load();
    } catch (e) {
      toast.error(`Restore failed: ${(e as Error).message}`);
    } finally {
      setBusyId(null);
    }
  };

  const totalAtRisk = agents.length;
  const suspended = agents.filter(a => a.dunning_stage === 'day14_suspended').length;

  return (
    <div className="bg-card border border-border rounded-2xl p-5">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-destructive/15 flex items-center justify-center">
            <AlertTriangle size={18} className="text-destructive" />
          </div>
          <div>
            <h3 className="text-sm font-semibold text-foreground">Failed Payments Queue</h3>
            <p className="text-xs text-muted-foreground">
              {totalAtRisk} at risk · {suspended} suspended
            </p>
          </div>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={load} className="gap-1.5 text-xs">
            <RefreshCw size={14} /> Refresh
          </Button>
          <Button size="sm" onClick={runProcessor} disabled={processorRunning} className="gap-1.5 text-xs">
            {processorRunning ? <Loader2 size={14} className="animate-spin" /> : <RefreshCw size={14} />}
            Run dunning processor
          </Button>
        </div>
      </div>

      {loading ? (
        <div className="flex justify-center py-10">
          <Loader2 size={20} className="animate-spin text-muted-foreground" />
        </div>
      ) : agents.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-10 text-center">
          <div className="w-12 h-12 rounded-full bg-emerald-500/15 flex items-center justify-center mb-3">
            <CheckCircle2 size={22} className="text-emerald-600" />
          </div>
          <p className="text-sm font-medium text-foreground">No failing payments</p>
          <p className="text-xs text-muted-foreground mt-1">All subscriptions are current.</p>
        </div>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border">
                {['Agent', 'Stage', 'Failed', 'Last email', 'Actions'].map(h => (
                  <th key={h} className="text-left py-2 px-3 text-xs font-medium text-muted-foreground">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {agents.map(a => {
                const stage = STAGE_LABEL[a.dunning_stage] ?? { label: a.dunning_stage, tone: '' };
                const busy = busyId === a.id;
                return (
                  <tr key={a.id} className="border-b border-border/50 hover:bg-secondary/40 transition-colors">
                    <td className="py-2 px-3">
                      <p className="font-medium text-foreground">{a.name}</p>
                      <p className="text-xs text-muted-foreground">{a.agency || a.email}</p>
                    </td>
                    <td className="py-2 px-3">
                      <Badge className={`text-[10px] ${stage.tone}`}>{stage.label}</Badge>
                    </td>
                    <td className="py-2 px-3">
                      <p className="text-foreground">{fmtDays(a.payment_failed_at)}</p>
                      <p className="text-xs text-muted-foreground">{fmtDate(a.payment_failed_at)}</p>
                    </td>
                    <td className="py-2 px-3 text-foreground">{fmtDays(a.dunning_last_email_at)}</td>
                    <td className="py-2 px-3">
                      <div className="flex items-center gap-1.5">
                        <Button
                          variant="outline"
                          size="sm"
                          disabled={busy}
                          onClick={() => resendEmail(a)}
                          className="h-7 px-2 text-xs gap-1"
                        >
                          {busy ? <Loader2 size={12} className="animate-spin" /> : <Mail size={12} />}
                          Resend
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          disabled={busy}
                          onClick={() => markRestored(a)}
                          className="h-7 px-2 text-xs gap-1 text-emerald-700 hover:text-emerald-700"
                        >
                          <CheckCircle2 size={12} /> Restore
                        </Button>
                        <a
                          href={`mailto:${a.email}`}
                          className="h-7 px-2 text-xs inline-flex items-center text-muted-foreground hover:text-foreground"
                        >
                          Email
                        </a>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
