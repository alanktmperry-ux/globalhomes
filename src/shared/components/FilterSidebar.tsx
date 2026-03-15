import { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { SlidersHorizontal, X, ChevronDown, ChevronUp, RotateCcw } from 'lucide-react';
import { Slider } from '@/components/ui/slider';
import { Checkbox } from '@/components/ui/checkbox';
import { Button } from '@/components/ui/button';
import { useCurrency } from '@/lib/CurrencyContext';

export interface Filters {
  priceRange: [number, number];
  propertyTypes: string[];
  minBeds: number;
  minBaths: number;
  minParking: number;
  features: string[];
}

export const defaultFilters: Filters = {
  priceRange: [0, 5_000_000],
  propertyTypes: [],
  minBeds: 0,
  minBaths: 0,
  minParking: 0,
  features: [],
};

const PROPERTY_TYPES = ['House', 'Apartment', 'Townhouse', 'Land', 'Commercial'];
const COMMON_FEATURES = [
  'Pool', 'Garden', 'Garage', 'Air conditioning', 'Hardwood floors',
  'Solar panels', 'Balcony', 'Fireplace', 'Study', 'Ensuite',
];

interface FilterSidebarProps {
  filters: Filters;
  onChange: (filters: Filters) => void;
  isOpen: boolean;
  onToggle: () => void;
  totalCount: number;
  filteredCount: number;
}

function Counter({ label, value, onChange, max = 10 }: { label: string; value: number; onChange: (v: number) => void; max?: number }) {
  return (
    <div className="flex items-center justify-between">
      <span className="text-sm text-foreground">{label}</span>
      <div className="flex items-center gap-2">
        <button
          onClick={() => onChange(Math.max(0, value - 1))}
          disabled={value === 0}
          className="w-8 h-8 rounded-lg bg-secondary text-foreground flex items-center justify-center text-sm font-medium disabled:opacity-30 hover:bg-accent transition-colors"
        >
          −
        </button>
        <span className="w-6 text-center text-sm font-semibold text-foreground">{value === 0 ? 'Any' : value + '+'}</span>
        <button
          onClick={() => onChange(Math.min(max, value + 1))}
          disabled={value === max}
          className="w-8 h-8 rounded-lg bg-secondary text-foreground flex items-center justify-center text-sm font-medium disabled:opacity-30 hover:bg-accent transition-colors"
        >
          +
        </button>
      </div>
    </div>
  );
}

function Section({ title, children, defaultOpen = true }: { title: string; children: React.ReactNode; defaultOpen?: boolean }) {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <div className="border-b border-border pb-4">
      <button onClick={() => setOpen(!open)} className="w-full flex items-center justify-between py-2">
        <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">{title}</span>
        {open ? <ChevronUp size={14} className="text-muted-foreground" /> : <ChevronDown size={14} className="text-muted-foreground" />}
      </button>
      <AnimatePresence>
        {open && (
          <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }} className="overflow-hidden">
            <div className="pt-2 space-y-3">{children}</div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

export function FilterSidebar({ filters, onChange, isOpen, onToggle, totalCount, filteredCount }: FilterSidebarProps) {
  const { formatPrice } = useCurrency();

  const update = <K extends keyof Filters>(key: K, value: Filters[K]) => {
    onChange({ ...filters, [key]: value });
  };

  const toggleArrayItem = (key: 'propertyTypes' | 'features', item: string) => {
    const arr = filters[key];
    update(key, arr.includes(item) ? arr.filter(x => x !== item) : [...arr, item]);
  };

  const activeFilterCount = useMemo(() => {
    let count = 0;
    if (filters.priceRange[0] > 0 || filters.priceRange[1] < 5_000_000) count++;
    if (filters.propertyTypes.length > 0) count++;
    if (filters.minBeds > 0) count++;
    if (filters.minBaths > 0) count++;
    if (filters.minParking > 0) count++;
    if (filters.features.length > 0) count++;
    return count;
  }, [filters]);

  const hasActiveFilters = activeFilterCount > 0;

  return (
    <>
      {/* Toggle button */}
      <button
        onClick={onToggle}
        className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-secondary border border-border text-xs font-medium text-foreground hover:bg-accent transition-colors relative"
      >
        <SlidersHorizontal size={14} />
        Filters
        {hasActiveFilters && (
          <span className="absolute -top-1.5 -right-1.5 w-4 h-4 rounded-full bg-primary text-primary-foreground text-[10px] font-bold flex items-center justify-center">
            {activeFilterCount}
          </span>
        )}
      </button>

      {/* Sidebar overlay + panel */}
      <AnimatePresence>
        {isOpen && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={onToggle}
              className="fixed inset-0 z-40 bg-black/40 backdrop-blur-sm"
            />
            <motion.aside
              initial={{ x: '100%' }}
              animate={{ x: 0 }}
              exit={{ x: '100%' }}
              transition={{ type: 'spring', damping: 25, stiffness: 300 }}
              className="fixed top-0 right-0 bottom-0 z-50 w-[340px] max-w-[90vw] bg-background border-l border-border shadow-elevated flex flex-col"
            >
              {/* Header */}
              <div className="flex items-center justify-between px-5 py-4 border-b border-border">
                <div>
                  <h2 className="text-base font-display font-bold text-foreground">Filters</h2>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    {filteredCount} of {totalCount} properties
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  {hasActiveFilters && (
                    <button
                      onClick={() => onChange(defaultFilters)}
                      className="flex items-center gap-1 text-xs text-destructive hover:text-destructive/80 font-medium transition-colors"
                    >
                      <RotateCcw size={12} /> Reset
                    </button>
                  )}
                  <button onClick={onToggle} className="w-8 h-8 rounded-lg hover:bg-secondary flex items-center justify-center transition-colors">
                    <X size={18} className="text-muted-foreground" />
                  </button>
                </div>
              </div>

              {/* Scrollable content */}
              <div className="flex-1 overflow-y-auto px-5 py-4 space-y-4">
                {/* Price Range */}
                <Section title="Price Range">
                  <div className="flex items-center justify-between text-sm font-medium text-foreground">
                    <span>{formatPrice(filters.priceRange[0])}</span>
                    <span>{formatPrice(filters.priceRange[1])}</span>
                  </div>
                  <Slider
                    min={0}
                    max={5_000_000}
                    step={50_000}
                    value={filters.priceRange}
                    onValueChange={(v) => update('priceRange', v as [number, number])}
                    className="mt-2"
                  />
                </Section>

                {/* Property Type */}
                <Section title="Property Type">
                  <div className="grid grid-cols-2 gap-2">
                    {PROPERTY_TYPES.map(type => (
                      <label key={type} className="flex items-center gap-2 cursor-pointer group">
                        <Checkbox
                          checked={filters.propertyTypes.includes(type)}
                          onCheckedChange={() => toggleArrayItem('propertyTypes', type)}
                        />
                        <span className="text-sm text-foreground group-hover:text-primary transition-colors">{type}</span>
                      </label>
                    ))}
                  </div>
                </Section>

                {/* Beds / Baths / Parking */}
                <Section title="Rooms & Parking">
                  <Counter label="Bedrooms" value={filters.minBeds} onChange={v => update('minBeds', v)} />
                  <Counter label="Bathrooms" value={filters.minBaths} onChange={v => update('minBaths', v)} />
                  <Counter label="Parking" value={filters.minParking} onChange={v => update('minParking', v)} />
                </Section>

                {/* Features */}
                <Section title="Features" defaultOpen={false}>
                  <div className="flex flex-wrap gap-2">
                    {COMMON_FEATURES.map(feature => {
                      const active = filters.features.includes(feature);
                      return (
                        <button
                          key={feature}
                          onClick={() => toggleArrayItem('features', feature)}
                          className={`px-3 py-1.5 rounded-full text-xs font-medium border transition-colors ${
                            active
                              ? 'bg-primary text-primary-foreground border-primary'
                              : 'bg-secondary text-foreground border-border hover:border-primary/50'
                          }`}
                        >
                          {feature}
                        </button>
                      );
                    })}
                  </div>
                </Section>
              </div>

              {/* Footer */}
              <div className="px-5 py-4 border-t border-border">
                <Button onClick={onToggle} className="w-full">
                  Show {filteredCount} properties
                </Button>
              </div>
            </motion.aside>
          </>
        )}
      </AnimatePresence>
    </>
  );
}
