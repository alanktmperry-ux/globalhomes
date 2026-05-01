import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { CheckCircle2, Languages, Star, Mail, Loader2, BedDouble } from 'lucide-react';
import HaloQualityBadge from '@/components/halo/HaloQualityBadge';
import { supabase } from '@/integrations/supabase/client';
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

const formatBedrooms = (h: Halo) => {
  const min = h.bedrooms_min;
  const max = h.bedrooms_max;
  if (min == null && max == null) return null;
  if (min != null && max != null && min !== max) return `${min}–${max} bedrooms`;
  const v = min ?? max!;
  return `${v}+ bedroom${v === 1 ? '' : 's'}`;
};

const maskEmail = (email: string) => {
  const [user, domain] = email.split('@');
  if (!user || !domain) return email;
  const visible = user.slice(0, Math.min(2, user.length));
  return `${visible}${'*'.repeat(Math.max(3, user.length - 2))}@${domain}`;
};

const previewText = (h: Halo) => {
  const src = (h.description || '').trim() || (h.must_haves || []).join(', ');
  if (!src) return null;
  return src.length > 80 ? `${src.slice(0, 80).trim()}…` : src;
};

export function HaloPreviewCard({ halo, unlocked, onRespond, pocketMatch }: Props) {
  const navigate = useNavigate();
  const [revealing, setRevealing] = useState(false);
  const [revealed, setRevealed] = useState<{ email: string | null } | null>(null);

  const intentLabel = halo.intent === 'buy' ? 'Buy' : 'Rent';
  const intentClass =
    halo.intent === 'buy'
      ? 'bg-blue-100 text-blue-800 hover:bg-blue-100'
      : 'bg-purple-100 text-purple-800 hover:bg-purple-100';

  const daysLeft = Math.max(
    0,
    Math.ceil((new Date(halo.expires_at).getTime() - Date.now()) / 86400000),
  );

  const budgetLabel = `AUD ${formatBudget(halo.budget_min, halo.budget_max)}`;
  const showLanguageBadge = halo.preferred_language && halo.preferred_language !== 'en';
  const bedroomsLabel = formatBedrooms(halo);
  const preview = previewText(halo);

  const handleReveal = async () => {
    if (revealing || revealed) return;
    setRevealing(true);
    try {
      const { data, error } = await supabase.functions.invoke('get-halo-contact', {
        body: { halo_id: halo.id },
      });
      if (error) throw error;
      setRevealed({ email: (data as any)?.email ?? null });
    } catch (e) {
      console.warn('[HaloPreviewCard] reveal failed', e);
      setRevealed({ email: null });
    } finally {
      setRevealing(false);
    }
  };

  return (
    <Card>
      <CardContent className="p-5 pr-14 sm:pr-5 space-y-4">
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
                <Languages size={12} /> {capitalise(halo.preferred_language)}
              </Badge>
            )}
            {pocketMatch && (
              <Badge
                variant="secondary"
                className="bg-amber-100 text-amber-800 hover:bg-amber-100 gap-1 border border-amber-300"
              >
                <Star size={12} className="fill-amber-500 text-amber-500" /> Pocket Match
              </Badge>
            )}
          </div>
          <div className="flex flex-col items-end gap-1 shrink-0">
            <HaloQualityBadge score={halo.quality_score} variant="agent" />
            <span className="text-xs text-muted-foreground whitespace-nowrap">
              Posted {timeAgo(halo.created_at)} · Expires in {daysLeft}d
            </span>
          </div>
        </div>

        <div className="space-y-1">
          {halo.property_types.length > 0 && (
            <p className="text-sm text-muted-foreground">
              {halo.property_types.join(', ')}
            </p>
          )}
          {bedroomsLabel && (
            <p className="text-sm text-muted-foreground flex items-center gap-1.5">
              <BedDouble size={13} /> {bedroomsLabel}
            </p>
          )}
          <p className="font-semibold text-base break-words">
            {halo.suburbs.join(', ') || '—'}
          </p>
          <p className="text-sm">{budgetLabel}</p>
          <p className="text-xs text-muted-foreground">
            {TIMEFRAME_LABELS[halo.timeframe]} · {FINANCE_LABELS[halo.finance_status]}
          </p>
          {preview && (
            <p className="text-xs italic text-muted-foreground pt-1 break-words">
              "{preview}"
            </p>
          )}
        </div>

        {unlocked ? (
          <div className="rounded-md border border-green-200 bg-green-50 px-3 py-2 space-y-2">
            {revealed?.email ? (
              <div className="flex items-center justify-between gap-2 flex-wrap">
                <a
                  href={`mailto:${revealed.email}`}
                  className="text-sm font-medium text-green-900 hover:underline break-all flex items-center gap-1.5"
                >
                  <Mail size={14} /> {revealed.email}
                </a>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => navigate(`/dashboard/halo-board/${halo.id}`)}
                >
                  Open
                </Button>
              </div>
            ) : revealed ? (
              <div className="flex items-center justify-between gap-2 flex-wrap">
                <span className="text-xs text-muted-foreground">Contact unavailable.</span>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => navigate(`/dashboard/halo-board/${halo.id}`)}
                >
                  View details
                </Button>
              </div>
            ) : (
              <div className="flex items-center justify-between gap-2 flex-wrap">
                <span className="text-xs text-green-900 flex items-center gap-1.5 break-all">
                  <Mail size={14} /> Seeker · {maskEmail('contact@example.com')}
                </span>
                <Button size="sm" onClick={handleReveal} disabled={revealing}>
                  {revealing ? <Loader2 size={14} className="animate-spin" /> : 'Reveal contact'}
                </Button>
              </div>
            )}
          </div>
        ) : (
          <div className="flex justify-end">
            <Button
              size="sm"
              className="bg-blue-600 hover:bg-blue-700 text-white"
              onClick={() => onRespond(halo)}
            >
              Respond — 1 credit
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

export default HaloPreviewCard;
