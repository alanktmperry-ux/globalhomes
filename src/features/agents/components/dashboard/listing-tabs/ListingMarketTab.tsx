import type { PropertyRow } from '@/features/agents/types/listing';
import { SuburbMarketSnapshot } from '@/features/market/components/SuburbMarketSnapshot';
import { PriceTrendChart } from '@/features/market/components/PriceTrendChart';
import { ComparableSalesList } from '@/features/market/components/ComparableSalesList';

interface Props {
  listing: PropertyRow;
}

export default function ListingMarketTab({ listing }: Props) {
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h3 className="text-base font-semibold text-foreground">Market Analysis</h3>
      </div>

      <SuburbMarketSnapshot
        suburb={listing.suburb}
        state={listing.state}
        propertyType={listing.property_type || 'house'}
      />

      <PriceTrendChart
        suburb={listing.suburb}
        state={listing.state}
        propertyType={listing.property_type || 'house'}
      />

      <ComparableSalesList
        suburb={listing.suburb}
        state={listing.state}
      />
    </div>
  );
}
