import { useCRMLeads } from '../hooks/useCRMLeads';
import { URGENCY_TIERS, type UrgencyTier } from '../lib/urgency';

interface Props {
  /** Called when a heat tile is clicked (switches to filtered list view). */
  onUrgencyClick?: (tier: UrgencyTier) => void;
}

const Ico = ({ icon, size = 18, color }: { icon: string; size?: number; color?: string }) => (
  // @ts-expect-error iconify-icon is a web component
  <iconify-icon icon={icon} style={{ fontSize: `${size}px`, color, display: 'inline-flex', lineHeight: 1 }} />
);

const TILE_CONFIG: Record<UrgencyTier, {
  label: string;
  icon: string;
  iconColor: string;
  labelColor: string;
  sub: string;
}> = {
  hot:  { label: 'HOT',  icon: 'solar:flame-bold',                iconColor: '#DC2626', labelColor: '#DC2626', sub: 'ready to act' },
  warm: { label: 'WARM', icon: 'solar:fire-minimalistic-bold',    iconColor: '#F59E0B', labelColor: '#D97706', sub: 'warming up' },
  cool: { label: 'COOL', icon: 'solar:snowflake-linear',          iconColor: '#0EA5E9', labelColor: '#0EA5E9', sub: 'in early discovery' },
  cold: { label: 'COLD', icon: 'solar:snowflake-linear',          iconColor: '#6B7280', labelColor: '#374151', sub: 'gone quiet' },
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

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
      {URGENCY_TIERS.map(tier => {
        const cfg = TILE_CONFIG[tier];
        const count = counts[tier];
        const interactive = !!onUrgencyClick;
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
              <Ico icon={cfg.icon} size={18} color={cfg.iconColor} />
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
  );
}
