import { useState, useEffect } from 'react';
import { useEOI } from '../hooks/useEOI';
import { OffMarketBadge } from './OffMarketBadge';
import type { FinanceStatus, ListingMode, EOIStatus } from '../types';
import { CheckCircle, AlertCircle } from 'lucide-react';

const FINANCE_LABELS: Record<FinanceStatus, string> = {
  cash: '💵 Cash buyer',
  pre_approved: '✅ Pre-approved finance',
  conditional: '⏳ Finance to be arranged',
  not_arranged: '❓ Finance not arranged',
};

interface Props {
  propertyId: string;
  listingMode: ListingMode;
  guidePrice?: number;
  closeDate?: string;
  agentName?: string;
}

export function EOISubmitPanel({ propertyId, listingMode, guidePrice, closeDate, agentName }: Props) {
  const { myEOI, loading, error, loadMyEOI, submitEOI, withdrawEOI } = useEOI(propertyId);
  const [price, setPrice] = useState(guidePrice ? String(guidePrice) : '');
  const [finance, setFinance] = useState<FinanceStatus>('pre_approved');
  const [settlement, setSettlement] = useState('42');
  const [conditions, setConditions] = useState('');
  const [coverLetter, setCoverLetter] = useState('');
  const [expanded, setExpanded] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    await submitEOI({
      property_id: propertyId,
      offered_price: Number(price.replace(/[^0-9]/g, '')),
      finance_status: finance,
      settlement_days: Number(settlement),
      conditions: conditions || undefined,
      cover_letter: coverLetter || undefined,
    });
  };

  // Already submitted
  if (myEOI && myEOI.status !== 'withdrawn') {
    const statusColors: Record<string, string> = {
      submitted: 'bg-blue-50 border-blue-200',
      under_review: 'bg-amber-50 border-amber-200',
      shortlisted: 'bg-green-50 border-green-200',
      accepted: 'bg-emerald-50 border-emerald-200',
      declined: 'bg-red-50 border-red-200',
    };
    const statusLabels: Record<string, string> = {
      submitted: '📋 EOI Received — the agent will be in touch',
      under_review: '🔍 Under Review — agent is reviewing your offer',
      shortlisted: '⭐ Shortlisted — you\'re in the running',
      accepted: '🎉 Accepted — congratulations!',
      declined: '❌ Declined — this offer was not accepted',
    };
    return (
      <div className={`rounded-2xl border p-5 ${statusColors[myEOI.status] ?? 'bg-secondary border-border'}`}>
        <div className="flex items-center gap-2 mb-3">
          <OffMarketBadge mode={listingMode} closeDate={closeDate} />
          <span className="text-xs text-muted-foreground">
            Submitted {new Date(myEOI.submitted_at).toLocaleDateString('en-AU')}
          </span>
        </div>
        <p className="text-sm font-medium text-foreground">
          {statusLabels[myEOI.status] ?? myEOI.status}
        </p>
        <p className="text-xs text-muted-foreground mt-2">
          Your offer: ${myEOI.offered_price.toLocaleString()} · {FINANCE_LABELS[myEOI.finance_status]}
        </p>
        {myEOI.agent_notes && (
          <p className="text-xs text-muted-foreground mt-2 italic">
            Agent note: {myEOI.agent_notes}
          </p>
        )}
        {myEOI.status === 'submitted' && (
          <button
            onClick={() => withdrawEOI(myEOI.id)}
            className="mt-3 text-xs text-muted-foreground underline hover:text-destructive"
          >
            Withdraw EOI
          </button>
        )}
      </div>
    );
  }

  return (
    <div className="rounded-2xl border border-purple-200 bg-purple-50/50 p-5">
      <div className="flex items-center gap-2 mb-2">
        <OffMarketBadge mode={listingMode} closeDate={closeDate} />
        {closeDate && (
          <span className="text-xs text-muted-foreground">
            Closes {new Date(closeDate).toLocaleDateString('en-AU', { day: 'numeric', month: 'short' })}
          </span>
        )}
      </div>

      <h3 className="font-display text-base font-semibold text-foreground mb-1">
        {listingMode === 'eoi' ? 'Submit Expression of Interest' : 'Express Interest'}
      </h3>
      <p className="text-xs text-muted-foreground mb-4">
        {guidePrice
          ? `Price guide: $${guidePrice.toLocaleString()} · All EOIs reviewed by ${agentName ?? 'the agent'}`
          : `Submit your offer details to ${agentName ?? 'the agent'} — no public price yet`}
      </p>

      <form onSubmit={handleSubmit} className="space-y-3">
        <div>
          <label className="block text-xs font-medium text-foreground mb-1">Your Offer Price *</label>
          <div className="relative">
            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm text-muted-foreground">$</span>
            <input
              type="text"
              value={price}
              onChange={e => setPrice(e.target.value)}
              placeholder={guidePrice ? guidePrice.toLocaleString() : '0'}
              className="pl-7 w-full border border-border rounded-lg px-3 py-2 text-sm bg-background text-foreground focus:ring-2 focus:ring-purple-400 focus:outline-none"
              required
            />
          </div>
        </div>

        <div>
          <label className="block text-xs font-medium text-foreground mb-1">Finance Status *</label>
          <select
            value={finance}
            onChange={e => setFinance(e.target.value as FinanceStatus)}
            className="w-full border border-border rounded-lg px-3 py-2 text-sm bg-background text-foreground focus:ring-2 focus:ring-purple-400 focus:outline-none"
          >
            {Object.entries(FINANCE_LABELS).map(([v, label]) => (
              <option key={v} value={v}>{label}</option>
            ))}
          </select>
        </div>

        <div>
          <label className="block text-xs font-medium text-foreground mb-1">Preferred Settlement (days)</label>
          <input
            type="number"
            value={settlement}
            onChange={e => setSettlement(e.target.value)}
            min={14}
            max={180}
            className="w-full border border-border rounded-lg px-3 py-2 text-sm bg-background text-foreground focus:ring-2 focus:ring-purple-400 focus:outline-none"
          />
        </div>

        <button
          type="button"
          onClick={() => setExpanded(!expanded)}
          className="text-xs text-purple-700 underline"
        >
          {expanded ? '▲ Hide' : '▼ Add'} conditions & cover letter
        </button>

        {expanded && (
          <>
            <div>
              <label className="block text-xs font-medium text-foreground mb-1">
                Conditions (building & pest, due diligence, etc.)
              </label>
              <textarea
                value={conditions}
                onChange={e => setConditions(e.target.value)}
                rows={2}
                placeholder="e.g. Subject to building & pest inspection"
                className="w-full border border-border rounded-lg px-3 py-2 text-sm bg-background text-foreground focus:ring-2 focus:ring-purple-400 focus:outline-none resize-none"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-foreground mb-1">
                Cover Letter (optional — stands out to vendors)
              </label>
              <textarea
                value={coverLetter}
                onChange={e => setCoverLetter(e.target.value)}
                rows={3}
                placeholder="Tell the vendor why this is your perfect home…"
                className="w-full border border-border rounded-lg px-3 py-2 text-sm bg-background text-foreground focus:ring-2 focus:ring-purple-400 focus:outline-none resize-none"
              />
            </div>
          </>
        )}

        {error && <p className="text-sm text-destructive">{error}</p>}

        <button
          type="submit"
          disabled={loading || !price}
          className="w-full bg-purple-700 hover:bg-purple-800 text-white font-semibold py-2.5 rounded-lg text-sm transition disabled:opacity-50"
        >
          {loading ? 'Submitting…' : 'Submit EOI →'}
        </button>
        <p className="text-xs text-muted-foreground text-center">
          Submitting an EOI is not legally binding — the agent will contact you to progress.
        </p>
      </form>
    </div>
  );
}
