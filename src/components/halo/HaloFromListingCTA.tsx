import { useNavigate } from 'react-router-dom';
import { Sparkles, ArrowRight } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface Props {
  listingId: string;
  agentId?: string | null;
  listingType?: string | null; // 'sale' | 'lease' | 'rent' | etc.
  suburb?: string | null;
  price?: number | null;
  weeklyRent?: number | null;
  propertyType?: string | null;
}

const PROPERTY_TYPE_MAP: Record<string, string> = {
  house: 'House',
  apartment: 'Apartment',
  unit: 'Apartment',
  townhouse: 'Townhouse',
  villa: 'Villa',
  land: 'Land',
  commercial: 'Commercial',
};

function mapPropertyType(t?: string | null): string | null {
  if (!t) return null;
  const key = t.toLowerCase();
  return PROPERTY_TYPE_MAP[key] ?? null;
}

function mapIntent(listingType?: string | null): 'buy' | 'rent' {
  const t = (listingType ?? '').toLowerCase();
  if (t === 'lease' || t === 'rent' || t === 'rental') return 'rent';
  return 'buy';
}

export function HaloFromListingCTA({
  listingId,
  agentId,
  listingType,
  suburb,
  price,
  weeklyRent,
  propertyType,
}: Props) {
  const navigate = useNavigate();

  const handleClick = () => {
    const intent = mapIntent(listingType);
    let budgetMax: number | null = null;
    if (intent === 'rent') {
      const wr = weeklyRent ?? price ?? null;
      if (wr) budgetMax = Math.round(wr * 52);
    } else if (price) {
      budgetMax = price;
    }
    const params = new URLSearchParams();
    params.set('intent', intent);
    if (suburb) params.set('suburb', suburb);
    if (budgetMax) params.set('budget_max', String(budgetMax));
    const pt = mapPropertyType(propertyType);
    if (pt) params.set('property_type', pt);
    params.set('source_listing_id', listingId);
    if (agentId) params.set('source_agent_id', agentId);
    params.set('source_type', 'listing_qr');
    navigate(`/halo/new?${params.toString()}`);
  };

  return (
    <div className="mt-4 p-5 rounded-xl border border-primary/20 bg-gradient-to-br from-primary/5 to-primary/10">
      <div className="flex items-start gap-3">
        <div className="shrink-0 w-10 h-10 rounded-full bg-primary/15 flex items-center justify-center">
          <Sparkles className="text-primary" size={20} />
        </div>
        <div className="flex-1 min-w-0">
          <h3 className="text-base font-semibold mb-1">Not quite right for you?</h3>
          <p className="text-sm text-muted-foreground mb-3">
            Post a Halo — tell agents exactly what you're looking for and let them come to you. It's free.
          </p>
          <Button onClick={handleClick} size="sm" className="gap-1.5">
            Post a Halo based on this listing <ArrowRight size={14} />
          </Button>
        </div>
      </div>
    </div>
  );
}
