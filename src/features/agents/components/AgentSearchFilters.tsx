import { useState, useRef, useEffect } from 'react';
import { Search, SlidersHorizontal, X } from 'lucide-react';
import { autocomplete } from '@/shared/lib/googleMapsService';
import { useTranslation } from '@/shared/lib/i18n';
import type { AgentFilters } from '../types';

const AU_STATES = ['NSW', 'VIC', 'QLD', 'WA', 'SA', 'TAS', 'ACT', 'NT'];
const SPECIALTIES: Array<{ value: string; key: string }> = [
  { value: 'Residential', key: 'agent.search.specialty.residential' },
  { value: 'Commercial', key: 'agent.search.specialty.commercial' },
  { value: 'Rural', key: 'agent.search.specialty.rural' },
  { value: 'Off-Market', key: 'agent.search.specialty.offMarket' },
  { value: 'Auctions', key: 'agent.search.specialty.auctions' },
  { value: 'Property Management', key: 'agent.search.specialty.propertyManagement' },
];

interface Props {
  filters: AgentFilters;
  onChange: (f: AgentFilters) => void;
  resultCount?: number;
}

export function AgentSearchFilters({ filters, onChange, resultCount }: Props) {
  const { t } = useTranslation();
  const [showMore, setShowMore] = useState(false);
  const [suburbInput, setSuburbInput] = useState(filters.suburb ?? '');
  const [suggestions, setSuggestions] = useState<string[]>([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const set = (key: keyof AgentFilters, val: any) =>
    onChange({ ...filters, [key]: val });

  const hasFilters = !!(filters.suburb || filters.state || filters.specialty || filters.minRating);

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap gap-2">
        {/* Suburb search */}
        <div className="relative flex-1 min-w-[200px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" size={16} />
          <input
            value={suburbInput}
            onChange={e => {
              const val = e.target.value;
              setSuburbInput(val);
              if (debounceRef.current) clearTimeout(debounceRef.current);
              if (!val.trim()) { setSuggestions([]); return; }
              debounceRef.current = setTimeout(async () => {
                const results = await autocomplete(val, '(regions)');
                setSuggestions(results.map(r => r.description.split(',')[0]));
                setShowSuggestions(true);
              }, 300);
            }}
            onKeyDown={e => {
              if (e.key === 'Enter') { set('suburb', suburbInput); setShowSuggestions(false); }
              if (e.key === 'Escape') setShowSuggestions(false);
            }}
            onBlur={() => { setTimeout(() => setShowSuggestions(false), 150); set('suburb', suburbInput); }}
            onFocus={() => { if (suggestions.length > 0) setShowSuggestions(true); }}
            placeholder={t('agent.search.searchSuburb')}
            className="w-full pl-9 border border-border rounded-xl px-3 py-2.5 text-sm bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-ring"
          />
          {showSuggestions && suggestions.length > 0 && (
            <ul className="absolute z-50 top-full left-0 right-0 mt-1 bg-popover border border-border rounded-xl shadow-lg overflow-hidden">
              {suggestions.map((s, i) => (
                <li
                  key={i}
                  onMouseDown={() => {
                    setSuburbInput(s);
                    set('suburb', s);
                    setShowSuggestions(false);
                    setSuggestions([]);
                  }}
                  className="px-4 py-2.5 text-sm cursor-pointer hover:bg-accent hover:text-accent-foreground"
                >
                  {s}
                </li>
              ))}
            </ul>
          )}
        </div>

        {/* State */}
        <select
          value={filters.state || ''}
          onChange={e => set('state', e.target.value || undefined)}
          className="border border-border rounded-xl px-3 py-2.5 text-sm bg-background text-foreground focus:outline-none"
        >
          <option value="">{t('agent.search.allStates')}</option>
          {AU_STATES.map(s => <option key={s} value={s}>{s}</option>)}
        </select>

        {/* Specialty */}
        <select
          value={filters.specialty || ''}
          onChange={e => set('specialty', e.target.value || undefined)}
          className="border border-border rounded-xl px-3 py-2.5 text-sm bg-background text-foreground focus:outline-none"
        >
          <option value="">{t('agent.search.anySpecialty')}</option>
          {SPECIALTIES.map(s => <option key={s.value} value={s.value}>{t(s.key)}</option>)}
        </select>

        {/* Min rating */}
        <select
          value={filters.minRating || ''}
          onChange={e => set('minRating', e.target.value ? Number(e.target.value) : undefined)}
          className="border border-border rounded-xl px-3 py-2.5 text-sm bg-background text-foreground focus:outline-none"
        >
          <option value="">{t('agent.search.anyRating')}</option>
          <option value="4">{t('agent.search.rating4Plus')}</option>
          <option value="4.5">{t('agent.search.rating45Plus')}</option>
        </select>

        {hasFilters && (
          <button
            onClick={() => { onChange({}); setSuburbInput(''); setSuggestions([]); }}
            className="flex items-center gap-1 text-xs text-muted-foreground hover:text-destructive transition-colors px-2"
          >
            <X size={14} /> {t('agent.search.clear')}
          </button>
        )}
      </div>

      {resultCount !== undefined && (
        <p className="text-xs text-muted-foreground">
          {t(resultCount === 1 ? 'agent.search.showingAgents_one' : 'agent.search.showingAgents_other', { count: resultCount })}
        </p>
      )}
    </div>
  );
}
