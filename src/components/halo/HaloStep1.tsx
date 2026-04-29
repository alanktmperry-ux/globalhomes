import { Building2, Home } from 'lucide-react';
import { Label } from '@/components/ui/label';
import { cn } from '@/lib/utils';
import type { HaloFormData } from '@/types/halo';
import { PROPERTY_TYPE_OPTIONS } from '@/types/halo';

interface Props {
  data: HaloFormData;
  update: (patch: Partial<HaloFormData>) => void;
}

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
}: {
  options: (string | number | null)[];
  value: number | null | undefined;
  onChange: (v: number | null) => void;
}) => (
  <div className="flex flex-wrap gap-2">
    {options.map((opt) => {
      const label = opt === null ? 'Any' : String(opt);
      const numVal = opt === null ? null : Number(String(opt).replace('+', ''));
      const active = (value ?? null) === numVal;
      return (
        <Chip key={label} active={active} onClick={() => onChange(numVal)}>
          {label}
        </Chip>
      );
    })}
  </div>
);

export function HaloStep1({ data, update }: Props) {
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
        <Label className="text-base font-semibold mb-3 block">I want to *</Label>
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
              <span className="font-semibold capitalize">{intent}</span>
            </button>
          ))}
        </div>
      </div>

      <div>
        <Label className="text-base font-semibold mb-3 block">Property type *</Label>
        <div className="flex flex-wrap gap-2">
          {PROPERTY_TYPE_OPTIONS.map((t) => (
            <Chip
              key={t}
              active={data.property_types.includes(t)}
              onClick={() => togglePropertyType(t)}
            >
              {t}
            </Chip>
          ))}
        </div>
      </div>

      <div>
        <Label className="text-base font-semibold mb-3 block">Bedrooms</Label>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <p className="text-sm text-muted-foreground mb-2">Min</p>
            <ChipGroup
              options={[1, 2, 3, 4, '5+', null]}
              value={data.bedrooms_min}
              onChange={(v) => update({ bedrooms_min: v })}
            />
          </div>
          <div>
            <p className="text-sm text-muted-foreground mb-2">Max</p>
            <ChipGroup
              options={[1, 2, 3, 4, '5+', null]}
              value={data.bedrooms_max}
              onChange={(v) => update({ bedrooms_max: v })}
            />
          </div>
        </div>
      </div>

      <div>
        <Label className="text-base font-semibold mb-3 block">Bathrooms (min)</Label>
        <ChipGroup
          options={[1, 2, '3+', null]}
          value={data.bathrooms_min}
          onChange={(v) => update({ bathrooms_min: v })}
        />
      </div>

      <div>
        <Label className="text-base font-semibold mb-3 block">Car spaces (min)</Label>
        <ChipGroup
          options={[0, 1, 2, '3+', null]}
          value={data.car_spaces_min}
          onChange={(v) => update({ car_spaces_min: v })}
        />
      </div>
    </div>
  );
}

export function validateStep1(data: HaloFormData): string | null {
  if (!data.intent) return 'Please choose buy or rent';
  if (data.property_types.length === 0) return 'Please select at least one property type';
  return null;
}
