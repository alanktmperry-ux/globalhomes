import { useState } from 'react';
import { useOffmarketSubscriptions } from '../hooks/useOffmarketSubscriptions';
import { Bell, Trash2 } from 'lucide-react';

const AU_STATES = ['NSW', 'VIC', 'QLD', 'WA', 'SA', 'TAS', 'ACT', 'NT'];

export function OffMarketSubscribePanel() {
  const { subs, loading, addSubscription, removeSubscription } = useOffmarketSubscriptions();
  const [suburb, setSuburb] = useState('');
  const [state, setState] = useState('NSW');
  const [minPrice, setMin] = useState('');
  const [maxPrice, setMax] = useState('');
  const [minBeds, setMinBeds] = useState('');
  const [saving, setSaving] = useState(false);

  const handleAdd = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!suburb.trim()) return;
    setSaving(true);
    await addSubscription({
      suburb: suburb.trim(),
      state,
      min_price: minPrice ? Number(minPrice) : undefined,
      max_price: maxPrice ? Number(maxPrice) : undefined,
      min_bedrooms: minBeds ? Number(minBeds) : undefined,
      property_types: [],
    });
    setSuburb('');
    setMin('');
    setMax('');
    setMinBeds('');
    setSaving(false);
  };

  return (
    <div className="rounded-2xl bg-[hsl(var(--sidebar-background))] p-5 text-[hsl(var(--sidebar-foreground))]">
      <div className="flex items-center gap-2 mb-3">
        <Bell className="w-4 h-4 text-amber-400" />
        <h3 className="font-display font-semibold text-sm">Off-Market Alerts</h3>
      </div>
      <p className="text-xs text-muted-foreground mb-4">
        Get notified when off-market properties are listed in suburbs you're watching — before they hit the public market.
      </p>

      <form onSubmit={handleAdd} className="space-y-3">
        <div className="flex gap-2">
          <input
            value={suburb}
            onChange={e => setSuburb(e.target.value)}
            placeholder="Suburb name"
            className="flex-1 bg-background border border-border rounded-lg px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:ring-2 focus:ring-amber-400 focus:outline-none"
            required
          />
          <select
            value={state}
            onChange={e => setState(e.target.value)}
            className="bg-background border border-border rounded-lg px-3 py-2 text-sm text-foreground focus:outline-none"
          >
            {AU_STATES.map(s => (
              <option key={s} value={s}>{s}</option>
            ))}
          </select>
        </div>
        <div className="grid grid-cols-3 gap-2">
          <div>
            <label className="text-[10px] text-muted-foreground mb-0.5 block">Min price</label>
            <input
              type="number"
              value={minPrice}
              onChange={e => setMin(e.target.value)}
              placeholder="$0"
              className="w-full bg-background border border-border rounded-lg px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none"
            />
          </div>
          <div>
            <label className="text-[10px] text-muted-foreground mb-0.5 block">Max price</label>
            <input
              type="number"
              value={maxPrice}
              onChange={e => setMax(e.target.value)}
              placeholder="No limit"
              className="w-full bg-background border border-border rounded-lg px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none"
            />
          </div>
          <div>
            <label className="text-[10px] text-muted-foreground mb-0.5 block">Min beds</label>
            <input
              type="number"
              value={minBeds}
              onChange={e => setMinBeds(e.target.value)}
              placeholder="Any"
              min={1}
              max={6}
              className="w-full bg-background border border-border rounded-lg px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none"
            />
          </div>
        </div>
        <button
          type="submit"
          disabled={saving || !suburb.trim()}
          className="w-full py-2 bg-amber-500 hover:bg-amber-600 text-white text-sm font-semibold rounded-lg transition disabled:opacity-50"
        >
          {saving ? 'Saving…' : '+ Add Alert'}
        </button>
      </form>

      {subs.length > 0 && (
        <div className="mt-4 space-y-2">
          <p className="text-[10px] uppercase tracking-wider font-semibold text-muted-foreground">
            Active Alerts ({subs.length})
          </p>
          {subs.map(sub => (
            <div key={sub.id} className="flex items-center justify-between p-2 rounded-lg bg-background/50">
              <div>
                <p className="text-xs font-medium text-foreground">{sub.suburb}, {sub.state}</p>
                <p className="text-[10px] text-muted-foreground">
                  {sub.min_price ? `$${(sub.min_price / 1000).toFixed(0)}k` : 'Any price'}
                  {sub.max_price ? ` – $${(sub.max_price / 1000).toFixed(0)}k` : ''}
                  {sub.min_bedrooms ? ` · ${sub.min_bedrooms}+ beds` : ''}
                </p>
              </div>
              <button
                onClick={() => removeSubscription(sub.id)}
                className="text-muted-foreground hover:text-destructive p-1"
              >
                <Trash2 className="w-3.5 h-3.5" />
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
