import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { ArrowUp, ArrowDown, Minus, Clock, TrendingUp, Star, Activity, RefreshCw } from 'lucide-react';
import { useAgentReputation, getReputationTier, type ReputationComponent } from '@/features/agents/hooks/useAgentReputation';
import { useMemo } from 'react';

interface Props {
  agentId: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const COMPONENT_META: Record<string, { label: string; icon: typeof Clock; tip: string }> = {
  response_time: { label: 'Response Time', icon: Clock, tip: 'Respond to leads within 1 hour to lift this score.' },
  conversion: { label: 'Conversion', icon: TrendingUp, tip: 'Move more leads to "qualified" or higher in your CRM.' },
  reviews: { label: 'Reviews', icon: Star, tip: 'Request reviews from past buyers and vendors.' },
  activity: { label: 'Activity', icon: Activity, tip: 'Stay active — list properties, log calls, complete tasks weekly.' },
};

function Sparkline({ data }: { data: { total_score: number; computed_at: string }[] }) {
  if (data.length < 2) {
    return <p className="text-xs text-muted-foreground italic">Sparkline appears once 2+ snapshots are recorded (24-48h).</p>;
  }
  const w = 280, h = 50, pad = 4;
  const xs = data.map((_, i) => pad + (i * (w - 2 * pad)) / Math.max(1, data.length - 1));
  const ys = data.map(d => h - pad - (d.total_score / 100) * (h - 2 * pad));
  const path = xs.map((x, i) => `${i === 0 ? 'M' : 'L'} ${x.toFixed(1)} ${ys[i].toFixed(1)}`).join(' ');
  return (
    <svg width="100%" viewBox={`0 0 ${w} ${h}`} className="overflow-visible">
      <path d={path} fill="none" stroke="hsl(var(--primary))" strokeWidth="2" />
      {xs.map((x, i) => (
        <circle key={i} cx={x} cy={ys[i]} r="2" fill="hsl(var(--primary))" />
      ))}
    </svg>
  );
}

export function ReputationExplainerModal({ agentId, open, onOpenChange }: Props) {
  const { breakdown, history, score, trend, priorScore, recompute, recomputing } = useAgentReputation(open ? agentId : null);
  const tier = getReputationTier(score);

  const components = useMemo(() => {
    if (!breakdown) return [];
    return (['response_time', 'conversion', 'reviews', 'activity'] as const).map(key => ({
      key,
      ...COMPONENT_META[key],
      ...(breakdown[key] as ReputationComponent),
    }));
  }, [breakdown]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            Reputation Score
            <Badge className={`${tier.bg} ${tier.color} border-0`}>{tier.tier}</Badge>
          </DialogTitle>
        </DialogHeader>

        {!breakdown ? (
          <div className="py-6 text-center text-sm text-muted-foreground">
            <p>No reputation data yet.</p>
            <Button onClick={recompute} disabled={recomputing} variant="outline" size="sm" className="mt-3">
              <RefreshCw size={14} className={`mr-1.5 ${recomputing ? 'animate-spin' : ''}`} />
              Compute now
            </Button>
          </div>
        ) : (
          <div className="space-y-5">
            {/* Total + trend */}
            <div className="flex items-baseline gap-3">
              <span className="font-display text-5xl font-extrabold">{score}</span>
              <span className="text-muted-foreground">/100</span>
              <div className="flex items-center gap-1 text-sm">
                {trend === 'up' && <ArrowUp size={16} className="text-success" />}
                {trend === 'down' && <ArrowDown size={16} className="text-destructive" />}
                {trend === 'neutral' && <Minus size={16} className="text-muted-foreground" />}
                <span className="text-muted-foreground">
                  {trend === 'neutral' ? 'No 30-day change' : `${score - priorScore > 0 ? '+' : ''}${score - priorScore} vs 30 days ago`}
                </span>
              </div>
            </div>

            {/* Components */}
            <div className="space-y-4">
              {components.map(c => {
                const Icon = c.icon;
                return (
                  <div key={c.key}>
                    <div className="flex items-center justify-between mb-1.5">
                      <span className="flex items-center gap-1.5 text-sm font-medium">
                        <Icon size={14} className="text-muted-foreground" /> {c.label}
                      </span>
                      <span className="text-sm font-semibold">{c.score}<span className="text-muted-foreground font-normal">/{c.max}</span></span>
                    </div>
                    <Progress value={(c.score / c.max) * 100} className="h-2" />
                    <p className="text-xs text-muted-foreground mt-1">{c.reason}</p>
                    {c.score < c.max * 0.7 && (
                      <p className="text-xs text-primary mt-0.5">💡 {c.tip}</p>
                    )}
                  </div>
                );
              })}
            </div>

            {/* Sparkline */}
            <div>
              <p className="text-xs font-medium text-muted-foreground mb-1">Last 90 days</p>
              <Sparkline data={history} />
            </div>

            {/* Methodology + recompute */}
            <div className="flex items-center justify-between pt-2 border-t border-border">
              <p className="text-[11px] text-muted-foreground">
                Updated nightly. Score from verified leads, reviews & activity.
              </p>
              <Button onClick={recompute} disabled={recomputing} variant="ghost" size="sm">
                <RefreshCw size={12} className={`mr-1 ${recomputing ? 'animate-spin' : ''}`} />
                Refresh
              </Button>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
