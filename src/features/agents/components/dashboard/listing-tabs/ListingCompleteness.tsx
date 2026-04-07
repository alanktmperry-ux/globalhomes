import { useMemo } from 'react';
import type { PropertyRow } from '@/features/agents/types/listing';

interface Props {
  listing: PropertyRow;
}

const fields = [
  { key: 'Title', weight: 10, check: (l: any) => !!l.title?.trim() },
  { key: 'Description', weight: 10, check: (l: any) => !!l.description?.trim() },
  { key: 'Photos', weight: 15, check: (l: any) => !!(l.image_url || l.images?.length) },
  { key: 'Price', weight: 10, check: (l: any) => l.price > 0 },
  { key: 'Location', weight: 10, check: (l: any) => !!l.address?.trim() },
  { key: 'Type', weight: 10, check: (l: any) => !!l.property_type },
  { key: 'Translation', weight: 25, check: (l: any) => !!(l.translations && Object.keys(l.translations).length > 0) },
  { key: 'Contact', weight: 10, check: (l: any) => !!(l.contact_email || l.contact_phone || l.agent_id) },
];

function getTip(pct: number) {
  if (pct >= 100) return '✅ Listing complete — ready to publish';
  if (pct >= 75) return 'Almost there — add your contact details to go live';
  if (pct >= 50) return 'Add a Chinese or Vietnamese translation to reach 3× more buyers — worth 25%';
  return 'Add photos and a description to get more views';
}

const ListingCompleteness = ({ listing }: Props) => {
  const { pct, results } = useMemo(() => {
    let total = 0;
    const results = fields.map(f => {
      const done = f.check(listing);
      if (done) total += f.weight;
      return { label: f.key, done };
    });
    return { pct: total, results };
  }, [listing]);

  return (
    <div className="w-full rounded-xl bg-muted/50 p-3 px-4">
      <div className="flex items-center justify-between mb-1.5">
        <span className="text-[13px] font-medium text-foreground">Listing completeness</span>
        <span className="text-[13px] font-medium text-green-500">{pct}%</span>
      </div>
      <div className="w-full h-1.5 rounded-full bg-border overflow-hidden">
        <div
          className="h-full rounded-full transition-all duration-700 ease-out"
          style={{ width: `${pct}%`, backgroundColor: '#22c55e' }}
        />
      </div>
      <p className="text-[11px] text-muted-foreground mt-1.5">{getTip(pct)}</p>
      <div className="flex flex-wrap gap-1.5 mt-2">
        {results.map(r => (
          <span
            key={r.label}
            className={`text-[10px] font-medium px-2 py-0.5 rounded-full ${
              r.done
                ? 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400'
                : 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400'
            }`}
          >
            {r.label}
          </span>
        ))}
      </div>
    </div>
  );
};

export default ListingCompleteness;
