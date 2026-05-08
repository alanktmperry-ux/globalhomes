import { useState } from 'react';
import { Loader2, PhoneCall, MessageSquare } from 'lucide-react';
import { useCommunicationStats, type CommsRange } from '@/features/crm/hooks/useCommunicationStats';
import { cn } from '@/shared/lib/utils';

const RANGES: { value: CommsRange; label: string }[] = [
  { value: 'week', label: 'This week' },
  { value: 'month', label: 'This month' },
  { value: 'all', label: 'All time' },
];

function formatDuration(seconds: number): string {
  if (!seconds) return '—';
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${m}:${String(s).padStart(2, '0')}`;
}

function formatDate(iso: string | null): string {
  if (!iso) return '—';
  return new Date(iso).toLocaleString(undefined, { dateStyle: 'medium', timeStyle: 'short' });
}

export function TeamCommunicationsDashboard() {
  const [range, setRange] = useState<CommsRange>('month');
  const { stats, loading, error } = useCommunicationStats(range);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <PhoneCall size={20} className="text-primary" /> Team Communications
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            Calls and SMS activity per agent
          </p>
        </div>
        <div className="flex items-center gap-1 bg-muted rounded-lg p-1">
          {RANGES.map((r) => (
            <button
              key={r.value}
              onClick={() => setRange(r.value)}
              className={cn(
                'px-3 py-1.5 text-xs font-medium rounded-md transition',
                range === r.value
                  ? 'bg-background text-foreground shadow-sm'
                  : 'text-muted-foreground hover:text-foreground'
              )}
            >
              {r.label}
            </button>
          ))}
        </div>
      </div>

      {error && (
        <div className="rounded-lg border border-destructive/40 bg-destructive/5 px-4 py-3 text-sm text-destructive">
          {error}
        </div>
      )}

      {loading ? (
        <div className="flex items-center justify-center py-16 text-muted-foreground">
          <Loader2 size={20} className="animate-spin mr-2" /> Loading stats…
        </div>
      ) : stats.length === 0 ? (
        <div className="rounded-xl border border-border bg-card p-10 text-center text-muted-foreground">
          <MessageSquare size={28} className="mx-auto mb-3 opacity-40" />
          No call or SMS activity in this period.
        </div>
      ) : (
        <div className="rounded-xl border border-border bg-card overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-muted/50 text-xs uppercase text-muted-foreground">
                <tr>
                  <th className="text-left px-4 py-3 font-semibold">Agent</th>
                  <th className="text-right px-3 py-3 font-semibold">Calls</th>
                  <th className="text-right px-3 py-3 font-semibold">Answered</th>
                  <th className="text-right px-3 py-3 font-semibold">Missed</th>
                  <th className="text-right px-3 py-3 font-semibold">Voicemail</th>
                  <th className="text-right px-3 py-3 font-semibold">SMS</th>
                  <th className="text-right px-3 py-3 font-semibold">Avg duration</th>
                  <th className="text-left px-4 py-3 font-semibold">Last activity</th>
                </tr>
              </thead>
              <tbody>
                {stats.map((s) => (
                  <tr key={s.agent_id} className="border-t border-border hover:bg-muted/30">
                    <td className="px-4 py-3 font-medium">{s.agent_name}</td>
                    <td className="px-3 py-3 text-right">{s.totalCalls}</td>
                    <td className="px-3 py-3 text-right text-green-600">{s.answered}</td>
                    <td className="px-3 py-3 text-right text-destructive">{s.missed}</td>
                    <td className="px-3 py-3 text-right">{s.voicemail}</td>
                    <td className="px-3 py-3 text-right">{s.totalSms}</td>
                    <td className="px-3 py-3 text-right tabular-nums">{formatDuration(s.avgCallDuration)}</td>
                    <td className="px-4 py-3 text-muted-foreground">{formatDate(s.lastActivity)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}

export default TeamCommunicationsDashboard;
