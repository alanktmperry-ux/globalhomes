import { useNavigate } from 'react-router-dom';
import type { PropertyRow } from '@/features/agents/types/listing';
import { Button } from '@/components/ui/button';
import { BarChart3 } from 'lucide-react';
import { SuburbMarketSnapshot } from '@/features/market/components/SuburbMarketSnapshot';
import { PriceTrendChart } from '@/features/market/components/PriceTrendChart';
import { ComparableSalesList } from '@/features/market/components/ComparableSalesList';

interface Props {
  listing: PropertyRow;
}

export default function ListingMarketTab({ listing }: Props) {
  const navigate = useNavigate();

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h3 className="text-base font-semibold text-foreground">Market Analysis</h3>
        <Button
          size="sm"
          className="gap-1.5 text-xs"
          onClick={() => navigate('/dashboard/cma/new', {
            state: {
              prefill: {
                property_id: listing.id,
                subject_address: listing.address,
                subject_suburb: listing.suburb,
                subject_state: listing.state,
                subject_postcode: listing.postcode,
                subject_bedrooms: listing.beds,
                subject_bathrooms: listing.baths,
                subject_car_spaces: listing.parking,
                subject_land_sqm: listing.land_size_sqm,
                subject_property_type: listing.property_type,
              }
            }
          })}
        >
          <BarChart3 size={14} />
          Generate CMA
        </Button>
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
