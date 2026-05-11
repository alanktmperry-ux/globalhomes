import type { CRMLead } from '../types';
import { Phone, Mail, Home, Languages } from 'lucide-react';
import { URGENCY_CONFIG, type UrgencyTier } from '../lib/urgency';

const PRIORITY_DOT: Record<string, string> = {
  high: 'bg-[#F87171]',
  medium: 'bg-[#2563EB]',
  low: 'bg-[#9CA3AF]',
};

const SOURCE_LABEL: Record<string, string> = {
  enquiry_form: 'Enquiry',
  open_home: 'Open Home',
  eoi: 'EOI',
  pre_approval: 'Pre-approved',
  referral: 'Referral',
  portal: 'Portal',
  manual: 'Manual',
};

// Language code → flag + display name for the prominent ListHQ language badge.
const LANGUAGE_META: Record<string, { flag: string; name: string }> = {
  en: { flag: '🇬🇧', name: 'English' },
  zh: { flag: '🇨🇳', name: 'Mandarin' },
  'zh-CN': { flag: '🇨🇳', name: 'Mandarin' },
  zh_simplified: { flag: '🇨🇳', name: 'Mandarin' },
  'zh-TW': { flag: '🇹🇼', name: 'Cantonese' },
  zh_traditional: { flag: '🇹🇼', name: 'Cantonese' },
  yue: { flag: '🇭🇰', name: 'Cantonese' },
  vi: { flag: '🇻🇳', name: 'Vietnamese' },
  ar: { flag: '🇸🇦', name: 'Arabic' },
  hi: { flag: '🇮🇳', name: 'Hindi' },
  pa: { flag: '🇮🇳', name: 'Punjabi' },
  ta: { flag: '🇮🇳', name: 'Tamil' },
  bn: { flag: '🇧🇩', name: 'Bengali' },
  ko: { flag: '🇰🇷', name: 'Korean' },
  ja: { flag: '🇯🇵', name: 'Japanese' },
  th: { flag: '🇹🇭', name: 'Thai' },
  id: { flag: '🇮🇩', name: 'Indonesian' },
  ms: { flag: '🇲🇾', name: 'Malay' },
  fil: { flag: '🇵🇭', name: 'Filipino' },
  es: { flag: '🇪🇸', name: 'Spanish' },
  pt: { flag: '🇵🇹', name: 'Portuguese' },
  fr: { flag: '🇫🇷', name: 'French' },
  it: { flag: '🇮🇹', name: 'Italian' },
  ru: { flag: '🇷🇺', name: 'Russian' },
};

interface Props {
  lead: CRMLead;
  onClick: () => void;
  onDragStart: () => void;
  onDragEnd: () => void;
}

export function LeadCard({ lead, onClick, onDragStart, onDragEnd }: Props) {
  const daysInStage = Math.floor(
    (Date.now() - new Date(lead.updated_at).getTime()) / 86400000
  );
  const urgency = (lead as any).urgency as UrgencyTier | undefined;
  const cfg = urgency ? URGENCY_CONFIG[urgency] : null;
  const lang = lead.original_language && lead.original_language !== 'en'
    ? LANGUAGE_META[lead.original_language] ?? { flag: '🌐', name: lead.original_language.toUpperCase() }
    : null;
  const wasTranslated = !!(lang && lead.message_en && lead.message_original && lead.message_en !== lead.message_original);

  return (
    <div
      draggable
      onDragStart={onDragStart}
      onDragEnd={onDragEnd}
      onClick={onClick}
      className="bg-white rounded-[12px] p-3 cursor-grab active:cursor-grabbing hover:shadow-md transition-all group"
      style={{ border: '1px solid #E5E7EB' }}
    >
      <div className="flex items-center justify-between mb-1.5">
        <div className="flex items-center gap-2 min-w-0">
          <span className={`w-2 h-2 rounded-full flex-shrink-0 ${PRIORITY_DOT[lead.priority]}`} />
          <span className="text-sm font-semibold text-[#0a0f1e] truncate">
            {lead.first_name} {lead.last_name ?? ''}
          </span>
        </div>
        <span className="text-[10px] uppercase font-semibold text-[#6B7280] flex-shrink-0" style={{ letterSpacing: '0.06em' }}>
          {SOURCE_LABEL[lead.source] ?? 'Manual'}
        </span>
      </div>

      {lead.property && (
        <p className="text-xs text-[#6B7280] flex items-center gap-1 mb-1 truncate">
          <Home size={10} />
          {lead.property.address}
        </p>
      )}

      {lead.budget_max && (
        <p className="text-xs text-[#6B7280] mb-1.5">
          Budget: up to ${(lead.budget_max / 1000).toFixed(0)}k
          {lead.pre_approved && (
            <span className="text-[#2563EB] ml-1">· Pre-approved</span>
          )}
        </p>
      )}

      {lang && (
        <div className="mt-2 mb-1">
          <span
            className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold"
            style={{ background: '#EFF6FF', color: '#1E40AF', letterSpacing: '0.04em' }}
          >
            <span>{lang.flag}</span>
            {lang.name}
          </span>
          {wasTranslated && (
            <p className="flex items-center gap-1 text-xs mt-2 text-[#6B7280]">
              <Languages size={11} /> Auto-translated from {lang.name}
            </p>
          )}
        </div>
      )}

      <div className="flex items-center justify-between mt-2">
        <div className="flex items-center gap-1.5 text-[#9CA3AF]">
          {lead.email && <Mail size={10} />}
          {lead.phone && (
            <a
              href={`tel:${lead.phone}`}
              onClick={e => e.stopPropagation()}
              className="flex items-center gap-0.5 text-[#10B981] hover:text-[#059669] transition"
              title={`Call ${lead.phone}`}
            >
              <Phone size={10} />
            </a>
          )}
        </div>
        <div className="flex items-center gap-1.5">
          {(lead as any).do_not_contact && (
            <span className="text-[10px] text-[#991B1B] font-medium">🚫 DNC</span>
          )}
          {cfg && (
            <span className={`text-[10px] px-1.5 py-0.5 rounded-full border inline-flex items-center gap-1 ${cfg.chip}`}>
              <span className={`w-1 h-1 rounded-full ${cfg.dot}`} />
              {cfg.label}
            </span>
          )}
          <span className="text-[10px] text-[#9CA3AF] tabular-nums">{daysInStage}d</span>
        </div>
      </div>
    </div>
  );
}
