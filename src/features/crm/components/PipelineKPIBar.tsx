import { useCRMLeads } from '../hooks/useCRMLeads';
import { URGENCY_CONFIG, URGENCY_TIERS, type UrgencyTier } from '../lib/urgency';

interface Props {
  /** Called when an urgency tile is clicked (switches to filtered list view). */
  onUrgencyClick?: (tier: UrgencyTier) => void;
}

export function PipelineKPIBar({ onUrgencyClick }: Props) {
  const { leads, loading } = useCRMLeads({ stage: 'all' });

  if (loading) return <div className="h-20 bg-muted/30 rounded-xl animate-pulse" />;

  const active = leads.filter(l => !['settled', 'lost'].includes(l.stage));
  const totalValue = active.reduce((sum, l) => sum + (l.budget_max ?? 0), 0);
  const settled30d = leads.filter(l =>
    l.stage === 'settled' &&
    (Date.now() - new Date(l.updated_at).getTime()) < 30 * 86400000
  ).length;

  const counts: Record<UrgencyTier, number> = { hot: 0, warm: 0, cool: 0, cold: 0 };
  for (const l of active) counts[(l as any).urgency as UrgencyTier]++;

  return (
    <div className="space-y-3">
      {/* Top row: pipeline meta */}
      <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
        <Tile label="Active Leads" value={active.length} sub="in pipeline" />
        <Tile label="Pipeline Value" value={`$${(totalValue / 1_000_000).toFixed(1)}m`} sub="combined budget" />
        <Tile label="Settled (30d)" value={settled30d} sub="this month" valueClass="text-primary" />
      </div>

      {/* Urgency row */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {URGENCY_TIERS.map(tier => {
          const cfg = URGENCY_CONFIG[tier];
          const count = counts[tier];
          const interactive = !!onUrgencyClick && count > 0;
          return (
            <button
              key={tier}
              type="button"
              disabled={!interactive}
              onClick={() => onUrgencyClick?.(tier)}
              className={`bg-card border rounded-xl p-4 text-left transition
                ${cfg.tile}
                ${interactive ? 'hover:shadow-md hover:-translate-y-0.5 cursor-pointer' : 'cursor-default'}
              `}
            >
              <div className="flex items-center gap-2 mb-1">
                <span className={`w-2 h-2 rounded-full ${cfg.dot}`} />
                <p className="text-xs font-medium text-foreground">{cfg.label}</p>
              </div>
              <p className="text-2xl font-bold text-foreground">{count}</p>
              <p className="text-[10px] text-muted-foreground">{cfg.sub}</p>
            </button>
          );
        })}
      </div>
    </div>
  );
}

function Tile({ label, value, sub, valueClass = 'text-foreground' }: {
  label: string; value: string | number; sub: string; valueClass?: string;
}) {
  return (
    <div className="bg-card border border-border rounded-xl p-4 text-center">
      <p className={`text-2xl font-bold ${valueClass}`}>{value}</p>
      <p className="text-xs font-medium text-foreground">{label}</p>
      <p className="text-[10px] text-muted-foreground">{sub}</p>
    </div>
  );
}
