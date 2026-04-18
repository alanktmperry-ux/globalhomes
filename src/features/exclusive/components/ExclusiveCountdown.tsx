import { useEffect, useState } from 'react';

export function getRemaining(endDate: string | Date) {
  const end = new Date(endDate).getTime();
  const diff = Math.max(0, end - Date.now());
  const days = Math.floor(diff / 86_400_000);
  const hours = Math.floor((diff % 86_400_000) / 3_600_000);
  const minutes = Math.floor((diff % 3_600_000) / 60_000);
  return { days, hours, minutes, expired: diff === 0 };
}

interface Props {
  endDate: string | Date;
  className?: string;
  compact?: boolean;
}

export function ExclusiveCountdown({ endDate, className, compact }: Props) {
  const [now, setNow] = useState(Date.now());
  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), 60_000);
    return () => clearInterval(id);
  }, []);

  const { days, hours, minutes, expired } = getRemaining(endDate);
  if (expired) return <span className={className}>Window closed</span>;

  if (compact) {
    return <span className={className}>{days}d {hours}h left</span>;
  }
  return (
    <span className={className}>
      {days} day{days === 1 ? '' : 's'} {hours} hour{hours === 1 ? '' : 's'} {minutes}m remaining
    </span>
  );
}

export default ExclusiveCountdown;
