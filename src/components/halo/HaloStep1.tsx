import { Building2, Home } from 'lucide-react';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { cn } from '@/lib/utils';
import type { HaloFormData } from '@/types/halo';
import { PROPERTY_TYPE_OPTIONS } from '@/types/halo';
import { useTranslation } from '@/shared/lib/i18n';

interface Props {
  data: HaloFormData;
  update: (patch: Partial<HaloFormData>) => void;
}

const PROPERTY_TYPE_KEY: Record<string, string> = {
  House: 'halo.wizard.step1.propertyType.house',
  Apartment: 'halo.wizard.step1.propertyType.apartment',
  Townhouse: 'halo.wizard.step1.propertyType.townhouse',
  Villa: 'halo.wizard.step1.propertyType.villa',
  Land: 'halo.wizard.step1.propertyType.land',
  Commercial: 'halo.wizard.step1.propertyType.commercial',
  Any: 'halo.wizard.step1.propertyType.any',
};

const Chip = ({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) => (
  <button
    type="button"
    onClick={onClick}
    className={cn(
      'px-4 py-2 rounded-full text-sm font-medium border transition-colors',
      active
        ? 'bg-primary text-primary-foreground border-primary'
        : 'bg-background text-foreground border-border hover:bg-accent',
    )}
  >
    {children}
  </button>
);

const ChipGroup = ({
  options,
  value,
  onChange,
  anyLabel,
}: {
  options: (string | number | null)[];
  value: number | null | undefined;
  onChange: (v: number | null) => void;
  anyLabel: string;
}) => (
  <div className="flex flex-wrap gap-2">
    {options.map((opt) => {
      const label = opt === null ? anyLabel : String(opt);
      const numVal = opt === null ? null : Number(String(opt).replace('+', ''));
      const active = (value ?? null) === numVal;
      return (
        <Chip key={String(opt) + label} active={active} onClick={() => onChange(numVal)}>
          {label}
        </Chip>
      );
    })}
  </div>
);

export function HaloStep1({ data, update }: Props) {
  const { t } = useTranslation();
  const anyLabel = t('halo.wizard.step1.any');

  const togglePropertyType = (type: string) => {
    if (type === 'Any') {
      update({ property_types: ['Any'] });
      return;
    }
    const current = data.property_types.filter((t) => t !== 'Any');
    if (current.includes(type)) {
      update({ property_types: current.filter((t) => t !== type) });
    } else {
      update({ property_types: [...current, type] });
    }
  };

  return (
    <div className="space-y-8">
      <div>
        <Label className="text-base font-semibold mb-2 block">{t('halo.wizard.step1.iSpeak')}</Label>
        <Select
          value={data.preferred_language}
          onValueChange={(v) => update({ preferred_language: v })}
        >
          <SelectTrigger>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="english">{t('halo.wizard.step1.lang.english')}</SelectItem>
            <SelectItem value="mandarin">{t('halo.wizard.step1.lang.mandarin')}</SelectItem>
            <SelectItem value="cantonese">{t('halo.wizard.step1.lang.cantonese')}</SelectItem>
            <SelectItem value="vietnamese">{t('halo.wizard.step1.lang.vietnamese')}</SelectItem>
            <SelectItem value="korean">{t('halo.wizard.step1.lang.korean')}</SelectItem>
            <SelectItem value="arabic">{t('halo.wizard.step1.lang.arabic')}</SelectItem>
            <SelectItem value="japanese">{t('halo.wizard.step1.lang.japanese')}</SelectItem>
            <SelectItem value="hindi">{t('halo.wizard.step1.lang.hindi')}</SelectItem>
            <SelectItem value="bengali">{t('halo.wizard.step1.lang.bengali')}</SelectItem>
            <SelectItem value="filipino">{t('halo.wizard.step1.lang.filipino')}</SelectItem>
            <SelectItem value="indonesian">{t('halo.wizard.step1.lang.indonesian')}</SelectItem>
            <SelectItem value="other">{t('halo.wizard.step1.lang.other')}</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div>
        <Label className="text-base font-semibold mb-3 block">{t('halo.wizard.step1.intent.label')}</Label>
        <div className="grid grid-cols-2 gap-3">
          {(['buy', 'rent'] as const).map((intent) => (
            <button
              key={intent}
              type="button"
              onClick={() => update({ intent })}
              className={cn(
                'p-6 rounded-xl border-2 text-center transition-all',
                data.intent === intent
                  ? 'border-primary bg-primary/5'
                  : 'border-border hover:border-primary/50',
              )}
            >
              {intent === 'buy' ? (
                <Home className="mx-auto mb-2" size={28} />
              ) : (
                <Building2 className="mx-auto mb-2" size={28} />
              )}
              <span className="font-semibold">
                {t(intent === 'buy' ? 'halo.wizard.step1.intent.buy' : 'halo.wizard.step1.intent.rent')}
              </span>
            </button>
          ))}
        </div>
      </div>

      <div>
        <Label className="text-base font-semibold mb-3 block">{t('halo.wizard.step1.propertyType.label')}</Label>
        <div className="flex flex-wrap gap-2">
          {PROPERTY_TYPE_OPTIONS.map((opt) => (
            <Chip
              key={opt}
              active={data.property_types.includes(opt)}
              onClick={() => togglePropertyType(opt)}
            >
              {t(PROPERTY_TYPE_KEY[opt] ?? opt)}
            </Chip>
          ))}
        </div>
      </div>

      <div>
        <Label className="text-base font-semibold mb-3 block">{t('halo.wizard.step1.bedrooms.label')}</Label>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <p className="text-sm text-muted-foreground mb-2">{t('halo.wizard.step1.bedrooms.min')}</p>
            <ChipGroup
              options={[null, 1, 2, 3, 4, '5+']}
              value={data.bedrooms_min}
              onChange={(v) => update({ bedrooms_min: v })}
              anyLabel={anyLabel}
            />
          </div>
          <div>
            <p className="text-sm text-muted-foreground mb-2">{t('halo.wizard.step1.bedrooms.max')}</p>
            <ChipGroup
              options={[null, 1, 2, 3, 4, '5+']}
              value={data.bedrooms_max}
              onChange={(v) => update({ bedrooms_max: v })}
              anyLabel={anyLabel}
            />
          </div>
        </div>
      </div>

      <div>
        <Label className="text-base font-semibold mb-3 block">{t('halo.wizard.step1.bathrooms.label')}</Label>
        <ChipGroup
          options={[null, 1, 2, '3+']}
          value={data.bathrooms_min}
          onChange={(v) => update({ bathrooms_min: v })}
          anyLabel={anyLabel}
        />
      </div>

      <div>
        <Label className="text-base font-semibold mb-3 block">{t('halo.wizard.step1.carSpaces.label')}</Label>
        <ChipGroup
          options={[0, 1, 2, '3+', null]}
          value={data.car_spaces_min}
          onChange={(v) => update({ car_spaces_min: v })}
          anyLabel={anyLabel}
        />
      </div>
    </div>
  );
}

/**
 * Returns a translation key (or null if valid). Callers should run the result
 * through t() before displaying.
 */
export function validateStep1(data: HaloFormData): string | null {
  if (!data.intent) return 'halo.validation.intent';
  if (data.property_types.length === 0) return 'halo.validation.propertyType';
  return null;
}
