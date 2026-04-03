import { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { AgentEOIDashboard } from '../components/AgentEOIDashboard';
import { supabase } from '@/integrations/supabase/client';

export default function AgentEOIPage() {
  const { listingId } = useParams<{ listingId: string }>();
  const [property, setProperty] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!listingId) return;
    supabase
      .from('properties')
      .select('id, address, suburb, state, eoi_guide_price, eoi_close_date, listing_mode')
      .eq('id', listingId)
      .single()
      .then(({ data }) => {
        setProperty(data);
        setLoading(false);
      });
  }, [listingId]);

  if (loading) return <div className="animate-pulse h-40 bg-secondary rounded-xl" />;
  if (!property) return <p className="text-muted-foreground">Property not found.</p>;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-display text-xl font-bold text-foreground">EOI Manager</h1>
        <p className="text-sm text-muted-foreground">
          {property.address} · {property.suburb}, {property.state}
        </p>
      </div>
      <AgentEOIDashboard
        propertyId={property.id}
        propertyAddress={property.address}
        guidePrice={property.eoi_guide_price}
      />
    </div>
  );
}
