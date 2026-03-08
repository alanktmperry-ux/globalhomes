import { useState } from 'react';
import { MapPin, Search } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import type { ListingDraft } from './PocketListingForm';

interface Props {
  draft: ListingDraft;
  update: (p: Partial<ListingDraft>) => void;
}

const MOCK_SUGGESTIONS = [
  { address: '42 Collins Street', suburb: 'Melbourne', state: 'VIC' },
  { address: '15 Toorak Road', suburb: 'South Yarra', state: 'VIC' },
  { address: '88 Chapel Street', suburb: 'Prahran', state: 'VIC' },
  { address: '7 St Kilda Road', suburb: 'St Kilda', state: 'VIC' },
];

const StepAddress = ({ draft, update }: Props) => {
  const [query, setQuery] = useState(draft.address);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [manualMode, setManualMode] = useState(false);

  const filtered = query.length > 1
    ? MOCK_SUGGESTIONS.filter((s) =>
        `${s.address} ${s.suburb}`.toLowerCase().includes(query.toLowerCase())
      )
    : [];

  const selectAddress = (addr: typeof MOCK_SUGGESTIONS[0]) => {
    const full = `${addr.address}, ${addr.suburb} ${addr.state}`;
    setQuery(full);
    update({ address: full, suburb: addr.suburb, state: addr.state });
    setShowSuggestions(false);
  };

  return (
    <div className="space-y-4">
      <div>
        <Label className="text-sm font-semibold mb-2 block">Property Address</Label>
        <div className="relative">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={query}
            onChange={(e) => {
              setQuery(e.target.value);
              setShowSuggestions(true);
              if (manualMode) {
                update({ address: e.target.value });
              }
            }}
            placeholder="Start typing an address..."
            className="pl-9 bg-secondary border-border"
          />
        </div>

        {/* Suggestions dropdown */}
        {showSuggestions && filtered.length > 0 && !manualMode && (
          <div className="mt-1 border border-border rounded-xl bg-card overflow-hidden shadow-elevated">
            {filtered.map((s) => (
              <button
                key={s.address}
                type="button"
                onClick={() => selectAddress(s)}
                className="w-full text-left px-4 py-3 hover:bg-accent transition-colors flex items-center gap-3 text-sm"
              >
                <MapPin size={14} className="text-primary shrink-0" />
                <span>{s.address}, <strong>{s.suburb}</strong> {s.state}</span>
              </button>
            ))}
          </div>
        )}

        <button
          type="button"
          onClick={() => setManualMode(!manualMode)}
          className="text-xs text-primary mt-2 hover:underline"
        >
          {manualMode ? 'Use address search' : "Can't find address? Type manually"}
        </button>
      </div>

      {/* Map preview placeholder */}
      {draft.address && (
        <div className="rounded-xl bg-secondary border border-border h-48 flex items-center justify-center">
          <div className="text-center">
            <MapPin size={24} className="mx-auto text-primary mb-2" />
            <p className="text-sm font-medium">{draft.address}</p>
            <p className="text-xs text-muted-foreground mt-1">Map preview</p>
          </div>
        </div>
      )}

      {manualMode && (
        <div className="grid grid-cols-2 gap-3">
          <div>
            <Label className="text-xs">Suburb</Label>
            <Input
              value={draft.suburb}
              onChange={(e) => update({ suburb: e.target.value })}
              placeholder="South Yarra"
              className="bg-secondary border-border"
            />
          </div>
          <div>
            <Label className="text-xs">State</Label>
            <Input
              value={draft.state}
              onChange={(e) => update({ state: e.target.value })}
              placeholder="VIC"
              className="bg-secondary border-border"
            />
          </div>
        </div>
      )}
    </div>
  );
};

export default StepAddress;
