import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Bed, Bath, Car, Ruler, Share2, Heart, MapPin, ChevronLeft, ChevronRight } from 'lucide-react';
import { Property } from '@/lib/types';
import { useI18n } from '@/lib/i18n';
import { useCurrency } from '@/lib/CurrencyContext';
import { AgentContactModal } from './AgentContactModal';
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar';
import { BadgeCheck, Star } from 'lucide-react';

interface PropertyDrawerProps {
  property: Property | null;
  onClose: () => void;
  isSaved: boolean;
  onToggleSave: (id: string) => void;
}

export function PropertyDrawer({ property, onClose, isSaved, onToggleSave }: PropertyDrawerProps) {
  const { t } = useI18n();
  const { formatPrice, currency } = useCurrency();
  const [imageIndex, setImageIndex] = useState(0);
  const [contactOpen, setContactOpen] = useState(false);

  // Reset image index when property changes
  const prevImage = () => setImageIndex(i => (i > 0 ? i - 1 : (property?.images.length || 1) - 1));
  const nextImage = () => setImageIndex(i => (i < (property?.images.length || 1) - 1 ? i + 1 : 0));

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
              className="fixed inset-x-0 bottom-0 z-50 max-h-[92vh] bg-card rounded-t-3xl shadow-drawer overflow-y-auto md:inset-x-auto md:left-1/2 md:top-1/2 md:bottom-auto md:-translate-x-1/2 md:-translate-y-1/2 md:w-full md:max-w-lg md:rounded-2xl md:max-h-[85vh]"
              initial={{ y: '100%' }}
              animate={{ y: 0 }}
              exit={{ y: '100%' }}
              transition={{ type: 'spring', damping: 28, stiffness: 300 }}
            >
              {/* Drag indicator */}
              <div className="sticky top-0 z-10 flex justify-center pt-3 pb-1 bg-card rounded-t-3xl md:hidden">
                <div className="w-10 h-1 rounded-full bg-border" />
              </div>

              {/* Image gallery */}
              <div className="relative aspect-video overflow-hidden md:rounded-t-2xl">
                <AnimatePresence mode="wait">
                  <motion.img
                    key={imageIndex}
                    src={property.images[imageIndex] || property.imageUrl}
                    alt={`${property.title} - Photo ${imageIndex + 1}`}
                    className="w-full h-full object-cover"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    transition={{ duration: 0.2 }}
                  />
                </AnimatePresence>

                {/* Gallery controls */}
                {property.images.length > 1 && (
                  <>
                    <button onClick={prevImage} className="absolute left-3 top-1/2 -translate-y-1/2 w-8 h-8 rounded-full bg-card/80 backdrop-blur-sm flex items-center justify-center hover:bg-card transition-colors">
                      <ChevronLeft size={16} />
                    </button>
                    <button onClick={nextImage} className="absolute right-3 top-1/2 -translate-y-1/2 w-8 h-8 rounded-full bg-card/80 backdrop-blur-sm flex items-center justify-center hover:bg-card transition-colors">
                      <ChevronRight size={16} />
                    </button>
                  </>
                )}

                {/* Image counter */}
                <div className="absolute bottom-3 right-3 px-2.5 py-1 rounded-full bg-card/80 backdrop-blur-sm text-xs font-medium text-foreground">
                  {imageIndex + 1}/{property.images.length || 1}
                </div>

                {/* Close + actions */}
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
                  <button className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-card/80 backdrop-blur-sm text-sm font-medium">
                    <Share2 size={14} />
                    {t('property.share')}
                  </button>
                </div>
              </div>

              {/* Thumbnail strip */}
              {property.images.length > 1 && (
                <div className="flex gap-1.5 p-3 overflow-x-auto">
                  {property.images.map((img, i) => (
                    <button
                      key={i}
                      onClick={() => setImageIndex(i)}
                      className={`shrink-0 w-16 h-12 rounded-lg overflow-hidden border-2 transition-colors ${
                        i === imageIndex ? 'border-primary' : 'border-transparent opacity-60 hover:opacity-100'
                      }`}
                    >
                      <img src={img} alt="" className="w-full h-full object-cover" />
                    </button>
                  ))}
                </div>
              )}

              <div className="p-5 space-y-5">
                {/* Price and title */}
                <div>
                  <p className="font-display text-2xl font-bold text-foreground">{formatPrice(property.price)}</p>
                  {currency.code !== 'AUD' && (
                    <p className="text-xs text-muted-foreground">{property.priceFormatted} AUD</p>
                  )}
                  <h2 className="font-display text-lg font-semibold text-foreground mt-1">{property.title}</h2>
                  <p className="flex items-center gap-1 text-sm text-muted-foreground mt-1">
                    <MapPin size={14} />
                    {property.address}, {property.suburb}, {property.state}
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
                <div className="p-4 rounded-xl bg-primary/5 border border-primary/10">
                  <p className="text-xs text-primary font-medium uppercase tracking-wider">{t('property.estimated')}</p>
                  <p className="font-display font-bold text-foreground text-lg mt-1">{property.estimatedValue}</p>
                </div>

                {/* Description */}
                <div>
                  <h3 className="font-display font-semibold text-foreground mb-2">{t('property.description')}</h3>
                  <p className="text-sm text-muted-foreground leading-relaxed">{property.description}</p>
                </div>

                {/* Features */}
                <div className="flex flex-wrap gap-2">
                  {property.features.map(f => (
                    <span key={f} className="px-3 py-1 rounded-full bg-secondary text-xs font-medium text-secondary-foreground">
                      {f}
                    </span>
                  ))}
                </div>

                {/* Agent section */}
                <div className="p-4 rounded-2xl bg-secondary/50 border border-border">
                  <h3 className="font-display font-semibold text-foreground mb-3">{t('property.agent')}</h3>
                  <div className="flex items-center gap-3 mb-4">
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
                      <div className="flex items-center gap-1 mt-0.5">
                        <Star size={12} className="fill-yellow-400 text-yellow-400" />
                        <span className="text-xs font-medium text-foreground">4.8</span>
                      </div>
                    </div>
                    {property.agent.isSubscribed && (
                      <span className="px-2 py-0.5 rounded-md bg-success text-success-foreground text-xs font-medium">
                        {t('agent.subscribed')}
                      </span>
                    )}
                  </div>

                  <button
                    onClick={() => setContactOpen(true)}
                    className="w-full py-3 rounded-xl bg-primary text-primary-foreground font-medium text-sm hover:bg-primary/90 transition-colors"
                  >
                    {t('property.contact')}
                  </button>
                </div>
              </div>

              {/* Sticky bottom bar */}
              <div className="sticky bottom-0 p-4 bg-card border-t border-border">
                <button
                  onClick={() => setContactOpen(true)}
                  className="w-full py-3 rounded-xl bg-primary text-primary-foreground font-medium text-sm hover:bg-primary/90 transition-colors"
                >
                  {t('property.contact')}
                </button>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>

      {property && (
        <AgentContactModal
          property={property}
          open={contactOpen}
          onClose={() => setContactOpen(false)}
        />
      )}
    </>
  );
}
