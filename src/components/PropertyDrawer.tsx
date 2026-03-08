import { motion, AnimatePresence } from 'framer-motion';
import { X, Bed, Bath, Car, Ruler, Phone, Mail, Lock, Share2, Heart, ChevronRight, MapPin } from 'lucide-react';
import { Property } from '@/lib/types';
import { useI18n } from '@/lib/i18n';
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar';

interface PropertyDrawerProps {
  property: Property | null;
  onClose: () => void;
  isSaved: boolean;
  onToggleSave: (id: string) => void;
}

export function PropertyDrawer({ property, onClose, isSaved, onToggleSave }: PropertyDrawerProps) {
  const { t } = useI18n();

  return (
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

            {/* Header image */}
            <div className="relative aspect-video overflow-hidden md:rounded-t-2xl">
              <img
                src={property.images[0]}
                alt={property.title}
                className="w-full h-full object-cover"
              />
              <button
                onClick={onClose}
                className="absolute top-4 right-4 w-9 h-9 rounded-full bg-card/80 backdrop-blur-sm flex items-center justify-center"
              >
                <X size={18} />
              </button>
              <div className="absolute bottom-4 left-4 flex gap-2">
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

            <div className="p-5 space-y-5">
              {/* Price and title */}
              <div>
                <p className="font-display text-2xl font-bold text-foreground">{property.priceFormatted}</p>
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
                <div className="flex items-center gap-3 mb-3">
                  <Avatar className="w-12 h-12">
                    <AvatarImage src={property.agent.avatarUrl} alt={property.agent.name} />
                    <AvatarFallback>{property.agent.name[0]}</AvatarFallback>
                  </Avatar>
                  <div>
                    <p className="font-display font-semibold text-foreground">{property.agent.name}</p>
                    <p className="text-sm text-muted-foreground">{property.agent.agency}</p>
                  </div>
                  {property.agent.isSubscribed && (
                    <span className="ml-auto px-2 py-0.5 rounded-md bg-success text-success-foreground text-xs font-medium">
                      {t('agent.subscribed')}
                    </span>
                  )}
                </div>

                {property.agent.isSubscribed ? (
                  <div className="space-y-2">
                    <a
                      href={`tel:${property.agent.phone}`}
                      className="flex items-center justify-between w-full p-3 rounded-xl bg-primary text-primary-foreground font-medium text-sm transition-transform active:scale-[0.98]"
                    >
                      <span className="flex items-center gap-2"><Phone size={16} /> {property.agent.phone}</span>
                      <ChevronRight size={16} />
                    </a>
                    <a
                      href={`mailto:${property.agent.email}`}
                      className="flex items-center justify-between w-full p-3 rounded-xl bg-card border border-border text-foreground font-medium text-sm transition-transform active:scale-[0.98]"
                    >
                      <span className="flex items-center gap-2"><Mail size={16} /> {property.agent.email}</span>
                      <ChevronRight size={16} />
                    </a>
                  </div>
                ) : (
                  <div className="relative">
                    <div className="space-y-2 blur-sm pointer-events-none select-none">
                      <div className="flex items-center gap-2 p-3 rounded-xl bg-muted text-muted-foreground text-sm">
                        <Phone size={16} /> +61 400 *** ***
                      </div>
                      <div className="flex items-center gap-2 p-3 rounded-xl bg-muted text-muted-foreground text-sm">
                        <Mail size={16} /> agent@*****.com
                      </div>
                    </div>
                    <div className="absolute inset-0 flex flex-col items-center justify-center">
                      <Lock size={20} className="text-muted-foreground mb-2" />
                      <p className="text-sm font-medium text-muted-foreground text-center">
                        {t('property.subscribeUnlock')}
                      </p>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
