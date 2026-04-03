import { useState } from 'react';
import { ThumbsUp, BadgeCheck } from 'lucide-react';
import { StarRating } from './StarRating';
import type { AgentReviewData } from '../types';
import { cn } from '@/lib/utils';

interface Props {
  review: AgentReviewData;
  agentName?: string;
  showResponse?: boolean;
}

const TYPE_LABELS: Record<string, string> = {
  buyer: 'Buyer', vendor: 'Vendor', tenant: 'Tenant', landlord: 'Landlord',
};

function getInitialColor(name: string) {
  const colors = [
    'bg-blue-100 text-blue-700',
    'bg-green-100 text-green-700',
    'bg-purple-100 text-purple-700',
    'bg-amber-100 text-amber-700',
    'bg-rose-100 text-rose-700',
    'bg-teal-100 text-teal-700',
  ];
  let hash = 0;
  for (let i = 0; i < name.length; i++) hash = name.charCodeAt(i) + ((hash << 5) - hash);
  return colors[Math.abs(hash) % colors.length];
}

function timeAgo(dateStr: string) {
  const diff = Date.now() - new Date(dateStr).getTime();
  const days = Math.floor(diff / 86400000);
  if (days < 1) return 'Today';
  if (days < 30) return `${days} day${days > 1 ? 's' : ''} ago`;
  const months = Math.floor(days / 30);
  if (months < 12) return `${months} month${months > 1 ? 's' : ''} ago`;
  const years = Math.floor(months / 12);
  return `${years} year${years > 1 ? 's' : ''} ago`;
}

export function ReviewCard({ review, agentName, showResponse = true }: Props) {
  const [expanded, setExpanded] = useState(false);
  const body = review.review_text || '';
  const isLong = body.length > 300;
  const borderColor = review.rating === 5 ? 'border-l-amber-400'
    : review.rating === 4 ? 'border-l-blue-400'
    : 'border-l-muted';

  return (
    <div className={cn('bg-card border border-border rounded-xl p-4 space-y-3 border-l-4', borderColor)}>
      <div className="flex items-start gap-3">
        <div className={cn('w-9 h-9 rounded-full flex items-center justify-center text-xs font-bold shrink-0', getInitialColor(review.reviewer_name))}>
          {review.reviewer_name[0]?.toUpperCase()}
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="font-semibold text-sm text-foreground">{review.reviewer_name}</span>
            {review.verified && (
              <BadgeCheck size={14} className="text-primary shrink-0" />
            )}
            <span className="px-2 py-0.5 rounded-full bg-secondary text-secondary-foreground text-[10px] font-medium">
              {TYPE_LABELS[review.review_type || review.relationship || 'buyer']}
            </span>
          </div>
          <div className="flex items-center gap-2 mt-0.5">
            <StarRating rating={review.rating} size="sm" />
            {review.suburb && (
              <span className="text-[11px] text-muted-foreground">· {review.suburb}</span>
            )}
            {review.year_of_service && (
              <span className="text-[11px] text-muted-foreground">· {review.year_of_service}</span>
            )}
          </div>
        </div>
        <span className="text-[11px] text-muted-foreground shrink-0">{timeAgo(review.created_at)}</span>
      </div>

      {review.title && (
        <p className="font-semibold text-sm text-foreground">{review.title}</p>
      )}

      {body && (
        <p className="text-sm text-muted-foreground leading-relaxed">
          {isLong && !expanded ? body.slice(0, 300) + '...' : body}
          {isLong && (
            <button onClick={() => setExpanded(!expanded)} className="ml-1 text-primary text-xs font-medium hover:underline">
              {expanded ? 'Show less' : 'Read more'}
            </button>
          )}
        </p>
      )}

      <div className="flex items-center gap-3">
        <button className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground transition-colors">
          <ThumbsUp size={12} />
          {review.helpful_count > 0 ? review.helpful_count : 'Helpful'}
        </button>
      </div>

      {showResponse && review.reply_text && (
        <div className="ml-4 pl-4 border-l-2 border-primary/20 mt-2">
          <p className="text-[11px] text-muted-foreground mb-1">
            <span className="font-medium text-foreground">{agentName || 'Agent'}</span> replied
          </p>
          <p className="text-sm text-foreground">{review.reply_text}</p>
        </div>
      )}
    </div>
  );
}
