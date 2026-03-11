import { useState, useEffect } from 'react';
import { Heart, Loader2 } from 'lucide-react';
import { BottomNav } from '@/components/BottomNav';
import { PropertyCard } from '@/components/PropertyCard';
import { PropertyDrawer } from '@/components/PropertyDrawer';
import { useI18n } from '@/lib/i18n';
import { useSavedProperties } from '@/hooks/useSavedProperties';
import { mockProperties } from '@/lib/mock-data';
import { Property } from '@/lib/types';
import { supabase } from '@/integrations/supabase/client';

const SavedPage = () => {
  const { t } = useI18n();
  const { savedIds, isSaved, toggleSaved } = useSavedProperties();
  const [selectedProperty, setSelectedProperty] = useState<Property | null>(null);
  const [dbProperties, setDbProperties] = useState<Property[]>([]);
  const [loading, setLoading] = useState(true);

  // Fetch DB properties once
  useEffect(() => {
    const fetchDbProperties = async () => {
      const { data } = await supabase
        .from('properties')
        .select('*, agents(name, agency, phone, email, avatar_url, is_subscribed)')
        .eq('status', 'public')
        .order('created_at', { ascending: false });

      if (data && data.length > 0) {
        const mapped: Property[] = data.map((p: any) => ({
          id: p.id,
          title: p.title,
          address: p.address,
          suburb: p.suburb,
          state: p.state,
          country: p.country,
          price: p.price,
          priceFormatted: p.price_formatted,
          beds: p.beds,
          baths: p.baths,
          parking: p.parking,
          sqm: p.sqm,
          imageUrl: p.image_url || p.images?.[0] || 'https://images.unsplash.com/photo-1600596542815-ffad4c1539a9?w=800&q=80',
          images: p.images || (p.image_url ? [p.image_url] : []),
          description: p.description || '',
          estimatedValue: p.estimated_value || '',
          propertyType: p.property_type || 'House',
          features: p.features || [],
          agent: p.agents ? {
            id: p.agent_id || '',
            name: p.agents.name || 'Agent',
            agency: p.agents.agency || '',
            phone: p.agents.phone || '',
            email: p.agents.email || '',
            avatarUrl: p.agents.avatar_url || '',
            isSubscribed: p.agents.is_subscribed || false,
          } : {
            id: '', name: 'Private Seller', agency: '', phone: '', email: '', avatarUrl: '', isSubscribed: false,
          },
          listedDate: p.listed_date || p.created_at,
          views: p.views,
          contactClicks: p.contact_clicks,
          lat: p.lat || undefined,
          lng: p.lng || undefined,
          status: 'listed' as const,
        }));
        setDbProperties(mapped);
      }
      setLoading(false);
    };
    fetchDbProperties();
  }, []);

  // Combine mock + DB properties, deduplicate by ID, then filter to saved
  const allProperties = [...mockProperties, ...dbProperties];
  const uniqueMap = new Map<string, Property>();
  allProperties.forEach(p => { if (!uniqueMap.has(p.id)) uniqueMap.set(p.id, p); });
  const savedProperties = Array.from(uniqueMap.values()).filter(p => savedIds.has(p.id));

  return (
    <div className="min-h-screen bg-background pb-20">
      <header className="sticky top-0 z-20 bg-background/95 backdrop-blur-md border-b border-border/50">
        <div className="max-w-lg mx-auto px-4 py-4">
          <h1 className="font-display text-xl font-bold text-foreground">{t('saved.title')}</h1>
        </div>
      </header>

      <main className="max-w-lg mx-auto px-4 py-4">
        {loading ? (
          <div className="flex items-center justify-center py-20">
            <Loader2 size={24} className="animate-spin text-primary" />
          </div>
        ) : savedProperties.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 text-muted-foreground">
            <Heart size={40} strokeWidth={1.2} className="mb-3" />
            <p className="text-sm">{t('saved.empty')}</p>
          </div>
        ) : (
          <div className="space-y-4">
            {savedProperties.map((p, i) => (
              <PropertyCard
                key={p.id}
                property={p}
                onSelect={setSelectedProperty}
                isSaved={isSaved(p.id)}
                onToggleSave={toggleSaved}
                index={i}
              />
            ))}
          </div>
        )}
      </main>

      <PropertyDrawer
        property={selectedProperty}
        onClose={() => setSelectedProperty(null)}
        isSaved={selectedProperty ? isSaved(selectedProperty.id) : false}
        onToggleSave={toggleSaved}
      />
      <BottomNav />
    </div>
  );
};

export default SavedPage;
