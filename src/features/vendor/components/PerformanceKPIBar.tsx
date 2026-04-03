import { useEffect, useState } from 'react';
import { Eye, Heart, MessageSquare, Home, CalendarDays } from 'lucide-react';
import type { PropertyPerformance } from '../types';

interface Props {
  performance: PropertyPerformance;
}

function AnimatedNumber({ value, duration = 800 }: { value: number; duration?: number }) {
  const [display, setDisplay] = useState(0);
  useEffect(() => {
    if (value === 0) { setDisplay(0); return; }
    const start = performance.now();
    const step = (ts: number) => {
      const progress = Math.min((ts - start) / duration, 1);
      setDisplay(Math.round(progress * value));
      if (progress < 1) requestAnimationFrame(step);
    };
    requestAnimationFrame(step);
  }, [value, duration]);
  return <>{display.toLocaleString()}</>;
}

const domLabel = (days: number) => {
  if (days < 7) return { text: 'Just listed', color: 'text-green-600' };
  if (days <= 30) return { text: 'Warming up', color: 'text-amber-600' };
  return { text: 'Consider price review', color: 'text-red-500' };
};

export function PerformanceKPIBar({ performance: perf }: Props) {
  const dom = domLabel(perf.days_on_market);

  const kpis = [
    { icon: Eye, label: 'Total Views', value: perf.total_views, sub: `${perf.total_unique_views.toLocaleString()} unique`, color: 'text-foreground' },
    { icon: Heart, label: 'Saved', value: perf.total_saves, sub: `${perf.save_rate}% save rate`, color: 'text-rose-500' },
    { icon: MessageSquare, label: 'Enquiries', value: perf.total_enquiries, sub: `${perf.enquiry_rate}% enquiry rate`, color: 'text-primary' },
    { icon: Home, label: 'Open Home Attendees', value: perf.open_home_attendees, sub: 'total attendees', color: 'text-amber-500' },
    { icon: CalendarDays, label: 'Days on Market', value: perf.days_on_market, sub: dom.text, color: dom.color },
  ];

  return (
    <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
      {kpis.map((k) => (
        <div key={k.label} className="bg-card rounded-xl shadow-sm hover:shadow-md transition-shadow p-4 border border-border">
          <div className="flex items-center gap-2 mb-2">
            <k.icon className={`h-4 w-4 ${k.color}`} />
            <span className="text-xs font-medium text-muted-foreground">{k.label}</span>
          </div>
          <p className="text-2xl font-bold text-foreground">
            <AnimatedNumber value={k.value} />
            {k.label === 'Days on Market' && <span className="text-base font-normal text-muted-foreground ml-1">days</span>}
          </p>
          <p className={`text-xs mt-1 ${k.label === 'Days on Market' ? dom.color : 'text-muted-foreground'}`}>{k.sub}</p>
        </div>
      ))}
    </div>
  );
}
