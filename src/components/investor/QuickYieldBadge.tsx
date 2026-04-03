interface Props {
  price: number;
  weeklyRent: number | null;
}

export function QuickYieldBadge({ price, weeklyRent }: Props) {
  if (!weeklyRent || !price) return null;
  const grossYield = ((weeklyRent * 52) / price) * 100;

  const color = grossYield >= 5
    ? 'text-green-700 bg-green-100 dark:text-green-400 dark:bg-green-900/30'
    : grossYield >= 4
    ? 'text-blue-700 bg-blue-100 dark:text-blue-400 dark:bg-blue-900/30'
    : 'text-muted-foreground bg-secondary';

  return (
    <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-bold ${color}`}>
      {grossYield.toFixed(1)}% yield
    </span>
  );
}
