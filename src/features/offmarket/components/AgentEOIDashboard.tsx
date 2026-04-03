import { useState } from 'react';
import { useAgentEOIs } from '../hooks/useAgentEOIs';
import type { ExpressionOfInterest, EOIStatus, FinanceStatus } from '../types';
import { CheckCircle, XCircle, Star, Eye, Mail, Phone } from 'lucide-react';

const STATUS_ACTIONS: { label: string; value: EOIStatus; icon: React.ReactNode; color: string }[] = [
  { label: 'Shortlist', value: 'shortlisted', icon: <Star className="w-3 h-3" />, color: 'text-yellow-600' },
  { label: 'Accept', value: 'accepted', icon: <CheckCircle className="w-3 h-3" />, color: 'text-green-600' },
  { label: 'Decline', value: 'declined', icon: <XCircle className="w-3 h-3" />, color: 'text-red-500' },
  { label: 'Review', value: 'under_review', icon: <Eye className="w-3 h-3" />, color: 'text-blue-600' },
];

const FINANCE_BADGE: Record<string, string> = {
  cash: 'bg-green-100 text-green-800',
  pre_approved: 'bg-blue-100 text-blue-800',
  conditional: 'bg-amber-100 text-amber-800',
  not_arranged: 'bg-secondary text-muted-foreground',
};

interface Props {
  propertyId: string;
  propertyAddress: string;
  guidePrice?: number;
}

export function AgentEOIDashboard({ propertyId, propertyAddress, guidePrice }: Props) {
  const { eois, loading, updateStatus } = useAgentEOIs(propertyId);
  const [noteText, setNoteText] = useState('');
  const [activeId, setActiveId] = useState<string | null>(null);
  const [filterStatus, setFilter] = useState<string>('all');

  const visible = filterStatus === 'all'
    ? eois
    : eois.filter(e => e.status === filterStatus);

  const topOffer = eois[0]?.offered_price;

  if (loading) return <div className="animate-pulse h-40 bg-secondary rounded-xl" />;

  return (
    <div className="space-y-6">
      {/* KPI row */}
      <div className="grid grid-cols-4 gap-3">
        {[
          { label: 'Total EOIs', value: eois.length },
          { label: 'New', value: eois.filter(e => e.status === 'submitted').length },
          { label: 'Shortlisted', value: eois.filter(e => e.status === 'shortlisted').length },
          { label: 'Highest Offer', value: topOffer ? `$${(topOffer / 1000).toFixed(0)}k` : '—' },
        ].map(({ label, value }) => (
          <div key={label} className="p-3 rounded-xl bg-card border border-border text-center">
            <p className="font-display text-lg font-bold text-foreground">{value}</p>
            <p className="text-[11px] text-muted-foreground">{label}</p>
          </div>
        ))}
      </div>

      {/* Filter tabs */}
      <div className="flex flex-wrap gap-1.5">
        {(['all', 'submitted', 'under_review', 'shortlisted', 'accepted', 'declined'] as const).map(s => (
          <button
            key={s}
            onClick={() => setFilter(s)}
            className={`px-3 py-1 rounded-full text-xs font-medium border transition ${
              filterStatus === s
                ? 'bg-foreground text-background border-foreground'
                : 'bg-card text-muted-foreground border-border hover:border-foreground/40'
            }`}
          >
            {s === 'all' ? 'All' : s.replace('_', ' ')}
          </button>
        ))}
      </div>

      {/* EOI cards */}
      {visible.length === 0 && (
        <p className="text-sm text-muted-foreground text-center py-8">No EOIs in this category yet.</p>
      )}

      {visible.map(eoi => (
        <div key={eoi.id} className="rounded-xl border border-border bg-card p-4 space-y-3">
          <div className="flex items-start justify-between gap-3">
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <span className="font-semibold text-sm text-foreground">
                  {eoi.buyer?.full_name ?? 'Buyer'}
                </span>
                {eoi.buyer?.pre_approval_verified && (
                  <span className="text-[10px] font-semibold text-green-700 bg-green-100 px-1.5 py-0.5 rounded-full">
                    ✓ Pre-approved
                  </span>
                )}
                <span className={`text-[10px] font-medium px-1.5 py-0.5 rounded-full ${FINANCE_BADGE[eoi.finance_status] ?? ''}`}>
                  {eoi.finance_status.replace('_', ' ')}
                </span>
              </div>
              <p className="text-lg font-bold text-foreground mt-1">
                ${eoi.offered_price.toLocaleString()}
                {guidePrice && (
                  <span className={`text-xs ml-2 ${eoi.offered_price >= guidePrice ? 'text-green-600' : 'text-destructive'}`}>
                    ({eoi.offered_price >= guidePrice ? '+' : ''}
                    {Math.round((eoi.offered_price - guidePrice) / guidePrice * 100)}% guide)
                  </span>
                )}
              </p>
              <p className="text-xs text-muted-foreground mt-1">
                {eoi.settlement_days}d settlement · {eoi.conditions || 'No conditions stated'}
              </p>
              {eoi.cover_letter && (
                <p className="text-xs italic text-muted-foreground mt-2 line-clamp-2">
                  "{eoi.cover_letter}"
                </p>
              )}
              <div className="flex items-center gap-3 mt-2">
                {eoi.buyer?.phone && (
                  <a href={`tel:${eoi.buyer.phone}`} className="text-xs text-primary flex items-center gap-1 hover:underline">
                    <Phone className="w-3 h-3" /> {eoi.buyer.phone}
                  </a>
                )}
              </div>
            </div>

            {/* Status actions */}
            <div className="flex flex-col gap-1">
              {STATUS_ACTIONS.map(action => (
                <button
                  key={action.value}
                  onClick={() => updateStatus(eoi.id, action.value)}
                  disabled={eoi.status === action.value}
                  className={`flex items-center gap-1 text-xs px-2.5 py-1.5 rounded-lg border transition hover:bg-accent disabled:opacity-30 ${action.color} border-current`}
                >
                  {action.icon} {action.label}
                </button>
              ))}
            </div>
          </div>

          {/* Agent note */}
          {activeId === eoi.id ? (
            <div className="flex items-center gap-2">
              <input
                value={noteText}
                onChange={e => setNoteText(e.target.value)}
                placeholder="Add a note to this buyer…"
                className="flex-1 border border-border rounded px-2 py-1 text-xs bg-background text-foreground"
              />
              <button
                onClick={() => { updateStatus(eoi.id, eoi.status, noteText); setActiveId(null); }}
                className="text-xs bg-foreground text-background px-3 py-1 rounded"
              >
                Save
              </button>
              <button onClick={() => setActiveId(null)} className="text-xs text-muted-foreground">Cancel</button>
            </div>
          ) : (
            <button
              onClick={() => { setActiveId(eoi.id); setNoteText(eoi.agent_notes ?? ''); }}
              className="text-xs text-muted-foreground hover:text-foreground underline"
            >
              {eoi.agent_notes ? `Note: ${eoi.agent_notes}` : '+ Add note'}
            </button>
          )}
        </div>
      ))}
    </div>
  );
}
