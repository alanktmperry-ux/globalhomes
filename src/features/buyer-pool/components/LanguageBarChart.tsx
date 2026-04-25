import { useEffect, useState } from "react";
import type { TopLanguage } from "../types";

export function LanguageBarChart({ languages }: { languages: TopLanguage[] }) {
  const [animate, setAnimate] = useState(false);

  useEffect(() => {
    const t = setTimeout(() => setAnimate(true), 50);
    return () => clearTimeout(t);
  }, [languages]);

  if (!languages || languages.length === 0) {
    return (
      <p className="text-sm text-muted-foreground">
        No language breakdown available for this suburb.
      </p>
    );
  }

  const max = Math.max(...languages.map((l) => l.pct));

  return (
    <div className="space-y-3">
      {languages.slice(0, 5).map((l) => {
        const widthPct = max > 0 ? (l.pct / max) * 100 : 0;
        return (
          <div key={l.lang} className="space-y-1.5">
            <div className="flex items-baseline justify-between gap-3 text-sm">
              <span className="font-medium text-foreground truncate">
                {l.lang}
              </span>
              <span className="text-muted-foreground tabular-nums shrink-0">
                {l.count.toLocaleString("en-AU")} · {l.pct.toFixed(1)}%
              </span>
            </div>
            <div className="h-2.5 w-full rounded-full bg-secondary overflow-hidden">
              <div
                className="h-full rounded-full bg-primary transition-[width] duration-700 ease-out"
                style={{ width: animate ? `${widthPct}%` : "0%" }}
              />
            </div>
          </div>
        );
      })}
    </div>
  );
}
