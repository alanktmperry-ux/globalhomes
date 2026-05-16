import { useCRMLeads } from '../hooks/useCRMLeads';
import { URGENCY_TIERS, type UrgencyTier } from '../lib/urgency';
import { type LucideIcon, Flame, Snowflake } from 'lucide-react';

interface Props {
  /** Called when a heat tile is clicked (switches to filtered list view). */
  onUrgencyClick?: (tier: UrgencyTier) => void;
}

const TILE_CONFIG: Record<UrgencyTier, {
  label: string;
  icon: LucideIcon;
  iconColor: string;
  labelColor: string;
  sub: string;
}> = {
  hot:  { label: 'HOT',  icon: Flame,     iconColor: '#DC2626', labelColor: '#DC2626', sub: 'ready to act' },
  warm: { label: 'WARM', icon: Flame,     iconColor: '#F59E0B', labelColor: '#D97706', sub: 'warming up' },
  cool: { label: 'COOL', icon: Snowflake, iconColor: '#0EA5E9', labelColor: '#0EA5E9', sub: 'in early discovery' },
  cold: { label: 'COLD', icon: Snowflake, iconColor: '#6B7280', labelColor: '#374151', sub: 'gone quiet' },
};

export function PipelineKPIBar({ onUrgencyClick }: Props) {
  const { leads, loading } = useCRMLeads({ stage: 'all' });

  if (loading) {
    return (
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {[0,1,2,3].map(i => (
          <div key={i} className="h-[124px] bg-white border border-[#E5E5E5] rounded-3xl animate-pulse" />
        ))}
      </div>
    );
  }

  const active = leads.filter(l => !['settled', 'lost'].includes(l.stage));
  const counts: Record<UrgencyTier, number> = { hot: 0, warm: 0, cool: 0, cold: 0 };
  for (const l of active) counts[(l as any).urgency as UrgencyTier]++;

  const pipelineValue = active.reduce((sum, l) => sum + ((l as any).budget_max ?? 0), 0);
  const leadsWithValue = active.filter(l => ((l as any).budget_max ?? 0) > 0).length;
  const formatValue = (v: number) => {
    if (v >= 1_000_000) return `$${(v / 1_000_000).toFixed(1)}M`;
    if (v >= 1_000) return `$${Math.round(v / 1_000)}k`;
    return `$${v}`;
  };

  return (
    <>
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
      {URGENCY_TIERS.map(tier => {
        const cfg = TILE_CONFIG[tier];
        const count = counts[tier];
        const interactive = !!onUrgencyClick;
        const I = cfg.icon;
        return (
          <button
            key={tier}
            type="button"
            disabled={!interactive}
            onClick={() => onUrgencyClick?.(tier)}
            className={
              'bg-white rounded-3xl border border-[#E5E5E5] p-5 text-left transition-all ' +
              (interactive ? 'hover:border-[#2563EB]/40 hover:shadow-[0_8px_24px_rgba(0,0,0,0.04)] cursor-pointer' : 'cursor-default')
            }
          >
            <div className="flex items-center gap-2">
              <I size={18} color={cfg.iconColor} style={{ display: 'inline-flex', flexShrink: 0 }} />
              <span
                className="text-[11px] uppercase font-bold"
                style={{ letterSpacing: '0.12em', color: cfg.labelColor }}
              >
                {cfg.label}
              </span>
            </div>
            <p className="text-[36px] font-extrabold text-[#0a0f1e] tabular-nums leading-none mt-3">{count}</p>
            <p className="text-[12px] text-[#6a6a6a] mt-1">{cfg.sub}</p>
          </button>
        );
      })}
    </div>
    {pipelineValue > 0 && (
      <div className="mt-3 px-5 py-3 bg-white border border-[#E5E5E5] rounded-2xl flex items-center justify-between">
        <span className="text-[12px] text-[#6a6a6a] uppercase font-semibold tracking-widest">Pipeline Value</span>
        <div>
          <span className="text-[20px] font-extrabold text-[#0a0f1e] tabular-nums">{formatValue(pipelineValue)}</span>
          <span className="text-[11px] text-[#6a6a6a] ml-2">across {leadsWithValue} lead{leadsWithValue !== 1 ? 's' : ''} with budget</span>
        </div>
      </div>
    )}
    </>
  );
}
