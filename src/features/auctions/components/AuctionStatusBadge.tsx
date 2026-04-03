import type { AuctionStatus } from '@/types/auction';

const STATUS_CONFIG: Record<AuctionStatus, { label: string; className: string; pulse?: boolean }> = {
  scheduled:  { label: 'Auction Scheduled', className: 'bg-primary/10 text-primary border-primary/20' },
  open:       { label: 'Registrations Open', className: 'bg-primary/10 text-primary border-primary/20' },
  live:       { label: 'Live Auction', className: 'bg-emerald-100 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-400 border-emerald-200 dark:border-emerald-800', pulse: true },
  sold:       { label: 'Sold at Auction', className: 'bg-emerald-100 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-400 border-emerald-200 dark:border-emerald-800' },
  sold_prior: { label: 'Sold Prior', className: 'bg-emerald-100 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-400 border-emerald-200 dark:border-emerald-800' },
  sold_after: { label: 'Sold After Auction', className: 'bg-emerald-100 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-400 border-emerald-200 dark:border-emerald-800' },
  passed_in:  { label: 'Passed In', className: 'bg-amber-100 dark:bg-amber-950/30 text-amber-700 dark:text-amber-400 border-amber-200 dark:border-amber-800' },
  withdrawn:  { label: 'Withdrawn', className: 'bg-secondary text-muted-foreground border-border' },
  postponed:  { label: 'Postponed', className: 'bg-amber-100 dark:bg-amber-950/30 text-amber-700 dark:text-amber-400 border-amber-200 dark:border-amber-800' },
};

interface Props { status: AuctionStatus; size?: 'sm' | 'md'; }

export function AuctionStatusBadge({ status, size = 'sm' }: Props) {
  const config = STATUS_CONFIG[status] ?? STATUS_CONFIG.scheduled;
  return (
    <span className={`inline-flex items-center gap-1.5 border rounded-full font-medium ${
      size === 'sm' ? 'px-2.5 py-0.5 text-xs' : 'px-3 py-1 text-sm'
    } ${config.className}`}>
      {config.pulse && (
        <span className="relative flex h-2 w-2">
          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-500 opacity-75" />
          <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-600" />
        </span>
      )}
      {config.label}
    </span>
  );
}
