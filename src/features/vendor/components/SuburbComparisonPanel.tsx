import { TrendingUp, TrendingDown, Minus } from 'lucide-react';
import type { PropertyPerformance, SuburbBenchmarks } from '../types';

interface Props {
  performance: PropertyPerformance;
  benchmarks: SuburbBenchmarks;
}

export function SuburbComparisonPanel({ performance, benchmarks }: Props) {
  const domDelta = benchmarks.avg_days_on_market != null
    ? performance.days_on_market - benchmarks.avg_days_on_market
    : null;

  const first7Views = performance.daily_views?.slice(0, 7).reduce((s, d) => s + d.views, 0) ?? 0;
  const showViewsComparison = performance.days_on_market <= 14;

  const competition = benchmarks.total_similar_active ?? 0;

  return (
    <div className="bg-card rounded-xl border border-border p-5">
      <h3 className="text-sm font-semibold text-foreground mb-1">
        How you compare to {benchmarks.suburb} {/* propertyType */}listings
      </h3>
      <p className="text-xs text-muted-foreground mb-4">Based on listings in the past 6 months</p>

      <div className="space-y-4">
        {/* Days on Market */}
        <div className="flex items-center justify-between">
          <div>
            <p className="text-xs text-muted-foreground">Days on Market</p>
            <p className="text-lg font-bold text-foreground">{performance.days_on_market} days</p>
          </div>
          <div className="text-right">
            <p className="text-xs text-muted-foreground">Suburb Avg</p>
            <p className="text-lg font-semibold text-muted-foreground">{benchmarks.avg_days_on_market ?? '—'} days</p>
          </div>
          {domDelta !== null && (
            <span className={`inline-flex items-center gap-1 text-xs font-medium px-2 py-1 rounded-full ${domDelta < 0 ? 'bg-green-100 text-green-700' : domDelta > 0 ? 'bg-amber-100 text-amber-700' : 'bg-muted text-muted-foreground'}`}>
              {domDelta < 0 ? <TrendingUp className="h-3 w-3" /> : domDelta > 0 ? <TrendingDown className="h-3 w-3" /> : <Minus className="h-3 w-3" />}
              {Math.abs(domDelta)} days {domDelta < 0 ? 'faster' : domDelta > 0 ? 'slower' : ''}
            </span>
          )}
        </div>

        {/* Views first 7 days */}
        {showViewsComparison && benchmarks.avg_views_first_7_days != null && (
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs text-muted-foreground">Views (first 7 days)</p>
              <p className="text-lg font-bold text-foreground">{first7Views}</p>
            </div>
            <div className="text-right">
              <p className="text-xs text-muted-foreground">Suburb Avg</p>
              <p className="text-lg font-semibold text-muted-foreground">{benchmarks.avg_views_first_7_days}</p>
            </div>
            {benchmarks.avg_views_first_7_days > 0 && (
              <span className={`inline-flex items-center gap-1 text-xs font-medium px-2 py-1 rounded-full ${first7Views >= benchmarks.avg_views_first_7_days ? 'bg-green-100 text-green-700' : 'bg-amber-100 text-amber-700'}`}>
                {first7Views >= benchmarks.avg_views_first_7_days ? <TrendingUp className="h-3 w-3" /> : <TrendingDown className="h-3 w-3" />}
                {Math.abs(Math.round(((first7Views - benchmarks.avg_views_first_7_days) / benchmarks.avg_views_first_7_days) * 100))}%
              </span>
            )}
          </div>
        )}

        {/* Competition */}
        <div>
          <p className="text-xs text-muted-foreground mb-1">Competition</p>
          <p className="text-sm text-foreground">
            There are currently <strong>{competition}</strong> similar active listings in {benchmarks.suburb}.
          </p>
          <span className={`inline-block mt-1 text-xs font-medium px-2 py-0.5 rounded-full ${competition > 5 ? 'bg-amber-100 text-amber-700' : 'bg-green-100 text-green-700'}`}>
            {competition > 5 ? 'High competition' : 'Low competition'}
          </span>
        </div>
      </div>
    </div>
  );
}
