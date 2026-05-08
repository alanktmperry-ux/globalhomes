import { useEffect, useState } from 'react';
import { Clock } from 'lucide-react';

interface Props {
  /** Trial end date — ISO string or Date */
  trialEndsAt: string | Date | null | undefined;
  /** Optional className for the wrapper */
  className?: string;
}

interface Remaining {
  expired: boolean;
  days: number;
  hours: number;
  minutes: number;
}

function compute(end: Date): Remaining {
  const ms = end.getTime() - Date.now();
  if (ms <= 0) return { expired: true, days: 0, hours: 0, minutes: 0 };
  const minutes = Math.floor(ms / 60000) % 60;
  const hours = Math.floor(ms / 3600000) % 24;
  const days = Math.floor(ms / 86400000);
  return { expired: false, days, hours, minutes };
}

export function TrialCountdown({ trialEndsAt, className }: Props) {
  const endDate = trialEndsAt ? new Date(trialEndsAt) : null;
  const [remaining, setRemaining] = useState<Remaining | null>(
    endDate ? compute(endDate) : null
  );

  useEffect(() => {
    if (!endDate) return;
    setRemaining(compute(endDate));
    const id = setInterval(() => setRemaining(compute(endDate)), 60_000);
    return () => clearInterval(id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [trialEndsAt]);

  if (!endDate || !remaining) return null;

  if (remaining.expired) {
    return (
      <div className={`flex items-center gap-2 text-xs text-destructive font-medium ${className ?? ''}`}>
        <Clock size={14} />
        Trial expired — upgrade to keep your listings live
      </div>
    );
  }

  const colorClass =
    remaining.days <= 3 ? 'text-destructive' :
    remaining.days <= 7 ? 'text-amber-600' :
    'text-muted-foreground';

  const label = remaining.days > 0
    ? `${remaining.days}d ${remaining.hours}h remaining`
    : `${remaining.hours}h ${remaining.minutes}m remaining`;

  return (
    <div className={`flex items-center gap-2 text-xs font-medium ${colorClass} ${className ?? ''}`}>
      <Clock size={14} />
      Trial: <span>{label}</span>
      <span className="text-muted-foreground">· ends {endDate.toLocaleDateString('en-AU')}</span>
    </div>
  );
}
