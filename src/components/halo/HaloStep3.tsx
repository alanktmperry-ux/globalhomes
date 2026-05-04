import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { cn } from '@/lib/utils';
import type { HaloFormData } from '@/types/halo';
import { MUST_HAVE_OPTIONS } from '@/types/halo';

interface Props {
  data: HaloFormData;
  update: (patch: Partial<HaloFormData>) => void;
}

export function HaloStep3({ data, update }: Props) {
  const toggleMustHave = (item: string) => {
    if (data.must_haves.includes(item)) {
      update({ must_haves: data.must_haves.filter((x) => x !== item) });
    } else {
      update({ must_haves: [...data.must_haves, item] });
    }
  };

  const desc = data.description ?? '';
  const dealBreakers = data.deal_breakers ?? '';

  return (
    <div className="space-y-8">
      <div>
        <Label htmlFor="description" className="text-base font-semibold mb-2 block">
          Tell agents more
        </Label>
        <Textarea
          id="description"
          value={desc}
          onChange={(e) => update({ description: e.target.value.slice(0, 500) })}
          placeholder="Describe what you're looking for in your own words..."
          rows={4}
        />
        <p className="text-xs text-muted-foreground mt-1 text-right">{desc.length} / 500</p>
      </div>

      <div>
        <Label className="text-base font-semibold mb-3 block">Must-haves</Label>
        <div className="flex flex-wrap gap-2">
          {MUST_HAVE_OPTIONS.map((item) => {
            const active = data.must_haves.includes(item);
            return (
              <button
                key={item}
                type="button"
                onClick={() => toggleMustHave(item)}
                className={cn(
                  'px-4 py-2 rounded-full text-sm font-medium border transition-colors',
                  active
                    ? 'bg-primary text-primary-foreground border-primary'
                    : 'bg-background text-foreground border-border hover:bg-accent',
                )}
              >
                {item}
              </button>
            );
          })}
        </div>
      </div>

      <div>
        <Label htmlFor="deal_breakers" className="text-base font-semibold mb-2 block">
          Deal breakers
        </Label>
        <Input
          id="deal_breakers"
          value={dealBreakers}
          onChange={(e) => update({ deal_breakers: e.target.value.slice(0, 200) })}
          placeholder="e.g. no strata, not near highway..."
          maxLength={200}
        />
        <p className="text-xs text-muted-foreground mt-1 text-right">{dealBreakers.length} / 200</p>
      </div>
    </div>
  );
}

export function validateStep3(_data: HaloFormData): string | null {
  return null;
}
