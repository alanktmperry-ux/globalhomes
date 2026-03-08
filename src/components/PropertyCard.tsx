import { motion } from 'framer-motion';
import { Bed, Bath, Car, Heart } from 'lucide-react';
import { Property } from '@/lib/types';
import { useI18n } from '@/lib/i18n';

interface PropertyCardProps {
  property: Property;
  onSelect: (property: Property) => void;
  isSaved: boolean;
  onToggleSave: (id: string) => void;
  index: number;
}

export function PropertyCard({ property, onSelect, isSaved, onToggleSave, index }: PropertyCardProps) {
  const { t } = useI18n();

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.08, duration: 0.4 }}
      className="group cursor-pointer rounded-2xl bg-card shadow-card overflow-hidden border border-border/50 transition-shadow hover:shadow-elevated"
      onClick={() => onSelect(property)}
    >
      <div className="relative aspect-[4/3] overflow-hidden">
        <img
          src={property.imageUrl}
          alt={property.title}
          className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
          loading="lazy"
        />
        <button
          onClick={e => { e.stopPropagation(); onToggleSave(property.id); }}
          className="absolute top-3 right-3 w-9 h-9 rounded-full bg-card/80 backdrop-blur-sm flex items-center justify-center transition-transform active:scale-90"
          aria-label={t('property.save')}
        >
          <Heart
            size={18}
            className={isSaved ? 'fill-destructive text-destructive' : 'text-foreground/70'}
          />
        </button>
        <div className="absolute bottom-3 left-3 px-3 py-1.5 rounded-lg bg-card/90 backdrop-blur-sm">
          <span className="font-display font-bold text-lg text-foreground">{property.priceFormatted}</span>
        </div>
      </div>

      <div className="p-4">
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
      </div>
    </motion.div>
  );
}
