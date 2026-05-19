import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import type { LucideIcon } from 'lucide-react';
import {
  Flame, Star, Wallet, MapPin, Calendar, Bath, Car,
  CheckCircle, Mail, MessageCircle, Loader2, ExternalLink,
  CheckCircle2, Lock,
} from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import type { Halo } from '@/types/halo';
import { TIMEFRAME_LABELS, FINANCE_LABELS } from '@/types/halo';

interface Props {
  halo: Halo;
  unlocked: boolean;
  onRespond: (halo: Halo) => void;
  pocketMatch?: boolean;
  matchScore?: number | null;
  matchReasons?: string[];
  heatScore?: number | null;
}

const fmtMoney = (n: number) => {
  if (n >= 1_000_000) return `$${(n / 1_000_000).toFixed(n % 1_000_000 === 0 ? 0 : 1)}M`;
  if (n >= 1_000) return `$${Math.round(n / 1_000)}K`;
  return `$${n.toLocaleString('en-AU')}`;
};

const formatBudget = (min: number | null | undefined, max: number | null | undefined) => {
  const hasMin = min != null && min > 0;
  const hasMax = max != null && max > 0;
  if (hasMin && hasMax) return `${fmtMoney(min!)} – ${fmtMoney(max!)}`;
  if (hasMax) return `Up to ${fmtMoney(max!)}`;
  if (hasMin) return `From ${fmtMoney(min!)}`;
  return 'Any budget';
};

const timeAgo = (iso: string) => {
  const diff = Date.now() - new Date(iso).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 60) return `${Math.max(1, mins)}m ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  if (days < 30) return `${days}d ago`;
  const months = Math.floor(days / 30);
  return `${months}mo ago`;
};

const LANG_META: Record<string, { flag: string; label: string }> = {
  en: { flag: '🇬🇧', label: 'English' },
  zh: { flag: '🇨🇳', label: 'Mandarin' },
  zh_simplified: { flag: '🇨🇳', label: 'Mandarin' },
  zh_traditional: { flag: '🇭🇰', label: 'Cantonese' },
  yue: { flag: '🇭🇰', label: 'Cantonese' },
  vi: { flag: '🇻🇳', label: 'Vietnamese' },
  ko: { flag: '🇰🇷', label: 'Korean' },
  hi: { flag: '🇮🇳', label: 'Hindi' },
  pa: { flag: '🇮🇳', label: 'Punjabi' },
  ar: { flag: '🇸🇦', label: 'Arabic' },
};




export function HaloPreviewCard({ halo, unlocked, onRespond, pocketMatch, matchScore, matchReasons, heatScore }: Props) {
  const navigate = useNavigate();
  const [revealing, setRevealing] = useState(false);
  const [revealed, setRevealed] = useState<{ email: string | null; name?: string | null } | null>(null);

  const lang = (halo.preferred_language || 'en').toLowerCase();
  const langKey = lang.startsWith('zh') && lang !== 'zh_traditional' ? 'zh' : lang;
  const langMeta = LANG_META[langKey] ?? LANG_META[lang] ?? { flag: '🌐', label: lang };

  const isHot = halo.finance_status === 'cash_buyer' || (halo as any).finance_status === 'pre_approved';

  const intentLabel = halo.intent === 'buy' ? 'Buy' : 'Rent';
  const bedPart = halo.bedrooms_min ? `${halo.bedrooms_min}+ bed` : null;
  const typePart = halo.property_types[0] ?? null;
  const intentString = [intentLabel, bedPart, typePart].filter(Boolean).join(' · ');

  const suburbs = halo.suburbs || [];
  const suburbsLabel =
    suburbs.length <= 2
      ? suburbs.join(', ') || '—'
      : `${suburbs.slice(0, 2).join(', ')} and ${suburbs.length - 2} more`;

  const initial = revealed?.name ? revealed.name.charAt(0).toUpperCase() : unlocked ? 'S' : '?';

  const handleReveal = async () => {
    if (revealing || revealed) return;
    setRevealing(true);
    try {
      const { data } = await supabase.functions.invoke('get-halo-contact', {
        body: { halo_id: halo.id },
      });
      setRevealed({ email: (data as any)?.email ?? null, name: (data as any)?.name ?? null });
    } catch {
      setRevealed({ email: null });
    } finally {
      setRevealing(false);
    }
  };

  return (
    <div
      className="bg-white rounded-3xl border border-[#E5E5E5] p-6 transition-all hover:border-[#2563EB]/40 hover:-translate-y-0.5 relative overflow-hidden cursor-pointer"
      style={{ transition: 'all 0.2s ease' }}
      onMouseEnter={(e) => (e.currentTarget.style.boxShadow = '0 12px 32px rgba(0,0,0,0.06)')}
      onMouseLeave={(e) => (e.currentTarget.style.boxShadow = 'none')}
      onClick={() => unlocked && navigate(`/dashboard/halo-board/${halo.id}`)}
      tabIndex={0}
      role="article"
      aria-label={`Halo brief for ${(halo.suburbs || []).join(', ') || 'unspecified suburbs'}`}
      onKeyDown={(e) => {
        if ((e.key === 'Enter' || e.key === ' ') && unlocked) {
          e.preventDefault();
          navigate(`/dashboard/halo-board/${halo.id}`);
        }
      }}
    >
      {/* Hot pill */}
      {isHot && (
        <div className="absolute top-4 left-4 bg-[#FEF2F2] text-[#DC2626] rounded-full px-2.5 py-1 text-[10px] font-extrabold uppercase tracking-[0.10em] inline-flex items-center gap-1">
          <Flame size={12} color="#DC2626" />
          Pre-approved
        </div>
      )}
      {pocketMatch && !isHot && (
        <div className="absolute top-4 left-4 bg-[#FEF3C7] text-[#92400E] rounded-full px-2.5 py-1 text-[10px] font-extrabold uppercase tracking-[0.10em] inline-flex items-center gap-1">
          <Star size={12} color="#92400E" />
          Pocket match
        </div>
      )}

      {/* Initial circle */}
      <div className="absolute top-5 right-5 w-12 h-12 rounded-full bg-gradient-to-br from-[#EFF6FF] to-[#DBEAFE] text-[#1E40AF] flex items-center justify-center font-extrabold text-[16px]">
        {initial}
      </div>

      {/* Language pill */}
      <div className="absolute right-5 top-[68px] bg-[#EFF6FF] text-[#1E40AF] rounded-full px-2.5 py-1 text-[11px] font-bold inline-flex items-center gap-1">
        <span>{langMeta.flag}</span>
        {langMeta.label}
      </div>

      {/* Intent section */}
      <div className={isHot || pocketMatch ? 'pt-8' : ''} style={{ paddingRight: '90px' }}>
        <div className="text-[10px] uppercase tracking-[0.12em] text-[#6a6a6a] font-bold">
          Intent
        </div>
        <div className="text-[20px] font-extrabold text-[#0a0f1e] tracking-[-0.02em] mt-1 leading-tight">
          {intentString}
        </div>
      </div>

      {/* Details */}
      <div className="mt-5 space-y-3">
        <DetailRow icon={Wallet} label="Budget" value={`AUD ${formatBudget(halo.budget_min, halo.budget_max)}`} />
        <DetailRow icon={MapPin} label="Suburbs" value={suburbsLabel} />
        <DetailRow icon={Calendar} label="Timeframe" value={TIMEFRAME_LABELS[halo.timeframe] || '—'} />
        {halo.bathrooms_min != null && halo.bathrooms_min > 0 && (
          <DetailRow icon={Bath} label="Bathrooms" value={`${halo.bathrooms_min}+`} />
        )}
        {halo.car_spaces_min != null && halo.car_spaces_min > 0 && (
          <DetailRow icon={Car} label="Parking" value={`${halo.car_spaces_min} car${halo.car_spaces_min === 1 ? '' : 's'}`} />
        )}
        <DetailRow icon={CheckCircle} label="Finance" value={FINANCE_LABELS[halo.finance_status] || '—'} />
      </div>

      {/* Phase B: Match score + reason chips + heat */}
      {((matchScore != null && matchScore > 0) || (heatScore != null && heatScore >= 30) || (matchReasons && matchReasons.length > 0)) && (
        <div className="mt-4 pt-4 border-t border-[#F3F4F6]">
          <div className="flex items-center gap-2 flex-wrap">
            {matchScore != null && matchScore > 0 && (
              <span
                className={`rounded-full px-2.5 py-1 text-[10px] font-extrabold uppercase tracking-[0.10em] inline-flex items-center gap-1 ${
                  matchScore >= 70
                    ? 'bg-[#ECFDF5] text-[#065F46]'
                    : matchScore >= 40
                    ? 'bg-[#EFF6FF] text-[#1E40AF]'
                    : 'bg-[#F3F4F6] text-[#374151]'
                }`}
                title="Your personal fit score"
              >
                <Star size={12} />
                {Math.round(matchScore)}% match
              </span>
            )}
            {heatScore != null && heatScore >= 30 && (
              <span
                className="bg-[#FEF2F2] text-[#DC2626] rounded-full px-2.5 py-1 text-[10px] font-extrabold uppercase tracking-[0.10em] inline-flex items-center gap-1"
                title="Predicted unlock probability — agents only"
              >
                <Flame size={12} />
                Hot {Math.round(heatScore)}
              </span>
            )}
          </div>
          {matchReasons && matchReasons.length > 0 && (
            <div className="mt-2 flex flex-wrap gap-1.5">
              {matchReasons.slice(0, 3).map((r, i) => (
                <span
                  key={i}
                  className="bg-[#F9FAFB] text-[#374151] border border-[#E5E7EB] rounded-full px-2 py-0.5 text-[10px] font-medium"
                >
                  {r}
                </span>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Footer */}
      <div className="mt-5 pt-5 border-t border-[#F3F4F6] flex items-center justify-between gap-3">
        <div className="text-[11px] text-[#6a6a6a] font-medium">
          Posted {timeAgo(halo.created_at)}
        </div>
        {unlocked ? (
          <div className="flex items-center gap-1.5" onClick={(e) => e.stopPropagation()}>
            {revealed?.email ? (
              <a
                href={`mailto:${revealed.email}`}
                aria-label="Email seeker"
                className="w-9 h-9 rounded-full bg-[#EFF6FF] text-[#2563EB] hover:bg-[#2563EB] hover:text-white flex items-center justify-center transition"
              >
                <Mail size={16} />
              </a>
            ) : (
              <button
                type="button"
                onClick={handleReveal}
                disabled={revealing}
                aria-label="Reveal contact"
                className="w-9 h-9 rounded-full bg-[#EFF6FF] text-[#2563EB] hover:bg-[#2563EB] hover:text-white flex items-center justify-center transition"
              >
                {revealing ? <Loader2 size={16} className="animate-spin" /> : <MessageCircle size={16} />}
              </button>
            )}
            <button
              type="button"
              onClick={() => navigate(`/dashboard/halo-board/${halo.id}`)}
              aria-label="Open"
              className="w-9 h-9 rounded-full bg-[#EFF6FF] text-[#2563EB] hover:bg-[#2563EB] hover:text-white flex items-center justify-center transition"
            >
              <ExternalLink size={16} />
            </button>
            <span className="bg-[#ECFDF5] text-[#065F46] rounded-full px-2.5 py-1 text-[10px] font-extrabold uppercase tracking-[0.10em] inline-flex items-center gap-1">
              <CheckCircle2 size={12} color="#065F46" />
              Unlocked
            </span>
          </div>
        ) : (
          <div className="flex flex-col items-end gap-1.5">
            <span className="text-[11px] font-medium text-[#6a6a6a]">1 credit to unlock contact details</span>
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                onRespond(halo);
              }}
              className="bg-[#0a0f1e] text-white rounded-full px-5 py-2.5 text-[13px] font-bold inline-flex items-center gap-2 hover:bg-[#2563EB] transition"
            >
              <Lock size={14} />
              Unlock · 1 credit
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

function DetailRow({ icon: Icon, label, value }: { icon: LucideIcon; label: string; value: string }) {
  return (
    <div className="flex items-center gap-3 text-[13px]">
      <span className="text-[#6a6a6a] shrink-0">
        <Icon size={16} color="#6a6a6a" />
      </span>
      <span className="font-medium text-[#6a6a6a] w-[90px] shrink-0 hidden sm:block">{label}</span>
      <span className="font-bold text-[#0a0f1e] flex-1 truncate">{value}</span>
    </div>
  );
}

export default HaloPreviewCard;
