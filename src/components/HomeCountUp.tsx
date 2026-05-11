import { useEffect, useRef, useState } from 'react';

interface Props {
  target: number;
  duration?: number;
  format?: (v: number) => string;
  suffix?: string;
  staticText?: string;
  className?: string;
  style?: React.CSSProperties;
}

const easeOutCubic = (t: number) => 1 - Math.pow(1 - t, 3);

export default function HomeCountUp({
  target,
  duration = 1500,
  format,
  suffix = '',
  staticText,
  className,
  style,
}: Props) {
  const ref = useRef<HTMLSpanElement>(null);
  const [value, setValue] = useState(staticText ? target : 0);
  const startedRef = useRef(false);

  useEffect(() => {
    if (staticText) return;
    const el = ref.current;
    if (!el) return;
    const io = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting && !startedRef.current) {
            startedRef.current = true;
            const start = performance.now();
            const tick = (now: number) => {
              const p = Math.min(1, (now - start) / duration);
              setValue(Math.round(easeOutCubic(p) * target));
              if (p < 1) requestAnimationFrame(tick);
            };
            requestAnimationFrame(tick);
            io.disconnect();
          }
        });
      },
      { threshold: 0.3 },
    );
    io.observe(el);
    return () => io.disconnect();
  }, [target, duration, staticText]);

  return (
    <span ref={ref} className={className} style={style}>
      {staticText ?? `${format ? format(value) : value.toLocaleString()}${suffix}`}
    </span>
  );
}
