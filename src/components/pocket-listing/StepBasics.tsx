import { Home, Building2, Warehouse, Mountain, Store, Minus, Plus } from 'lucide-react';
import { Label } from '@/components/ui/label';
import { Slider } from '@/components/ui/slider';
import type { ListingDraft } from './PocketListingForm';

interface Props {
  draft: ListingDraft;
  update: (p: Partial<ListingDraft>) => void;
}

const TYPES = [
  { key: 'House', icon: <Home size={20} />, label: 'House' },
  { key: 'Apartment', icon: <Building2 size={20} />, label: 'Apt' },
  { key: 'Townhouse', icon: <Warehouse size={20} />, label: 'Town' },
  { key: 'Land', icon: <Mountain size={20} />, label: 'Land' },
  { key: 'Commercial', icon: <Store size={20} />, label: 'Comm' },
];

const PRICE_DISPLAYS = [
  { key: 'exact', label: 'Exact' },
  { key: 'range', label: 'Range' },
  { key: 'eoi', label: 'EOI' },
  { key: 'contact', label: 'Contact Agent' },
];

const Counter = ({ label, value, onChange }: { label: string; value: number; onChange: (v: number) => void }) => (
  <div className="flex items-center justify-between bg-secondary rounded-xl px-4 py-3">
    <span className="text-sm font-medium">{label}</span>
    <div className="flex items-center gap-3">
      <button
        type="button"
        onClick={() => onChange(Math.max(0, value - 1))}
        className="w-8 h-8 rounded-lg bg-card border border-border flex items-center justify-center hover:bg-accent transition-colors"
      >
        <Minus size={14} />
      </button>
      <span className="font-display text-lg font-bold w-6 text-center">{value}</span>
      <button
        type="button"
        onClick={() => onChange(value + 1)}
        className="w-8 h-8 rounded-lg bg-card border border-border flex items-center justify-center hover:bg-accent transition-colors"
      >
        <Plus size={14} />
      </button>
    </div>
  </div>
);

const formatPrice = (v: number) =>
  v >= 1000000 ? `$${(v / 1000000).toFixed(1)}M` : `$${(v / 1000).toFixed(0)}K`;

const StepBasics = ({ draft, update }: Props) => {
  return (
    <div className="space-y-6">
      {/* Property Type */}
      <div>
        <Label className="text-sm font-semibold mb-3 block">Property Type</Label>
        <div className="grid grid-cols-5 gap-2">
          {TYPES.map((t) => (
            <button
              key={t.key}
              type="button"
              onClick={() => update({ propertyType: t.key })}
              className={`flex flex-col items-center gap-1.5 py-3 rounded-xl border transition-all text-xs font-medium ${
                draft.propertyType === t.key
                  ? 'bg-primary/15 border-primary text-primary'
                  : 'bg-secondary border-border text-muted-foreground hover:border-primary/40'
              }`}
            >
              {t.icon}
              {t.label}
            </button>
          ))}
        </div>
      </div>

      {/* Price */}
      <div>
        <Label className="text-sm font-semibold mb-3 block">
          Price Guide: {formatPrice(draft.priceMin)} – {formatPrice(draft.priceMax)}
        </Label>
        <Slider
          min={100000}
          max={10000000}
          step={50000}
          value={[draft.priceMin, draft.priceMax]}
          onValueChange={([min, max]) => update({ priceMin: min, priceMax: max })}
          className="mb-3"
        />
        <div className="flex gap-1.5">
          {PRICE_DISPLAYS.map((p) => (
            <button
              key={p.key}
              type="button"
              onClick={() => update({ priceDisplay: p.key as ListingDraft['priceDisplay'] })}
              className={`flex-1 py-1.5 rounded-lg text-xs font-medium border transition-colors ${
                draft.priceDisplay === p.key
                  ? 'bg-primary text-primary-foreground border-primary'
                  : 'bg-secondary text-muted-foreground border-border'
              }`}
            >
              {p.label}
            </button>
          ))}
        </div>
      </div>

      {/* Counters */}
      <div className="space-y-2">
        <Counter label="Bedrooms" value={draft.beds} onChange={(v) => update({ beds: v })} />
        <Counter label="Bathrooms" value={draft.baths} onChange={(v) => update({ baths: v })} />
        <Counter label="Car Spaces" value={draft.cars} onChange={(v) => update({ cars: v })} />
      </div>
    </div>
  );
};

export default StepBasics;
