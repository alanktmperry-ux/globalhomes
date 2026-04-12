import React, { useState, useCallback, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useI18n } from '@/shared/lib/i18n';
import { useCurrency } from '@/shared/lib/CurrencyContext';
import { Helmet } from 'react-helmet-async';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { PropertyCard } from '@/components/PropertyCard';
import { mapDbProperty } from '@/features/properties/api/fetchPublicProperties';
import { Property } from '@/shared/lib/types';
import { Loader2 } from 'lucide-react';

const PROPERTIES_WITH_AGENTS =
  '*, agents(name, agency, phone, email, avatar_url, is_subscribed, verification_badge_level, specialization, years_experience, rating, review_count)';

const BuyPage = () => {
  const { t } = useI18n();
  const navigate = useNavigate();
  const [savedIds, setSavedIds] = useState<Set<string>>(new Set());
  const { setListingMode } = useCurrency();

  useEffect(() => {
    setListingMode('sale');
  }, []);

  const { data: properties, isLoading } = useQuery({
    queryKey: ['buy-properties'],
    queryFn: async (): Promise<Property[]> => {
      const { data, error } = await supabase
        .from('properties')
        .select(PROPERTIES_WITH_AGENTS)
        .eq('is_active', true)
        .eq('listing_type', 'sale')
        .order('created_at', { ascending: false })
        .limit(50);

      if (error) throw error;
      return (data ?? []).map((p: any) => mapDbProperty(p));
    },
  });

  const handleSelect = useCallback((property: Property) => {
    navigate(`/property/${property.id}`);
  }, [navigate]);

  const handleToggleSave = useCallback((id: string) => {
    setSavedIds(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }, []);

  return (
    <>
      <Helmet>
        <title>Buy Property | ListHQ</title>
        <meta name="description" content="Browse properties for sale across Australia on ListHQ." />
      </Helmet>

      <div className="min-h-screen bg-background">
        <div className="max-w-7xl mx-auto px-4 py-8">
          <h1 className="text-3xl font-bold text-foreground mb-6">
            {t('Properties for Sale')}
          </h1>

          {isLoading ? (
            <div className="flex items-center justify-center py-20">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
          ) : properties && properties.length > 0 ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
              {properties.map((property, index) => (
                <PropertyCard
                  key={property.id}
                  property={property}
                  onSelect={handleSelect}
                  isSaved={savedIds.has(property.id)}
                  onToggleSave={handleToggleSave}
                  index={index}
                />
              ))}
            </div>
          ) : (
            <div className="text-center py-20 text-muted-foreground">
              {t('No properties found')}
            </div>
          )}
        </div>
      </div>
    </>
  );
};

export default BuyPage;
