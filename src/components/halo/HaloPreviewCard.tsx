import { useNavigate } from 'react-router-dom';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { CheckCircle2, Languages, Star } from 'lucide-react';
import HaloQualityBadge from '@/components/halo/HaloQualityBadge';
import type { Halo } from '@/types/halo';
import { TIMEFRAME_LABELS, FINANCE_LABELS } from '@/types/halo';

interface Props {
  halo: Halo;
  unlocked: boolean;
  onRespond: (halo: Halo) => void;
  pocketMatch?: boolean;
}

const fmtMoney = (n: number) => `$${n.toLocaleString('en-AU')}`;

const formatBudget = (min: number | null | undefined, max: number | null | undefined) => {
  const hasMin = min != null && min > 0;
  const hasMax = max != null && max > 0;
  if (hasMin && hasMax) return `${fmtMoney(min!)} – ${fmtMoney(max!)}`;
  if (hasMax) return `Up to ${fmtMoney(max!)}`;
  if (hasMin) return `From ${fmtMoney(min!)}`;
  return 'Any budget';
};

const capitalise = (s: string) => s.charAt(0).toUpperCase() + s.slice(1);

const timeAgo = (iso: string) => {
  const diff = Date.now() - new Date(iso).getTime();
  const days = Math.floor(diff / 86400000);
  if (days <= 0) return 'today';
  if (days === 1) return '1 day ago';
  if (days < 30) return `${days} days ago`;
  const months = Math.floor(days / 30);
  return months === 1 ? '1 month ago' : `${months} months ago`;
};

export function HaloPreviewCard({ halo, unlocked, onRespond, pocketMatch }: Props) {
  const navigate = useNavigate();
  const intentLabel = halo.intent === 'buy' ? 'Buy' : 'Rent';
  const intentClass =
    halo.intent === 'buy'
      ? 'bg-blue-100 text-blue-800 hover:bg-blue-100'
      : 'bg-purple-100 text-purple-800 hover:bg-purple-100';

  const daysLeft = Math.max(
    0,
    Math.ceil((new Date(halo.expires_at).getTime() - Date.now()) / 86400000),
  );

  const budgetLabel = `AUD $${fmt(halo.budget_min)} – $${fmt(halo.budget_max)}`;
  const showLanguageBadge = halo.preferred_language && halo.preferred_language !== 'en';

  return (
    <Card>
      <CardContent className="p-5 space-y-4">
        <div className="flex items-start justify-between gap-3 flex-wrap">
          <div className="flex flex-wrap items-center gap-2">
            <Badge className={intentClass} variant="secondary">
              {intentLabel}
            </Badge>
            {unlocked && (
              <Badge
                variant="secondary"
                className="bg-green-100 text-green-800 hover:bg-green-100 gap-1"
              >
                <CheckCircle2 size={12} /> Unlocked
              </Badge>
            )}
            {showLanguageBadge && (
              <Badge variant="outline" className="gap-1">
                <Languages size={12} /> {halo.preferred_language}
              </Badge>
            )}
            <HaloQualityBadge score={halo.quality_score} variant="agent" />
            {pocketMatch && (
              <Badge
                variant="secondary"
                className="bg-amber-100 text-amber-800 hover:bg-amber-100 gap-1 border border-amber-300"
              >
                <Star size={12} className="fill-amber-500 text-amber-500" /> Pocket Match
              </Badge>
            )}
          </div>
          <span className="text-xs text-muted-foreground">
            Posted {timeAgo(halo.created_at)} · Expires in {daysLeft}d
          </span>
        </div>

        <div className="space-y-1">
          {halo.property_types.length > 0 && (
            <p className="text-sm text-muted-foreground">
              {halo.property_types.join(', ')}
            </p>
          )}
          <p className="font-semibold text-base break-words">
            {halo.suburbs.join(', ') || '—'}
          </p>
          <p className="text-sm">{budgetLabel}</p>
          <p className="text-xs text-muted-foreground">
            {TIMEFRAME_LABELS[halo.timeframe]} · {FINANCE_LABELS[halo.finance_status]}
          </p>
        </div>

        <div className="flex justify-end">
          {unlocked ? (
            <Button
              size="sm"
              variant="outline"
              onClick={() => navigate(`/dashboard/halo-board/${halo.id}`)}
            >
              View details
            </Button>
          ) : (
            <Button
              size="sm"
              className="bg-blue-600 hover:bg-blue-700 text-white"
              onClick={() => onRespond(halo)}
            >
              Respond — 1 credit
            </Button>
          )}
        </div>
      </CardContent>
    </Card>
  );
}

export default HaloPreviewCard;
