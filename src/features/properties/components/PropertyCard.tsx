import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Bed, Bath, Car, Heart, BadgeCheck, Star, Sparkles, Shield, ShieldCheck, Eye, UserCheck, CalendarDays, PawPrint, Sofa, Globe2, AlertTriangle } from 'lucide-react';
import { TourBadge } from '@/components/tour/TourBadge';
import { OffMarketBadge } from '@/features/offmarket/components/OffMarketBadge';
import { Property, PropertyStatus } from '@/shared/lib/types';
import { useI18n } from '@/shared/lib/i18n';
import { useCurrency } from '@/shared/lib/CurrencyContext';
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar';
import { AgentContactModal } from '@/features/agents/components/AgentContactModal';
import { useInvestorMode } from '@/context/InvestorModeContext';
import { QuickYieldBadge } from '@/components/investor/QuickYieldBadge';
import { useListingTranslation } from '@/features/properties/hooks/useListingTranslation';

function VerificationBadge({ level }: { level?: string }) {
  if (!level || level === 'email') return null;
  const config: Record<string, { icon: typeof Shield; className: string; label: string }> = {
    phone: { icon: Shield, className: 'bg-blue-500', label: 'Phone Verified' },
    license: { icon: ShieldCheck, className: 'bg-emerald-500', label: 'Licensed' },
    top_performer: { icon: ShieldCheck, className: 'bg-amber-500', label: 'Top Performer' },
  };
  const c = config[level] || config.phone;
  return (
    <div className={`absolute -bottom-0.5 -right-0.5 w-4 h-4 rounded-full ${c.className} flex items-center justify-center`} title={c.label}>
      <c.icon size={10} className="text-white" />
    </div>
  );
}

export interface CollabReaction {
  property_id: string;
  user_id: string;
  emoji: string;
}

interface PropertyCardProps {
  property: Property;
  onSelect: (property: Property) => void;
  isSaved: boolean;
  onToggleSave: (id: string) => void;
  index: number;
  // Collab props (optional)
  isCollab?: boolean;
  collabReactions?: CollabReaction[];
  onToggleReaction?: (propertyId: string, emoji: string) => void;
  partnerViewed?: boolean;
  currentUserId?: string;
}

const COLLAB_EMOJIS = ['👍', '👎', '🔥'] as const;

export function PropertyCard({ property, onSelect, isSaved, onToggleSave, index, isCollab, collabReactions = [], onToggleReaction, partnerViewed, currentUserId }: PropertyCardProps) {
  const { t } = useI18n();
  const { formatPrice, currency, listingMode } = useCurrency();
  const { investorMode } = useInvestorMode();
  const isRental = listingMode === 'rent' || property.listingType === 'rent' || property.listingType === 'rental' || property.price < 50000;
  const [contactOpen, setContactOpen] = useState(false);
  const navigate = useNavigate();

  // Rental-specific feature detection
  const features = property.features || [];
  const featuresLower = features.map(f => f.toLowerCase());
  const isPetFriendly = featuresLower.some(f => f.includes('pet') || f.includes('dog') || f.includes('cat'));
  const isFurnished = featuresLower.some(f => f.includes('furnished'));

  const realViews = typeof property.views === 'number' && property.views > 0 ? property.views : null;

  const statusConfig: Record<PropertyStatus, { label: string; className: string } | null> = {
    'off-market': { label: 'Off-Market', className: 'bg-amber-500/90 text-white' },
    'coming-soon': { label: 'Coming Soon', className: 'bg-blue-500/90 text-white' },
    'new': { label: 'New', className: 'bg-emerald-500/90 text-white' },
    'listed': null,
  };

  const badge = property.status ? statusConfig[property.status] : null;
  const isFeatured = property.agent.isSubscribed;
  const agentRating = property.agent.rating && property.agent.rating > 0 ? property.agent.rating : null;
  const reviewCount = property.agent.reviewCount || 0;

  // FIRB eligibility heuristic: new builds, off-the-plan & apartments are generally
  // eligible for foreign buyers; established dwellings need verification.
  const ptype = (property.propertyType || '').toLowerCase();
  const isNewOrOffPlan =
    property.status === 'new' ||
    ptype.includes('off-the-plan') ||
    ptype.includes('off the plan') ||
    ptype.includes('new');
  const isApartment = ptype.includes('apartment') || ptype.includes('unit');
  const firbEligible = !isRental && (isNewOrOffPlan || isApartment);
  const firbCheckRequired = !isRental && !firbEligible;

  return (
    <>
      <motion.div
        role="article"
        aria-label={`${property.title} — ${formatPrice(property.price, property.listingType ?? undefined)}`}
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: index * 0.08, duration: 0.4 }}
        className="group cursor-pointer rounded-2xl bg-card shadow-card overflow-hidden border border-border/50 transition-all duration-300 hover:shadow-elevated active:scale-[0.99]"
      >
        {/* Image */}
        <div className="relative aspect-[4/3] overflow-hidden" onClick={() => { onSelect(property); navigate(`/property/${property.id}`); }}>
          <img
            src={property.imageUrl}
            alt={property.title}
            className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
            loading="lazy"
          />
          {badge && (
            <span className={`absolute top-3 left-3 px-2.5 py-1 rounded-full text-[11px] font-bold tracking-wide uppercase shadow-sm ${badge.className}`}>
              {badge.label}
            </span>
          )}
          {isFeatured && (
            <span className="absolute top-3 left-3 mt-0 px-2.5 py-1 rounded-full text-[11px] font-bold tracking-wide uppercase shadow-sm bg-primary/90 text-primary-foreground" style={badge ? { marginTop: 28 } : undefined}>
              ★ {t('property.featured')}
            </span>
          )}
          <button
            onClick={e => { e.stopPropagation(); onToggleSave(property.id); }}
            className="absolute top-3 right-3 w-11 h-11 rounded-full bg-card/80 backdrop-blur-sm flex items-center justify-center transition-transform active:scale-90"
            aria-label={isSaved ? `Remove ${property.title} from saved` : `Save ${property.title}`}
            aria-pressed={isSaved}
          >
            <Heart
              size={18}
              className={isSaved ? 'fill-destructive text-destructive' : 'text-foreground/70'}
            />
          </button>
          <div className="absolute bottom-3 left-3 flex items-center gap-1.5">
            <div className="px-3 py-1.5 rounded-lg bg-card/90 backdrop-blur-sm">
              <span className="font-display font-bold text-lg text-foreground">{formatPrice(property.price, property.listingType ?? undefined)}</span>
              {currency.code !== 'AUD' && (
                <span className="block text-[10px] text-muted-foreground">{property.priceFormatted} AUD</span>
              )}
            </div>
            <span className={`px-2 py-1 rounded-full text-[10px] font-bold uppercase tracking-wide shadow-sm ${
              isRental
                ? 'bg-emerald-500/90 text-white'
                : 'bg-blue-500/90 text-white'
            }`}>
              {isRental ? t('property.perWeek') : t('listing.forsale')}
            </span>
          </div>
          <TourBadge
            virtualTourUrl={(property as any).virtualTourUrl ?? (property as any).virtual_tour_url ?? null}
            videoUrl={(property as any).videoUrl ?? (property as any).video_url ?? null}
          />
          {(property as any).listing_mode && (property as any).listing_mode !== 'public' && (
            <div className="absolute top-3 left-3" style={badge ? { marginTop: 28 } : undefined}>
              <OffMarketBadge mode={(property as any).listing_mode} closeDate={(property as any).eoi_close_date} />
            </div>
          )}
        </div>

        {/* Property info */}
        <div className="p-4" onClick={() => { onSelect(property); navigate(`/property/${property.id}`); }}>
          <h3 className="font-display font-semibold text-foreground text-base leading-tight mb-1 line-clamp-1">
            {property.title}
          </h3>
          <p className="text-sm text-muted-foreground mb-3">
            {property.address}, {property.suburb}, {property.state}
          </p>

          <div className="flex items-center gap-4 text-sm text-muted-foreground">
            <span className="flex items-center gap-1.5">
              <Bed size={15} /> {property.beds} {t('card.beds')}
            </span>
            <span className="flex items-center gap-1.5">
              <Bath size={15} /> {property.baths} {t('card.bath')}
            </span>
            <span className="flex items-center gap-1.5">
              <Car size={15} /> {property.parking} {t('card.car')}
            </span>
            {investorMode && !isRental && (property as any).estimatedWeeklyRent ? (
              <QuickYieldBadge price={property.price} weeklyRent={(property as any).estimatedWeeklyRent} />
            ) : (
              <span className="ml-auto text-xs bg-secondary px-2 py-0.5 rounded-md font-medium">
                {property.propertyType}
              </span>
            )}
          </div>

          {/* Rental-specific row */}
          {isRental && (
            <div className="mt-2 flex flex-wrap items-center gap-2">
              <span className="inline-flex items-center gap-1 text-[11px] font-medium text-muted-foreground bg-secondary/70 px-2 py-0.5 rounded-full">
                <CalendarDays size={11} />
                {t('filter.availableNow')}
              </span>
              {isFurnished && (
                <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-primary bg-primary/10 px-2 py-0.5 rounded-full">
                  <Sofa size={11} />
                  {t('filter.furnished')}
                </span>
              )}
              {isPetFriendly && (
                <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-emerald-600 bg-emerald-500/10 px-2 py-0.5 rounded-full">
                  <PawPrint size={11} />
                  {t('filter.petFriendly')}
                </span>
              )}
            </div>
          )}

          {/* Real views count */}
          {realViews && (
            <div className="mt-2 flex items-center gap-1.5 text-[11px] font-medium text-muted-foreground">
              <Eye size={12} />
              <span>{realViews} views</span>
            </div>
          )}

          {property.aiSummary && (
            <p className="mt-2 flex items-start gap-1.5 text-xs text-primary/80 leading-snug">
              <Sparkles size={12} className="shrink-0 mt-0.5" />
              <span className="line-clamp-1">{property.aiSummary}</span>
            </p>
          )}

          {/* FIRB foreign-buyer eligibility hint (sale only) */}
          {firbEligible && (
            <div className="mt-2">
              <span
                className="inline-flex items-center gap-1 text-[11px] font-semibold text-emerald-700 bg-emerald-500/10 px-2 py-0.5 rounded-full"
                title="Generally eligible for foreign buyers — verify on firb.gov.au"
              >
                <Globe2 size={11} />
                {t('firb.eligibleBadge')}
              </span>
            </div>
          )}
          {firbCheckRequired && (
            <div className="mt-2">
              <span
                className="inline-flex items-center gap-1 text-[11px] font-semibold text-amber-700 bg-amber-500/10 px-2 py-0.5 rounded-full"
                title="Established dwelling — foreign buyers must check FIRB eligibility"
              >
                <AlertTriangle size={11} />
                {t('firb.checkBadge')}
              </span>
            </div>
          )}

          {/* Collab: partner viewed indicator */}
          {isCollab && partnerViewed && (
            <div className="mt-2 flex items-center gap-1.5 text-[11px] font-medium text-primary animate-fade-in">
              <UserCheck size={12} />
              <span>Partner viewed this</span>
            </div>
          )}

          {/* Collab: emoji reactions */}
          {isCollab && onToggleReaction && (
            <div className="mt-2 flex items-center gap-1.5 animate-fade-in">
              {COLLAB_EMOJIS.map((emoji) => {
                const count = collabReactions.filter(r => r.emoji === emoji).length;
                const iMine = currentUserId ? collabReactions.some(r => r.emoji === emoji && r.user_id === currentUserId) : false;
                return (
                  <button
                    key={emoji}
                    onClick={(e) => { e.stopPropagation(); onToggleReaction(property.id, emoji); }}
                    className={`flex items-center gap-1 px-2 py-1 rounded-full text-xs border transition-all ${
                      iMine
                        ? 'border-primary bg-primary/10 text-primary font-semibold scale-105'
                        : 'border-border bg-secondary/50 text-muted-foreground hover:bg-accent'
                    }`}
                  >
                    <span>{emoji}</span>
                    {count > 0 && <span className="text-[10px]">{count}</span>}
                  </button>
                );
              })}
            </div>
          )}
        </div>

        {/* Agent section */}
        <div className="px-4 pb-4 pt-0">
          <div className="border-t border-border/50 pt-3">
            <div className="flex items-center gap-3">
              <div className="relative group/agent">
                <Avatar className="w-10 h-10 border-2 border-primary transition-transform group-hover/agent:scale-110">
                  <AvatarImage src={property.agent.avatarUrl} alt={property.agent.name} className="object-cover" />
                  <AvatarFallback className="text-xs font-bold">{property.agent.name[0]}</AvatarFallback>
                </Avatar>
                <VerificationBadge level={property.agent.verificationLevel} />
                {!property.agent.verificationLevel && property.agent.isSubscribed && (
                  <div className="absolute -bottom-0.5 -right-0.5 w-4 h-4 rounded-full bg-primary flex items-center justify-center">
                    <BadgeCheck size={10} className="text-primary-foreground" />
                  </div>
                )}
              </div>
              <div className="flex-1 min-w-0">
                <p className="font-display font-semibold text-foreground text-sm truncate">{property.agent.name}</p>
                <p className="text-xs text-muted-foreground truncate">{property.agent.agency}</p>
              </div>
              {agentRating ? (
                <div className="flex items-center gap-1 mr-2">
                  <Star size={12} className="fill-yellow-400 text-yellow-400" />
                  <span className="text-xs font-medium text-foreground">{agentRating.toFixed(1)}</span>
                  {reviewCount > 0 && <span className="text-[10px] text-muted-foreground">({reviewCount})</span>}
                </div>
              ) : null}
              <button
                onClick={(e) => { e.stopPropagation(); setContactOpen(true); }}
                className="px-4 py-2 rounded-full bg-primary text-primary-foreground text-xs font-medium hover:bg-primary/90 transition-colors whitespace-nowrap"
              >
                {isRental ? t('property.enquire') : t('property.contact')}
              </button>
            </div>
          </div>
        </div>
      </motion.div>

      <AgentContactModal
        property={property}
        open={contactOpen}
        onClose={() => setContactOpen(false)}
      />
    </>
  );
}
