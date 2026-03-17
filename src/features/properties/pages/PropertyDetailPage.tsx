import { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { ArrowLeft, Bed, Bath, Car, Ruler, Share2, Heart, MapPin, ChevronLeft, ChevronRight, Calendar, Eye, Home, BadgeCheck, Star, X, PawPrint, Sofa, Clock, FileText, Users } from 'lucide-react';
import { Property } from '@/shared/lib/types';
import { useI18n } from '@/shared/lib/i18n';
import { useCurrency } from '@/shared/lib/CurrencyContext';
import { AgentContactModal } from '@/features/agents/components/AgentContactModal';
import { InvestmentInsightsCard } from '@/features/properties/components/InvestmentInsightsCard';
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar';
import { SiteHeader } from '@/shared/components/layout/SiteHeader';
import { SiteFooter } from '@/shared/components/layout/SiteFooter';
import { BottomNav } from '@/shared/components/layout/BottomNav';
import { useSavedProperties } from '@/features/properties/hooks/useSavedProperties';
import { useIsMobile } from '@/shared/hooks/use-mobile';
import { mockProperties } from '@/features/properties/api/mock-data';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/hooks/use-toast';
import { RentalEnquiryForm } from '@/features/properties/components/RentalEnquiryForm';
import { InspectionBookingModal } from '@/features/properties/components/InspectionBookingModal';
import { PriceHistoryChart } from '@/features/properties/components/PriceHistoryChart';
import { InspectionSlot } from '@/shared/lib/types';

export default function PropertyDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { t } = useI18n();
  const { formatPrice, currency, listingMode } = useCurrency();
  const { isSaved, toggleSaved } = useSavedProperties();
  const isMobile = useIsMobile();

  const [property, setProperty] = useState<Property | null>(null);
  const [loading, setLoading] = useState(true);
  const [imageIndex, setImageIndex] = useState(0);
  const [contactOpen, setContactOpen] = useState(false);
  const [lightboxOpen, setLightboxOpen] = useState(false);
  const [rentalEnquiryOpen, setRentalEnquiryOpen] = useState(false);
  const [inspectionBookingOpen, setInspectionBookingOpen] = useState(false);
  const [inspectionTimes, setInspectionTimes] = useState<InspectionSlot[]>([]);
  useEffect(() => {
    const fetchProperty = async () => {
      setLoading(true);
      const { data } = await supabase
        .from('properties')
        .select('*, agents(id, name, agency, phone, email, avatar_url, is_subscribed)')
        .eq('id', id || '')
        .single();

      if (data) {
        const p: any = data;
        setProperty({
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
          imageUrl: p.image_url || p.images?.[0] || '',
          images: p.images || (p.image_url ? [p.image_url] : []),
          description: p.description || '',
          estimatedValue: p.estimated_value || '',
          propertyType: p.property_type || 'House',
          features: p.features || [],
          agent: p.agents ? {
            id: p.agents.id || p.agent_id || '',
            name: p.agents.name || 'Agent',
            agency: p.agents.agency || '',
            phone: p.agents.phone || '',
            email: p.agents.email || '',
            avatarUrl: p.agents.avatar_url || '',
            isSubscribed: p.agents.is_subscribed || false,
          } : { id: '', name: 'Private Seller', agency: '', phone: '', email: '', avatarUrl: '', isSubscribed: false },
          listedDate: p.listed_date || p.created_at,
          views: p.views,
          contactClicks: p.contact_clicks,
          status: 'listed',
          rentalYieldPct: p.rental_yield_pct,
          strPermitted: p.str_permitted,
          yearBuilt: p.year_built,
          councilRatesAnnual: p.council_rates_annual,
          strataFeesQuarterly: p.strata_fees_quarterly,
          rentalWeekly: p.rental_weekly,
          currencyCode: p.currency_code,
          listingType: p.listing_type || null,
          inspectionTimes: Array.isArray(p.inspection_times) ? p.inspection_times : [],
        });
        setInspectionTimes(Array.isArray(p.inspection_times) ? p.inspection_times : []);
      } else {
        const mock = mockProperties.find(p => p.id === id);
        setProperty(mock || null);
      }
      setLoading(false);
    };
    fetchProperty();
  }, [id]);

  const prevImage = () => setImageIndex(i => (i > 0 ? i - 1 : (property?.images.length || 1) - 1));
  const nextImage = () => setImageIndex(i => (i < (property?.images.length || 1) - 1 ? i + 1 : 0));

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex flex-col">
        <SiteHeader />
        <div className="flex-1 flex items-center justify-center">
          <div className="w-10 h-10 border-4 border-primary border-t-transparent rounded-full animate-spin" />
        </div>
      </div>
    );
  }

  if (!property) {
    return (
      <div className="min-h-screen bg-background flex flex-col">
        <SiteHeader />
        <div className="flex-1 flex flex-col items-center justify-center gap-4">
          <Home size={48} className="text-muted-foreground" />
          <h1 className="font-display text-xl font-bold text-foreground">Property not found</h1>
          <button onClick={() => navigate('/')} className="px-6 py-2 rounded-xl bg-primary text-primary-foreground font-medium text-sm">
            Back to search
          </button>
        </div>
      </div>
    );
  }

  const saved = isSaved(property.id);
  const images = property.images.length > 0 ? property.images : [property.imageUrl];
  const isRental = listingMode === 'rent' || property.listingType === 'rent' || property.listingType === 'rental' || property.price < 50000;

  // Rental-specific derived data
  const featuresLower = (property.features || []).map(f => f.toLowerCase());
  const isPetFriendly = featuresLower.some(f => f.includes('pet') || f.includes('dog') || f.includes('cat'));
  const isFurnished = featuresLower.some(f => f.includes('furnished'));
  const weeklyRent = property.rentalWeekly || property.price;
  const bondAmount = weeklyRent * 4;

  const statusConfig: Record<string, { label: string; className: string }> = {
    'off-market': { label: 'Off-Market', className: 'bg-amber-500/90 text-white' },
    'coming-soon': { label: 'Coming Soon', className: 'bg-blue-500/90 text-white' },
    'new': { label: 'New', className: 'bg-emerald-500/90 text-white' },
  };
  const badge = property.status && property.status !== 'listed' ? statusConfig[property.status] : null;

  const handleCtaClick = () => {
    if (isRental) {
      setRentalEnquiryOpen(true);
    } else {
      setContactOpen(true);
    }
  };

  const ctaLabel = isRental ? 'Enquire / Apply' : t('property.contact');

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <SiteHeader />

      {/* Back button */}
      <div className="max-w-6xl mx-auto w-full px-4 pt-4">
        <button
          onClick={() => navigate(-1)}
          className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors mb-4"
        >
          <ArrowLeft size={16} />
          Back to results
        </button>
      </div>

      <main className="flex-1 max-w-6xl mx-auto w-full px-4 pb-24 md:pb-12">
        {/* Hero image gallery */}
        <div className="relative rounded-2xl overflow-hidden aspect-[16/9] md:aspect-[2.4/1] mb-4">
          <AnimatePresence mode="wait">
            <motion.img
              key={imageIndex}
              src={images[imageIndex]}
              alt={`${property.title} - Photo ${imageIndex + 1}`}
              className="w-full h-full object-cover cursor-pointer"
              onClick={() => setLightboxOpen(true)}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.2 }}
            />
          </AnimatePresence>

          {images.length > 1 && (
            <>
              <button onClick={prevImage} className="absolute left-3 top-1/2 -translate-y-1/2 w-10 h-10 rounded-full bg-card/80 backdrop-blur-sm flex items-center justify-center hover:bg-card transition-colors shadow-md">
                <ChevronLeft size={20} />
              </button>
              <button onClick={nextImage} className="absolute right-3 top-1/2 -translate-y-1/2 w-10 h-10 rounded-full bg-card/80 backdrop-blur-sm flex items-center justify-center hover:bg-card transition-colors shadow-md">
                <ChevronRight size={20} />
              </button>
            </>
          )}

          <div className="absolute bottom-3 right-3 px-3 py-1.5 rounded-full bg-card/80 backdrop-blur-sm text-xs font-medium text-foreground">
            {imageIndex + 1}/{images.length}
          </div>

          {/* Badges */}
          <div className="absolute top-4 left-4 flex gap-2">
            {badge && (
              <span className={`px-3 py-1.5 rounded-full text-xs font-bold tracking-wide uppercase shadow-sm ${badge.className}`}>
                {badge.label}
              </span>
            )}
            <span className="px-3 py-1.5 rounded-full bg-card/80 backdrop-blur-sm text-xs font-bold tracking-wide uppercase text-foreground">
              {property.propertyType}
            </span>
            {isRental && property.contactClicks > 0 && (
              <span className="px-3 py-1.5 rounded-full bg-primary/90 text-primary-foreground text-xs font-bold tracking-wide uppercase shadow-sm flex items-center gap-1">
                <Users size={12} />
                {property.contactClicks} application{property.contactClicks !== 1 ? 's' : ''}
              </span>
            )}
          </div>

          {/* Action buttons */}
          <div className="absolute top-4 right-4 flex gap-2">
            <button
              onClick={() => toggleSaved(property.id)}
              className="w-10 h-10 rounded-full bg-card/80 backdrop-blur-sm flex items-center justify-center transition-transform active:scale-90 shadow-md"
            >
              <Heart size={18} className={saved ? 'fill-destructive text-destructive' : 'text-foreground/70'} />
            </button>
            <button
              onClick={async () => {
                const url = window.location.href;
                const title = property.title;
                const text = `${property.title} — ${property.address}, ${property.suburb}`;
                if (navigator.share) {
                  try { await navigator.share({ title, text, url }); } catch {}
                } else {
                  await navigator.clipboard.writeText(url);
                  toast({ title: 'Link copied to clipboard!' });
                }
              }}
              className="w-10 h-10 rounded-full bg-card/80 backdrop-blur-sm flex items-center justify-center shadow-md"
            >
              <Share2 size={18} className="text-foreground/70" />
            </button>
          </div>
        </div>

        {/* Thumbnail strip */}
        {images.length > 1 && (
          <div className="flex gap-2 mb-6 overflow-x-auto pb-1">
            {images.map((img, i) => (
              <button
                key={i}
                onClick={() => setImageIndex(i)}
                className={`shrink-0 w-20 h-14 rounded-lg overflow-hidden border-2 transition-all ${
                  i === imageIndex ? 'border-primary shadow-md' : 'border-transparent opacity-60 hover:opacity-100'
                }`}
              >
                <img src={img} alt="" className="w-full h-full object-cover" />
              </button>
            ))}
          </div>
        )}

        {/* Content grid */}
        <div className="grid md:grid-cols-3 gap-6">
          {/* Main content - 2 cols */}
          <div className="md:col-span-2 space-y-6">
            {/* Price + title */}
            <div>
              {isRental ? (
                <>
                  <div className="flex items-baseline gap-2">
                    <p className="font-display text-3xl md:text-4xl font-bold text-foreground">
                      {formatPrice(weeklyRent, 'rent')}
                    </p>
                    <span className="text-lg text-muted-foreground font-medium">per week</span>
                  </div>
                  {currency.code !== 'AUD' && (
                    <p className="text-sm text-muted-foreground mt-0.5">${weeklyRent.toLocaleString()}/wk AUD</p>
                  )}
                </>
              ) : (
                <>
                  <p className="font-display text-3xl md:text-4xl font-bold text-foreground">{formatPrice(property.price)}</p>
                  {currency.code !== 'AUD' && (
                    <p className="text-sm text-muted-foreground mt-0.5">{property.priceFormatted} AUD</p>
                  )}
                </>
              )}
              <h1 className="font-display text-xl md:text-2xl font-semibold text-foreground mt-2">{property.title}</h1>
              <p className="flex items-center gap-1.5 text-muted-foreground mt-1.5">
                <MapPin size={16} />
                {property.address}, {property.suburb}, {property.state}
                {property.country && property.country !== 'Australia' ? `, ${property.country}` : ''}
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
                <div key={stat.label} className="flex flex-col items-center p-4 rounded-xl bg-secondary">
                  <stat.icon size={20} className="text-primary mb-1.5" />
                  <span className="font-display font-bold text-foreground">{stat.value}</span>
                  <span className="text-xs text-muted-foreground">{stat.label}</span>
                </div>
              ))}
            </div>

            {/* Rental Info Section */}
            {isRental && (
              <div className="p-5 rounded-2xl bg-card border border-border shadow-card">
                <h2 className="font-display text-lg font-semibold text-foreground mb-4 flex items-center gap-2">
                  <FileText size={18} className="text-primary" />
                  Rental Information
                </h2>
                <div className="grid grid-cols-2 gap-4">
                  <div className="p-3 rounded-xl bg-secondary">
                    <p className="text-[11px] text-muted-foreground uppercase tracking-wider font-medium">Available From</p>
                    <p className="text-sm font-semibold text-foreground mt-1 flex items-center gap-1.5">
                      <Calendar size={14} className="text-primary" />
                      Available Now
                    </p>
                  </div>
                  <div className="p-3 rounded-xl bg-secondary">
                    <p className="text-[11px] text-muted-foreground uppercase tracking-wider font-medium">Lease Term</p>
                    <p className="text-sm font-semibold text-foreground mt-1 flex items-center gap-1.5">
                      <Clock size={14} className="text-primary" />
                      6 – 12 months
                    </p>
                  </div>
                  <div className="p-3 rounded-xl bg-secondary">
                    <p className="text-[11px] text-muted-foreground uppercase tracking-wider font-medium">Bond</p>
                    <p className="text-sm font-semibold text-foreground mt-1">
                      {formatPrice(bondAmount, 'sale')} <span className="text-xs text-muted-foreground font-normal">(4 weeks)</span>
                    </p>
                  </div>
                  <div className="p-3 rounded-xl bg-secondary">
                    <p className="text-[11px] text-muted-foreground uppercase tracking-wider font-medium">Pet Policy</p>
                    <p className="text-sm font-semibold mt-1 flex items-center gap-1.5">
                      <PawPrint size={14} className={isPetFriendly ? 'text-emerald-500' : 'text-muted-foreground'} />
                      <span className={isPetFriendly ? 'text-emerald-600 dark:text-emerald-400' : 'text-foreground'}>
                        {isPetFriendly ? 'Pets Allowed' : 'On Application'}
                      </span>
                    </p>
                  </div>
                  {isFurnished && (
                    <div className="col-span-2 p-3 rounded-xl bg-primary/5 border border-primary/10">
                      <p className="text-sm font-semibold text-primary flex items-center gap-1.5">
                        <Sofa size={14} />
                        This property is furnished
                      </p>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Inspection Times — for all property types */}
            <div className="p-5 rounded-2xl bg-card border border-border shadow-card">
              <h2 className="font-display text-lg font-semibold text-foreground mb-3 flex items-center gap-2">
                <Eye size={18} className="text-primary" />
                Inspection Times
              </h2>
              {(() => {
                const upcoming = inspectionTimes.filter(s => new Date(`${s.date}T${s.start}`) > new Date());
                if (upcoming.length === 0) {
                  return (
                    <>
                      <p className="text-sm text-muted-foreground">
                        No scheduled inspections. Contact agent for inspection times.
                      </p>
                      <button
                        onClick={handleCtaClick}
                        className="mt-3 px-5 py-2.5 rounded-xl bg-secondary text-foreground font-medium text-sm hover:bg-accent transition-colors"
                      >
                        Request Inspection
                      </button>
                    </>
                  );
                }
                return (
                  <div className="space-y-2">
                    {upcoming.map((slot, i) => {
                      const dayStr = new Date(slot.date).toLocaleDateString('en-AU', { weekday: 'short', day: 'numeric', month: 'short' });
                      return (
                        <button
                          key={`${slot.date}-${slot.start}`}
                          onClick={() => setInspectionBookingOpen(true)}
                          className="w-full flex items-center gap-3 p-3 rounded-xl border border-border bg-secondary hover:border-primary/40 text-left transition-all group"
                        >
                          <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center shrink-0 group-hover:bg-primary group-hover:text-primary-foreground transition-colors">
                            <Calendar size={16} className="text-primary group-hover:text-primary-foreground" />
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-semibold text-foreground">{dayStr}</p>
                            <p className="text-xs text-muted-foreground flex items-center gap-1">
                              <Clock size={10} /> {slot.start} – {slot.end}
                            </p>
                          </div>
                          <span className="px-3 py-1.5 rounded-lg bg-primary text-primary-foreground text-xs font-medium opacity-0 group-hover:opacity-100 transition-opacity">
                            Book
                          </span>
                        </button>
                      );
                    })}
                  </div>
                );
              })()}
            </div>

            {/* Detail chips */}
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
              {property.estimatedValue && !isRental && (
                <div className="col-span-2 sm:col-span-3 p-4 rounded-xl bg-primary/5 border border-primary/10">
                  <p className="text-xs text-primary font-medium uppercase tracking-wider">{t('property.estimated')}</p>
                  <p className="font-display font-bold text-foreground text-lg mt-1">{property.estimatedValue}</p>
                </div>
              )}
              {property.listedDate && (
                <div className="p-3 rounded-xl bg-secondary flex items-center gap-3">
                  <Calendar size={16} className="text-muted-foreground shrink-0" />
                  <div>
                    <p className="text-[11px] text-muted-foreground uppercase tracking-wider font-medium">Listed</p>
                    <p className="text-sm font-semibold text-foreground">{new Date(property.listedDate).toLocaleDateString('en-AU', { day: 'numeric', month: 'short', year: 'numeric' })}</p>
                  </div>
                </div>
              )}
              {property.views > 0 && (
                <div className="p-3 rounded-xl bg-secondary flex items-center gap-3">
                  <Eye size={16} className="text-muted-foreground shrink-0" />
                  <div>
                    <p className="text-[11px] text-muted-foreground uppercase tracking-wider font-medium">Views</p>
                    <p className="text-sm font-semibold text-foreground">{property.views.toLocaleString()}</p>
                  </div>
                </div>
              )}
              <div className="p-3 rounded-xl bg-secondary flex items-center gap-3">
                <Home size={16} className="text-muted-foreground shrink-0" />
                <div>
                  <p className="text-[11px] text-muted-foreground uppercase tracking-wider font-medium">Type</p>
                  <p className="text-sm font-semibold text-foreground">{property.propertyType}</p>
                </div>
              </div>
            </div>

            {/* Description */}
            {property.description && (
              <div>
                <h2 className="font-display text-lg font-semibold text-foreground mb-3">Description</h2>
                <p className="text-muted-foreground leading-relaxed whitespace-pre-line">{property.description}</p>
              </div>
            )}

            {/* Features */}
            {property.features.length > 0 && (
              <div>
                <h2 className="font-display text-lg font-semibold text-foreground mb-3">Features</h2>
                <div className="flex flex-wrap gap-2">
                  {property.features.map(f => (
                    <span key={f} className="px-3 py-1.5 rounded-full bg-secondary text-sm font-medium text-secondary-foreground">
                      {f}
                    </span>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Sidebar */}
          <div className="space-y-4">
            {/* Investment Insights (hide for rentals) */}
            {!isRental && <InvestmentInsightsCard property={property} />}

            <div className="p-5 rounded-2xl bg-card border border-border shadow-card sticky top-4">
              <h3 className="font-display font-semibold text-foreground mb-4">{t('property.agent')}</h3>
              <Link to={property.agent.id ? `/agent/${property.agent.id}` : '#'} className="flex items-center gap-3 mb-5 group/agent cursor-pointer">
                <div className="relative">
                  <Avatar className="w-16 h-16 border-2 border-primary transition-transform group-hover/agent:scale-105">
                    <AvatarImage src={property.agent.avatarUrl} alt={property.agent.name} className="object-cover" />
                    <AvatarFallback className="text-lg font-bold">{property.agent.name[0]}</AvatarFallback>
                  </Avatar>
                  {property.agent.isSubscribed && (
                    <div className="absolute -bottom-1 -right-1 w-6 h-6 rounded-full bg-primary flex items-center justify-center">
                      <BadgeCheck size={14} className="text-primary-foreground" />
                    </div>
                  )}
                </div>
                <div className="flex-1">
                  <p className="font-display font-semibold text-foreground text-lg group-hover/agent:text-primary transition-colors">{property.agent.name}</p>
                  <p className="text-sm text-muted-foreground">{property.agent.agency}</p>
                  {property.agent.rating ? (
                    <div className="flex items-center gap-1 mt-1">
                      <Star size={14} className="fill-yellow-400 text-yellow-400" />
                      <span className="text-sm font-medium text-foreground">{property.agent.rating.toFixed(1)}</span>
                      {property.agent.reviewCount ? (
                        <span className="text-xs text-muted-foreground">({property.agent.reviewCount} review{property.agent.reviewCount !== 1 ? 's' : ''})</span>
                      ) : null}
                    </div>
                  ) : (
                    <p className="text-xs text-muted-foreground mt-1">No reviews yet</p>
                  )}
                  <span className="text-xs text-primary font-medium mt-1 inline-block">View profile →</span>
                </div>
              </Link>

              {property.agent.isSubscribed && (
                <span className="inline-block px-3 py-1 rounded-md bg-success text-success-foreground text-xs font-medium mb-4">
                  {t('agent.subscribed')}
                </span>
              )}

              <button
                onClick={handleCtaClick}
                className="w-full py-3.5 rounded-xl bg-primary text-primary-foreground font-semibold text-sm hover:bg-primary/90 transition-colors"
              >
                {ctaLabel}
              </button>

              {property.agent.phone && (
                <a
                  href={`tel:${property.agent.phone}`}
                  className="w-full mt-3 py-3 rounded-xl border border-border bg-secondary text-foreground font-medium text-sm flex items-center justify-center gap-2 hover:bg-accent transition-colors"
                >
                  📞 {property.agent.phone}
                </a>
              )}
            </div>
          </div>
        </div>
      </main>

      {/* Mobile sticky CTA */}
      {isMobile && (
        <div className="fixed bottom-16 left-0 right-0 p-4 bg-card/95 backdrop-blur-sm border-t border-border z-30">
          <button
            onClick={handleCtaClick}
            className="w-full py-3.5 rounded-xl bg-primary text-primary-foreground font-semibold text-sm"
          >
            {ctaLabel}
          </button>
        </div>
      )}

      {/* Lightbox */}
      <AnimatePresence>
        {lightboxOpen && (
          <motion.div
            className="fixed inset-0 z-[60] bg-black/95 flex items-center justify-center"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
          >
            <button onClick={() => setLightboxOpen(false)} className="absolute top-4 right-4 w-10 h-10 rounded-full bg-white/10 flex items-center justify-center text-white z-10">
              <X size={20} />
            </button>
            <button onClick={prevImage} className="absolute left-4 top-1/2 -translate-y-1/2 w-12 h-12 rounded-full bg-white/10 flex items-center justify-center text-white">
              <ChevronLeft size={24} />
            </button>
            <button onClick={nextImage} className="absolute right-4 top-1/2 -translate-y-1/2 w-12 h-12 rounded-full bg-white/10 flex items-center justify-center text-white">
              <ChevronRight size={24} />
            </button>
            <img src={images[imageIndex]} alt="" className="max-w-[90vw] max-h-[85vh] object-contain rounded-lg" />
            <div className="absolute bottom-6 left-1/2 -translate-x-1/2 text-white/80 text-sm font-medium">
              {imageIndex + 1} / {images.length}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <SiteFooter />
      <BottomNav />

      <AgentContactModal
        property={property}
        open={contactOpen}
        onClose={() => setContactOpen(false)}
      />

      {isRental && (
        <RentalEnquiryForm
          property={property}
          open={rentalEnquiryOpen}
          onClose={() => setRentalEnquiryOpen(false)}
        />
      )}

      <InspectionBookingModal
        property={property}
        inspectionTimes={inspectionTimes}
        open={inspectionBookingOpen}
        onClose={() => setInspectionBookingOpen(false)}
      />
    </div>
  );
}
