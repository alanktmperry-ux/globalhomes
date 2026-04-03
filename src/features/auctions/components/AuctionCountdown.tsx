import { useState, useEffect } from 'react';
import type { AuctionStatus } from '@/types/auction';

interface Props {
  auctionDate: string;
  auctionTime: string;
  status?: AuctionStatus;
}

export function AuctionCountdown({ auctionDate, auctionTime, status }: Props) {
  const [timeLeft, setTimeLeft] = useState('');
  const [urgency, setUrgency] = useState<'normal' | 'soon' | 'live'>('normal');

  useEffect(() => {
    if (status === 'live') { setUrgency('live'); return; }

    const target = new Date(`${auctionDate}T${auctionTime}`);
    const tick = () => {
      const now = new Date();
      const diff = target.getTime() - now.getTime();
      if (diff <= 0) { setTimeLeft('Starting now'); setUrgency('live'); return; }

      const days = Math.floor(diff / 86400000);
      const hrs = Math.floor((diff % 86400000) / 3600000);
      const mins = Math.floor((diff % 3600000) / 60000);
      const secs = Math.floor((diff % 60000) / 1000);

      if (days > 0) {
        setTimeLeft(`${days}d ${hrs}h`);
        setUrgency('normal');
      } else if (hrs > 0) {
        setTimeLeft(`${hrs}h ${mins}m`);
        setUrgency(hrs < 1 ? 'soon' : 'normal');
      } else {
        setTimeLeft(`${mins}m ${secs}s`);
        setUrgency('soon');
      }
    };

    tick();
    const interval = setInterval(tick, 1000);
    return () => clearInterval(interval);
  }, [auctionDate, auctionTime, status]);

  if (status === 'live' || urgency === 'live') {
    return (
      <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-emerald-100 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-400 text-sm font-semibold">
        <span className="relative flex h-2.5 w-2.5">
          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-500 opacity-75" />
          <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-emerald-600" />
        </span>
        LIVE NOW
      </div>
    );
  }

  return (
    <div className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-full text-sm font-semibold ${
      urgency === 'soon'
        ? 'bg-destructive/10 text-destructive'
        : 'bg-primary/10 text-primary'
    }`}>
      🔨 Auction in {timeLeft}
    </div>
  );
}
