import { useState } from 'react';
import { Loader2, BarChart2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useMarketComparableSales } from '../hooks/useMarketData';
import { ComparableSaleCard } from './ComparableSaleCard';

const formatAUD = (n: number) =>
  new Intl.NumberFormat('en-AU', { style: 'currency', currency: 'AUD', maximumFractionDigits: 0 }).format(n);

interface Props {
  suburb: string;
  state: string;
  initialPropertyType?: string;
  initialBedrooms?: number;
}

const typeOptions = [
  { value: '', label: 'All' },
  { value: 'house', label: 'House' },
  { value: 'unit', label: 'Unit' },
  { value: 'townhouse', label: 'Townhouse' },
  { value: 'land', label: 'Land' },
];

const periodOptions = [
  { value: 6, label: '6 months' },
  { value: 12, label: '12 months' },
  { value: 24, label: '24 months' },
];

export function ComparableSalesList({ suburb, state, initialPropertyType, initialBedrooms }: Props) {
  const [propertyType, setPropertyType] = useState(initialPropertyType ?? '');
  const [bedrooms, setBedrooms] = useState<number | undefined>(initialBedrooms);
  const [monthsBack, setMonthsBack] = useState(12);
  const [page, setPage] = useState(0);

  const { sales, totalCount, medianPrice, loading, PAGE_SIZE } = useMarketComparableSales(
    suburb, state,
    { propertyType: propertyType || undefined, bedrooms, monthsBack },
    page
  );

  const hasMore = (page + 1) * PAGE_SIZE < totalCount;

  return (
    <div className="space-y-4">
      {/* Filters */}
      <div className="flex flex-wrap gap-2">
        <div className="flex gap-1 rounded-lg bg-secondary p-1">
          {typeOptions.map(opt => (
            <button
              key={opt.value}
              onClick={() => { setPropertyType(opt.value); setPage(0); }}
              className={`px-3 py-1.5 rounded-md text-xs font-medium transition-colors ${
                propertyType === opt.value ? 'bg-background text-foreground shadow-sm' : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              {opt.label}
            </button>
          ))}
        </div>
        <div className="flex gap-1 rounded-lg bg-secondary p-1">
          {periodOptions.map(opt => (
            <button
              key={opt.value}
              onClick={() => { setMonthsBack(opt.value); setPage(0); }}
              className={`px-3 py-1.5 rounded-md text-xs font-medium transition-colors ${
                monthsBack === opt.value ? 'bg-background text-foreground shadow-sm' : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              {opt.label}
            </button>
          ))}
        </div>
      </div>

      {/* Summary */}
      {!loading && totalCount > 0 && (
        <p className="text-sm text-muted-foreground">
          {totalCount} sale{totalCount !== 1 ? 's' : ''} · Median {medianPrice ? formatAUD(medianPrice) : 'N/A'}
        </p>
      )}

      {/* Results */}
      {loading ? (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="animate-spin text-muted-foreground" size={24} />
        </div>
      ) : sales.length === 0 ? (
        <div className="text-center py-12">
          <BarChart2 size={32} className="mx-auto text-muted-foreground mb-2" />
          <p className="text-sm font-medium text-foreground">No comparable sales found</p>
          <p className="text-xs text-muted-foreground mt-1">Try extending the search period or broadening filters.</p>
        </div>
      ) : (
        <div className="grid gap-3 sm:grid-cols-2">
          {sales.map(sale => (
            <ComparableSaleCard key={sale.id} sale={sale} />
          ))}
        </div>
      )}

      {/* Pagination */}
      {hasMore && (
        <div className="text-center pt-2">
          <Button variant="outline" size="sm" onClick={() => setPage(p => p + 1)}>
            Show more
          </Button>
        </div>
      )}
    </div>
  );
}
