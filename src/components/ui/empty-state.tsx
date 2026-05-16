import { ReactNode } from 'react';
import { type LucideIcon } from 'lucide-react';

export interface EmptyStateProps {
  /** Lucide icon component e.g. {Inbox} */
  icon: LucideIcon;
  title: string;
  body?: ReactNode;
  ctaLabel?: string;
  onCtaClick?: () => void;
  /** Secondary CTA — rendered as ghost button */
  secondaryCtaLabel?: string;
  onSecondaryCtaClick?: () => void;
  variant?: 'default' | 'compact';
  className?: string;
}

/**
 * Version A+ standard empty state.
 *
 * Default: white card with border, 64px icon, py-24.
 * Compact: transparent, 48px icon, py-10 — for use inside cards/sidebars.
 */
export const EmptyState = ({
  icon,
  title,
  body,
  ctaLabel,
  onCtaClick,
  secondaryCtaLabel,
  onSecondaryCtaClick,
  variant = 'default',
  className = '',
}: EmptyStateProps) => {
  const compact = variant === 'compact';

  const container = compact
    ? 'flex flex-col items-center justify-center py-10 px-4 text-center'
    : 'flex flex-col items-center justify-center py-24 px-6 text-center bg-white rounded-[12px]';

  const containerStyle = compact ? undefined : { border: '1px solid #E5E7EB' };

  const titleClass = compact
    ? 'text-base font-semibold text-[#0a0f1e] mt-4 mb-1'
    : 'text-xl font-bold text-[#0a0f1e] mt-6 mb-2';
  const bodyClass = compact
    ? 'text-xs text-[#6B7280] max-w-xs'
    : 'text-sm font-light text-[#6B7280] mb-8 max-w-md';
  const ctaClass = compact
    ? 'bg-[#2563EB] hover:bg-[#1D4ED8] text-white font-semibold rounded-[10px] px-4 py-2 text-xs transition-all'
    : 'bg-[#2563EB] hover:bg-[#1D4ED8] text-white font-semibold rounded-[10px] px-6 py-3 text-sm transition-all';
  const secondaryCtaClass = compact
    ? 'text-[#2563EB] hover:bg-[#EFF6FF] font-semibold rounded-[10px] px-4 py-2 text-xs transition-all'
    : 'text-[#2563EB] hover:bg-[#EFF6FF] font-semibold rounded-[10px] px-6 py-3 text-sm transition-all';

  const IconComponent = icon;

  return (
    <div className={`${container} ${className}`} style={containerStyle}>
      <IconComponent size={compact ? 48 : 64} color="#E5E7EB" style={{ display: 'inline-flex', flexShrink: 0 }} />
      <h3 className={titleClass}>{title}</h3>
      {body && <p className={bodyClass}>{body}</p>}
      {(ctaLabel || secondaryCtaLabel) && (
        <div className={`flex flex-wrap items-center justify-center gap-2 ${compact ? 'mt-3' : ''}`}>
          {ctaLabel && (
            <button type="button" onClick={onCtaClick} className={ctaClass}>
              {ctaLabel}
            </button>
          )}
          {secondaryCtaLabel && (
            <button type="button" onClick={onSecondaryCtaClick} className={secondaryCtaClass}>
              {secondaryCtaLabel}
            </button>
          )}
        </div>
      )}
    </div>
  );
};

export default EmptyState;
