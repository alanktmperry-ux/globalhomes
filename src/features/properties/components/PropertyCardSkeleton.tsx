import { cn } from '@/lib/utils';

export function PropertyCardSkeleton({ className }: { className?: string }) {
  return (
    <div className={cn("rounded-2xl bg-card shadow-card overflow-hidden border border-border/50", className)}>
      {/* Image placeholder — matches aspect-[4/3] of real card */}
      <div className="relative aspect-[4/3] bg-muted animate-pulse">
        {/* Shimmer gradient overlay */}
        <div className="absolute inset-0 bg-gradient-to-r from-transparent via-background/20 to-transparent animate-[shimmer_2s_infinite]" />
        {/* Status badge placeholder */}
        <div className="absolute top-3 left-3 h-5 w-20 rounded-full bg-muted-foreground/10" />
        {/* Heart button placeholder */}
        <div className="absolute top-3 right-3 w-9 h-9 rounded-full bg-muted-foreground/10" />
        {/* Price + listing type badge */}
        <div className="absolute bottom-3 left-3 flex items-center gap-1.5">
          <div className="h-9 w-28 rounded-lg bg-muted-foreground/15" />
          <div className="h-5 w-16 rounded-full bg-muted-foreground/10" />
        </div>
      </div>

      {/* Property info — matches real card padding & spacing */}
      <div className="p-4 space-y-3">
        {/* Title */}
        <div className="h-5 bg-muted rounded-md w-3/4 animate-pulse" />
        {/* Address */}
        <div className="h-3.5 bg-muted rounded-md w-5/6 animate-pulse" />

        {/* Bed / Bath / Car / Type row */}
        <div className="flex items-center gap-4">
          <div className="h-4 w-10 bg-muted rounded animate-pulse" />
          <div className="h-4 w-10 bg-muted rounded animate-pulse" />
          <div className="h-4 w-10 bg-muted rounded animate-pulse" />
          <div className="ml-auto h-5 w-16 bg-muted rounded-md animate-pulse" />
        </div>

        {/* AI summary line */}
        <div className="flex items-center gap-1.5">
          <div className="h-3 w-3 bg-primary/20 rounded-full animate-pulse" />
          <div className="h-3 bg-muted rounded w-2/3 animate-pulse" />
        </div>

        {/* Social proof badges */}
        <div className="flex items-center gap-2">
          <div className="h-5 w-24 bg-muted rounded-full animate-pulse" />
          <div className="h-5 w-20 bg-muted rounded-full animate-pulse" />
        </div>
      </div>

      {/* Agent section */}
      <div className="px-4 pb-4 pt-0">
        <div className="border-t border-border/50 pt-3">
          <div className="flex items-center gap-3">
            {/* Avatar */}
            <div className="w-10 h-10 rounded-full bg-muted animate-pulse" />
            {/* Name + agency */}
            <div className="flex-1 space-y-1.5">
              <div className="h-3.5 bg-muted rounded w-24 animate-pulse" />
              <div className="h-3 bg-muted rounded w-32 animate-pulse" />
            </div>
            {/* Contact button */}
            <div className="h-8 w-20 rounded-full bg-primary/20 animate-pulse" />
          </div>
        </div>
      </div>
    </div>
  );
}

export function MapSkeleton() {
  return (
    <div className="relative w-full h-full bg-muted/60 rounded-xl overflow-hidden flex items-center justify-center">
      {/* Faux map grid lines */}
      <div className="absolute inset-0 opacity-[0.04]" style={{
        backgroundImage: 'linear-gradient(hsl(var(--foreground)) 1px, transparent 1px), linear-gradient(90deg, hsl(var(--foreground)) 1px, transparent 1px)',
        backgroundSize: '60px 60px',
      }} />

      {/* Fake map pins */}
      <div className="absolute top-[20%] left-[30%] w-3 h-3 rounded-full bg-primary/30 animate-pulse" />
      <div className="absolute top-[45%] left-[55%] w-3 h-3 rounded-full bg-primary/30 animate-pulse [animation-delay:300ms]" />
      <div className="absolute top-[35%] left-[70%] w-3 h-3 rounded-full bg-primary/30 animate-pulse [animation-delay:600ms]" />
      <div className="absolute top-[60%] left-[40%] w-3 h-3 rounded-full bg-primary/30 animate-pulse [animation-delay:900ms]" />
      <div className="absolute top-[25%] left-[50%] w-3 h-3 rounded-full bg-primary/30 animate-pulse [animation-delay:200ms]" />

      {/* Center label */}
      <div className="flex flex-col items-center gap-2 z-10">
        <div className="w-8 h-8 rounded-full bg-primary/15 flex items-center justify-center animate-pulse">
          <svg className="w-4 h-4 text-primary/50" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z" />
            <circle cx="12" cy="10" r="3" />
          </svg>
        </div>
        <p className="text-sm font-display font-medium text-muted-foreground animate-pulse">
          Locating properties…
        </p>
      </div>
    </div>
  );
}
