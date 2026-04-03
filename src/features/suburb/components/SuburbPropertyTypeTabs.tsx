import { useState } from 'react';
import { SuburbStatsGrid } from './SuburbStatsGrid';
import type { SuburbMarketStats, PropertyType } from '../types';

const TYPES: { value: PropertyType; label: string }[] = [
  { value: 'house', label: '🏡 Houses' },
  { value: 'unit', label: '🏢 Units' },
  { value: 'townhouse', label: '🏘 Townhouses' },
];

interface Props {
  allStats: SuburbMarketStats[];
}

export function SuburbPropertyTypeTabs({ allStats }: Props) {
  const [active, setActive] = useState<PropertyType>('house');
  const stats = allStats.find((s) => s.property_type === active);

  return (
    <div>
      <div className="flex gap-2 mb-4">
        {TYPES.map((t) => (
          <button
            key={t.value}
            onClick={() => setActive(t.value)}
            className={`px-4 py-2 rounded-full text-sm font-medium border transition ${
              active === t.value
                ? 'bg-foreground text-background border-foreground'
                : 'bg-card text-muted-foreground border-border hover:border-foreground/30'
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>
      {stats ? (
        <SuburbStatsGrid stats={stats} />
      ) : (
        <div className="p-6 rounded-xl bg-secondary text-center text-sm text-muted-foreground">
          No data for {active}s in this suburb yet.
        </div>
      )}
    </div>
  );
}
