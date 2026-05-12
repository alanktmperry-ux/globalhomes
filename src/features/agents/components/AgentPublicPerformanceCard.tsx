import { Clock, Award, Star, MessageSquare } from 'lucide-react';
import { usePublicAgentPerformance } from '@/features/agents/hooks/usePublicAgentPerformance';
import { useTranslation } from '@/shared/lib/i18n';

interface Props {
  agentId: string;
}

export function AgentPublicPerformanceCard({ agentId }: Props) {
  const perf = usePublicAgentPerformance(agentId);
  const { t } = useTranslation();

  function formatTime(hours: number | null) {
    if (!hours) return null;
    if (hours < 1) return t('agent.performance.card.minutes', { count: Math.round(hours * 60) });
    if (hours < 24) return t('agent.performance.card.hours', { count: Math.round(hours) });
    const days = Math.round(hours / 24);
    return t(days === 1 ? 'agent.performance.card.days_one' : 'agent.performance.card.days_other', { count: days });
  }

  if (!perf) return null;
  const hasData = perf.sold_listings > 0 || perf.review_count > 0 || perf.avg_response_hours != null;
  if (!hasData) return null;

  const timeLabel = formatTime(perf.avg_response_hours);

  return (
    <div className="rounded-2xl border border-border bg-card p-5 mb-8">
      <h3 className="text-sm font-bold text-foreground mb-4">{t('agent.performance.card.title')}</h3>
      <div className="grid grid-cols-2 gap-4">
        {timeLabel && (
          <div className="flex items-start gap-2.5">
            <Clock size={16} className="text-primary mt-0.5 shrink-0" />
            <div>
              <p className="text-xs text-muted-foreground">{t('agent.performance.card.responseTime')}</p>
              <p className="text-sm font-semibold text-foreground">
                {t('agent.performance.card.repliesIn', { time: timeLabel })}
              </p>
            </div>
          </div>
        )}
        {perf.sold_listings > 0 && (
          <div className="flex items-start gap-2.5">
            <Award size={16} className="text-primary mt-0.5 shrink-0" />
            <div>
              <p className="text-xs text-muted-foreground">{t('agent.performance.card.propertiesSold')}</p>
              <p className="text-sm font-semibold text-foreground">{perf.sold_listings}</p>
            </div>
          </div>
        )}
        {perf.avg_rating != null && perf.review_count > 0 && (
          <div className="flex items-start gap-2.5">
            <Star size={16} className="text-primary mt-0.5 shrink-0" />
            <div>
              <p className="text-xs text-muted-foreground">{t('agent.performance.card.rating')}</p>
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
              <p className="text-xs text-muted-foreground">{t('agent.performance.card.responseRate')}</p>
              <p className="text-sm font-semibold text-foreground">
                {Math.round(perf.response_rate)}%
              </p>
            </div>
          </div>
        )}
      </div>
      {perf.active_listings > 0 && (
        <p className="text-xs text-muted-foreground mt-4 pt-3 border-t border-border">
          {t(perf.active_listings === 1 ? 'agent.performance.card.activeListings_one' : 'agent.performance.card.activeListings_other', { count: perf.active_listings })}
        </p>
      )}
    </div>
  );
}
