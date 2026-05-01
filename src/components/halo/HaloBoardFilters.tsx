import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { PROPERTY_TYPE_OPTIONS } from '@/types/halo';

export type IntentFilter = 'all' | 'buy' | 'rent';
export type BudgetFilter = 'any' | 'under_500k' | '500k_1m' | '1m_2m' | '2m_plus';
export type LanguageFilter = 'all' | 'en' | 'zh' | 'vi' | 'ko';

export const LANGUAGE_OPTIONS: { value: LanguageFilter; label: string }[] = [
  { value: 'all', label: 'All languages' },
  { value: 'en', label: 'English' },
  { value: 'zh', label: '中文' },
  { value: 'vi', label: 'Tiếng Việt' },
  { value: 'ko', label: '한국어' },
];

export interface HaloBoardFiltersState {
  intent: IntentFilter;
  propertyTypes: string[];
  budget: BudgetFilter;
  suburb: string;
  language: LanguageFilter;
}

export const DEFAULT_FILTERS: HaloBoardFiltersState = {
  intent: 'all',
  propertyTypes: [],
  budget: 'any',
  suburb: '',
  language: 'all',
};

interface Props {
  value: HaloBoardFiltersState;
  onChange: (next: HaloBoardFiltersState) => void;
  resultCount: number;
}

export function HaloBoardFilters({ value, onChange, resultCount }: Props) {
  const togglePropertyType = (type: string) => {
    const next = value.propertyTypes.includes(type)
      ? value.propertyTypes.filter((t) => t !== type)
      : [...value.propertyTypes, type];
    onChange({ ...value, propertyTypes: next });
  };

  return (
    <div className="space-y-4 mb-6">
      <div className="flex flex-wrap gap-2">
        {(['all', 'buy', 'rent'] as IntentFilter[]).map((i) => (
          <Button
            key={i}
            size="sm"
            variant={value.intent === i ? 'default' : 'outline'}
            onClick={() => onChange({ ...value, intent: i })}
            className="capitalize"
          >
            {i === 'all' ? 'All' : i}
          </Button>
        ))}
      </div>

      <div className="flex flex-wrap gap-2">
        {PROPERTY_TYPE_OPTIONS.map((type) => {
          const active = value.propertyTypes.includes(type);
          return (
            <Badge
              key={type}
              onClick={() => togglePropertyType(type)}
              variant={active ? 'default' : 'outline'}
              className="cursor-pointer select-none"
            >
              {type}
            </Badge>
          );
        })}
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <Select
          value={value.budget}
          onValueChange={(v) => onChange({ ...value, budget: v as BudgetFilter })}
        >
          <SelectTrigger>
            <SelectValue placeholder="Budget max" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="any">Any budget</SelectItem>
            <SelectItem value="under_500k">Under $500K</SelectItem>
            <SelectItem value="500k_1m">$500K–$1M</SelectItem>
            <SelectItem value="1m_2m">$1M–$2M</SelectItem>
            <SelectItem value="2m_plus">$2M+</SelectItem>
          </SelectContent>
        </Select>

        <Input
          placeholder="Search suburb"
          value={value.suburb}
          onChange={(e) => onChange({ ...value, suburb: e.target.value })}
        />
      </div>

      <p className="text-sm text-muted-foreground">
        Showing {resultCount} {resultCount === 1 ? 'Halo' : 'Halos'}
      </p>
    </div>
  );
}

export function applyFilters<T extends {
  intent: string;
  property_types: string[];
  suburbs: string[];
  budget_max: number | null;
}>(halos: T[], f: HaloBoardFiltersState): T[] {
  return halos.filter((h) => {
    if (f.intent !== 'all' && h.intent !== f.intent) return false;
    if (
      f.propertyTypes.length > 0 &&
      !h.property_types.some((t) => f.propertyTypes.includes(t))
    )
      return false;
    if (f.suburb.trim()) {
      const q = f.suburb.toLowerCase();
      if (!h.suburbs.some((s) => s.toLowerCase().includes(q))) return false;
    }
    const b = h.budget_max ?? 0;
    if (f.budget === 'under_500k' && b >= 500000) return false;
    if (f.budget === '500k_1m' && (b < 500000 || b >= 1000000)) return false;
    if (f.budget === '1m_2m' && (b < 1000000 || b >= 2000000)) return false;
    if (f.budget === '2m_plus' && b < 2000000) return false;
    return true;
  });
}

export default HaloBoardFilters;
