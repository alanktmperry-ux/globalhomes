import { Star } from 'lucide-react';
import { cn } from '@/lib/utils';

interface Props {
  rating: number;
  size?: 'sm' | 'md' | 'lg';
  interactive?: boolean;
  onChange?: (rating: number) => void;
  className?: string;
}

const SIZES = { sm: 12, md: 16, lg: 20 };

export function StarRating({ rating, size = 'md', interactive = false, onChange, className }: Props) {
  const px = SIZES[size];

  return (
    <div className={cn('flex gap-0.5', className)}>
      {[1, 2, 3, 4, 5].map(i => {
        const filled = i <= Math.floor(rating);
        const partial = !filled && i === Math.ceil(rating) && rating % 1 > 0;
        const pct = partial ? Math.round((rating % 1) * 100) : 0;

        return (
          <button
            key={i}
            type="button"
            disabled={!interactive}
            onClick={() => interactive && onChange?.(i)}
            onMouseEnter={undefined}
            className={cn(
              'relative',
              interactive && 'cursor-pointer hover:scale-110 transition-transform',
              !interactive && 'cursor-default'
            )}
          >
            {/* Empty star */}
            <Star
              size={px}
              className="text-muted-foreground/30"
              fill="currentColor"
            />
            {/* Filled overlay */}
            {(filled || partial) && (
              <Star
                size={px}
                className="absolute inset-0 text-amber-400"
                fill="currentColor"
                style={partial ? { clipPath: `inset(0 ${100 - pct}% 0 0)` } : undefined}
              />
            )}
          </button>
        );
      })}
    </div>
  );
}
