import { useState, useCallback, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ArrowRight, MapPin, Sparkles, Loader2, Zap } from 'lucide-react';
import { SearchBar } from '@/components/SearchBar';
import { PropertyCard } from '@/components/PropertyCard';
import { PropertyCardSkeleton } from '@/components/PropertyCardSkeleton';
import { PropertyDrawer } from '@/components/PropertyDrawer';
import { LanguageSwitcher } from '@/components/LanguageSwitcher';
import { BottomNav } from '@/components/BottomNav';
import { useI18n } from '@/lib/i18n';
import { useSearchHistory } from '@/hooks/useSearchHistory';
import { useSavedProperties } from '@/hooks/useSavedProperties';
import { manusSearch } from '@/lib/ManusSearchService';
import { Property } from '@/lib/types';
import { mockProperties } from '@/lib/mock-data';
import { useToast } from '@/hooks/use-toast';

const Index = () => {
  const { t } = useI18n();
  const { addSearch, lastSearch } = useSearchHistory();
  const { isSaved, toggleSaved } = useSavedProperties();
  const { toast } = useToast();

  const [results, setResults] = useState<Property[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [hasSearched, setHasSearched] = useState(false);
  const [selectedProperty, setSelectedProperty] = useState<Property | null>(null);
  const [manusStatus, setManusStatus] = useState<string | null>(null);

  const handleSearch = useCallback(async (query: string) => {
    setIsSearching(true);
    setHasSearched(true);
    setManusStatus(null);
    addSearch(query);
    manusSearch.cancelPolling();

    try {
      const result = await manusSearch.search({ query }, (update) => {
        setManusStatus(update.status);
        if (update.status === 'completed' && update.properties && update.properties.length > 0) {
          setResults(update.properties);
          toast({
            title: '🔍 Live results ready',
            description: `Found ${update.properties.length} properties from real estate sites`,
          });
        } else if (update.status === 'failed') {
          setManusStatus(null);
        }
      });
      setResults(result.properties);
    } catch {
      setResults([]);
    } finally {
      setIsSearching(false);
    }
  }, [addSearch, toast]);

  // Recommended properties (just show a subset for now)
  const recommended = mockProperties.slice(0, 3);

  return (
    <div className="min-h-screen bg-background pb-20">
      {/* Header */}
      <header className="sticky top-0 z-20 bg-background/95 backdrop-blur-md border-b border-border/50">
        <div className="max-w-lg mx-auto px-4 pt-4 pb-3">
          <div className="flex items-center justify-between mb-3">
            <h1 className="font-display text-xl font-bold text-foreground tracking-tight">
              {t('app.name')}
            </h1>
            <LanguageSwitcher />
          </div>
          <SearchBar onSearch={handleSearch} />
        </div>
      </header>

      <main className="max-w-lg mx-auto px-4 py-4">
        {/* Resume search */}
        <AnimatePresence>
          {lastSearch && !hasSearched && (
            <motion.button
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              onClick={() => handleSearch(lastSearch.text)}
              className="w-full flex items-center gap-3 p-4 mb-5 rounded-2xl bg-primary/5 border border-primary/10 text-left transition-colors active:bg-primary/10"
            >
              <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center shrink-0">
                <MapPin size={18} className="text-primary" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-xs text-primary font-medium uppercase tracking-wider">{t('search.resume')}</p>
                <p className="text-sm text-foreground font-medium truncate mt-0.5">
                  {lastSearch.location ? `Back to ${lastSearch.location}` : lastSearch.text}
                </p>
              </div>
              <ArrowRight size={18} className="text-primary shrink-0" />
            </motion.button>
          )}
        </AnimatePresence>

        {/* Search results */}
        {hasSearched && (
          <div className="mb-6">
            <h2 className="font-display font-semibold text-foreground mb-3">{t('search.results')}</h2>
            {isSearching ? (
              <div className="space-y-4">
                {[0, 1, 2].map(i => <PropertyCardSkeleton key={i} />)}
              </div>
            ) : (
              <div className="space-y-4">
                {results.map((property, i) => (
                  <PropertyCard
                    key={property.id}
                    property={property}
                    onSelect={setSelectedProperty}
                    isSaved={isSaved(property.id)}
                    onToggleSave={toggleSaved}
                    index={i}
                  />
                ))}
                {results.length === 0 && (
                  <p className="text-center text-muted-foreground py-8 text-sm">No properties found. Try a different search.</p>
                )}
              </div>
            )}
          </div>
        )}

        {/* Recommended section */}
        {!hasSearched && (
          <div>
            <div className="flex items-center gap-2 mb-3">
              <Sparkles size={16} className="text-primary" />
              <h2 className="font-display font-semibold text-foreground">{t('search.recommended')}</h2>
            </div>
            <div className="space-y-4">
              {recommended.map((property, i) => (
                <PropertyCard
                  key={property.id}
                  property={property}
                  onSelect={setSelectedProperty}
                  isSaved={isSaved(property.id)}
                  onToggleSave={toggleSaved}
                  index={i}
                />
              ))}
            </div>
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

export default Index;
