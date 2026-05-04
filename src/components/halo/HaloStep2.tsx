import { useState, KeyboardEvent, useCallback } from 'react';
import { X } from 'lucide-react';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Switch } from '@/components/ui/switch';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { SuburbAutocomplete } from '@/components/ui/SuburbAutocomplete';
import { cn } from '@/lib/utils';
import type { HaloFormData, HaloTimeframe, HaloFinanceStatus } from '@/types/halo';
import { TIMEFRAME_LABELS, FINANCE_LABELS } from '@/types/halo';

interface Props {
  data: HaloFormData;
  update: (patch: Partial<HaloFormData>) => void;
}

const formatAUD = (n: number | null | undefined) =>
  n == null ? '' : n.toLocaleString('en-AU');

const parseAUD = (s: string): number | null => {
  const digits = s.replace(/[^\d]/g, '');
  if (!digits) return null;
  return parseInt(digits, 10);
};

export function HaloStep2({ data, update }: Props) {
  const [suburbInput, setSuburbInput] = useState('');

  const addSuburb = useCallback((raw: string) => {
    const v = raw.trim();
    if (!v) return;
    if (data.suburbs.length >= 5) return;
    if (data.suburbs.some((s) => s.toLowerCase() === v.toLowerCase())) {
      setSuburbInput('');
      return;
    }
    update({ suburbs: [...data.suburbs, v] });
    setSuburbInput('');
  }, [data.suburbs, update]);

  const handleSuburbKey = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Backspace' && !suburbInput && data.suburbs.length) {
      update({ suburbs: data.suburbs.slice(0, -1) });
    }
  };

  return (
    <div className="space-y-8">
      <div>
        <Label className="text-base font-semibold mb-3 block">Suburbs *</Label>
        <div className="flex flex-wrap gap-2 mb-2">
          {data.suburbs.map((s) => (
            <span
              key={s}
              className="inline-flex items-center gap-1 px-3 py-1 rounded-full bg-primary/10 text-primary text-sm font-medium"
            >
              {s}
              <button
                type="button"
                onClick={() => update({ suburbs: data.suburbs.filter((x) => x !== s) })}
                className="hover:text-primary/70"
                aria-label={`Remove ${s}`}
              >
                <X size={14} />
              </button>
            </span>
          ))}
        </div>
        <SuburbAutocomplete
          value={suburbInput}
          onChange={setSuburbInput}
          onSelect={addSuburb}
          onKeyDown={handleSuburbKey}
          disabled={data.suburbs.length >= 5}
          placeholder={data.suburbs.length >= 5 ? 'Maximum reached' : 'Start typing a suburb…'}
        />
        <p className="text-xs text-muted-foreground mt-1">
          {data.suburbs.length >= 5 ? 'Maximum 5 suburbs' : `${data.suburbs.length}/5 suburbs`}
        </p>
      </div>

      <div className="flex items-start justify-between gap-4 p-4 rounded-lg border">
        <div>
          <Label className="text-base font-semibold">Suburb flexibility</Label>
          <p className="text-sm text-muted-foreground mt-1">
            {data.suburb_flexibility ? 'Willing to consider nearby areas' : 'Exact suburbs only'}
          </p>
        </div>
        <Switch
          checked={data.suburb_flexibility}
          onCheckedChange={(v) => update({ suburb_flexibility: v })}
        />
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <Label htmlFor="budget_min" className="text-base font-semibold mb-2 block">
            Min budget (AUD)
          </Label>
          <div className="relative">
            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground text-sm">$</span>
            <Input
              id="budget_min"
              inputMode="numeric"
              className="pl-7"
              value={formatAUD(data.budget_min)}
              onChange={(e) => update({ budget_min: parseAUD(e.target.value) })}
              placeholder="500,000"
            />
          </div>
        </div>
        <div>
          <Label htmlFor="budget_max" className="text-base font-semibold mb-2 block">
            Max budget (AUD) *
          </Label>
          <div className="relative">
            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground text-sm">$</span>
            <Input
              id="budget_max"
              inputMode="numeric"
              className="pl-7"
              value={formatAUD(data.budget_max)}
              onChange={(e) => update({ budget_max: parseAUD(e.target.value) ?? 0 })}
              placeholder="900,000"
            />
          </div>
        </div>
      </div>

      <div>
        <Label className="text-base font-semibold mb-3 block">Timeframe *</Label>
        <RadioGroup
          value={data.timeframe}
          onValueChange={(v) => update({ timeframe: v as HaloTimeframe })}
          className="grid grid-cols-1 sm:grid-cols-2 gap-2"
        >
          {(Object.keys(TIMEFRAME_LABELS) as HaloTimeframe[]).map((key) => (
            <label
              key={key}
              htmlFor={`tf-${key}`}
              className={cn(
                'flex items-center gap-3 p-4 rounded-lg border cursor-pointer transition-colors',
                data.timeframe === key ? 'border-primary bg-primary/5' : 'hover:border-primary/50',
              )}
            >
              <RadioGroupItem value={key} id={`tf-${key}`} />
              <span className="text-sm font-medium">{TIMEFRAME_LABELS[key]}</span>
            </label>
          ))}
        </RadioGroup>
      </div>

      <div>
        <Label className="text-base font-semibold mb-3 block">Finance status *</Label>
        <RadioGroup
          value={data.finance_status}
          onValueChange={(v) => update({ finance_status: v as HaloFinanceStatus })}
          className="grid grid-cols-1 sm:grid-cols-2 gap-2"
        >
          {(Object.keys(FINANCE_LABELS) as HaloFinanceStatus[]).map((key) => (
            <label
              key={key}
              htmlFor={`fin-${key}`}
              className={cn(
                'flex items-center gap-3 p-4 rounded-lg border cursor-pointer transition-colors',
                data.finance_status === key ? 'border-primary bg-primary/5' : 'hover:border-primary/50',
              )}
            >
              <RadioGroupItem value={key} id={`fin-${key}`} />
              <span className="text-sm font-medium">{FINANCE_LABELS[key]}</span>
            </label>
          ))}
        </RadioGroup>
      </div>
    </div>
  );
}

export function validateStep2(data: HaloFormData): string | null {
  if (data.suburbs.length === 0) return 'Please add at least one suburb';
  if (!data.budget_max || data.budget_max <= 0) return 'Please enter a maximum budget';
  if (data.budget_min != null && data.budget_min >= data.budget_max) {
    return 'Max budget must be higher than min budget';
  }
  if (!data.timeframe) return 'Please choose a timeframe';
  if (!data.finance_status) return 'Please choose your finance status';
  return null;
}
