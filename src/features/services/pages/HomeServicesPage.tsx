import { useEffect, useMemo, useState } from 'react';
import { Helmet } from 'react-helmet-async';
import { useSearchParams } from 'react-router-dom';
import {
  Camera, Map, Sofa, Bug, HardHat, Scale, Sparkles, Trees, Truck, Star, MapPin, Loader2,
} from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { RequestQuoteModal } from '@/features/services/components/RequestQuoteModal';
import { useTranslation } from '@/shared/lib/i18n/useTranslation';

interface Provider {
  id: string;
  name: string;
  category: string;
  description: string | null;
  price_from: number | null;
  price_to: number | null;
  price_unit: string | null;
  suburb: string | null;
  state: string | null;
  rating: number | null;
  logo_url: string | null;
}

const CATEGORIES = [
  { key: 'photography',         labelKey: 'homeServices.category.photography',         icon: Camera },
  { key: 'floor_plans',         labelKey: 'homeServices.category.floorPlans',         icon: Map },
  { key: 'virtual_staging',     labelKey: 'homeServices.category.virtualStaging',     icon: Sofa },
  { key: 'pest_inspection',     labelKey: 'homeServices.category.pestInspection',     icon: Bug },
  { key: 'building_inspection', labelKey: 'homeServices.category.buildingInspection', icon: HardHat },
  { key: 'conveyancing',        labelKey: 'homeServices.category.conveyancing',        icon: Scale },
  { key: 'cleaning',            labelKey: 'homeServices.category.cleaning',            icon: Sparkles },
  { key: 'landscaping',         labelKey: 'homeServices.category.landscaping',         icon: Trees },
  { key: 'removalists',         labelKey: 'homeServices.category.removalists',         icon: Truck },
] as const;

const categoryLabel = (key: string, t: (k: string) => string) =>
  t(CATEGORIES.find(c => c.key === key)?.labelKey ?? key);

const formatPriceRange = (p: Provider, t: (k: string) => string) => {
  if (p.price_from == null) return t('homeServices.card.contactForQuote');
  const unit = p.price_unit && p.price_unit !== 'job' ? `/${p.price_unit}` : '';
  return `${t('homeServices.card.from')} $${Math.round(p.price_from).toLocaleString()}${unit}`;
};

export default function HomeServicesPage() {
  const { t } = useTranslation();
  const [searchParams, setSearchParams] = useSearchParams();
  const initialCat = searchParams.get('category') || 'all';
  const [activeCategory, setActiveCategory] = useState<string>(initialCat);
  const [providers, setProviders] = useState<Provider[]>([]);
  const [loading, setLoading] = useState(true);
  const [quoteProvider, setQuoteProvider] = useState<Provider | null>(null);

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      const { data, error } = await supabase
        .from('home_service_providers')
        .select('id, name, category, description, price_from, price_to, price_unit, suburb, state, rating, logo_url')
        .eq('is_active', true)
        .order('rating', { ascending: false });
      if (!error && data) setProviders(data as Provider[]);
      setLoading(false);
    };
    load();
  }, []);

  useEffect(() => {
    const next = new URLSearchParams(searchParams);
    if (activeCategory && activeCategory !== 'all') next.set('category', activeCategory);
    else next.delete('category');
    setSearchParams(next, { replace: true });
  }, [activeCategory, searchParams, setSearchParams]);

  const filtered = useMemo(() => {
    if (activeCategory === 'all') return providers;
    return providers.filter(p => p.category === activeCategory);
  }, [providers, activeCategory]);

  return (
    <>
      <Helmet>
        <title>{t('homeServices.pageTitle')} | ListHQ</title>
        <meta
          name="description"
          content={t('homeServices.pageSubtitle')}
        />
        <link rel="canonical" href="https://listhq.com.au/home-services" />
      </Helmet>

      <div className="min-h-screen bg-background">
        <section className="border-b border-border bg-secondary/30">
          <div className="max-w-6xl mx-auto px-4 py-12 md:py-16 text-center">
            <h1 className="font-display text-3xl md:text-5xl font-bold text-foreground mb-3">
              {t('homeServices.hero.title')}
            </h1>
            <p className="text-base md:text-lg text-muted-foreground max-w-2xl mx-auto">
              {t('homeServices.hero.subtitle')}
            </p>
          </div>
        </section>

        <main className="max-w-6xl mx-auto px-4 py-8">
          <div className="flex gap-2 overflow-x-auto pb-3 mb-6 -mx-1 px-1 snap-x">
            <button
              onClick={() => setActiveCategory('all')}
              className={`shrink-0 snap-start inline-flex items-center gap-1.5 h-9 px-4 rounded-full text-xs font-semibold border transition-all ${
                activeCategory === 'all'
                  ? 'bg-primary text-primary-foreground border-primary'
                  : 'bg-card text-foreground border-border hover:bg-secondary'
              }`}
            >
              {t('homeServices.filter.allCategories')}
            </button>
            {CATEGORIES.map(({ key, labelKey, icon: Icon }) => (
              <button
                key={key}
                onClick={() => setActiveCategory(key)}
                className={`shrink-0 snap-start inline-flex items-center gap-1.5 h-9 px-4 rounded-full text-xs font-semibold border transition-all ${
                  activeCategory === key
                    ? 'bg-primary text-primary-foreground border-primary'
                    : 'bg-card text-foreground border-border hover:bg-secondary'
                }`}
              >
                <Icon size={14} />
                {t(labelKey)}
              </button>
            ))}
          </div>

          {loading ? (
            <div className="flex justify-center py-16">
              <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
            </div>
          ) : filtered.length === 0 ? (
            <div className="py-16 text-center text-sm text-muted-foreground">
              {t('homeServices.empty.noProviders')}
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {filtered.map((p) => (
                <article
                  key={p.id}
                  className="bg-card border border-border rounded-2xl p-5 flex flex-col hover:shadow-md transition-shadow"
                >
                  <div className="flex items-start justify-between gap-2 mb-2">
                    <h3 className="font-display text-base font-semibold text-foreground leading-snug">
                      {p.name}
                    </h3>
                    {p.rating != null && (
                      <span className="inline-flex items-center gap-1 text-xs font-medium text-foreground shrink-0">
                        <Star size={12} className="fill-amber-400 text-amber-400" />
                        {Number(p.rating).toFixed(1)}
                      </span>
                    )}
                  </div>

                  <Badge variant="secondary" className="self-start mb-3 text-[10px]">
                    {categoryLabel(p.category, t)}
                  </Badge>

                  {p.description && (
                    <p className="text-xs text-muted-foreground leading-relaxed mb-4 line-clamp-3">
                      {p.description}
                    </p>
                  )}

                  <div className="mt-auto space-y-2">
                    <div className="flex items-center justify-between text-xs">
                      <span className="font-semibold text-foreground">{formatPriceRange(p, t)}</span>
                      {p.suburb && (
                        <span className="inline-flex items-center gap-1 text-muted-foreground">
                          <MapPin size={11} />
                          {p.suburb}{p.state ? `, ${p.state}` : ''}
                        </span>
                      )}
                    </div>
                    <Button
                      size="sm"
                      className="w-full"
                      onClick={() => setQuoteProvider(p)}
                    >
                      {t('homeServices.card.requestQuote')}
                    </Button>
                  </div>
                </article>
              ))}
            </div>
          )}

          <p className="text-[11px] text-muted-foreground text-center mt-10 leading-relaxed max-w-xl mx-auto">
            {t('homeServices.footer.disclaimer')}
          </p>
        </main>

        <RequestQuoteModal
          open={!!quoteProvider}
          onOpenChange={(open) => { if (!open) setQuoteProvider(null); }}
          provider={quoteProvider}
        />
      </div>
    </>
  );
}
