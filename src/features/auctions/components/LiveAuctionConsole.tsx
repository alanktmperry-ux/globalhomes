import { useState } from 'react';
import { useLiveAuction } from '../hooks/useLiveAuction';
import { useAuctionRegistrations } from '../hooks/useAuctionRegistrations';
import { useAuctionAgent } from '../hooks/useAuction';
import { BidFeed } from './BidFeed';
import { toast } from 'sonner';
import { Gavel, Trophy, XCircle } from 'lucide-react';

interface Props { propertyId: string; auctionId: string; }

const INCREMENTS = [
  { label: '+$1k', value: 1000 },
  { label: '+$2.5k', value: 2500 },
  { label: '+$5k', value: 5000 },
  { label: '+$10k', value: 10000 },
  { label: '+$25k', value: 25000 },
  { label: '+$50k', value: 50000 },
];

export function LiveAuctionConsole({ propertyId, auctionId }: Props) {
  const { auction, concludeAuction } = useAuctionAgent(propertyId);
  const { bids, lastBid, reserveMet, isSubmitting, recordBid } = useLiveAuction(auctionId);
  const { registrations } = useAuctionRegistrations(auctionId);
  const approvedRegs = registrations.filter(r => r.is_approved);

  const [bidAmount, setBidAmount] = useState('');
  const [selectedReg, setSelectedReg] = useState<string>('');
  const [bidType, setBidType] = useState<'genuine' | 'vendor' | 'opening'>('genuine');
  const [bidSource, setBidSource] = useState('floor');
  const [showConclude, setShowConclude] = useState(false);
  const [concludeOutcome, setConcludeOutcome] = useState<'sold' | 'passed_in'>('sold');

  const currentBid = lastBid ?? 0;
  const reservePrice = auction?.reserve_price ?? 0;
  const reserveStatus = !reservePrice ? 'none' : reserveMet ? 'met' : currentBid >= reservePrice * 0.95 ? 'near' : 'below';

  const handleRecordBid = async () => {
    const amount = parseFloat(bidAmount.replace(/,/g, ''));
    if (!amount || amount <= currentBid) {
      toast.error('Bid must exceed current highest bid');
      return;
    }
    const { data } = await recordBid(amount, bidType, selectedReg || undefined, bidSource);
    if (data && typeof data === 'object' && 'success' in data) {
      if ((data as any).success) {
        setBidAmount('');
        toast.success(`Bid #${(data as any).bid_number} recorded`);
      } else {
        toast.error((data as any).error);
      }
    }
  };

  const handleConclude = async () => {
    const soldPrice = concludeOutcome === 'sold' ? currentBid : undefined;
    const winningBid = bids.find(b => b.is_winning);
    const { data } = await concludeAuction(auctionId, concludeOutcome, soldPrice, winningBid?.registration_id ?? undefined);
    if (data && typeof data === 'object' && 'success' in data && (data as any).success) {
      toast.success(concludeOutcome === 'sold' ? 'SOLD! 🎉' : 'Auction passed in');
      setShowConclude(false);
    }
  };

  const addIncrement = (inc: number) => {
    const next = currentBid + inc;
    setBidAmount(next.toString());
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
      {/* Left: Bid Controls */}
      <div className="space-y-5">
        {/* Current bid banner */}
        <div className="p-6 rounded-2xl bg-card border border-border text-center">
          <p className="text-xs text-muted-foreground uppercase tracking-wider">Current Bid</p>
          <p className="text-4xl font-bold text-foreground mt-2">
            ${currentBid.toLocaleString('en-AU')}
          </p>
          <div className="mt-3">
            {reserveStatus === 'below' && (
              <span className="px-3 py-1 rounded-full text-xs font-semibold bg-destructive/10 text-destructive">Below Reserve</span>
            )}
            {reserveStatus === 'near' && (
              <span className="px-3 py-1 rounded-full text-xs font-semibold bg-amber-100 text-amber-700 animate-pulse">AT RESERVE</span>
            )}
            {reserveStatus === 'met' && (
              <span className="px-3 py-1 rounded-full text-xs font-semibold bg-emerald-100 text-emerald-700">🟢 ON THE MARKET</span>
            )}
          </div>
        </div>

        {/* Bidder select */}
        <div>
          <label className="text-sm font-medium text-foreground mb-1.5 block">Bidder (Paddle)</label>
          <select value={selectedReg} onChange={e => setSelectedReg(e.target.value)}
            className="w-full px-3 py-2.5 rounded-xl border border-border bg-background text-sm focus:outline-none focus:ring-2 focus:ring-ring">
            <option value="">— Select bidder —</option>
            {approvedRegs.map(r => (
              <option key={r.id} value={r.id}>#{r.paddle_number} — {r.full_name}</option>
            ))}
          </select>
        </div>

        {/* Bid amount + increments */}
        <div>
          <label className="text-sm font-medium text-foreground mb-1.5 block">Bid Amount</label>
          <div className="relative">
            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">$</span>
            <input value={bidAmount} onChange={e => setBidAmount(e.target.value.replace(/[^0-9,]/g, ''))}
              className="w-full pl-7 pr-3 py-3 rounded-xl border border-border bg-background text-lg font-bold focus:outline-none focus:ring-2 focus:ring-ring" />
          </div>
          <div className="flex flex-wrap gap-1.5 mt-2">
            {INCREMENTS.map(inc => (
              <button key={inc.value} onClick={() => addIncrement(inc.value)}
                className="px-2.5 py-1.5 rounded-lg text-xs font-medium bg-secondary text-secondary-foreground hover:bg-secondary/80 transition-colors">
                {inc.label}
              </button>
            ))}
          </div>
        </div>

        {/* Bid type + source */}
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="text-xs text-muted-foreground mb-1 block">Bid Type</label>
            <div className="flex gap-1">
              {(['genuine', 'vendor', 'opening'] as const).map(t => (
                <button key={t} onClick={() => setBidType(t)}
                  className={`flex-1 py-2 rounded-lg text-xs font-medium transition-colors ${
                    bidType === t ? 'bg-primary text-primary-foreground' : 'bg-secondary text-secondary-foreground hover:bg-secondary/80'
                  }`}>
                  {t === 'genuine' ? 'Floor' : t === 'vendor' ? 'Vendor' : 'Opening'}
                </button>
              ))}
            </div>
          </div>
          <div>
            <label className="text-xs text-muted-foreground mb-1 block">Source</label>
            <div className="flex gap-1">
              {['floor', 'phone', 'online'].map(s => (
                <button key={s} onClick={() => setBidSource(s)}
                  className={`flex-1 py-2 rounded-lg text-xs font-medium transition-colors capitalize ${
                    bidSource === s ? 'bg-primary text-primary-foreground' : 'bg-secondary text-secondary-foreground hover:bg-secondary/80'
                  }`}>
                  {s}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Record Bid */}
        <button onClick={handleRecordBid} disabled={isSubmitting || !bidAmount}
          className="w-full py-4 bg-primary text-primary-foreground rounded-xl text-base font-bold hover:bg-primary/90 disabled:opacity-50 transition-colors flex items-center justify-center gap-2">
          <Gavel size={18} />
          {isSubmitting ? 'Recording…' : 'Record Bid'}
        </button>

        {/* Conclude buttons */}
        <div className="flex gap-2">
          <button onClick={() => { setConcludeOutcome('sold'); setShowConclude(true); }}
            className="flex-1 py-3 rounded-xl text-sm font-semibold bg-emerald-600 text-white hover:bg-emerald-700 transition-colors flex items-center justify-center gap-1.5">
            <Trophy size={16} /> SOLD
          </button>
          <button onClick={() => { setConcludeOutcome('passed_in'); setShowConclude(true); }}
            className="flex-1 py-3 rounded-xl text-sm font-semibold bg-amber-500 text-white hover:bg-amber-600 transition-colors flex items-center justify-center gap-1.5">
            <XCircle size={16} /> PASSED IN
          </button>
        </div>
      </div>

      {/* Right: Bid Feed */}
      <div className="space-y-4">
        <h3 className="font-semibold text-foreground">Live Bid Feed</h3>
        <BidFeed auctionId={auctionId} />
      </div>

      {/* Conclude dialog */}
      {showConclude && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
          <div className="bg-card rounded-2xl shadow-lg w-full max-w-sm border border-border p-6 space-y-4">
            <h3 className="font-semibold text-lg text-foreground">
              {concludeOutcome === 'sold' ? '🎉 Confirm Sale' : '⚠️ Confirm Passed In'}
            </h3>
            <p className="text-sm text-muted-foreground">
              {concludeOutcome === 'sold'
                ? `SOLD at $${currentBid.toLocaleString('en-AU')}. This will update the property status.`
                : `Passed in at $${currentBid.toLocaleString('en-AU')}. The highest bidder gets first right of negotiation.`}
            </p>
            <div className="flex gap-2">
              <button onClick={() => setShowConclude(false)} className="flex-1 py-2.5 rounded-xl text-sm bg-secondary text-secondary-foreground">Cancel</button>
              <button onClick={handleConclude}
                className={`flex-1 py-2.5 rounded-xl text-sm font-semibold text-white ${concludeOutcome === 'sold' ? 'bg-emerald-600 hover:bg-emerald-700' : 'bg-amber-500 hover:bg-amber-600'}`}>
                Confirm
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
