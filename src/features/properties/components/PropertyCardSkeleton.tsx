export function PropertyCardSkeleton() {
  return (
    <div className="rounded-2xl bg-card shadow-card overflow-hidden border border-border/50 animate-pulse">
      <div className="aspect-[4/3] bg-muted" />
      <div className="p-4 space-y-3">
        <div className="h-4 bg-muted rounded w-3/4" />
        <div className="h-3 bg-muted rounded w-1/2" />
        <div className="flex gap-4">
          <div className="h-3 bg-muted rounded w-12" />
          <div className="h-3 bg-muted rounded w-12" />
          <div className="h-3 bg-muted rounded w-12" />
        </div>
      </div>
    </div>
  );
}
