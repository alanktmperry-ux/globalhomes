import { useState, useMemo } from 'react';
import { ReviewCard } from './ReviewCard';
import { StarRating } from './StarRating';
import type { AgentReviewData, ReviewType } from '../types';

interface Props {
  reviews: AgentReviewData[];
  agentName?: string;
  avgRating?: number;
  reviewCount?: number;
}

const FILTER_OPTIONS: { value: string; label: string }[] = [
  { value: 'all', label: 'All' },
  { value: 'buyer', label: 'Buyers' },
  { value: 'vendor', label: 'Vendors' },
  { value: 'tenant', label: 'Tenants' },
  { value: 'landlord', label: 'Landlords' },
];

const SORT_OPTIONS = [
  { value: 'recent', label: 'Most Recent' },
  { value: 'highest', label: 'Highest Rated' },
  { value: 'helpful', label: 'Most Helpful' },
];

export function ReviewsList({ reviews, agentName, avgRating = 0, reviewCount = 0 }: Props) {
  const [filter, setFilter] = useState('all');
  const [sort, setSort] = useState('recent');
  const [showCount, setShowCount] = useState(10);

  // Rating histogram
  const histogram = useMemo(() => {
    const counts = [0, 0, 0, 0, 0];
    reviews.forEach(r => { if (r.rating >= 1 && r.rating <= 5) counts[r.rating - 1]++; });
    return counts.reverse(); // 5 stars first
  }, [reviews]);

  const filtered = useMemo(() => {
    let list = filter === 'all'
      ? reviews
      : reviews.filter(r => (r.review_type || r.relationship) === filter);

    if (sort === 'highest') list = [...list].sort((a, b) => b.rating - a.rating);
    else if (sort === 'helpful') list = [...list].sort((a, b) => (b.helpful_count || 0) - (a.helpful_count || 0));
    else list = [...list].sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());

    return list;
  }, [reviews, filter, sort]);

  const maxHistCount = Math.max(...histogram, 1);

  return (
    <div className="space-y-6">
      {/* Header with rating summary */}
      <div className="flex flex-col sm:flex-row gap-6 items-start">
        <div className="text-center sm:text-left">
          <p className="text-4xl font-bold text-foreground">{avgRating > 0 ? avgRating.toFixed(1) : '—'}</p>
          <StarRating rating={avgRating} size="md" className="justify-center sm:justify-start mt-1" />
          <p className="text-sm text-muted-foreground mt-1">{reviewCount} review{reviewCount !== 1 ? 's' : ''}</p>
        </div>

        {/* Histogram */}
        <div className="flex-1 space-y-1.5 min-w-[200px]">
          {histogram.map((count, i) => (
            <div key={i} className="flex items-center gap-2 text-xs">
              <span className="w-8 text-right text-muted-foreground">{5 - i}★</span>
              <div className="flex-1 h-2 bg-muted rounded-full overflow-hidden">
                <div
                  className="h-full bg-amber-400 rounded-full transition-all"
                  style={{ width: `${(count / maxHistCount) * 100}%` }}
                />
              </div>
              <span className="w-6 text-right text-muted-foreground">{count}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Filters and sort */}
      <div className="flex flex-wrap items-center gap-2">
        {FILTER_OPTIONS.map(opt => (
          <button
            key={opt.value}
            onClick={() => setFilter(opt.value)}
            className={`px-3 py-1.5 rounded-full text-xs font-medium border transition-colors
              ${filter === opt.value
                ? 'bg-foreground text-background border-foreground'
                : 'bg-card text-muted-foreground border-border hover:border-foreground/30'
              }`}
          >
            {opt.label}
          </button>
        ))}
        <select
          value={sort}
          onChange={e => setSort(e.target.value)}
          className="ml-auto text-xs border border-border rounded-lg px-2 py-1.5 bg-card text-foreground focus:outline-none"
        >
          {SORT_OPTIONS.map(opt => (
            <option key={opt.value} value={opt.value}>{opt.label}</option>
          ))}
        </select>
      </div>

      {/* Reviews */}
      <div className="space-y-4">
        {filtered.slice(0, showCount).map(review => (
          <ReviewCard key={review.id} review={review} agentName={agentName} />
        ))}
      </div>

      {filtered.length > showCount && (
        <button
          onClick={() => setShowCount(s => s + 10)}
          className="w-full py-2.5 text-sm font-medium text-primary hover:underline"
        >
          Load more reviews
        </button>
      )}

      {filtered.length === 0 && (
        <p className="text-center text-muted-foreground text-sm py-8">
          No reviews yet for this filter.
        </p>
      )}
    </div>
  );
}
