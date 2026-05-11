import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { cn } from '@/lib/utils';
import type { HaloFormData } from '@/types/halo';
import { MUST_HAVE_OPTIONS } from '@/types/halo';
import { useTranslation } from '@/shared/lib/i18n';

interface Props {
  data: HaloFormData;
  update: (patch: Partial<HaloFormData>) => void;
}

const MUST_HAVE_KEY: Record<string, string> = {
  'Pool': 'halo.wizard.step3.mustHaves.pool',
  'Granny flat': 'halo.wizard.step3.mustHaves.grannyFlat',
  'Study': 'halo.wizard.step3.mustHaves.study',
  'New build': 'halo.wizard.step3.mustHaves.newBuild',
  'Period home': 'halo.wizard.step3.mustHaves.periodHome',
  'North-facing': 'halo.wizard.step3.mustHaves.northFacing',
  'Large land': 'halo.wizard.step3.mustHaves.largeLand',
  'Pet-friendly': 'halo.wizard.step3.mustHaves.petFriendly',
  'Off-street parking': 'halo.wizard.step3.mustHaves.offStreetParking',
};

export function HaloStep3({ data, update }: Props) {
  const { t } = useTranslation();
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
          {t('halo.wizard.step3.description.label')}
        </Label>
        <Textarea
          id="description"
          value={desc}
          onChange={(e) => update({ description: e.target.value.slice(0, 500) })}
          placeholder={t('halo.wizard.step3.description.placeholder')}
          rows={4}
        />
        <p className="text-xs text-muted-foreground mt-1 text-end">
          {t('halo.wizard.step3.description.counter', { count: desc.length })}
        </p>
      </div>

      <div>
        <Label className="text-base font-semibold mb-3 block">{t('halo.wizard.step3.mustHaves.label')}</Label>
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
                {t(MUST_HAVE_KEY[item] ?? item)}
              </button>
            );
          })}
        </div>
      </div>

      <div>
        <Label htmlFor="deal_breakers" className="text-base font-semibold mb-2 block">
          {t('halo.wizard.step3.dealBreakers.label')}
        </Label>
        <Input
          id="deal_breakers"
          value={dealBreakers}
          onChange={(e) => update({ deal_breakers: e.target.value.slice(0, 200) })}
          placeholder={t('halo.wizard.step3.dealBreakers.placeholder')}
          maxLength={200}
        />
        <p className="text-xs text-muted-foreground mt-1 text-end">
          {t('halo.wizard.step3.dealBreakers.counter', { count: dealBreakers.length })}
        </p>
      </div>
    </div>
  );
}

export function validateStep3(_data: HaloFormData): string | null {
  return null;
}
