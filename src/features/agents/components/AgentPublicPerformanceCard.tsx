import { Clock, Award, Star, MessageSquare } from 'lucide-react';
import { usePublicAgentPerformance } from '@/features/agents/hooks/usePublicAgentPerformance';

interface Props {
  agentId: string;
}

function formatTime(hours: number | null) {
  if (!hours) return null;
  if (hours < 1) return `${Math.round(hours * 60)} min`;
  if (hours < 24) return `${hours.toFixed(0)}h`;
  return `${(hours / 24).toFixed(0)} day${hours >= 48 ? 's' : ''}`;
}

export function AgentPublicPerformanceCard({ agentId }: Props) {
  const perf = usePublicAgentPerformance(agentId);

  if (!perf) return null;
  const hasData = perf.sold_listings > 0 || perf.review_count > 0 || perf.avg_response_hours != null;
  if (!hasData) return null;

  const timeLabel = formatTime(perf.avg_response_hours);

  return (
    <div className="rounded-2xl border border-border bg-card p-5 mb-8">
      <h3 className="text-sm font-bold text-foreground mb-4">Performance</h3>
      <div className="grid grid-cols-2 gap-4">
        {timeLabel && (
          <div className="flex items-start gap-2.5">
            <Clock size={16} className="text-primary mt-0.5 shrink-0" />
            <div>
              <p className="text-xs text-muted-foreground">Response time</p>
              <p className="text-sm font-semibold text-foreground">
                Typically replies in {timeLabel}
              </p>
            </div>
          </div>
        )}
        {perf.sold_listings > 0 && (
          <div className="flex items-start gap-2.5">
            <Award size={16} className="text-primary mt-0.5 shrink-0" />
            <div>
              <p className="text-xs text-muted-foreground">Properties sold</p>
              <p className="text-sm font-semibold text-foreground">{perf.sold_listings}</p>
            </div>
          </div>
        )}
        {perf.avg_rating != null && perf.review_count > 0 && (
          <div className="flex items-start gap-2.5">
            <Star size={16} className="text-primary mt-0.5 shrink-0" />
            <div>
              <p className="text-xs text-muted-foreground">Rating</p>
              <div className="flex items-center gap-1">
                <div className="flex gap-0.5">
                  {[1, 2, 3, 4, 5].map(i => (
                    <Star key={i} size={12} className={
                      i <= Math.round(perf.avg_rating ?? 0)
                        ? 'fill-yellow-400 text-yellow-400'
                        : 'text-muted-foreground'
                    } />
                  ))}
                </div>
                <span className="text-xs text-muted-foreground">({perf.review_count})</span>
              </div>
            </div>
          </div>
        )}
        {perf.response_rate != null && (
          <div className="flex items-start gap-2.5">
            <MessageSquare size={16} className="text-primary mt-0.5 shrink-0" />
            <div>
              <p className="text-xs text-muted-foreground">Response rate</p>
              <p className="text-sm font-semibold text-foreground">
                {Math.round(perf.response_rate)}%
              </p>
            </div>
          </div>
        )}
      </div>
      {perf.active_listings > 0 && (
        <p className="text-xs text-muted-foreground mt-4 pt-3 border-t border-border">
          {perf.active_listings} active listing{perf.active_listings !== 1 ? 's' : ''}
        </p>
      )}
    </div>
  );
}
