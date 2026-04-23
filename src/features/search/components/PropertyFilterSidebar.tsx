import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';

export interface PropertyFilters {
  category: string;
  propertyType: string;
  intent: string;
  minPrice: number | null;
  maxPrice: number | null;
  minBeds: number | null;
  minFloorArea: number | null;
  minLandSize: number | null;
}

interface Props {
  filters: PropertyFilters;
  onChange: (filters: PropertyFilters) => void;
  onReset: () => void;
}

const CATEGORIES = ['Residential', 'Commercial', 'Land'] as const;

const TYPES_BY_CATEGORY: Record<string, string[]> = {
  Residential: ['House', 'Apartment', 'Townhouse', 'Unit', 'Villa', 'Terrace', 'Duplex', 'Studio'],
  Commercial: ['Office', 'Retail', 'Industrial', 'Warehouse'],
  Land: ['Vacant Land', 'Acreage', 'Rural', 'Development Site'],
};

const INTENTS = [
  { key: 'sale', label: 'For Sale' },
  { key: 'rent', label: 'For Rent' },
];

const BED_OPTIONS: { label: string; value: number | null }[] = [
  { label: 'Any', value: null },
  { label: '1+', value: 1 },
  { label: '2+', value: 2 },
  { label: '3+', value: 3 },
  { label: '4+', value: 4 },
  { label: '5+', value: 5 },
];

const pillClass = (active: boolean) =>
  `px-3 py-1.5 rounded-full text-sm font-medium border transition-colors ${
    active
      ? 'bg-primary text-primary-foreground border-primary'
      : 'bg-secondary text-secondary-foreground border-border hover:border-primary/40'
  }`;

const Section = ({ title, children }: { title: string; children: React.ReactNode }) => (
  <div className="space-y-2">
    <Label className="text-sm font-semibold">{title}</Label>
    {children}
  </div>
);

export function PropertyFilterSidebar({ filters, onChange, onReset }: Props) {
  const update = (partial: Partial<PropertyFilters>) => onChange({ ...filters, ...partial });

  const types = TYPES_BY_CATEGORY[filters.category] ?? [];

  return (
    <aside className="bg-card border border-border rounded-xl p-4 space-y-5 w-full">
      {/* Category */}
      <Section title="Property category">
        <div className="flex flex-wrap gap-2">
          {CATEGORIES.map((c) => (
            <button
              key={c}
              type="button"
              className={pillClass(filters.category === c)}
              onClick={() => update({ category: c, propertyType: '' })}
            >
              {c}
            </button>
          ))}
        </div>
      </Section>

      {/* Property type */}
      {types.length > 0 && (
        <Section title="Property type">
          <div className="flex flex-wrap gap-2">
            {types.map((t) => (
              <button
                key={t}
                type="button"
                className={pillClass(filters.propertyType === t)}
                onClick={() => update({ propertyType: filters.propertyType === t ? '' : t })}
              >
                {t}
              </button>
            ))}
          </div>
        </Section>
      )}

      {/* Intent */}
      <Section title="Listing intent">
        <div className="flex flex-wrap gap-2">
          {INTENTS.map((i) => (
            <button
              key={i.key}
              type="button"
              className={pillClass(filters.intent === i.key)}
              onClick={() => update({ intent: filters.intent === i.key ? '' : i.key })}
            >
              {i.label}
            </button>
          ))}
        </div>
      </Section>

      {/* Price */}
      <Section title="Price range">
        <div className="flex gap-2">
          <Input
            type="number"
            placeholder="No min"
            value={filters.minPrice ?? ''}
            onChange={(e) => update({ minPrice: e.target.value ? Number(e.target.value) : null })}
          />
          <Input
            type="number"
            placeholder="No max"
            value={filters.maxPrice ?? ''}
            onChange={(e) => update({ maxPrice: e.target.value ? Number(e.target.value) : null })}
          />
        </div>
      </Section>

      {/* Bedrooms (Residential) */}
      {filters.category === 'Residential' && (
        <Section title="Bedrooms">
          <div className="flex flex-wrap gap-2">
            {BED_OPTIONS.map((b) => (
              <button
                key={b.label}
                type="button"
                className={pillClass(filters.minBeds === b.value)}
                onClick={() => update({ minBeds: b.value })}
              >
                {b.label}
              </button>
            ))}
          </div>
        </Section>
      )}

      {/* Floor area (Commercial) */}
      {filters.category === 'Commercial' && (
        <Section title="Min floor area (m²)">
          <Input
            type="number"
            placeholder="Any size"
            value={filters.minFloorArea ?? ''}
            onChange={(e) => update({ minFloorArea: e.target.value ? Number(e.target.value) : null })}
          />
        </Section>
      )}

      {/* Land size (Land) */}
      {filters.category === 'Land' && (
        <Section title="Min land size (m²)">
          <Input
            type="number"
            placeholder="Any size"
            value={filters.minLandSize ?? ''}
            onChange={(e) => update({ minLandSize: e.target.value ? Number(e.target.value) : null })}
          />
        </Section>
      )}

      <div className="pt-2 border-t border-border">
        <Button variant="ghost" size="sm" onClick={onReset} className="text-muted-foreground hover:text-foreground">
          Reset filters
        </Button>
      </div>
    </aside>
  );
}
