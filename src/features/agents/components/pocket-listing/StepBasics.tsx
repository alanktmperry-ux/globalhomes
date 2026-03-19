import { Home, Building2, Warehouse, Mountain, Store, Minus, Plus, DollarSign, Key } from 'lucide-react';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
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

const LISTING_TYPES = [
  { key: 'sale' as const, icon: <DollarSign size={16} />, label: 'For Sale' },
  { key: 'rent' as const, icon: <Key size={16} />, label: 'For Rent' },
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
  const isLand = draft.propertyType === 'Land';
  const isCommercial = draft.propertyType === 'Commercial';
  const isRental = draft.listingType === 'rent';
  const showBedsBaths = !isLand;
  const showCars = !isLand;

  return (
    <div className="space-y-6">
      {/* Listing Type — Sale or Rent */}
      <div>
        <Label className="text-sm font-semibold mb-3 block">Listing Type</Label>
        <div className="grid grid-cols-2 gap-2">
          {LISTING_TYPES.map((lt) => (
            <button
              key={lt.key}
              type="button"
              onClick={() => update({ listingType: lt.key })}
              className={`flex items-center justify-center gap-2 py-3 rounded-xl border transition-all text-sm font-medium ${
                draft.listingType === lt.key
                  ? 'bg-primary/15 border-primary text-primary'
                  : 'bg-secondary border-border text-muted-foreground hover:border-primary/40'
              }`}
            >
              {lt.icon}
              {lt.label}
            </button>
          ))}
        </div>
      </div>

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

      {/* Property type hint */}
      <p className="text-xs text-muted-foreground -mt-3">
        {draft.propertyType === 'House' && 'Standalone residential dwelling'}
        {draft.propertyType === 'Apartment' && 'Unit, flat, or apartment in a complex'}
        {draft.propertyType === 'Townhouse' && 'Multi-level attached dwelling'}
        {draft.propertyType === 'Land' && 'Vacant land or development site'}
        {draft.propertyType === 'Commercial' && 'Office, retail, warehouse, or mixed-use'}
      </p>

      {/* Price */}
      <div>
        <Label className="text-sm font-semibold mb-2 block">
          {isRental ? 'Rent per Week ($)' : 'Price ($)'}
        </Label>
        <Input
          type="number"
          min={0}
          value={draft.priceMin || ''}
          onChange={(e) => {
            const val = Number(e.target.value) || 0;
            update({ priceMin: val, priceMax: Math.round(val * 1.1) });
          }}
          placeholder={isRental ? 'e.g. 650' : 'e.g. 1200000'}
          className="h-10"
        />
        {draft.priceMin > 0 && (
          <p className="text-xs text-muted-foreground mt-1.5">
            Price Guide: {formatPrice(draft.priceMin)} – {formatPrice(Math.round(draft.priceMin * 1.1))}
          </p>
        )}
        {!isRental && (
          <div className="flex gap-1.5 mt-3">
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
        )}
      </div>

      {/* Rental-specific fields */}
      {isRental && (
        <div className="bg-secondary/50 rounded-xl p-4 space-y-3">
          <Label className="text-sm font-semibold block">Rental Details</Label>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label className="text-xs text-muted-foreground mb-1 block">Weekly Rent ($)</Label>
              <Input
                type="number"
                min={0}
                value={draft.rentalWeekly || ''}
                onChange={(e) => update({ rentalWeekly: Number(e.target.value) || 0 })}
                placeholder="e.g. 650"
                className="h-9"
              />
            </div>
            <div>
              <Label className="text-xs text-muted-foreground mb-1 block">Bond (weeks)</Label>
              <Input
                type="number"
                min={1}
                max={8}
                value={draft.rentalBondWeeks || 4}
                onChange={(e) => update({ rentalBondWeeks: Number(e.target.value) || 4 })}
                placeholder="4"
                className="h-9"
              />
            </div>
          </div>
        </div>
      )}

      {/* Estimated rental for sale listings */}
      {!isRental && (
        <div>
          <Label className="text-xs text-muted-foreground mb-1 block">Estimated Rental ($/week)</Label>
          <Input
            type="number"
            min={0}
            value={draft.estimatedRentalWeekly || ''}
            onChange={(e) => update({ estimatedRentalWeekly: Number(e.target.value) || 0 })}
            placeholder="e.g. 650 — helps investors assess yield"
            className="h-9"
          />
        </div>
      )}

      {/* Counters — contextual based on property type */}
      <div className="space-y-2">
        {showBedsBaths && (
          <>
            <Counter label={isCommercial ? 'Offices / Rooms' : 'Bedrooms'} value={draft.beds} onChange={(v) => update({ beds: v })} />
            <Counter label={isCommercial ? 'Washrooms' : 'Bathrooms'} value={draft.baths} onChange={(v) => update({ baths: v })} />
          </>
        )}
        {showCars && (
          <Counter label="Car Spaces" value={draft.cars} onChange={(v) => update({ cars: v })} />
        )}
        {/* Floor Area & Land Size */}
        <div className="grid grid-cols-2 gap-3">
          {!isLand && (
            <div>
              <Label className="text-xs text-muted-foreground mb-1 block">Floor Area (sqm)</Label>
              <Input
                type="number"
                min={0}
                value={draft.sqm || ''}
                onChange={(e) => update({ sqm: Number(e.target.value) || 0 })}
                placeholder="e.g. 180"
                className="h-9"
              />
            </div>
          )}
          <div className={isLand ? 'col-span-2' : ''}>
            <Label className="text-xs text-muted-foreground mb-1 block">Land Size (sqm)</Label>
            <Input
              type="number"
              min={0}
              value={draft.landSize || ''}
              onChange={(e) => update({ landSize: Number(e.target.value) || 0 })}
              placeholder="e.g. 650"
              className="h-9"
            />
          </div>
        </div>
      </div>
    </div>
  );
};

export default StepBasics;
