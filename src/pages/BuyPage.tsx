import React from 'react';
import { useSearchParams } from 'react-router-dom';
import { useI18n } from '@/shared/lib/i18n';
import { Helmet } from 'react-helmet-async';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { PropertyCard } from '@/components/PropertyCard';
import { Loader2 } from 'lucide-react';

const BuyPage = () => {
  const { t } = useI18n();
  const [searchParams] = useSearchParams();

  const { data: properties, isLoading } = useQuery({
    queryKey: ['buy-properties', searchParams.toString()],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('properties')
        .select('*')
        .eq('is_active', true)
        .eq('listing_type', 'sale')
        .order('created_at', { ascending: false })
        .limit(50);

      if (error) throw error;
      return data || [];
    },
  });

  return (
    <>
      <Helmet>
        <title>Buy Property | ListHQ</title>
        <meta name="description" content="Browse properties for sale across Australia on ListHQ." />
      </Helmet>

      <div className="min-h-screen bg-background">
        <div className="max-w-7xl mx-auto px-4 py-8">
          <h1 className="text-3xl font-bold text-foreground mb-6">
            {t('Properties for Sale', 'buy_heading')}
          </h1>

          {isLoading ? (
            <div className="flex items-center justify-center py-20">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
          ) : properties && properties.length > 0 ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
              {properties.map((property) => (
                <PropertyCard key={property.id} property={property} />
              ))}
            </div>
          ) : (
            <div className="text-center py-20 text-muted-foreground">
              {t('No properties found', 'no_properties')}
            </div>
          )}
        </div>
      </div>
    </>
  );
};

export default BuyPage;
