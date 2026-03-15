import { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Bed, Bath, Car, Heart, BadgeCheck, Star, Sparkles, Shield, ShieldCheck, Eye, Users, TrendingUp, UserCheck } from 'lucide-react';
import { Property, PropertyStatus } from '@/lib/types';
import { useI18n } from '@/lib/i18n';
import { useCurrency } from '@/lib/CurrencyContext';
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar';
import { AgentContactModal } from '@/components/AgentContactModal';

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
  const { formatPrice, currency } = useCurrency();
  const isRental = property.listingType === 'rent' || property.listingType === 'rental' || property.price < 50000;
  const [contactOpen, setContactOpen] = useState(false);
  const navigate = useNavigate();

  // Seeded pseudo-random for consistent demo numbers per property
  const socialProof = useMemo(() => {
    const hash = property.id.split('').reduce((a, c) => a + c.charCodeAt(0), 0);
    const viewsToday = 5 + (hash % 16); // 5–20
    const savedByCount = 3 + (hash % 10); // 3–12
    const rentedNearby = 1 + (hash % 5);  // 1–5
    return { viewsToday, savedByCount, rentedNearby };
  }, [property.id]);

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

  return (
    <>
      <motion.div
        role="article"
        aria-label={`${property.title} — ${formatPrice(property.price, property.listingType ?? undefined)}`}
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: index * 0.08, duration: 0.4 }}
        className="group cursor-pointer rounded-2xl bg-card shadow-card overflow-hidden border border-border/50 transition-all duration-300 hover:shadow-elevated hover:scale-[1.03]"
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
              ★ Featured
            </span>
          )}
          <button
            onClick={e => { e.stopPropagation(); onToggleSave(property.id); }}
            className="absolute top-3 right-3 w-9 h-9 rounded-full bg-card/80 backdrop-blur-sm flex items-center justify-center transition-transform active:scale-90"
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
              {isRental ? 'Per Week' : 'For Sale'}
            </span>
          </div>
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
              <Bed size={15} /> {property.beds}
            </span>
            <span className="flex items-center gap-1.5">
              <Bath size={15} /> {property.baths}
            </span>
            <span className="flex items-center gap-1.5">
              <Car size={15} /> {property.parking}
            </span>
            <span className="ml-auto text-xs bg-secondary px-2 py-0.5 rounded-md font-medium">
              {property.propertyType}
            </span>
          </div>

          {/* AI annotation */}
          {property.aiSummary && (
            <p className="mt-2 flex items-start gap-1.5 text-xs text-primary/80 leading-snug">
              <Sparkles size={12} className="shrink-0 mt-0.5" />
              <span className="line-clamp-1">{property.aiSummary}</span>
            </p>
          )}

          {/* Social proof badges */}
          <div className="mt-2.5 flex flex-wrap items-center gap-2">
            <span className="inline-flex items-center gap-1 text-[11px] font-medium text-muted-foreground bg-secondary/70 px-2 py-0.5 rounded-full">
              <Eye size={11} className="animate-[pulse_2s_cubic-bezier(0.4,0,0.6,1)_infinite] text-primary" />
              {socialProof.viewsToday} viewed today
            </span>
            <span className="inline-flex items-center gap-1 text-[11px] font-medium text-muted-foreground bg-secondary/70 px-2 py-0.5 rounded-full">
              <Users size={11} className="text-destructive/70" />
              Saved by {socialProof.savedByCount}
            </span>
            {isRental && (
              <span className="inline-flex items-center gap-1 text-[11px] font-medium text-accent-foreground bg-accent/50 px-2 py-0.5 rounded-full">
                <TrendingUp size={11} />
                {socialProof.rentedNearby} similar rented this week
              </span>
            )}
          </div>
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
                {t('property.contact')}
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
