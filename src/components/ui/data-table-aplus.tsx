import { ReactNode, ThHTMLAttributes, TdHTMLAttributes, HTMLAttributes } from 'react';

/**
 * Version A+ data table & dashboard primitives.
 * Pure presentational wrappers — no behaviour, no business logic.
 * Use across Finance / Tenancies / Compliance pages.
 */

export function APlusTable({ children, className = '' }: { children: ReactNode; className?: string }) {
  return (
    <div
      className={`bg-white rounded-[12px] overflow-hidden ${className}`}
      style={{ border: '1px solid #E5E7EB' }}
    >
      <div className="overflow-x-auto">
        <table className="w-full border-collapse">{children}</table>
      </div>
    </div>
  );
}

export function APlusTHead({ children }: { children: ReactNode }) {
  return (
    <thead className="border-b" style={{ background: '#F9FAFB', borderColor: '#E5E7EB' }}>
      <tr>{children}</tr>
    </thead>
  );
}

interface APlusThProps extends ThHTMLAttributes<HTMLTableCellElement> {
  align?: 'left' | 'right' | 'center';
  sortable?: boolean;
}
export function APlusTh({ children, align = 'left', sortable, className = '', ...rest }: APlusThProps) {
  const alignCls = align === 'right' ? 'text-right' : align === 'center' ? 'text-center' : 'text-left';
  const sortCls = sortable ? 'cursor-pointer hover:text-[#0a0f1e] transition-colors' : '';
  return (
    <th
      {...rest}
      className={`px-5 py-3 text-[10px] uppercase font-semibold text-[#6B7280] whitespace-nowrap ${alignCls} ${sortCls} ${className}`}
      style={{ letterSpacing: '0.10em', ...(rest.style || {}) }}
    >
      {children}
    </th>
  );
}

export function APlusTBody({ children }: { children: ReactNode }) {
  return <tbody>{children}</tbody>;
}

interface APlusTrProps extends HTMLAttributes<HTMLTableRowElement> {}
export function APlusTr({ children, className = '', ...rest }: APlusTrProps) {
  return (
    <tr
      {...rest}
      className={`border-b transition-colors hover:bg-[#F9FAFB] ${className}`}
      style={{ borderColor: '#F3F4F6', ...(rest.style || {}) }}
    >
      {children}
    </tr>
  );
}

interface APlusTdProps extends TdHTMLAttributes<HTMLTableCellElement> {
  align?: 'left' | 'right' | 'center';
  numeric?: boolean;
}
export function APlusTd({ children, align = 'left', numeric, className = '', ...rest }: APlusTdProps) {
  const alignCls = align === 'right' || numeric ? 'text-right' : align === 'center' ? 'text-center' : 'text-left';
  const numCls = numeric ? 'tabular-nums font-semibold text-[#0a0f1e]' : 'text-[#374151]';
  return (
    <td
      {...rest}
      className={`px-5 py-3.5 text-sm ${alignCls} ${numCls} ${className}`}
    >
      {children}
    </td>
  );
}

export function APlusPrimaryText({ children, className = '' }: { children: ReactNode; className?: string }) {
  return <div className={`font-semibold text-[#0a0f1e] ${className}`}>{children}</div>;
}
export function APlusSubText({ children, className = '' }: { children: ReactNode; className?: string }) {
  return <div className={`text-xs text-[#6B7280] mt-0.5 ${className}`}>{children}</div>;
}

export function APlusDateText({ children, className = '' }: { children: ReactNode; className?: string }) {
  return <span className={`text-xs text-[#6B7280] tabular-nums whitespace-nowrap ${className}`}>{children}</span>;
}

export function APlusAmount({
  value,
  sign,
  className = '',
}: {
  value: ReactNode;
  sign?: 'positive' | 'negative' | 'zero';
  className?: string;
}) {
  const colour =
    sign === 'positive' ? 'text-[#065F46]' :
    sign === 'negative' ? 'text-[#991B1B]' :
    sign === 'zero' ? 'text-[#6B7280]' :
    'text-[#0a0f1e]';
  return <span className={`tabular-nums font-semibold ${colour} ${className}`}>{value}</span>;
}

/* ---------- Status badges ---------- */

export type APlusBadgeTone =
  | 'pending' | 'received' | 'deposited' | 'cleared' | 'reconciled' | 'reversed'
  | 'green' | 'amber' | 'red' | 'blue' | 'purple' | 'grey' | 'cyan';

const TONE_MAP: Record<APlusBadgeTone, { bg: string; color: string; dot: string }> = {
  pending:    { bg: '#FFFBEB', color: '#92400E', dot: '#FBBF24' },
  received:   { bg: '#EFF6FF', color: '#1E40AF', dot: '#2563EB' },
  deposited:  { bg: '#F0F9FF', color: '#0E7490', dot: '#06B6D4' },
  cleared:    { bg: '#ECFDF5', color: '#065F46', dot: '#34D399' },
  reconciled: { bg: '#F3F4F6', color: '#374151', dot: '#6B7280' },
  reversed:   { bg: '#FEF2F2', color: '#991B1B', dot: '#F87171' },
  green:      { bg: '#ECFDF5', color: '#065F46', dot: '#34D399' },
  amber:      { bg: '#FFFBEB', color: '#92400E', dot: '#FBBF24' },
  red:        { bg: '#FEF2F2', color: '#991B1B', dot: '#F87171' },
  blue:       { bg: '#EFF6FF', color: '#1E40AF', dot: '#2563EB' },
  purple:     { bg: '#FAF5FF', color: '#6B21A8', dot: '#A855F7' },
  grey:       { bg: '#F3F4F6', color: '#374151', dot: '#6B7280' },
  cyan:       { bg: '#F0F9FF', color: '#0E7490', dot: '#06B6D4' },
};

export function APlusBadge({
  tone, label, icon, showDot = true,
}: {
  tone: APlusBadgeTone;
  label: ReactNode;
  icon?: string;
  showDot?: boolean;
}) {
  const t = TONE_MAP[tone];
  return (
    <span
      className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-semibold uppercase"
      style={{ background: t.bg, color: t.color, letterSpacing: '0.08em' }}
    >
      {icon ? (
        // @ts-expect-error iconify web component
        <iconify-icon icon={icon} style={{ fontSize: '10px' }}></iconify-icon>
      ) : showDot ? (
        <span className="w-1.5 h-1.5 rounded-full" style={{ background: t.dot }} />
      ) : null}
      {label}
    </span>
  );
}

/* ---------- Action menu trigger ---------- */
export function APlusActionTrigger(props: HTMLAttributes<HTMLButtonElement>) {
  return (
    <button
      {...props}
      className={`w-8 h-8 rounded-[8px] text-[#6B7280] hover:text-[#0a0f1e] hover:bg-[#F3F4F6] flex items-center justify-center transition-all ${props.className || ''}`}
    >
      {/* @ts-expect-error iconify */}
      <iconify-icon icon="solar:menu-dots-linear" style={{ fontSize: '18px' }}></iconify-icon>
    </button>
  );
}

/* ---------- Stat card ---------- */
export function APlusStatCard({
  label, value, valueClassName = '', trailing, icon, urgent,
}: {
  label: string;
  value: ReactNode;
  valueClassName?: string;
  trailing?: ReactNode;
  icon?: string;
  urgent?: boolean;
}) {
  return (
    <div className="bg-white rounded-[12px] p-5" style={{ border: '1px solid #E5E7EB' }}>
      <div className="flex items-center gap-2">
        <span
          className="text-[10px] uppercase font-semibold text-[#6B7280]"
          style={{ letterSpacing: '0.10em' }}
        >
          {label}
        </span>
        {icon && (
          // @ts-expect-error iconify
          <iconify-icon icon={icon} style={{ fontSize: '14px', color: urgent ? '#F87171' : '#9CA3AF' }}></iconify-icon>
        )}
      </div>
      <div className={`text-3xl font-bold tabular-nums mt-2 ${urgent ? 'text-[#991B1B]' : 'text-[#0a0f1e]'} ${valueClassName}`}>
        {value}
      </div>
      {trailing && <div className="mt-2">{trailing}</div>}
    </div>
  );
}

/* ---------- Banners ---------- */
export function APlusArrearsBanner({
  title, body, action,
}: { title: ReactNode; body?: ReactNode; action?: ReactNode }) {
  return (
    <div
      className="bg-[#FEF2F2] rounded-[12px] p-4 flex items-center gap-3 mb-6"
      style={{ border: '1px solid rgba(248,113,113,0.30)' }}
    >
      {/* @ts-expect-error iconify */}
      <iconify-icon icon="solar:danger-triangle-linear" style={{ fontSize: '24px', color: '#DC2626' }}></iconify-icon>
      <div className="flex-1 min-w-0">
        <div className="text-sm font-bold text-[#991B1B]">{title}</div>
        {body && <div className="text-xs text-[#991B1B]/80 mt-0.5">{body}</div>}
      </div>
      {action}
    </div>
  );
}

export function APlusDueSoonBanner({
  title, body, action,
}: { title: ReactNode; body?: ReactNode; action?: ReactNode }) {
  return (
    <div
      className="bg-[#FFFBEB] rounded-[12px] p-4 flex items-center gap-3 mb-6"
      style={{ border: '1px solid rgba(251,191,36,0.30)' }}
    >
      {/* @ts-expect-error iconify */}
      <iconify-icon icon="solar:clock-circle-linear" style={{ fontSize: '24px', color: '#D97706' }}></iconify-icon>
      <div className="flex-1 min-w-0">
        <div className="text-sm font-bold text-[#92400E]">{title}</div>
        {body && <div className="text-xs text-[#92400E]/80 mt-0.5">{body}</div>}
      </div>
      {action}
    </div>
  );
}

export function APlusReconciledBanner({ children }: { children?: ReactNode }) {
  return (
    <div className="bg-[#F3F4F6] rounded-[10px] p-4 flex items-center gap-3 mb-4">
      {/* @ts-expect-error iconify */}
      <iconify-icon icon="solar:lock-keyhole-minimalistic-linear" style={{ fontSize: '20px', color: '#6B7280' }}></iconify-icon>
      <div className="text-sm text-[#374151]">
        {children || 'This period is reconciled and locked. Transactions cannot be edited.'}
      </div>
    </div>
  );
}

/* ---------- Sub-tab pills ---------- */
export function APlusTabBar({ children }: { children: ReactNode }) {
  return (
    <div
      className="flex items-center gap-1 bg-white rounded-[10px] p-1 mb-6 w-fit"
      style={{ border: '1px solid #E5E7EB' }}
    >
      {children}
    </div>
  );
}
export function APlusTab({
  active, onClick, children,
}: { active?: boolean; onClick?: () => void; children: ReactNode }) {
  return (
    <button
      onClick={onClick}
      className={
        active
          ? 'px-4 py-2 rounded-[8px] bg-[#EFF6FF] text-[#2563EB] text-sm font-semibold transition-all'
          : 'px-4 py-2 rounded-[8px] text-[#6B7280] hover:text-[#374151] text-sm font-medium transition-all'
      }
    >
      {children}
    </button>
  );
}

/* ---------- Page header ---------- */
export function APlusPageHeader({ title, subtitle, right }: { title: string; subtitle?: string; right?: ReactNode }) {
  return (
    <div className="flex items-start justify-between mb-6 gap-4 flex-wrap">
      <div>
        <h1 className="text-2xl font-bold text-[#0a0f1e] tracking-tight">{title}</h1>
        {subtitle && <p className="text-sm font-light text-[#6B7280] mt-1">{subtitle}</p>}
      </div>
      {right}
    </div>
  );
}

/* ---------- Section card (e.g. lease detail panel) ---------- */
export function APlusSectionCard({
  title, children, className = '', actions,
}: { title?: string; children: ReactNode; className?: string; actions?: ReactNode }) {
  return (
    <div className={`bg-white rounded-[12px] p-6 ${className}`} style={{ border: '1px solid #E5E7EB' }}>
      {(title || actions) && (
        <div className="flex items-center justify-between mb-4">
          {title && <h2 className="text-lg font-bold text-[#0a0f1e]">{title}</h2>}
          {actions}
        </div>
      )}
      {children}
    </div>
  );
}

export function APlusFieldRow({
  label, value, last,
}: { label: ReactNode; value: ReactNode; last?: boolean }) {
  return (
    <div className={`flex items-start justify-between py-3 ${last ? '' : 'border-b border-[#F3F4F6]'}`}>
      <div className="text-sm text-[#6B7280] font-light">{label}</div>
      <div className="text-sm font-semibold text-[#0a0f1e] text-right">{value}</div>
    </div>
  );
}
