import { Check } from 'lucide-react';
import { cn } from '@/lib/utils';

interface Props {
  current: number;
  total: number;
  labels?: string[];
}

export function HaloStepIndicator({ current, total, labels }: Props) {
  return (
    <div className="w-full">
      <p className="text-sm text-muted-foreground mb-2">
        Step {current} of {total}
      </p>
      <div className="flex items-center gap-2">
        {Array.from({ length: total }).map((_, i) => {
          const stepNum = i + 1;
          const isDone = stepNum < current;
          const isActive = stepNum === current;
          return (
            <div key={i} className="flex-1 flex items-center gap-2">
              <div
                className={cn(
                  'flex items-center justify-center w-8 h-8 rounded-full text-xs font-semibold shrink-0 transition-colors',
                  isDone && 'bg-primary text-primary-foreground',
                  isActive && 'bg-primary text-primary-foreground ring-4 ring-primary/20',
                  !isDone && !isActive && 'bg-muted text-muted-foreground',
                )}
              >
                {isDone ? <Check size={14} /> : stepNum}
              </div>
              {i < total - 1 && (
                <div className={cn('flex-1 h-1 rounded-full', stepNum < current ? 'bg-primary' : 'bg-muted')} />
              )}
            </div>
          );
        })}
      </div>
      {labels && (
        <p className="text-base font-semibold mt-3">{labels[current - 1]}</p>
      )}
    </div>
  );
}
