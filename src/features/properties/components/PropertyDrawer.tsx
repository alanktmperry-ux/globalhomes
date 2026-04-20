import { useState, useCallback, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Bed, Bath, Car, Ruler, Share2, Heart, MapPin, ChevronLeft, ChevronRight, Phone, MessageCircle, Mail, Shield, ShieldCheck } from 'lucide-react';
import { Property } from '@/shared/lib/types';
import { useI18n } from '@/shared/lib/i18n';
import { useCurrency } from '@/shared/lib/CurrencyContext';
import { AgentContactModal } from '@/features/agents/components/AgentContactModal';
import { ShareSheet } from '@/shared/components/ShareSheet';
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar';
import { BadgeCheck, Star } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { InvestmentInsightsCard } from './InvestmentInsightsCard';
import { MarketInsightsCard } from './MarketInsightsCard';
import { AffordabilityCalculator } from './AffordabilityCalculator';
import useEmblaCarousel from 'embla-carousel-react';
import { useListingTranslation } from '@/features/properties/hooks/useListingTranslation';

function VerificationTier({ level }: { level?: string }) {
  const tiers: { key: string; label: string; icon: typeof Shield; active: boolean }[] = [
    { key: 'email', label: 'Email', icon: Shield, active: true },
    { key: 'phone', label: 'Phone', icon: Shield, active: ['phone', 'license', 'top_performer'].includes(level || '') },
    { key: 'license', label: 'Licensed', icon: ShieldCheck, active: ['license', 'top_performer'].includes(level || '') },
  ];

  return (
    <div className="flex items-center gap-1.5">
      {tiers.map(t => (
        <div
          key={t.key}
          className={`flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-medium ${
            t.active ? 'bg-primary/10 text-primary' : 'bg-muted text-muted-foreground/50'
          }`}
          title={t.label}
        >
          <t.icon size={10} />
          {t.label}
        </div>
      ))}
    </div>
  );
}

export interface SearchContext {
  currentFilters?: {
    priceRange?: [number, number];
    propertyTypes?: string[];
    minBeds?: number;
    minBaths?: number;
  };
  currentQuery?: string;
  searchRadius?: number;
  savedPropertiesCount?: number;
  viewedPropertiesCount?: number;
  savedSearchesCount?: number;
  sessionDurationMinutes?: number;
  listingMode?: string;
}

interface PropertyDrawerProps {
  property: Property | null;
  onClose: () => void;
  isSaved: boolean;
  onToggleSave: (id: string) => void;
  searchContext?: SearchContext;
}

export function PropertyDrawer({ property, onClose, isSaved, onToggleSave, searchContext }: PropertyDrawerProps) {
  const { t } = useI18n();
  const { formatPrice, currency } = useCurrency();
  const [contactOpen, setContactOpen] = useState(false);
  const [shareOpen, setShareOpen] = useState(false);

  const images = property?.images?.length ? property.images : property ? [property.imageUrl] : [];
  const [emblaRef, emblaApi] = useEmblaCarousel({ loop: true, dragFree: false });
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [zoomScale, setZoomScale] = useState(1);
  const zoomRef = useRef<HTMLDivElement>(null);

  const onSelect = useCallback(() => {
    if (!emblaApi) return;
    setSelectedIndex(emblaApi.selectedScrollSnap());
  }, [emblaApi]);

  useEffect(() => {
    if (!emblaApi) return;
    emblaApi.on('select', onSelect);
    onSelect();
    return () => { emblaApi.off('select', onSelect); };
  }, [emblaApi, onSelect]);

  // Reset carousel when property changes
  useEffect(() => {
    if (emblaApi && property) {
      emblaApi.scrollTo(0, true);
      setSelectedIndex(0);
      setZoomScale(1);
    }
  }, [property?.id, emblaApi]);

  // Keyboard navigation
  useEffect(() => {
    if (!property || !emblaApi) return;
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'ArrowLeft') emblaApi.scrollPrev();
      if (e.key === 'ArrowRight') emblaApi.scrollNext();
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [property, emblaApi, onClose]);

  // Pinch-to-zoom (touch)
  useEffect(() => {
    const el = zoomRef.current;
    if (!el) return;
    let initialDistance = 0;
    let initialScale = 1;

    const getDistance = (touches: TouchList) => {
      const dx = touches[0].clientX - touches[1].clientX;
      const dy = touches[0].clientY - touches[1].clientY;
      return Math.sqrt(dx * dx + dy * dy);
    };

    const onTouchStart = (e: TouchEvent) => {
      if (e.touches.length === 2) {
        initialDistance = getDistance(e.touches);
        initialScale = zoomScale;
      }
    };
    const onTouchMove = (e: TouchEvent) => {
      if (e.touches.length === 2) {
        e.preventDefault();
        const dist = getDistance(e.touches);
        const scale = Math.min(3, Math.max(1, initialScale * (dist / initialDistance)));
        setZoomScale(scale);
      }
    };
    const onTouchEnd = () => {
      if (zoomScale < 1.1) setZoomScale(1);
    };

    el.addEventListener('touchstart', onTouchStart, { passive: true });
    el.addEventListener('touchmove', onTouchMove, { passive: false });
    el.addEventListener('touchend', onTouchEnd);
    return () => {
      el.removeEventListener('touchstart', onTouchStart);
      el.removeEventListener('touchmove', onTouchMove);
      el.removeEventListener('touchend', onTouchEnd);
    };
  }, [zoomScale]);

  const trackLeadEvent = async (eventType: string) => {
    if (!property?.agent.id) return;
    try {
      await supabase.from('lead_events').insert({
        agent_id: property.agent.id,
        property_id: property.id,
        event_type: eventType,
        user_id: (await supabase.auth.getUser()).data.user?.id || null,
      });
    } catch { /* silent */ }
  };

  const agentRating = property?.agent.rating && property.agent.rating > 0 ? property.agent.rating : null;
  const reviewCount = property?.agent.reviewCount || 0;

  return (
    <>
      <AnimatePresence>
        {property && (
          <>
            <motion.div
              className="fixed inset-0 bg-foreground/20 backdrop-blur-sm z-40"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={onClose}
            />
            <motion.div
              className="fixed inset-x-0 bottom-0 z-50 max-h-[97vh] bg-card rounded-t-3xl shadow-drawer overflow-y-auto md:inset-x-auto md:left-1/2 md:top-[3vh] md:bottom-auto md:-translate-x-1/2 md:w-full md:max-w-4xl md:rounded-2xl md:max-h-[94vh]"
              initial={{ y: '100%', opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              exit={{ y: '100%', opacity: 0 }}
              transition={{ type: 'spring', damping: 28, stiffness: 300 }}
            >
              {/* Drag indicator */}
              <div className="sticky top-0 z-10 flex justify-center pt-3 pb-1 bg-card rounded-t-3xl md:hidden">
                <div className="w-10 h-1 rounded-full bg-border" />
              </div>

              {/* Embla image gallery */}
              <div className="relative aspect-video overflow-hidden md:rounded-t-2xl" ref={zoomRef}>
                <div className="overflow-hidden h-full" ref={emblaRef}>
                  <div className="flex h-full">
                    {images.map((img, i) => (
                      <div key={i} className="flex-[0_0_100%] min-w-0 h-full">
                        <img
                          src={img}
                          alt={`${property.title} - Photo ${i + 1}`}
                          className="w-full h-full object-cover transition-transform duration-200"
                          style={{ transform: `scale(${zoomScale})` }}
                          loading={i === 0 ? 'eager' : 'lazy'}
                          draggable={false}
                        />
                      </div>
                    ))}
                  </div>
                </div>

                {images.length > 1 && (
                  <>
                    <button onClick={() => emblaApi?.scrollPrev()} className="absolute left-3 top-1/2 -translate-y-1/2 w-8 h-8 rounded-full bg-card/80 backdrop-blur-sm flex items-center justify-center hover:bg-card transition-colors">
                      <ChevronLeft size={16} />
                    </button>
                    <button onClick={() => emblaApi?.scrollNext()} className="absolute right-3 top-1/2 -translate-y-1/2 w-8 h-8 rounded-full bg-card/80 backdrop-blur-sm flex items-center justify-center hover:bg-card transition-colors">
                      <ChevronRight size={16} />
                    </button>
                  </>
                )}

                <div className="absolute bottom-3 right-3 px-2.5 py-1 rounded-full bg-card/80 backdrop-blur-sm text-xs font-medium text-foreground tabular-nums">
                  {selectedIndex + 1}/{images.length}
                </div>

                <button onClick={onClose} className="absolute top-4 right-4 w-9 h-9 rounded-full bg-card/80 backdrop-blur-sm flex items-center justify-center">
                  <X size={18} />
                </button>
                <div className="absolute bottom-3 left-3 flex gap-2">
                  <button
                    onClick={() => onToggleSave(property.id)}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-card/80 backdrop-blur-sm text-sm font-medium"
                  >
                    <Heart size={14} className={isSaved ? 'fill-destructive text-destructive' : ''} />
                    {t('property.save')}
                  </button>
                  <button
                    onClick={() => setShareOpen(true)}
                    className="flex items-center gap-1.5 px-4 py-2 rounded-full bg-primary text-primary-foreground text-sm font-semibold shadow-md whitespace-nowrap"
                  >
                    <Share2 size={16} />
                    {t('property.share')}
                  </button>
                </div>
              </div>

              {/* Thumbnail strip */}
              {images.length > 1 && (
                <div className="flex gap-1.5 p-3 overflow-x-auto">
                  {images.map((img, i) => (
                    <button
                      key={i}
                      onClick={() => emblaApi?.scrollTo(i)}
                      className={`shrink-0 w-16 h-12 rounded-lg overflow-hidden border-2 transition-colors ${
                        i === selectedIndex ? 'border-primary' : 'border-transparent opacity-60 hover:opacity-100'
                      }`}
                    >
                      <img src={img} alt="" className="w-full h-full object-cover" />
                    </button>
                  ))}
                </div>
              )}

              <div className="p-5 space-y-5">
                {/* Status badge + Property type */}
                <div className="flex items-center gap-2 flex-wrap">
                  {property.status && property.status !== 'listed' && (
                    <span className={`px-2.5 py-1 rounded-full text-[11px] font-bold tracking-wide uppercase ${
                      property.status === 'off-market' ? 'bg-amber-500/90 text-white' :
                      property.status === 'coming-soon' ? 'bg-blue-500/90 text-white' :
                      property.status === 'new' ? 'bg-emerald-500/90 text-white' : 'bg-secondary text-secondary-foreground'
                    }`}>
                      {property.status === 'off-market' ? 'Off-Market' : property.status === 'coming-soon' ? 'Coming Soon' : 'New'}
                    </span>
                  )}
                  <span className="px-2.5 py-1 rounded-full bg-secondary text-secondary-foreground text-[11px] font-bold tracking-wide uppercase">
                    {property.propertyType}
                  </span>
                </div>

                {/* Price and title */}
                <div>
                  <div className="flex items-center gap-2">
                    <p className="font-display text-2xl font-bold text-foreground">{formatPrice(property.price, property.listingType ?? undefined)}</p>
                    <span className={`px-2.5 py-1 rounded-full text-[11px] font-bold uppercase tracking-wide ${
                      (property.listingType === 'rent' || property.listingType === 'rental' || property.price < 50000)
                        ? 'bg-emerald-500/90 text-white'
                        : 'bg-blue-500/90 text-white'
                    }`}>
                      {(property.listingType === 'rent' || property.listingType === 'rental' || property.price < 50000) ? 'Per Week' : 'For Sale'}
                    </span>
                  </div>
                  {currency.code !== 'AUD' && (
                    <p className="text-xs text-muted-foreground">{property.priceFormatted} AUD</p>
                  )}
                  <h2 className="font-display text-lg font-semibold text-foreground mt-1">{property.title}</h2>
                  <p className="flex items-center gap-1 text-sm text-muted-foreground mt-1">
                    <MapPin size={14} />
                    {property.address}, {property.suburb}, {property.state} {property.country && property.country !== 'Australia' ? `, ${property.country}` : ''}
                  </p>
                </div>

                {/* Key stats */}
                <div className="grid grid-cols-4 gap-3">
                  {[
                    { icon: Bed, value: property.beds, label: t('property.beds') },
                    { icon: Bath, value: property.baths, label: t('property.baths') },
                    { icon: Car, value: property.parking, label: t('property.parking') },
                    { icon: Ruler, value: `${property.sqm}m²`, label: 'Size' },
                  ].map(stat => (
                    <div key={stat.label} className="flex flex-col items-center p-3 rounded-xl bg-secondary">
                      <stat.icon size={18} className="text-primary mb-1" />
                      <span className="font-display font-bold text-foreground text-sm">{stat.value}</span>
                      <span className="text-xs text-muted-foreground">{stat.label}</span>
                    </div>
                  ))}
                </div>

                {/* Estimated value */}
                {property.estimatedValue && (
                  <div className="p-4 rounded-xl bg-primary/5 border border-primary/10">
                    <p className="text-xs text-primary font-medium uppercase tracking-wider">{t('property.estimated')}</p>
                    <p className="font-display font-bold text-foreground text-lg mt-1">{property.estimatedValue}</p>
                  </div>
                )}

                {/* Property details grid */}
                <div className="grid grid-cols-2 gap-3">
                  {property.listedDate && (
                    <div className="p-3 rounded-xl bg-secondary">
                      <p className="text-[11px] text-muted-foreground uppercase tracking-wider font-medium">Listed</p>
                      <p className="text-sm font-semibold text-foreground mt-0.5">{new Date(property.listedDate).toLocaleDateString('en-AU', { day: 'numeric', month: 'short', year: 'numeric' })}</p>
                    </div>
                  )}
                  {property.views > 0 && (
                    <div className="p-3 rounded-xl bg-secondary">
                      <p className="text-[11px] text-muted-foreground uppercase tracking-wider font-medium">Views</p>
                      <p className="text-sm font-semibold text-foreground mt-0.5">{property.views.toLocaleString()}</p>
                    </div>
                  )}
                </div>

                {/* Description (auto-translated) */}
                {(translatedDescription || descTranslating) && (
                  <div>
                    <h3 className="font-display font-semibold text-foreground mb-2">{t('property.description')}</h3>
                    {descTranslating ? (
                      <div className="space-y-2">
                        <div className="h-3 w-full rounded bg-muted animate-pulse" />
                        <div className="h-3 w-11/12 rounded bg-muted animate-pulse" />
                        <div className="h-3 w-9/12 rounded bg-muted animate-pulse" />
                      </div>
                    ) : (
                      <>
                        <p className="text-sm text-muted-foreground leading-relaxed whitespace-pre-line">{translatedDescription}</p>
                        {descIsTranslated && (
                          <p className="mt-2 text-[11px] text-muted-foreground italic">Translated by AI</p>
                        )}
                      </>
                    )}
                  </div>
                )}

                {/* Features */}
                {property.features.length > 0 && (
                  <div>
                    <h3 className="font-display font-semibold text-foreground mb-2">Features</h3>
                    <div className="flex flex-wrap gap-2">
                      {property.features.map(f => (
                        <span key={f} className="px-3 py-1 rounded-full bg-secondary text-xs font-medium text-secondary-foreground">
                          {f}
                        </span>
                      ))}
                    </div>
                  </div>
                )}

                {/* Investment Insights */}
                <InvestmentInsightsCard property={property} />

                {/* Market Insights (rental listings) */}
                <MarketInsightsCard property={property} />

                {/* Affordability Calculator */}
                <AffordabilityCalculator property={property} />

                {/* Agent section */}
                <div className="p-4 rounded-2xl bg-secondary/50 border border-border">
                  <h3 className="font-display font-semibold text-foreground mb-3">{t('property.agent')}</h3>
                  <div className="flex items-center gap-3 mb-3">
                    <div className="relative">
                      <Avatar className="w-14 h-14 border-2 border-primary">
                        <AvatarImage src={property.agent.avatarUrl} alt={property.agent.name} className="object-cover" />
                        <AvatarFallback>{property.agent.name[0]}</AvatarFallback>
                      </Avatar>
                      {property.agent.isSubscribed && (
                        <div className="absolute -bottom-1 -right-1 w-5 h-5 rounded-full bg-primary flex items-center justify-center">
                          <BadgeCheck size={12} className="text-primary-foreground" />
                        </div>
                      )}
                    </div>
                    <div className="flex-1">
                      <p className="font-display font-semibold text-foreground">{property.agent.name}</p>
                      <p className="text-sm text-muted-foreground">{property.agent.agency}</p>
                      <div className="flex items-center gap-2 mt-0.5">
                        {agentRating ? (
                          <span className="flex items-center gap-1">
                            <Star size={12} className="fill-yellow-400 text-yellow-400" />
                            <span className="text-xs font-medium text-foreground">{agentRating.toFixed(1)}</span>
                            {reviewCount > 0 && <span className="text-[10px] text-muted-foreground">({reviewCount})</span>}
                          </span>
                        ) : (
                          <span className="text-[10px] text-muted-foreground">No reviews yet</span>
                        )}
                        {property.agent.specialization && (
                          <span className="text-[10px] text-muted-foreground">· {property.agent.specialization}</span>
                        )}
                        {property.agent.yearsExperience && property.agent.yearsExperience > 0 && (
                          <span className="text-[10px] text-muted-foreground">· {property.agent.yearsExperience}yr exp</span>
                        )}
                      </div>
                    </div>
                    {property.agent.isSubscribed && (
                      <span className="px-2 py-0.5 rounded-md bg-primary/10 text-primary text-xs font-medium">
                        {t('agent.subscribed')}
                      </span>
                    )}
                  </div>

                  {/* Verification tiers */}
                  <div className="mb-4">
                    <VerificationTier level={property.agent.verificationLevel} />
                  </div>

                  <button
                    onClick={() => setContactOpen(true)}
                    className="w-full py-3 rounded-xl bg-primary text-primary-foreground font-medium text-sm hover:bg-primary/90 transition-colors"
                  >
                    {t('property.contact')}
                  </button>
                </div>
              </div>

              {/* Quick-action sticky bar */}
              <div className="sticky bottom-0 p-4 bg-card border-t border-border">
                <div className="flex items-center gap-2">
                  {property.agent.phone && (
                    <a
                      href={`tel:${property.agent.phone}`}
                      onClick={() => trackLeadEvent('phone_click')}
                      className="flex-1 flex items-center justify-center gap-2 py-3 rounded-xl border border-border bg-secondary text-foreground font-medium text-sm hover:bg-secondary/80 transition-colors"
                    >
                      <Phone size={16} />
                      Call
                    </a>
                  )}
                  {property.agent.phone && (
                    <a
                      href={`https://wa.me/${property.agent.phone.replace(/[^0-9]/g, '')}?text=${encodeURIComponent(`Hi, I'm interested in ${property.title} at ${property.address}`)}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      onClick={() => trackLeadEvent('whatsapp_click')}
                      className="flex-1 flex items-center justify-center gap-2 py-3 rounded-xl border border-border bg-secondary text-foreground font-medium text-sm hover:bg-secondary/80 transition-colors"
                    >
                      <MessageCircle size={16} />
                      WhatsApp
                    </a>
                  )}
                  <button
                    onClick={() => { setContactOpen(true); trackLeadEvent('contact_click'); }}
                    className="flex-1 flex items-center justify-center gap-2 py-3 rounded-xl bg-primary text-primary-foreground font-medium text-sm hover:bg-primary/90 transition-colors"
                  >
                    <Mail size={16} />
                    Enquire
                  </button>
                </div>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>

      {property && (
        <>
          <AgentContactModal
            property={property}
            open={contactOpen}
            onClose={() => setContactOpen(false)}
            searchContext={searchContext}
          />
          <ShareSheet
            property={property}
            open={shareOpen}
            onClose={() => setShareOpen(false)}
          />
        </>
      )}
    </>
  );
}
