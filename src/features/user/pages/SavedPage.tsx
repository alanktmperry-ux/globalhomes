import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Heart, Loader2 } from 'lucide-react';
import { BottomNav } from '@/shared/components/layout/BottomNav';
import { PropertyCard } from '@/features/properties/components/PropertyCard';
import { PropertyDrawer } from '@/features/properties/components/PropertyDrawer';
import { useI18n } from '@/shared/lib/i18n';
import { useSavedProperties } from '@/features/properties/hooks/useSavedProperties';
import { Property } from '@/shared/lib/types';
import { fetchPublicProperties } from '@/features/properties/api/fetchPublicProperties';

const SavedPage = () => {
  const { t } = useI18n();
  const navigate = useNavigate();
  const { savedIds, isSaved, toggleSaved } = useSavedProperties();
  const [selectedProperty, setSelectedProperty] = useState<Property | null>(null);
  const [dbProperties, setDbProperties] = useState<Property[]>([]);
  const [dbLoading, setDbLoading] = useState(true);

  useEffect(() => {
    fetchPublicProperties(0, 50).then(({ data }) => {
      setDbProperties(data);
      setDbLoading(false);
    });
  }, []);

  // Filter real DB properties to saved IDs only
  const savedProperties = dbProperties.filter(p => savedIds.has(p.id));

  return (
    <div className="min-h-screen bg-background pb-20">
      <header className="sticky top-0 z-20 bg-background/95 backdrop-blur-md border-b border-border/50">
        <div className="max-w-lg mx-auto px-4 py-4">
          <h1 className="font-display text-xl font-bold text-foreground">{t('saved.title')}</h1>
        </div>
      </header>

      <main className="max-w-lg mx-auto px-4 py-4">
        {dbLoading ? (
          <div className="flex items-center justify-center py-20">
            <Loader2 size={24} className="animate-spin text-primary" />
          </div>
        ) : savedProperties.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 text-muted-foreground">
            <Heart size={40} strokeWidth={1.2} className="mb-3 text-border" />
            <p className="text-sm font-medium text-foreground mb-1">
              No saved properties yet
            </p>
            <p className="text-xs text-muted-foreground mb-6 text-center max-w-[200px]">
              Tap the heart on any listing to save it for later
            </p>
            <button
              onClick={() => navigate('/')}
              className="px-5 py-2.5 rounded-xl bg-primary text-primary-foreground text-sm font-medium hover:opacity-90 transition-opacity">
              Browse properties
            </button>
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
