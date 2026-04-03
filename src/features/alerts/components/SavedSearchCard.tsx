import { Trash2, Search, ChevronRight } from 'lucide-react';
import { Link } from 'react-router-dom';
import type { SavedSearchRecord, AlertFrequency } from '../types';

const FREQ_LABEL: Record<AlertFrequency, string> = {
  instant: '⚡ Instant alerts',
  daily: '📅 Daily digest',
  weekly: '📆 Weekly digest',
  off: '🔕 Alerts off',
};

interface Props {
  search: SavedSearchRecord;
  onDelete: (id: string) => void;
  onClearBadge: (id: string) => void;
  onUpdateFreq: (id: string, freq: string) => void;
}

export function SavedSearchCard({ search, onDelete, onClearBadge, onUpdateFreq }: Props) {
  const summary: string[] = [];
  if (search.suburbs?.length) summary.push(search.suburbs.join(', '));
  if (search.min_price || search.max_price) {
    const lo = search.min_price ? `$${(search.min_price / 1000).toFixed(0)}k` : 'Any';
    const hi = search.max_price ? `$${(search.max_price / 1000).toFixed(0)}k` : 'Any';
    summary.push(`${lo} – ${hi}`);
  }
  if (search.min_bedrooms) summary.push(`${search.min_bedrooms}+ bed`);
  if (search.property_types?.length) summary.push(search.property_types.join(', '));

  const params = new URLSearchParams();
  if (search.suburbs?.[0]) params.set('suburb', search.suburbs[0]);
  if (search.states?.[0]) params.set('state', search.states[0]);
  if (search.min_price) params.set('min_price', String(search.min_price));
  if (search.max_price) params.set('max_price', String(search.max_price));
  if (search.min_bedrooms) params.set('min_beds', String(search.min_bedrooms));

  return (
    <div className={`rounded-2xl border p-4 bg-card transition
      ${search.new_match_count > 0 ? 'border-primary shadow-sm' : 'border-border'}`}
    >
      <div className="flex items-start justify-between mb-3">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <p className="font-display font-semibold text-foreground truncate">{search.name}</p>
            {search.new_match_count > 0 && (
              <span className="px-2 py-0.5 rounded-full bg-primary text-primary-foreground text-[10px] font-bold">
                {search.new_match_count} new
              </span>
            )}
          </div>
          <p className="text-xs text-muted-foreground truncate">
            {summary.length > 0 ? summary.join(' · ') : 'All properties'}
          </p>
          <p className="text-xs text-muted-foreground mt-0.5">
            {FREQ_LABEL[search.alert_frequency]}
            {search.last_alerted_at && (
              <> · Last alert {new Date(search.last_alerted_at).toLocaleDateString('en-AU', {
                day: 'numeric', month: 'short'
              })}</>
            )}
          </p>
        </div>
        <button
          onClick={() => onDelete(search.id)}
          className="p-1.5 text-muted-foreground hover:text-destructive hover:bg-destructive/10 rounded-lg transition"
        >
          <Trash2 className="w-4 h-4" />
        </button>
      </div>

      <div className="flex items-center gap-2">
        <Link
          to={`/?${params.toString()}`}
          onClick={() => { if (search.new_match_count > 0) onClearBadge(search.id); }}
          className="flex items-center gap-1.5 flex-1 bg-primary text-primary-foreground text-sm
                     font-semibold py-2 px-3 rounded-xl hover:bg-primary/90 transition justify-center"
        >
          <Search className="w-3.5 h-3.5" />
          View Matches
          <ChevronRight className="w-3.5 h-3.5" />
        </Link>
        <select
          value={search.alert_frequency}
          onChange={e => onUpdateFreq(search.id, e.target.value)}
          className="text-xs border border-border rounded-xl px-2 py-2 bg-background
                     text-foreground focus:outline-none"
        >
          <option value="instant">Instant</option>
          <option value="daily">Daily</option>
          <option value="weekly">Weekly</option>
          <option value="off">Off</option>
        </select>
      </div>
    </div>
  );
}
