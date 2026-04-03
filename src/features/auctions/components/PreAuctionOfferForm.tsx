import { useState } from 'react';
import { usePreAuctionOffers } from '../hooks/useLiveAuction';
import { useAuth } from '@/features/auth/AuthProvider';
import { ChevronDown, ChevronUp, AlertTriangle } from 'lucide-react';

interface Props { propertyId: string; auctionId: string; }

export function PreAuctionOfferForm({ propertyId, auctionId }: Props) {
  const { user } = useAuth();
  const { submitOffer } = usePreAuctionOffers(auctionId);
  const [expanded, setExpanded] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [form, setForm] = useState({
    buyer_name: user?.user_metadata?.full_name ?? '',
    buyer_email: user?.email ?? '',
    buyer_phone: '',
    offer_amount: '',
    settlement_days: 60,
    subject_to_finance: false,
    subject_to_building: false,
    conditions: '',
  });

  const update = (field: string, value: any) => setForm(prev => ({ ...prev, [field]: value }));

  const amountNum = parseInt(form.offer_amount.replace(/[^0-9]/g, ''), 10) || 0;
  const depositAmount = Math.round(amountNum * 0.1);

  const handleSubmit = async () => {
    if (!amountNum || !form.buyer_name || !form.buyer_email) return;
    setSubmitting(true);
    setError(null);

    const profileId = user?.id;
    const { error: err } = await submitOffer({
      property_id: propertyId,
      auction_id: auctionId,
      buyer_profile_id: profileId ?? null,
      buyer_name: form.buyer_name,
      buyer_email: form.buyer_email,
      buyer_phone: form.buyer_phone || null,
      offer_amount: amountNum,
      deposit_amount: depositAmount,
      settlement_days: form.settlement_days,
      subject_to_finance: form.subject_to_finance,
      subject_to_building: form.subject_to_building,
      conditions: form.conditions || null,
    });

    if (err) setError(err.message);
    else setSubmitted(true);
    setSubmitting(false);
  };

  if (submitted) {
    return (
      <div className="rounded-2xl border border-emerald-200 dark:border-emerald-800 bg-emerald-50 dark:bg-emerald-950/30 p-5">
        <p className="font-semibold text-emerald-700 dark:text-emerald-400">Offer submitted</p>
        <p className="text-sm text-emerald-600 dark:text-emerald-500 mt-1">
          Your pre-auction offer of ${amountNum.toLocaleString('en-AU')} has been sent to the agent. They'll review it and respond within 48 hours.
        </p>
      </div>
    );
  }

  return (
    <div className="rounded-2xl border border-border bg-card overflow-hidden">
      <button onClick={() => setExpanded(!expanded)} className="w-full p-4 flex items-center justify-between text-left">
        <span className="font-semibold text-foreground text-sm">💰 Submit a Pre-Auction Offer</span>
        {expanded ? <ChevronUp size={16} className="text-muted-foreground" /> : <ChevronDown size={16} className="text-muted-foreground" />}
      </button>

      {expanded && (
        <div className="px-5 pb-5 space-y-3">
          <div className="p-3 rounded-xl bg-amber-50 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-800 flex items-start gap-2">
            <AlertTriangle size={14} className="text-amber-600 dark:text-amber-400 mt-0.5 shrink-0" />
            <p className="text-xs text-amber-700 dark:text-amber-400">
              Vendors are not obligated to accept pre-auction offers. Cooling-off does NOT apply to properties purchased at or prior to auction.
            </p>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <input value={form.buyer_name} onChange={e => update('buyer_name', e.target.value)} placeholder="Your name *"
              className="px-3 py-2.5 rounded-xl border border-border bg-background text-sm focus:outline-none focus:ring-2 focus:ring-ring" />
            <input value={form.buyer_email} onChange={e => update('buyer_email', e.target.value)} placeholder="Email *" type="email"
              className="px-3 py-2.5 rounded-xl border border-border bg-background text-sm focus:outline-none focus:ring-2 focus:ring-ring" />
          </div>
          <input value={form.buyer_phone} onChange={e => update('buyer_phone', e.target.value)} placeholder="Phone"
            className="w-full px-3 py-2.5 rounded-xl border border-border bg-background text-sm focus:outline-none focus:ring-2 focus:ring-ring" />

          <div className="relative">
            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground text-sm">$</span>
            <input value={form.offer_amount} onChange={e => update('offer_amount', e.target.value.replace(/[^0-9,]/g, ''))}
              placeholder="Offer amount *"
              className="w-full pl-7 pr-3 py-2.5 rounded-xl border border-border bg-background text-sm focus:outline-none focus:ring-2 focus:ring-ring" />
          </div>
          {amountNum > 0 && (
            <p className="text-xs text-muted-foreground">10% deposit: ${depositAmount.toLocaleString('en-AU')}</p>
          )}

          <select value={form.settlement_days} onChange={e => update('settlement_days', parseInt(e.target.value))}
            className="w-full px-3 py-2.5 rounded-xl border border-border bg-background text-sm focus:outline-none focus:ring-2 focus:ring-ring">
            <option value={30}>30 day settlement</option>
            <option value={45}>45 day settlement</option>
            <option value={60}>60 day settlement</option>
            <option value={90}>90 day settlement</option>
          </select>

          <div className="space-y-2">
            <label className="flex items-center gap-2 text-sm cursor-pointer">
              <input type="checkbox" checked={form.subject_to_finance} onChange={e => update('subject_to_finance', e.target.checked)} className="rounded border-border" />
              Subject to finance
            </label>
            <label className="flex items-center gap-2 text-sm cursor-pointer">
              <input type="checkbox" checked={form.subject_to_building} onChange={e => update('subject_to_building', e.target.checked)} className="rounded border-border" />
              Subject to building & pest inspection
            </label>
          </div>

          <textarea value={form.conditions} onChange={e => update('conditions', e.target.value)} placeholder="Additional conditions (optional)"
            rows={2} className="w-full px-3 py-2.5 rounded-xl border border-border bg-background text-sm focus:outline-none focus:ring-2 focus:ring-ring resize-none" />

          {error && <p className="text-sm text-destructive">{error}</p>}

          <button onClick={handleSubmit} disabled={submitting || !amountNum || !form.buyer_name || !form.buyer_email}
            className="w-full py-2.5 bg-primary text-primary-foreground rounded-xl text-sm font-semibold hover:bg-primary/90 disabled:opacity-50 transition-colors">
            {submitting ? 'Submitting…' : 'Submit Offer'}
          </button>
        </div>
      )}
    </div>
  );
}
