import { useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { X } from 'lucide-react';

interface Props {
  propertyId: string;
  auctionDate: string | null;
  onClose: () => void;
  onSaved: () => void;
}

type ResultType = 'sold_at_auction' | 'sold_prior' | 'passed_in' | 'withdrawn';

const RESULT_OPTIONS: { value: ResultType; label: string }[] = [
  { value: 'sold_at_auction', label: 'Sold at auction' },
  { value: 'sold_prior', label: 'Sold prior to auction' },
  { value: 'passed_in', label: 'Passed in' },
  { value: 'withdrawn', label: 'Withdrawn' },
];

export function RecordAuctionResultModal({ propertyId, auctionDate, onClose, onSaved }: Props) {
  const [result, setResult] = useState<ResultType>('sold_at_auction');
  const [soldPrice, setSoldPrice] = useState('');
  const [numBidders, setNumBidders] = useState('');
  const [saving, setSaving] = useState(false);

  const isSold = ['sold_at_auction', 'sold_prior'].includes(result);

  const handleSave = async () => {
    setSaving(true);

    await supabase.from('auction_results').insert({
      property_id: propertyId,
      result,
      sold_price: soldPrice ? parseInt(soldPrice.replace(/,/g, ''), 10) : null,
      num_bidders: numBidders ? parseInt(numBidders, 10) : null,
      auction_date: auctionDate,
    } as any);

    const newStatus = isSold ? 'sold' : result === 'passed_in' ? 'active' : 'off_market';
    const newPrice = soldPrice ? parseInt(soldPrice.replace(/,/g, ''), 10) : undefined;

    await supabase
      .from('properties')
      .update({
        status: newStatus,
        listing_status: newStatus,
        ...(newPrice ? { price: newPrice } : {}),
      })
      .eq('id', propertyId);

    setSaving(false);
    onSaved();
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
      <div className="bg-card rounded-2xl shadow-lg w-full max-w-md border border-border">
        <div className="flex items-center justify-between p-5 border-b border-border">
          <h2 className="font-display text-lg font-semibold text-foreground">Record auction result</h2>
          <button onClick={onClose} className="text-muted-foreground hover:text-foreground">
            <X size={20} />
          </button>
        </div>

        <div className="p-5 space-y-4">
          <div>
            <label className="text-sm font-medium text-foreground mb-2 block">Result</label>
            <div className="grid grid-cols-2 gap-2">
              {RESULT_OPTIONS.map(opt => (
                <button
                  key={opt.value}
                  onClick={() => setResult(opt.value)}
                  className={`py-2.5 px-3 rounded-xl text-sm font-medium border transition-colors text-left ${
                    result === opt.value
                      ? 'bg-primary border-primary text-primary-foreground'
                      : 'bg-background border-border text-foreground hover:border-primary/40'
                  }`}
                >
                  {opt.label}
                </button>
              ))}
            </div>
          </div>

          {isSold && (
            <div>
              <label className="text-sm font-medium text-foreground mb-1.5 block">Sale price</label>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground text-sm">$</span>
                <input
                  value={soldPrice}
                  onChange={(e) => setSoldPrice(e.target.value.replace(/[^0-9,]/g, ''))}
                  placeholder="1,250,000"
                  className="w-full pl-7 pr-3 py-2.5 rounded-xl border border-border bg-background text-sm focus:outline-none focus:ring-2 focus:ring-ring"
                />
              </div>
            </div>
          )}

          <div>
            <label className="text-sm font-medium text-foreground mb-1.5 block">Number of registered bidders</label>
            <input
              value={numBidders}
              onChange={(e) => setNumBidders(e.target.value.replace(/\D/g, ''))}
              placeholder="e.g. 4"
              type="number"
              min="0"
              className="w-full px-3 py-2.5 rounded-xl border border-border bg-background text-sm focus:outline-none focus:ring-2 focus:ring-ring"
            />
          </div>

          <p className="text-xs text-muted-foreground">
            Recording this result will automatically update the listing status.
            {result === 'passed_in' ? ' The listing will return to Active for private negotiation.' : ''}
            {isSold ? ' The listing will be marked as Sold.' : ''}
          </p>
        </div>

        <div className="p-5 border-t border-border">
          <button
            onClick={handleSave}
            disabled={saving}
            className="w-full py-3 bg-primary text-primary-foreground rounded-xl font-semibold text-sm hover:bg-primary/90 disabled:opacity-50 transition-colors"
          >
            {saving ? 'Saving…' : 'Record result'}
          </button>
        </div>
      </div>
    </div>
  );
}
