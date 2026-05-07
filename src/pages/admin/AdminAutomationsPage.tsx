import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { ChevronDown, ChevronRight, Zap, Loader2 } from 'lucide-react';
import { toast } from 'sonner';

type Sequence = {
  id: string;
  name: string;
  trigger_event: string;
  description: string | null;
  is_active: boolean;
  created_at: string;
};

type Step = {
  id: string;
  sequence_id: string;
  step_order: number;
  delay_hours: number;
  channel: string;
  subject: string | null;
  body: string;
};

type LogRow = {
  id: string;
  channel: string;
  recipient: string;
  status: string;
  error: string | null;
  sent_at: string;
  drip_sequence_steps: { channel: string; step_order: number; sequence_id: string } | null;
};

function formatDelay(h: number): string {
  if (!h || h <= 0) return 'Immediately';
  if (h < 24) return `After ${h}h`;
  const days = Math.round(h / 24);
  return `After ${days} day${days === 1 ? '' : 's'}`;
}

function timeAgo(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const m = Math.floor(diff / 60000);
  if (m < 1) return 'just now';
  if (m < 60) return `${m} min${m === 1 ? '' : 's'} ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  const d = Math.floor(h / 24);
  return `${d}d ago`;
}

function ChannelBadge({ channel }: { channel: string }) {
  if (channel === 'sms') {
    return <Badge className="bg-purple-100 text-purple-700 hover:bg-purple-100 border-purple-200">💬 SMS</Badge>;
  }
  return <Badge className="bg-blue-100 text-blue-700 hover:bg-blue-100 border-blue-200">📧 Email</Badge>;
}

function SequenceCard({ seq, onToggle }: { seq: Sequence; onToggle: (s: Sequence) => void }) {
  const [expanded, setExpanded] = useState(false);
  const [steps, setSteps] = useState<Step[] | null>(null);
  const [count, setCount] = useState<number | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const { count } = await (supabase as any)
        .from('drip_enrollments')
        .select('id', { count: 'exact', head: true })
        .eq('sequence_id', seq.id);
      if (!cancelled) setCount(count ?? 0);
    })();
    return () => { cancelled = true; };
  }, [seq.id]);

  const loadSteps = async () => {
    if (steps) return;
    const { data } = await (supabase as any)
      .from('drip_sequence_steps')
      .select('*')
      .eq('sequence_id', seq.id)
      .order('step_order', { ascending: true });
    setSteps((data as Step[]) ?? []);
  };

  const handleExpand = () => {
    const next = !expanded;
    setExpanded(next);
    if (next) loadSteps();
  };

  return (
    <div className="border border-border rounded-xl bg-card">
      <div className="p-4 flex items-start gap-4">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <h3 className="font-bold text-foreground">{seq.name}</h3>
            <Badge variant="secondary" className="text-[10px] font-mono">{seq.trigger_event}</Badge>
            {count != null && (
              <Badge variant="outline" className="text-[10px]">{count} enrolled</Badge>
            )}
          </div>
          {seq.description && (
            <p className="text-xs text-muted-foreground mt-1">{seq.description}</p>
          )}
          <button
            onClick={handleExpand}
            className="mt-2 text-xs text-primary hover:underline flex items-center gap-1"
          >
            {expanded ? <ChevronDown size={12} /> : <ChevronRight size={12} />}
            View steps
          </button>
        </div>
        <div className="flex items-center gap-2 flex-shrink-0">
          <Switch
            checked={seq.is_active}
            onCheckedChange={() => onToggle(seq)}
          />
        </div>
      </div>

      {expanded && (
        <div className="border-t border-border px-4 py-3 bg-muted/20">
          {steps == null ? (
            <div className="flex justify-center py-4"><Loader2 size={16} className="animate-spin text-muted-foreground" /></div>
          ) : steps.length === 0 ? (
            <p className="text-xs text-muted-foreground py-2">No steps configured.</p>
          ) : (
            <ol className="space-y-3">
              {steps.map((s) => (
                <li key={s.id} className="flex gap-3">
                  <div className="flex-shrink-0 w-7 h-7 rounded-full bg-primary/10 text-primary font-bold text-xs flex items-center justify-center">
                    {s.step_order}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-[11px] font-medium text-muted-foreground">{formatDelay(s.delay_hours)}</span>
                      <ChannelBadge channel={s.channel} />
                      {s.subject && s.channel === 'email' && (
                        <span className="text-xs italic text-foreground truncate">{s.subject}</span>
                      )}
                    </div>
                    <p className="text-xs text-muted-foreground mt-1 line-clamp-2">
                      {(s.body || '').slice(0, 120)}{(s.body || '').length > 120 ? '…' : ''}
                    </p>
                  </div>
                </li>
              ))}
            </ol>
          )}
        </div>
      )}
    </div>
  );
}

export default function AdminAutomationsPage() {
  const [sequences, setSequences] = useState<Sequence[]>([]);
  const [logs, setLogs] = useState<LogRow[]>([]);
  const [loading, setLoading] = useState(true);

  const loadSequences = async () => {
    const { data } = await (supabase as any)
      .from('drip_sequences')
      .select('*')
      .order('created_at', { ascending: true });
    setSequences((data as Sequence[]) ?? []);
  };

  const loadLogs = async () => {
    const { data } = await (supabase as any)
      .from('drip_send_log')
      .select('id, channel, recipient, status, error, sent_at, drip_sequence_steps(channel, step_order, sequence_id)')
      .order('sent_at', { ascending: false })
      .limit(50);
    setLogs((data as LogRow[]) ?? []);
  };

  useEffect(() => {
    (async () => {
      await Promise.all([loadSequences(), loadLogs()]);
      setLoading(false);
    })();
  }, []);

  const handleToggle = async (seq: Sequence) => {
    const next = !seq.is_active;
    setSequences((prev) => prev.map((s) => (s.id === seq.id ? { ...s, is_active: next } : s)));
    const { error } = await (supabase as any)
      .from('drip_sequences')
      .update({ is_active: next })
      .eq('id', seq.id);
    if (error) {
      setSequences((prev) => prev.map((s) => (s.id === seq.id ? { ...s, is_active: !next } : s)));
      toast.error(`Failed to update ${seq.name}`);
    } else {
      toast.success(`${seq.name} ${next ? 'activated' : 'deactivated'}`);
    }
  };

  const sequenceById = (id?: string) => sequences.find((s) => s.id === id);

  return (
    <TooltipProvider>
      <div className="space-y-8">
        <div>
          <div className="flex items-center gap-2">
            <Zap size={20} className="text-primary" />
            <h1 className="text-2xl font-bold text-foreground">Automations</h1>
          </div>
          <p className="text-sm text-muted-foreground mt-1">
            Manage drip sequences and monitor delivery activity.
          </p>
        </div>

        {/* Sequences */}
        <section>
          <h2 className="text-sm font-bold uppercase tracking-wider text-muted-foreground mb-3">Sequences</h2>
          {loading ? (
            <div className="flex justify-center py-12"><Loader2 size={20} className="animate-spin text-muted-foreground" /></div>
          ) : sequences.length === 0 ? (
            <div className="border border-dashed border-border rounded-xl p-8 text-center text-sm text-muted-foreground">
              No drip sequences configured yet.
            </div>
          ) : (
            <div className="space-y-3">
              {sequences.map((s) => (
                <SequenceCard key={s.id} seq={s} onToggle={handleToggle} />
              ))}
            </div>
          )}
        </section>

        {/* Activity */}
        <section>
          <h2 className="text-sm font-bold uppercase tracking-wider text-muted-foreground mb-3">Recent Activity</h2>
          <div className="border border-border rounded-xl overflow-hidden bg-card">
            <table className="w-full text-sm">
              <thead className="bg-muted/40 text-xs text-muted-foreground uppercase tracking-wider">
                <tr>
                  <th className="text-left px-4 py-2 font-semibold">Sent</th>
                  <th className="text-left px-4 py-2 font-semibold">Channel</th>
                  <th className="text-left px-4 py-2 font-semibold">Recipient</th>
                  <th className="text-left px-4 py-2 font-semibold">Sequence step</th>
                  <th className="text-left px-4 py-2 font-semibold">Status</th>
                </tr>
              </thead>
              <tbody>
                {logs.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="text-center py-8 text-muted-foreground text-xs">
                      No activity yet.
                    </td>
                  </tr>
                ) : (
                  logs.map((l) => {
                    const seq = sequenceById(l.drip_sequence_steps?.sequence_id);
                    const stepNo = l.drip_sequence_steps?.step_order;
                    const failed = l.status !== 'sent';
                    return (
                      <tr key={l.id} className="border-t border-border">
                        <td className="px-4 py-2 text-xs text-muted-foreground whitespace-nowrap">{timeAgo(l.sent_at)}</td>
                        <td className="px-4 py-2"><ChannelBadge channel={l.channel} /></td>
                        <td className="px-4 py-2 text-xs font-mono truncate max-w-[200px]">{l.recipient}</td>
                        <td className="px-4 py-2 text-xs">
                          {seq?.name ?? '—'}{stepNo != null ? ` · Step ${stepNo}` : ''}
                        </td>
                        <td className="px-4 py-2 text-xs">
                          {failed ? (
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <span className="text-destructive font-medium cursor-help">❌ {l.status}</span>
                              </TooltipTrigger>
                              {l.error && <TooltipContent>{l.error}</TooltipContent>}
                            </Tooltip>
                          ) : (
                            <span className="text-green-600 font-medium">✅ sent</span>
                          )}
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </section>
      </div>
    </TooltipProvider>
  );
}
