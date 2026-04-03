import { useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { ArrowRight, Loader2 } from 'lucide-react';
import { usePropertyComparables } from '../hooks/useMarketData';
import { ComparableSaleCard } from './ComparableSaleCard';

interface Props {
  propertyId: string;
  suburb: string;
  state: string;
}

export function WhatSoldNearby({ propertyId, suburb, state }: Props) {
  const [visible, setVisible] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!ref.current) return;
    const observer = new IntersectionObserver(
      ([entry]) => { if (entry.isIntersecting) { setVisible(true); observer.disconnect(); } },
      { rootMargin: '200px' }
    );
    observer.observe(ref.current);
    return () => observer.disconnect();
  }, []);

  return (
    <div ref={ref}>
      {visible ? <WhatSoldContent propertyId={propertyId} suburb={suburb} state={state} /> : null}
    </div>
  );
}

function WhatSoldContent({ propertyId, suburb, state }: Props) {
  const { comparables, loading } = usePropertyComparables(propertyId);

  if (loading) {
    return (
      <div className="py-8 flex justify-center">
        <Loader2 className="animate-spin text-muted-foreground" size={20} />
      </div>
    );
  }

  if (comparables.length === 0) return null;

  const stateSlug = state.toLowerCase();
  const suburbSlug = suburb.toLowerCase().replace(/\s+/g, '-');

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-base font-semibold text-foreground">Recently Sold in {suburb}</h3>
        <Link
          to={`/suburb/${stateSlug}/${suburbSlug}/sold`}
          className="text-xs text-primary hover:underline inline-flex items-center gap-1"
        >
          View all <ArrowRight size={12} />
        </Link>
      </div>
      <div className="grid gap-3 sm:grid-cols-2">
        {comparables.slice(0, 6).map(sale => (
          <ComparableSaleCard key={sale.id} sale={sale} compact />
        ))}
      </div>
    </div>
  );
}
