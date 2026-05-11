import { useState, useMemo } from 'react';
import { useCRMLeads } from '../hooks/useCRMLeads';
import { LeadDetailModal } from './LeadDetailModal';
import LeadContactForm from '@/shared/components/LeadContactForm';
import { useAgentId } from '../hooks/useAgentId';
import type { CRMLead, LeadStage } from '../types';
import {
  URGENCY_CONFIG, URGENCY_TIERS, type UrgencyTier,
} from '../lib/urgency';

const Ico = ({ icon, size = 16, color, className }: { icon: string; size?: number; color?: string; className?: string }) => (
  // @ts-expect-error iconify-icon is a web component
  <iconify-icon icon={icon} class={className} style={{ fontSize: `${size}px`, color, display: 'inline-flex', lineHeight: 1 }} />
);

const fmtLabel = (s: string) =>
  s.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase());

// Heat tab styling
const HEAT_PILL: Record<UrgencyTier, { bg: string; text: string }> = {
  hot:  { bg: 'bg-[#FEF2F2]', text: 'text-[#DC2626]' },
  warm: { bg: 'bg-[#FFFBEB]', text: 'text-[#D97706]' },
  cool: { bg: 'bg-[#EFF6FF]', text: 'text-[#0EA5E9]' },
  cold: { bg: 'bg-[#F3F4F6]', text: 'text-[#374151]' },
};

const AVATAR_TONE: Record<UrgencyTier, string> = {
  hot:  'bg-[#FEF2F2] text-[#DC2626]',
  warm: 'bg-[#FFFBEB] text-[#D97706]',
  cool: 'bg-[#EFF6FF] text-[#0EA5E9]',
  cold: 'bg-[#F3F4F6] text-[#374151]',
};

// Synthesize a readiness score (0-100) from urgency tier + recency.
function readinessFor(lead: any): number {
  const base: Record<UrgencyTier, number> = { hot: 92, warm: 74, cool: 52, cold: 28 };
  const score = base[(lead.urgency as UrgencyTier) ?? 'cold'] ?? 30;
  return Math.max(0, Math.min(100, score));
}

function scoreBarColor(score: number) {
  if (score >= 90) return '#10B981'; // green
  if (score >= 60) return '#F59E0B'; // amber
  return '#9CA3AF'; // grey
}

function initialsFor(lead: any): string {
  const first = (lead.first_name ?? '').trim();
  const last = (lead.last_name ?? '').trim();
  const a = first.charAt(0).toUpperCase();
  const b = last.charAt(0).toUpperCase();
  return (a + b) || first.charAt(0).toUpperCase() || '?';
}

function relativeTime(iso?: string | null): string {
  if (!iso) return 'Never';
  const diff = Date.now() - new Date(iso).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 60) return `${Math.max(1, mins)}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  const days = Math.floor(hrs / 24);
  if (days < 30) return `${days}d ago`;
  const months = Math.floor(days / 30);
  return `${months}mo ago`;
}

function fmtBudget(min?: number | null, max?: number | null): string | null {
  const f = (v: number) => v >= 1_000_000 ? `$${(v / 1_000_000).toFixed(1)}M` : `$${Math.round(v / 1000)}K`;
  if (min && max) return `${f(min)}–${f(max)}`;
  if (max) return `up to ${f(max)}`;
  if (min) return `from ${f(min)}`;
  return null;
}

function intentSummary(lead: any): string {
  const parts: string[] = [];
  parts.push('Buy');
  if (lead.property?.suburb) parts.push(lead.property.suburb);
  const b = fmtBudget(lead.budget_min, lead.budget_max);
  if (b) parts.push(b);
  return parts.join(' · ');
}

interface Props {
  urgencyFilter?: UrgencyTier[];
  onUrgencyFilterChange?: (next: UrgencyTier[]) => void;
}

const HEAT_TABS: Array<{ key: 'all' | UrgencyTier | 'unresponded'; label: string }> = [
  { key: 'all', label: 'All' },
  { key: 'hot', label: 'Hot' },
  { key: 'warm', label: 'Warm' },
  { key: 'cool', label: 'Cool' },
  { key: 'cold', label: 'Cold' },
  { key: 'unresponded', label: 'Unresponded' },
];

export function CRMListView({ urgencyFilter, onUrgencyFilterChange }: Props) {
  const [search, setSearch] = useState('');
  const [stageFilter, setStage] = useState<LeadStage | 'all'>('all');
  const [selectedLead, setSelected] = useState<CRMLead | null>(null);
  const [showAddLead, setShowAddLead] = useState(false);
  const [internalUrgency, setInternalUrgency] = useState<UrgencyTier[]>([]);
  const [sortBy, setSortBy] = useState<'readiness' | 'newest' | 'last_contacted'>('readiness');

  const urgency = urgencyFilter ?? internalUrgency;
  const setUrgency = onUrgencyFilterChange ?? setInternalUrgency;

  const agentId = useAgentId();
  const { leads, loading, fetchLeads } = useCRMLeads({
    search, stage: stageFilter, urgency: urgency.length ? urgency : undefined,
  });

  // Derive the "active heat tab" from the urgency multi-select
  const activeHeat: 'all' | UrgencyTier | 'unresponded' =
    urgency.length === 1 ? urgency[0] : 'all';

  const sorted = useMemo(() => {
    const arr = [...leads];
    if (sortBy === 'readiness') {
      arr.sort((a, b) => readinessFor(b) - readinessFor(a));
    } else if (sortBy === 'newest') {
      arr.sort((a: any, b: any) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
    } else {
      arr.sort((a: any, b: any) => {
        const aT = a.last_contacted ? new Date(a.last_contacted).getTime() : 0;
        const bT = b.last_contacted ? new Date(b.last_contacted).getTime() : 0;
        return bT - aT;
      });
    }
    return arr;
  }, [leads, sortBy]);

  const setHeatTab = (key: 'all' | UrgencyTier | 'unresponded') => {
    if (key === 'all') setUrgency([]);
    else if (key === 'unresponded') setUrgency(['hot']); // hot = never contacted
    else setUrgency([key as UrgencyTier]);
  };

  const SORT_LABELS: Record<typeof sortBy, string> = {
    readiness: 'Highest readiness',
    newest: 'Newest',
    last_contacted: 'Last contacted',
  };
  const [sortOpen, setSortOpen] = useState(false);

  return (
    <div className="space-y-6">
      {/* Filter + search strip */}
      <div className="bg-white border border-[#E5E5E5] rounded-3xl p-3 flex items-center gap-3 mb-2 flex-wrap">
        <div className="flex-1 min-w-0 overflow-x-auto">
          <div className="flex items-center gap-2 flex-wrap">
            {HEAT_TABS.map((t) => {
              const active = activeHeat === t.key;
              return (
                <button
                  key={t.key}
                  type="button"
                  onClick={() => setHeatTab(t.key)}
                  className={
                    active
                      ? 'px-4 py-2 rounded-full text-[13px] font-semibold bg-[#0a0f1e] text-white transition-all'
                      : 'px-4 py-2 rounded-full text-[13px] font-semibold bg-[#F9FAFB] text-[#6a6a6a] hover:bg-[#EFF6FF] hover:text-[#1E40AF] transition-all'
                  }
                >
                  {t.label}
                </button>
              );
            })}
          </div>
        </div>

        <div className="flex-1 relative min-w-[220px] max-w-[420px]">
          <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-[#9CA3AF] pointer-events-none">
            <Ico icon="solar:magnifer-linear" size={16} />
          </span>
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search by name, email, suburb, or listing..."
            className="w-full bg-[#F9FAFB] border-0 rounded-full pl-10 pr-4 py-2.5 text-[14px] text-[#0a0f1e] placeholder-[#9CA3AF] focus:outline-none focus:ring-2 focus:ring-[#2563EB]/20"
          />
        </div>

        {/* Stage filter (compact) */}
        <select
          value={stageFilter}
          onChange={(e) => setStage(e.target.value as LeadStage | 'all')}
          className="bg-white border border-[#E5E5E5] rounded-full px-4 py-2.5 text-[13px] font-bold text-[#374151] hover:border-[#2563EB] hover:text-[#2563EB] transition-all focus:outline-none cursor-pointer"
        >
          <option value="all">All stages</option>
          {['new', 'contacted', 'qualified', 'offer_stage', 'under_contract', 'settled', 'lost'].map(s => (
            <option key={s} value={s}>{fmtLabel(s)}</option>
          ))}
        </select>

        {/* Sort */}
        <div className="relative">
          <button
            type="button"
            onClick={() => setSortOpen((o) => !o)}
            className="bg-white border border-[#E5E5E5] rounded-full px-4 py-2.5 text-[13px] font-bold text-[#374151] inline-flex items-center gap-2 hover:border-[#2563EB] hover:text-[#2563EB] transition-all"
          >
            {SORT_LABELS[sortBy]}
            <Ico icon="solar:alt-arrow-down-linear" size={12} />
          </button>
          {sortOpen && (
            <>
              <div className="fixed inset-0 z-20" onClick={() => setSortOpen(false)} />
              <div className="absolute right-0 top-full mt-2 w-52 rounded-2xl border border-[#E5E5E5] bg-white shadow-[0_12px_32px_rgba(0,0,0,0.08)] z-30 overflow-hidden">
                {(Object.keys(SORT_LABELS) as (keyof typeof SORT_LABELS)[]).map((k) => (
                  <button
                    key={k}
                    type="button"
                    onClick={() => { setSortBy(k); setSortOpen(false); }}
                    className="w-full text-left px-4 py-2.5 text-[13px] hover:bg-[#F9FAFB] transition-colors"
                  >
                    {SORT_LABELS[k]}
                  </button>
                ))}
              </div>
            </>
          )}
        </div>
      </div>

      {/* List */}
      {loading ? (
        <div className="space-y-3">
          {[0,1,2,3].map(i => (
            <div key={i} className="h-[96px] bg-white border border-[#E5E5E5] rounded-3xl animate-pulse" />
          ))}
        </div>
      ) : sorted.length === 0 ? (
        leads.length === 0 && !search && urgency.length === 0 && stageFilter === 'all' ? (
          <div className="bg-white rounded-3xl border border-[#E5E5E5] py-20 px-8 text-center">
            <div className="flex justify-center"><Ico icon="solar:users-group-rounded-linear" size={56} color="#E5E7EB" /></div>
            <h2 className="text-[22px] font-bold text-[#0a0f1e] mt-6">Your pipeline is empty — for now</h2>
            <p className="text-[14px] text-[#6a6a6a] max-w-[460px] mx-auto leading-[1.55] mt-3">
              Once buyers start enquiring on your listings or matching via Halo, they'll appear here automatically with readiness scores.
            </p>
            <button
              type="button"
              onClick={() => setShowAddLead(true)}
              className="mt-8 rounded-full px-5 py-2.5 text-[14px] font-bold text-white inline-flex items-center gap-2 transition-all hover:shadow-[0_8px_24px_rgba(37,99,235,0.3)]"
              style={{ background: 'linear-gradient(135deg, #2563EB, #4F88FF, #93C5FD)' }}
            >
              <Ico icon="solar:user-plus-bold" size={16} color="#fff" /> Add your first buyer
            </button>
            <div className="mt-4">
              <a href="/dashboard/crm/import" className="text-[13px] font-bold text-[#2563EB] hover:underline">
                Import contacts from CSV →
              </a>
            </div>
          </div>
        ) : (
          <div className="bg-white rounded-3xl border border-[#E5E5E5] py-12 px-8 text-center">
            <div className="flex justify-center"><Ico icon="solar:magnifer-square-linear" size={56} color="#E5E7EB" /></div>
            <h2 className="text-[22px] font-bold text-[#0a0f1e] mt-6">No buyers match</h2>
            <p className="text-[14px] text-[#6a6a6a] max-w-[420px] mx-auto leading-[1.55] mt-3">
              Try clearing some filters.
            </p>
            <button
              type="button"
              onClick={() => { setSearch(''); setStage('all'); setUrgency([]); }}
              className="mt-6 text-[#374151] border border-[#E5E5E5] rounded-full px-4 py-2 text-[13px] font-bold hover:border-[#2563EB] hover:text-[#2563EB] transition-all bg-white"
            >
              Clear all filters
            </button>
          </div>
        )
      ) : (
        <div className="space-y-3">
          {sorted.map((lead: any) => {
            const tier = (lead.urgency as UrgencyTier) ?? 'cold';
            const heat = HEAT_PILL[tier];
            const score = readinessFor(lead);
            const cfg = URGENCY_CONFIG[tier];
            const suburbStr = lead.property?.suburb && lead.property?.state
              ? `${lead.property.suburb}, ${lead.property.state}`
              : lead.property?.suburb || '';
            return (
              <div
                key={lead.id}
                onClick={() => setSelected(lead)}
                className="bg-white rounded-3xl border border-[#E5E5E5] p-5 flex items-center gap-5 cursor-pointer hover:border-[#2563EB]/40 hover:shadow-[0_8px_24px_rgba(0,0,0,0.04)] transition-all"
              >
                {/* Avatar */}
                <div className={`w-[60px] h-[60px] rounded-full flex items-center justify-center text-[18px] font-extrabold shrink-0 ${AVATAR_TONE[tier]}`}>
                  {initialsFor(lead)}
                </div>

                {/* Identity */}
                <div className="flex-1 min-w-0">
                  <h3 className="text-[16px] font-bold text-[#0a0f1e] truncate">
                    {lead.first_name} {lead.last_name ?? ''}
                  </h3>
                  <p className="text-[12px] text-[#6a6a6a] truncate">
                    {lead.email ?? lead.phone ?? '—'}{suburbStr ? ` · ${suburbStr}` : ''}
                  </p>
                  <div className="mt-2 flex items-center gap-2 flex-wrap">
                    <span className={`inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-[11px] font-bold ${heat.bg} ${heat.text} uppercase tracking-[0.08em]`}>
                      <span className={`w-1.5 h-1.5 rounded-full ${cfg.dot}`} />
                      {cfg.label}
                    </span>
                    <span className="bg-[#F9FAFB] text-[#6a6a6a] rounded-full px-2.5 py-1 text-[11px] font-bold">
                      {fmtLabel(lead.stage)}
                    </span>
                  </div>
                </div>

                {/* Intent */}
                <div className="hidden md:block w-[180px] min-w-0">
                  <p className="text-[10px] uppercase font-bold text-[#6a6a6a]" style={{ letterSpacing: '0.12em' }}>INTENT</p>
                  <p className="text-[13px] font-bold text-[#0a0f1e] truncate mt-1">{intentSummary(lead)}</p>
                </div>

                {/* Readiness */}
                <div className="hidden lg:block w-[160px]">
                  <p className="text-[10px] uppercase font-bold text-[#6a6a6a]" style={{ letterSpacing: '0.12em' }}>READINESS</p>
                  <div className="w-full h-2 rounded-full bg-[#F3F4F6] mt-2 overflow-hidden">
                    <div
                      className="h-full rounded-full transition-all"
                      style={{ width: `${score}%`, background: scoreBarColor(score) }}
                    />
                  </div>
                  <p className="text-[12px] font-extrabold text-[#0a0f1e] mt-1 tabular-nums">{score} / 100</p>
                </div>

                {/* Last activity */}
                <div className="hidden xl:block w-[140px]">
                  <p className="text-[10px] uppercase font-bold text-[#6a6a6a]" style={{ letterSpacing: '0.12em' }}>LAST ACTIVITY</p>
                  <p className="text-[13px] text-[#374151] mt-1 truncate">{relativeTime(lead.last_contacted)}</p>
                </div>

                {/* Quick actions */}
                <div className="flex items-center gap-2 shrink-0" onClick={(e) => e.stopPropagation()}>
                  <button
                    type="button"
                    onClick={() => setSelected(lead)}
                    aria-label="Message"
                    title="Message"
                    className="w-9 h-9 rounded-full bg-[#F9FAFB] hover:bg-[#0a0f1e] text-[#374151] hover:text-white flex items-center justify-center transition-all"
                  >
                    <Ico icon="solar:chat-line-bold" size={16} />
                  </button>
                  {lead.phone ? (
                    <a
                      href={`tel:${lead.phone}`}
                      aria-label="Call"
                      title="Call"
                      className="w-9 h-9 rounded-full bg-[#F9FAFB] hover:bg-[#0a0f1e] text-[#374151] hover:text-white flex items-center justify-center transition-all"
                    >
                      <Ico icon="solar:phone-linear" size={16} />
                    </a>
                  ) : (
                    <button
                      type="button"
                      disabled
                      aria-label="No phone"
                      className="w-9 h-9 rounded-full bg-[#F9FAFB] text-[#D1D5DB] flex items-center justify-center cursor-not-allowed"
                    >
                      <Ico icon="solar:phone-linear" size={16} />
                    </button>
                  )}
                  {lead.email ? (
                    <a
                      href={`mailto:${lead.email}`}
                      aria-label="Email"
                      title="Email"
                      className="w-9 h-9 rounded-full bg-[#F9FAFB] hover:bg-[#0a0f1e] text-[#374151] hover:text-white flex items-center justify-center transition-all"
                    >
                      <Ico icon="solar:letter-linear" size={16} />
                    </a>
                  ) : (
                    <button
                      type="button"
                      disabled
                      aria-label="No email"
                      className="w-9 h-9 rounded-full bg-[#F9FAFB] text-[#D1D5DB] flex items-center justify-center cursor-not-allowed"
                    >
                      <Ico icon="solar:letter-linear" size={16} />
                    </button>
                  )}
                  <span className="text-[#6a6a6a] pl-1">
                    <Ico icon="solar:alt-arrow-right-linear" size={18} />
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {selectedLead && (
        <LeadDetailModal
          lead={selectedLead}
          onClose={() => setSelected(null)}
          onUpdate={() => setSelected(null)}
        />
      )}

      {showAddLead && agentId && (
        <LeadContactForm
          context="lead"
          agentId={agentId}
          onClose={() => setShowAddLead(false)}
          onSaved={() => { setShowAddLead(false); fetchLeads(); }}
        />
      )}
    </div>
  );
}
