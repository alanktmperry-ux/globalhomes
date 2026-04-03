interface Props {
  suburb: string;
  state: string;
  stats: {
    count: number;
    median_price: number | null;
    avg_days_on_market: number | null;
    min_price: number | null;
    max_price: number | null;
  } | null;
  bedrooms?: number;
}

function formatPrice(n: number | null) {
  if (!n) return 'N/A';
  if (n >= 1_000_000) return `$${(n / 1_000_000).toFixed(2)}M`;
  return `$${(n / 1000).toFixed(0)}k`;
}

export function ComparableSalesSEOBlock({ suburb, state, stats, bedrooms }: Props) {
  if (!stats || stats.count === 0) return null;

  const bedroomLabel = bedrooms ? `${bedrooms}-bedroom ` : '';
  const stateLabel = state.toUpperCase();

  return (
    <div className="mt-8">
      <h2 className="font-display text-lg font-semibold text-foreground mb-3">
        Recent {bedroomLabel}property sales in {suburb}, {stateLabel}
      </h2>
      <p className="text-sm text-muted-foreground leading-relaxed">
        In the last 12 months, {stats.count} {bedroomLabel}properties have
        sold in {suburb}, {stateLabel}, with a median sale price of{' '}
        {formatPrice(stats.median_price)}.
        {stats.min_price && stats.max_price && (
          <> Sales ranged from {formatPrice(stats.min_price)} to {formatPrice(stats.max_price)}.</>
        )}
        {stats.avg_days_on_market && (
          <> Properties typically sold within {Math.round(stats.avg_days_on_market)} days of listing.</>
        )}
      </p>
    </div>
  );
}
