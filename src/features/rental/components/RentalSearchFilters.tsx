import { useState } from 'react';
import type { RentalFilters } from '../hooks/useRentalSearch';
import { Search, SlidersHorizontal, X } from 'lucide-react';

const AU_STATES = ['NSW', 'VIC', 'QLD', 'WA', 'SA', 'TAS', 'ACT', 'NT'];
const RENT_MAX_OPTIONS = [300, 400, 500, 600, 700, 800, 1000, 1200, 1500, 2000];

interface Props {
  value: RentalFilters;
  onChange: (f: RentalFilters) => void;
}

export function RentalSearchFilters({ value: filters, onChange }: Props) {
  const [showMore, setShowMore] = useState(false);
  const [suburbInput, setSuburbInput] = useState(filters.suburb ?? '');

  const set = (key: keyof RentalFilters, val: any) =>
    onChange({ ...filters, [key]: val });

  return (
    <div className="space-y-3">
      {/* Top row */}
      <div className="flex flex-wrap gap-2">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <input
            value={suburbInput}
            onChange={e => setSuburbInput(e.target.value)}
            onKeyDown={e => { if (e.key === 'Enter') set('suburb', suburbInput); }}
            onBlur={() => set('suburb', suburbInput)}
            placeholder="Suburb, postcode or area"
            className="pl-9 w-full border border-border rounded-xl px-3 py-2.5 text-sm bg-card text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
          />
        </div>

        <select
          value={filters.state ?? ''}
          onChange={e => set('state', e.target.value || undefined)}
          className="border border-border rounded-xl px-3 py-2.5 text-sm bg-card text-foreground focus:outline-none"
        >
          <option value="">All states</option>
          {AU_STATES.map(s => <option key={s} value={s}>{s}</option>)}
        </select>

        <select
          value={filters.maxRent ?? ''}
          onChange={e => set('maxRent', e.target.value ? Number(e.target.value) : undefined)}
          className="border border-border rounded-xl px-3 py-2.5 text-sm bg-card text-foreground focus:outline-none"
        >
          <option value="">Max rent</option>
          {RENT_MAX_OPTIONS.map(r => (
            <option key={r} value={r}>${r}/wk</option>
          ))}
        </select>

        <select
          value={filters.minBedrooms ?? ''}
          onChange={e => set('minBedrooms', e.target.value ? Number(e.target.value) : undefined)}
          className="border border-border rounded-xl px-3 py-2.5 text-sm bg-card text-foreground focus:outline-none"
        >
          <option value="">Any beds</option>
          {[1, 2, 3, 4, 5].map(n => (
            <option key={n} value={n}>{n}+ bed</option>
          ))}
        </select>

        <button
          onClick={() => setShowMore(!showMore)}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-xl border text-sm font-medium transition
            ${showMore
              ? 'bg-primary text-primary-foreground border-primary'
              : 'bg-card text-muted-foreground border-border hover:border-foreground/30'
            }`}
        >
          <SlidersHorizontal className="w-4 h-4" />
          Filters
        </button>
      </div>

      {/* Extended filters */}
      {showMore && (
        <div className="flex flex-wrap gap-2 pt-2 border-t border-border">
          <button
            onClick={() => set('petsAllowed', filters.petsAllowed ? undefined : true)}
            className={`px-3 py-1.5 rounded-full text-sm border transition
              ${filters.petsAllowed
                ? 'bg-green-600 text-white border-green-600'
                : 'bg-card text-muted-foreground border-border hover:border-foreground/30'
              }`}
          >
            🐾 Pets allowed
          </button>

          <select
            value={filters.furnished ?? ''}
            onChange={e => set('furnished', e.target.value || undefined)}
            className="border border-border rounded-full px-3 py-1.5 text-sm bg-card text-foreground focus:outline-none"
          >
            <option value="">Any furnishings</option>
            <option value="furnished">Furnished</option>
            <option value="unfurnished">Unfurnished</option>
          </select>

          {['house', 'apartment', 'townhouse', 'studio'].map(t => (
            <button
              key={t}
              onClick={() => {
                const types = filters.propertyTypes ?? [];
                set('propertyTypes', types.includes(t)
                  ? types.filter(x => x !== t)
                  : [...types, t]);
              }}
              className={`px-3 py-1.5 rounded-full text-sm border transition capitalize
                ${(filters.propertyTypes ?? []).includes(t)
                  ? 'bg-primary text-primary-foreground border-primary'
                  : 'bg-card text-muted-foreground border-border hover:border-foreground/30'
                }`}
            >
              {t}
            </button>
          ))}

          <button
            onClick={() => { onChange({}); setSuburbInput(''); }}
            className="flex items-center gap-1 text-xs text-muted-foreground hover:text-destructive ml-auto"
          >
            <X className="w-3 h-3" /> Clear all
          </button>
        </div>
      )}
    </div>
  );
}
