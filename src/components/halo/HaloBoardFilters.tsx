import { PROPERTY_TYPE_OPTIONS } from '@/types/halo';

export type IntentFilter = 'all' | 'buy' | 'rent';
export type BudgetFilter = 'any' | 'under_500k' | '500k_1m' | '1m_2m' | '2m_plus';
export type LanguageFilter = 'all' | 'en' | 'zh' | 'vi' | 'ko';

export const LANGUAGE_OPTIONS: { value: LanguageFilter; label: string; flag: string }[] = [
  { value: 'all', label: 'All', flag: '🌐' },
  { value: 'en', label: 'English', flag: '🇬🇧' },
  { value: 'zh', label: '中文', flag: '🇨🇳' },
  { value: 'vi', label: 'Tiếng Việt', flag: '🇻🇳' },
  { value: 'ko', label: '한국어', flag: '🇰🇷' },
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

const Ico = ({ icon, size = 16, color }: { icon: string; size?: number; color?: string }) =>
  // @ts-expect-error iconify web component
  <iconify-icon icon={icon} width={size} height={size} style={{ color, display: 'inline-block' }} />;

export function HaloBoardFilters({ value, onChange }: Props) {
  const intents: { v: IntentFilter; label: string }[] = [
    { v: 'all', label: 'All' },
    { v: 'buy', label: 'Buy' },
    { v: 'rent', label: 'Rent' },
  ];

  return (
    <div className="sticky top-4 z-10 bg-white border border-[#E5E5E5] rounded-3xl p-3 flex items-center gap-2 mb-6 flex-wrap">
      {/* Intent tabs */}
      <div className="flex items-center gap-1.5 flex-wrap">
        {intents.map((i) => {
          const active = value.intent === i.v;
          return (
            <button
              key={i.v}
              type="button"
              onClick={() => onChange({ ...value, intent: i.v })}
              className={`px-4 py-2 rounded-full text-[13px] font-semibold transition ${
                active ? 'bg-[#0a0f1e] text-white' : 'bg-[#F9FAFB] text-[#6a6a6a] hover:bg-[#EFF6FF]'
              }`}
            >
              {i.label}
            </button>
          );
        })}
      </div>

      <div className="w-px h-7 bg-[#E5E5E5] mx-1 hidden md:block" />

      {/* Language flag pills */}
      <div className="flex items-center gap-1.5 flex-wrap">
        {LANGUAGE_OPTIONS.map((opt) => {
          const active = value.language === opt.value;
          return (
            <button
              key={opt.value}
              type="button"
              aria-label={opt.label}
              title={opt.label}
              onClick={() => onChange({ ...value, language: opt.value })}
              className={`w-10 h-10 rounded-full text-[18px] flex items-center justify-center cursor-pointer transition ${
                active ? 'bg-[#0a0f1e] ring-2 ring-[#2563EB]' : 'bg-[#F9FAFB] hover:bg-[#EFF6FF]'
              }`}
            >
              <span>{opt.flag}</span>
            </button>
          );
        })}
      </div>

      <div className="flex-1" />

      {/* Suburb search */}
      <div className="relative">
        <span className="absolute left-3 top-1/2 -translate-y-1/2 text-[#9CA3AF]">
          <Ico icon="solar:map-point-linear" size={16} />
        </span>
        <input
          value={value.suburb}
          onChange={(e) => onChange({ ...value, suburb: e.target.value })}
          placeholder="Any suburb"
          className="bg-white border border-[#E5E5E5] rounded-full pl-9 pr-4 py-2 text-[13px] font-medium text-[#0a0f1e] placeholder:text-[#9CA3AF] focus:outline-none focus:border-[#2563EB] w-[180px]"
        />
      </div>

      {/* Budget filter */}
      <select
        value={value.budget}
        onChange={(e) => onChange({ ...value, budget: e.target.value as BudgetFilter })}
        className="bg-white border border-[#E5E5E5] rounded-full px-4 py-2 text-[13px] font-semibold text-[#0a0f1e] focus:outline-none focus:border-[#2563EB] cursor-pointer"
      >
        <option value="any">Any budget</option>
        <option value="under_500k">Under $500K</option>
        <option value="500k_1m">$500K–$1M</option>
        <option value="1m_2m">$1M–$2M</option>
        <option value="2m_plus">$2M+</option>
      </select>

      {/* Property type chips */}
      {PROPERTY_TYPE_OPTIONS.length > 0 && (
        <div className="basis-full flex flex-wrap gap-1.5 pt-1">
          {PROPERTY_TYPE_OPTIONS.map((type) => {
            const active = value.propertyTypes.includes(type);
            const next = active
              ? value.propertyTypes.filter((t) => t !== type)
              : [...value.propertyTypes, type];
            return (
              <button
                key={type}
                type="button"
                onClick={() => onChange({ ...value, propertyTypes: next })}
                className={`px-3 py-1.5 rounded-full text-[12px] font-semibold transition ${
                  active
                    ? 'bg-[#EFF6FF] text-[#1E40AF] border border-[#2563EB]/30'
                    : 'bg-[#F9FAFB] text-[#6a6a6a] border border-transparent hover:bg-[#EFF6FF]'
                }`}
              >
                {type}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}

export function applyFilters<T extends {
  intent: string;
  property_types: string[];
  suburbs: string[];
  budget_max: number | null;
  preferred_language?: string | null;
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
    if (f.language !== 'all') {
      const lang = (h.preferred_language || 'en').toLowerCase();
      const normalised = lang.startsWith('zh') ? 'zh' : lang;
      if (normalised !== f.language) return false;
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
