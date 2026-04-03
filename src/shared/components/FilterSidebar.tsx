import { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { SlidersHorizontal, X, ChevronDown, ChevronUp, RotateCcw, PawPrint, Home, GraduationCap, Sofa, BadgeCheck, CalendarDays, Clock, DollarSign } from 'lucide-react';
import { Slider } from '@/components/ui/slider';
import { Checkbox } from '@/components/ui/checkbox';
import { Switch } from '@/components/ui/switch';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Calendar } from '@/components/ui/calendar';
import { cn } from '@/lib/utils';
import { format } from 'date-fns';
import { useCurrency } from '@/lib/CurrencyContext';
import { useI18n } from '@/shared/lib/i18n';

export interface Filters {
  priceRange: [number, number];
  propertyTypes: string[];
  minBeds: number;
  minBaths: number;
  minParking: number;
  features: string[];
  // Rental-specific
  petFriendly: boolean;
  furnished: boolean;
  availableNow: boolean;
  availableFrom: Date | null;
  leaseTerm: string;
  schoolZone: string;
  // Sale-specific
  firstHomeBuyer: boolean;
}

export const defaultFilters: Filters = {
  priceRange: [0, 5_000_000],
  propertyTypes: [],
  minBeds: 0,
  minBaths: 0,
  minParking: 0,
  features: [],
  petFriendly: false,
  furnished: false,
  availableNow: false,
  availableFrom: null,
  leaseTerm: '',
  schoolZone: '',
  firstHomeBuyer: false,
};

const defaultRentalFilters: Filters = {
  ...defaultFilters,
  priceRange: [0, 3_000],
};

const PROPERTY_TYPES = ['House', 'Apartment', 'Townhouse', 'Land', 'Commercial'];
const COMMON_FEATURES = [
  'Pool', 'Garden', 'Garage', 'Air conditioning', 'Hardwood floors',
  'Solar panels', 'Balcony', 'Fireplace', 'Study', 'Ensuite',
];

const LEASE_TERMS = [
  { value: '', label: 'Any' },
  { value: '6', label: '6 months' },
  { value: '12', label: '12 months' },
  { value: 'month-to-month', label: 'Month-to-month' },
];

const SCHOOL_ZONES = [
  { value: '', label: 'Any zone' },
  { value: 'melbourne-high', label: 'Melbourne High School' },
  { value: 'mac-rob', label: 'Mac.Robertson Girls\' High' },
  { value: 'balwyn-high', label: 'Balwyn High School' },
  { value: 'glen-waverley-sc', label: 'Glen Waverley Secondary' },
  { value: 'sydney-boys', label: 'Sydney Boys High' },
  { value: 'sydney-girls', label: 'Sydney Girls High' },
  { value: 'north-sydney-boys', label: 'North Sydney Boys High' },
  { value: 'fort-street', label: 'Fort Street High School' },
  { value: 'brisbane-state', label: 'Brisbane State High' },
  { value: 'adelaide-high', label: 'Adelaide High School' },
  { value: 'perth-modern', label: 'Perth Modern School' },
];

interface FilterSidebarProps {
  filters: Filters;
  onChange: (filters: Filters) => void;
  isOpen: boolean;
  onToggle: () => void;
  totalCount: number;
  filteredCount: number;
  listingMode?: 'sale' | 'rent';
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

function ToggleRow({ icon: Icon, label, checked, onChange, description }: {
  icon: React.ElementType;
  label: string;
  checked: boolean;
  onChange: (v: boolean) => void;
  description?: string;
}) {
  return (
    <label className="flex items-center gap-3 cursor-pointer group py-1">
      <div className={cn(
        "w-8 h-8 rounded-lg flex items-center justify-center transition-colors shrink-0",
        checked ? "bg-primary/15 text-primary" : "bg-secondary text-muted-foreground group-hover:text-foreground"
      )}>
        <Icon size={16} />
      </div>
      <div className="flex-1 min-w-0">
        <span className="text-sm font-medium text-foreground block">{label}</span>
        {description && <span className="text-[11px] text-muted-foreground">{description}</span>}
      </div>
      <Switch checked={checked} onCheckedChange={onChange} />
    </label>
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

export function FilterSidebar({ filters, onChange, isOpen, onToggle, totalCount, filteredCount, listingMode = 'sale' }: FilterSidebarProps) {
  const { formatPrice } = useCurrency();
  const { t } = useI18n();
  const isRental = listingMode === 'rent';

  const priceMax = isRental ? 3_000 : 5_000_000;
  const priceStep = isRental ? 50 : 50_000;

  const update = <K extends keyof Filters>(key: K, value: Filters[K]) => {
    onChange({ ...filters, [key]: value });
  };

  const toggleArrayItem = (key: 'propertyTypes' | 'features', item: string) => {
    const arr = filters[key];
    update(key, arr.includes(item) ? arr.filter(x => x !== item) : [...arr, item]);
  };

  const activeFilterCount = useMemo(() => {
    let count = 0;
    const maxPrice = isRental ? 3_000 : 5_000_000;
    if (filters.priceRange[0] > 0 || filters.priceRange[1] < maxPrice) count++;
    if (filters.propertyTypes.length > 0) count++;
    if (filters.minBeds > 0) count++;
    if (filters.minBaths > 0) count++;
    if (filters.minParking > 0) count++;
    if (filters.features.length > 0) count++;
    if (filters.petFriendly) count++;
    if (filters.furnished) count++;
    if (filters.availableNow || filters.availableFrom) count++;
    if (filters.leaseTerm) count++;
    if (filters.schoolZone) count++;
    if (filters.firstHomeBuyer) count++;
    return count;
  }, [filters, isRental]);

  const hasActiveFilters = activeFilterCount > 0;

  const formatRentPrice = (v: number) => `$${v.toLocaleString()}/wk`;

  const handleReset = () => {
    onChange(isRental ? defaultRentalFilters : defaultFilters);
  };

  // Bond calculator from current price range
  const bondFromWeekly = filters.priceRange[1] * 4;

  return (
    <>
      {/* Toggle button */}
      <button
        onClick={onToggle}
        className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-secondary border border-border text-xs font-medium text-foreground hover:bg-accent transition-colors relative"
      >
        <SlidersHorizontal size={14} />
        {t('filter.header')}
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
                  <h2 className="text-base font-display font-bold text-foreground">{t('filter.header')}</h2>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    {filteredCount} of {totalCount} properties
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  {hasActiveFilters && (
                    <button
                      onClick={handleReset}
                      className="flex items-center gap-1 text-xs text-destructive hover:text-destructive/80 font-medium transition-colors"
                    >
                      <RotateCcw size={12} /> {t('filter.reset')}
                    </button>
                  )}
                  <button onClick={onToggle} className="w-8 h-8 rounded-lg hover:bg-secondary flex items-center justify-center transition-colors">
                    <X size={18} className="text-muted-foreground" />
                  </button>
                </div>
              </div>

              {/* Scrollable content */}
              <div className="flex-1 overflow-y-auto px-5 py-4 space-y-4">

                {/* ===== RENTAL: Quick rental filters at top ===== */}
                {isRental && (
                  <Section title={t('filter.petFriendly').split(' ')[0] + ' ' + 'Preferences'}>
                    <ToggleRow
                      icon={PawPrint}
                      label={t('filter.petFriendly')}
                      description="Allows cats, dogs, or other pets"
                      checked={filters.petFriendly}
                      onChange={v => update('petFriendly', v)}
                    />
                    <ToggleRow
                      icon={Sofa}
                      label={t('filter.furnished')}
                      description="Fully or partially furnished"
                      checked={filters.furnished}
                      onChange={v => update('furnished', v)}
                    />

                    {/* Availability */}
                    <div className="space-y-2 pt-1">
                      <span className="text-sm font-medium text-foreground flex items-center gap-1.5">
                        <CalendarDays size={14} className="text-primary" />
                        {t('filter.availability')}
                      </span>
                      <div className="flex gap-2">
                        <button
                          onClick={() => {
                            update('availableNow', true);
                            update('availableFrom', null);
                          }}
                          className={cn(
                            "flex-1 px-3 py-2 rounded-lg text-xs font-medium border transition-colors",
                            filters.availableNow
                              ? "bg-primary text-primary-foreground border-primary"
                              : "bg-secondary text-foreground border-border hover:border-primary/50"
                          )}
                        >
                          {t('filter.availableNow')}
                        </button>
                        <Popover>
                          <PopoverTrigger asChild>
                            <button
                              className={cn(
                                "flex-1 px-3 py-2 rounded-lg text-xs font-medium border transition-colors",
                                filters.availableFrom && !filters.availableNow
                                  ? "bg-primary text-primary-foreground border-primary"
                                  : "bg-secondary text-foreground border-border hover:border-primary/50"
                              )}
                            >
                              {filters.availableFrom && !filters.availableNow
                                ? format(filters.availableFrom, 'dd MMM yyyy')
                                : 'From date'}
                            </button>
                          </PopoverTrigger>
                          <PopoverContent className="w-auto p-0" align="start">
                            <Calendar
                              mode="single"
                              selected={filters.availableFrom ?? undefined}
                              onSelect={(date) => {
                                update('availableFrom', date ?? null);
                                update('availableNow', false);
                              }}
                              disabled={(date) => date < new Date()}
                              initialFocus
                              className={cn("p-3 pointer-events-auto")}
                            />
                          </PopoverContent>
                        </Popover>
                      </div>
                      {(filters.availableNow || filters.availableFrom) && (
                        <button
                          onClick={() => {
                            update('availableNow', false);
                            update('availableFrom', null);
                          }}
                          className="text-[11px] text-muted-foreground hover:text-destructive transition-colors"
                        >
                          Clear availability filter
                        </button>
                      )}
                    </div>

                    {/* Lease Term */}
                    <div className="space-y-2 pt-1">
                      <span className="text-sm font-medium text-foreground flex items-center gap-1.5">
                        <Clock size={14} className="text-primary" />
                        Lease Term
                      </span>
                      <div className="grid grid-cols-2 gap-2">
                        {LEASE_TERMS.map(term => (
                          <button
                            key={term.value || 'any'}
                            onClick={() => update('leaseTerm', filters.leaseTerm === term.value ? '' : term.value)}
                            className={cn(
                              "px-3 py-2 rounded-lg text-xs font-medium border transition-colors",
                              filters.leaseTerm === term.value
                                ? "bg-primary text-primary-foreground border-primary"
                                : "bg-secondary text-foreground border-border hover:border-primary/50"
                            )}
                          >
                            {term.label}
                          </button>
                        ))}
                      </div>
                    </div>
                  </Section>
                )}

                {/* Price Range / Weekly Rent */}
                <Section title={isRental ? 'Weekly Rent' : 'Price Range'}>
                  <div className="flex items-center justify-between text-sm font-medium text-foreground">
                    <span>{isRental ? formatRentPrice(filters.priceRange[0]) : formatPrice(filters.priceRange[0])}</span>
                    <span>
                      {isRental ? formatRentPrice(filters.priceRange[1]) : formatPrice(filters.priceRange[1])}
                      {isRental && filters.priceRange[1] >= priceMax && '+'}
                    </span>
                  </div>
                  <Slider
                    min={0}
                    max={priceMax}
                    step={priceStep}
                    value={[
                      Math.min(filters.priceRange[0], priceMax),
                      Math.min(filters.priceRange[1], priceMax),
                    ]}
                    onValueChange={(v) => update('priceRange', v as [number, number])}
                    className="mt-2"
                  />
                  {/* Bond Budget helper for rentals */}
                  {isRental && filters.priceRange[1] < priceMax && (
                    <div className="mt-2 px-3 py-2 rounded-lg bg-primary/5 border border-primary/10">
                      <div className="flex items-center gap-1.5 text-[11px] font-medium text-primary">
                        <DollarSign size={12} />
                        Bond estimate (4 weeks): ${bondFromWeekly.toLocaleString()}
                      </div>
                    </div>
                  )}
                </Section>

                {/* Property Type */}
                <Section title={t('filter.propertyType')}>
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
                <Section title={t('filter.roomsParking')}>
                  <Counter label="Bedrooms" value={filters.minBeds} onChange={v => update('minBeds', v)} />
                  <Counter label="Bathrooms" value={filters.minBaths} onChange={v => update('minBaths', v)} />
                  <Counter label="Parking spots" value={filters.minParking} onChange={v => update('minParking', v)} />
                </Section>

                {/* Non-rental: existing rental preferences section (hidden since it's at top for rental) */}
                {!isRental && (
                  <>
                    {/* School Zone */}
                    <Section title="School Catchment" defaultOpen={false}>
                      <div className="flex items-center gap-2 mb-2">
                        <GraduationCap size={14} className="text-muted-foreground" />
                        <span className="text-xs text-muted-foreground">Filter by school catchment zone</span>
                      </div>
                      <Select
                        value={filters.schoolZone}
                        onValueChange={v => update('schoolZone', v === 'any' ? '' : v)}
                      >
                        <SelectTrigger className="w-full text-sm">
                          <SelectValue placeholder="Select school zone" />
                        </SelectTrigger>
                        <SelectContent>
                          {SCHOOL_ZONES.map(zone => (
                            <SelectItem key={zone.value || 'any'} value={zone.value || 'any'}>
                              {zone.label}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </Section>

                    {/* Sale-specific: First Home Buyer */}
                    <Section title="Buyer Eligibility" defaultOpen={false}>
                      <ToggleRow
                        icon={BadgeCheck}
                        label="First home buyer eligible"
                        description="Properties under stamp duty concession threshold"
                        checked={filters.firstHomeBuyer}
                        onChange={v => update('firstHomeBuyer', v)}
                      />
                      {filters.firstHomeBuyer && (
                        <div className="ml-11 mt-1 px-3 py-2 rounded-lg bg-success/10 border border-success/20">
                          <p className="text-[11px] text-success font-medium">
                            Showing properties ≤ $800k (VIC/NSW threshold). Stamp duty concessions may apply.
                          </p>
                        </div>
                      )}
                    </Section>
                  </>
                )}

                {/* School Zone for rental too */}
                {isRental && (
                  <Section title="School Catchment" defaultOpen={false}>
                    <div className="flex items-center gap-2 mb-2">
                      <GraduationCap size={14} className="text-muted-foreground" />
                      <span className="text-xs text-muted-foreground">Filter by school catchment zone</span>
                    </div>
                    <Select
                      value={filters.schoolZone}
                      onValueChange={v => update('schoolZone', v === 'any' ? '' : v)}
                    >
                      <SelectTrigger className="w-full text-sm">
                        <SelectValue placeholder="Select school zone" />
                      </SelectTrigger>
                      <SelectContent>
                        {SCHOOL_ZONES.map(zone => (
                          <SelectItem key={zone.value || 'any'} value={zone.value || 'any'}>
                            {zone.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </Section>
                )}

                {/* Features */}
                <Section title={t('filter.features')} defaultOpen={false}>
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
                  {t('filter.show').replace('{count}', String(filteredCount))}
                </Button>
              </div>
            </motion.aside>
          </>
        )}
      </AnimatePresence>
    </>
  );
}
