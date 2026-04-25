import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Progress } from '@/components/ui/progress';
import { Button } from '@/components/ui/button';
import { ArrowUp, ArrowDown, Minus, Phone, Clock } from 'lucide-react';
import { useResponseTimeStats, formatDuration, getResponseTimeColor } from '@/features/agents/hooks/useResponseTimeStats';
import { useNavigate } from 'react-router-dom';

interface Props {
  agentId: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

function Sparkline({ data }: { data: { date: string; medianMinutes: number | null }[] }) {
  const vals = data.map(d => d.medianMinutes).filter((v): v is number => v != null);
  if (vals.length < 2) {
    return <p className="text-xs text-muted-foreground italic">Daily median appears once you contact leads on multiple days.</p>;
  }
  const w = 320, h = 50, pad = 4;
  const max = Math.max(...vals, 1);
  const xs = data.map((_, i) => pad + (i * (w - 2 * pad)) / Math.max(1, data.length - 1));
  const ys = data.map(d => d.medianMinutes == null ? null : h - pad - (d.medianMinutes / max) * (h - 2 * pad));
  let path = '';
  ys.forEach((y, i) => {
    if (y == null) return;
    path += `${path ? 'L' : 'M'} ${xs[i].toFixed(1)} ${y.toFixed(1)} `;
  });
  return (
    <svg width="100%" viewBox={`0 0 ${w} ${h}`} className="overflow-visible">
      <path d={path} fill="none" stroke="hsl(var(--primary))" strokeWidth="2" />
    </svg>
  );
}

export function ResponseTimeModal({ agentId, open, onOpenChange }: Props) {
  const navigate = useNavigate();
  const stats = useResponseTimeStats(open ? agentId : null);
  const colors = getResponseTimeColor(stats.medianMinutes);
  const totalDist = stats.distribution.under5m + stats.distribution.under1h + stats.distribution.under24h + stats.distribution.over24h;
  const pct = (n: number) => totalDist ? Math.round((n / totalDist) * 100) : 0;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Clock size={18} /> Response Time Breakdown
          </DialogTitle>
        </DialogHeader>

        {stats.totalLeads === 0 ? (
          <div className="py-8 text-center text-sm text-muted-foreground">
            No leads contacted in the last 30 days yet. The metric activates as soon as you respond to your first lead.
          </div>
        ) : (
          <div className="space-y-5">
            {/* Headline */}
            <div className="flex items-baseline gap-3">
              <span className={`font-display text-5xl font-extrabold ${colors.text}`}>
                {formatDuration(stats.medianMinutes)}
              </span>
              <span className="text-sm text-muted-foreground">median across {stats.totalLeads} leads</span>
              <div className="flex items-center gap-1 text-sm ml-auto">
                {stats.trend === 'up' && <><ArrowUp size={14} className="text-success" /><span className="text-success">faster</span></>}
                {stats.trend === 'down' && <><ArrowDown size={14} className="text-destructive" /><span className="text-destructive">slower</span></>}
                {stats.trend === 'neutral' && <><Minus size={14} className="text-muted-foreground" /><span className="text-muted-foreground">vs prior 30d</span></>}
              </div>
            </div>

            {/* Distribution */}
            <div>
              <p className="text-xs font-medium text-muted-foreground mb-2">Distribution</p>
              <div className="space-y-2">
                {[
                  { label: 'Within 5 minutes', n: stats.distribution.under5m, color: 'bg-success' },
                  { label: 'Within 1 hour',    n: stats.distribution.under1h, color: 'bg-success/70' },
                  { label: 'Within 24 hours',  n: stats.distribution.under24h, color: 'bg-amber-500' },
                  { label: 'Over 24 hours',    n: stats.distribution.over24h, color: 'bg-destructive' },
                ].map(row => (
                  <div key={row.label}>
                    <div className="flex justify-between text-xs mb-0.5">
                      <span>{row.label}</span>
                      <span className="text-muted-foreground">{row.n} ({pct(row.n)}%)</span>
                    </div>
                    <div className="h-2 bg-secondary rounded-full overflow-hidden">
                      <div className={`h-full ${row.color} transition-all`} style={{ width: `${pct(row.n)}%` }} />
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* By source */}
            {stats.sourceMedians.length > 0 && (
              <div>
                <p className="text-xs font-medium text-muted-foreground mb-2">Median by source</p>
                <div className="space-y-1.5">
                  {stats.sourceMedians.map(s => (
                    <div key={s.source} className="flex items-center justify-between text-sm border border-border rounded-md px-3 py-2">
                      <span>{s.source} <span className="text-xs text-muted-foreground">({s.count})</span></span>
                      <span className={`font-semibold ${getResponseTimeColor(s.medianMinutes).text}`}>
                        {formatDuration(s.medianMinutes)}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Sparkline */}
            <div>
              <p className="text-xs font-medium text-muted-foreground mb-1">30-day trend</p>
              <Sparkline data={stats.sparkline} />
            </div>

            {/* Worst unresponded */}
            {stats.worstUnresponded.length > 0 && (
              <div>
                <p className="text-xs font-medium text-destructive mb-2">⚠ Oldest unresponded</p>
                <div className="space-y-1.5">
                  {stats.worstUnresponded.map(l => {
                    const ageMin = (Date.now() - new Date(l.created_at).getTime()) / 60000;
                    return (
                      <div key={l.id} className="flex items-center justify-between text-sm border border-border rounded-md px-3 py-2">
                        <div>
                          <p className="text-xs">{l.enquiry_source ?? 'Lead'} · {formatDuration(ageMin)} ago</p>
                          <p className="text-[10px] text-muted-foreground">{new Date(l.created_at).toLocaleString('en-AU')}</p>
                        </div>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => { onOpenChange(false); navigate(`/dashboard/leads?lead=${l.id}`); }}
                        >
                          <Phone size={12} className="mr-1" /> Contact
                        </Button>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
