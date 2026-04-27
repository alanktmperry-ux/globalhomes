import { useState } from 'react';
import { Trash2, Search, ChevronRight, Bell } from 'lucide-react';
import { Link } from 'react-router-dom';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import type { SavedSearchRecord, AlertFrequency } from '../types';

const FREQ_BADGE: Record<AlertFrequency, string> = {
  instant: '🔔 Instant',
  daily: '📅 Daily',
  weekly: '📆 Weekly',
  off: '🔕 Off',
};

const PILLS: { value: AlertFrequency; label: string }[] = [
  { value: 'instant', label: 'Instant' },
  { value: 'daily', label: 'Daily' },
  { value: 'weekly', label: 'Weekly' },
];

interface Props {
  search: SavedSearchRecord;
  onDelete: (id: string) => void;
  onClearBadge: (id: string) => void;
  onUpdateFreq: (id: string, freq: string) => void;
}

export function SavedSearchCard({ search, onDelete, onClearBadge, onUpdateFreq }: Props) {
  const [freq, setFreq] = useState<AlertFrequency>(search.alert_frequency);

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

  const handleFreqChange = async (value: AlertFrequency) => {
    if (value === freq) return;
    const prev = freq;
    setFreq(value); // optimistic
    onUpdateFreq(search.id, value);
    const { error } = await supabase
      .from('saved_searches')
      .update({ alert_frequency: value } as any)
      .eq('id', search.id);
    if (error) {
      setFreq(prev);
      toast.error('Could not update frequency');
    } else {
      toast.success('Notification frequency updated');
    }
  };

  return (
    <div className={`rounded-2xl border p-4 bg-card transition
      ${search.new_match_count > 0 ? 'border-primary shadow-sm' : 'border-border'}`}
    >
      <div className="flex items-start justify-between mb-3">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1 flex-wrap">
            <p className="font-display font-semibold text-foreground truncate">{search.name}</p>
            {search.new_match_count > 0 && (
              <span className="px-2 py-0.5 rounded-full bg-primary text-primary-foreground text-[10px] font-bold">
                {search.new_match_count} new
              </span>
            )}
            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-muted text-muted-foreground text-[10px] font-medium">
              <Bell className="w-3 h-3" />
              {FREQ_BADGE[freq]}
            </span>
          </div>
          <p className="text-xs text-muted-foreground truncate">
            {summary.length > 0 ? summary.join(' · ') : 'All properties'}
          </p>
          {search.last_alerted_at && (
            <p className="text-xs text-muted-foreground mt-0.5">
              Last alert {new Date(search.last_alerted_at).toLocaleDateString('en-AU', {
                day: 'numeric', month: 'short'
              })}
            </p>
          )}
        </div>
        <button
          onClick={() => onDelete(search.id)}
          className="p-1.5 text-muted-foreground hover:text-destructive hover:bg-destructive/10 rounded-lg transition"
          aria-label="Delete saved search"
        >
          <Trash2 className="w-4 h-4" />
        </button>
      </div>

      {/* Frequency pills */}
      <div className="flex items-center gap-1.5 mb-3">
        {PILLS.map(p => {
          const active = freq === p.value;
          return (
            <button
              key={p.value}
              onClick={() => handleFreqChange(p.value)}
              className={`h-7 px-3 rounded-full text-xs font-medium transition border
                ${active
                  ? 'bg-primary text-primary-foreground border-primary'
                  : 'bg-background text-muted-foreground border-border hover:text-foreground hover:border-foreground/30'
                }`}
            >
              {p.label}
            </button>
          );
        })}
      </div>

      <Link
        to={`/?${params.toString()}`}
        onClick={() => { if (search.new_match_count > 0) onClearBadge(search.id); }}
        className="flex items-center gap-1.5 w-full bg-primary text-primary-foreground text-sm
                   font-semibold py-2 px-3 rounded-xl hover:bg-primary/90 transition justify-center"
      >
        <Search className="w-3.5 h-3.5" />
        View Matches
        <ChevronRight className="w-3.5 h-3.5" />
      </Link>
    </div>
  );
}
