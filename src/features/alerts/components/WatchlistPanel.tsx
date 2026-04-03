import { Link } from 'react-router-dom';
import { useSavedProperties } from '@/features/properties/hooks/useSavedProperties';
import { Heart } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/features/auth/AuthProvider';
import { useState, useEffect } from 'react';

interface SavedPropertyItem {
  property_id: string;
  saved_price?: number;
  notes?: string;
  saved_at: string;
  property?: {
    address: string;
    suburb: string;
    state: string;
    price: number;
    beds?: number;
    baths?: number;
    images?: string[];
  };
}

export function WatchlistPanel() {
  const { user } = useAuth();
  const { savedIds, toggleSaved } = useSavedProperties();
  const [items, setItems] = useState<SavedPropertyItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) { setItems([]); setLoading(false); return; }
    const fetchItems = async () => {
      setLoading(true);
      const { data } = await supabase
        .from('saved_properties')
        .select(`
          property_id, saved_price, notes, saved_at,
          properties:property_id (address, suburb, state, price, beds, baths, images)
        `)
        .eq('user_id', user.id)
        .order('saved_at', { ascending: false });

      const mapped = (data ?? []).map((d: any) => ({
        property_id: d.property_id,
        saved_price: d.saved_price,
        notes: d.notes,
        saved_at: d.saved_at,
        property: d.properties,
      }));
      setItems(mapped);
      setLoading(false);
    };
    fetchItems();
  }, [user, savedIds]);

  if (loading) return (
    <div className="space-y-4">
      {[1, 2, 3].map(i => (
        <div key={i} className="h-24 bg-muted/50 rounded-2xl animate-pulse" />
      ))}
    </div>
  );

  if (!items.length) return (
    <div className="flex flex-col items-center justify-center py-16 text-muted-foreground">
      <Heart className="w-10 h-10 mb-3 text-border" strokeWidth={1.2} />
      <p className="text-sm font-medium text-foreground mb-1">Your watchlist is empty</p>
      <p className="text-xs text-muted-foreground mb-4 text-center max-w-[220px]">
        Tap the heart icon on any property to save it here
      </p>
      <Link
        to="/"
        className="px-5 py-2.5 rounded-xl bg-primary text-primary-foreground text-sm font-medium hover:bg-primary/90 transition"
      >
        Browse Properties
      </Link>
    </div>
  );

  const priceDrops = items.filter(s =>
    s.saved_price && s.property?.price && s.property.price < s.saved_price
  );

  return (
    <div className="space-y-4">
      {priceDrops.length > 0 && (
        <div className="rounded-2xl bg-emerald-500/5 border border-emerald-500/20 p-4">
          <p className="text-sm font-semibold text-emerald-700 dark:text-emerald-400 mb-2">
            🎉 {priceDrops.length} price drop{priceDrops.length > 1 ? 's' : ''} on your watchlist!
          </p>
          {priceDrops.map(s => {
            const drop = s.saved_price! - s.property!.price;
            return (
              <Link key={s.property_id} to={`/property/${s.property_id}`} className="block text-xs text-emerald-600 dark:text-emerald-400 hover:underline">
                {s.property?.address} — ↓ ${drop.toLocaleString()}
              </Link>
            );
          })}
        </div>
      )}

      <div className="space-y-3">
        {items.map(item => {
          const p = item.property;
          if (!p) return null;
          const priceDrop = item.saved_price && p.price < item.saved_price
            ? item.saved_price - p.price : 0;
          return (
            <div key={item.property_id} className="rounded-2xl border border-border bg-card overflow-hidden">
              <Link to={`/property/${item.property_id}`} className="flex gap-3 p-3">
                <div className="w-20 h-20 rounded-xl overflow-hidden flex-shrink-0 bg-muted">
                  {p.images?.[0] ? (
                    <img src={p.images[0]} alt={p.address} className="w-full h-full object-cover" />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-muted-foreground text-xs">
                      No photo
                    </div>
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-display font-semibold text-foreground text-sm truncate">{p.address}</p>
                  <p className="text-xs text-muted-foreground">{p.suburb}, {p.state}</p>
                  <div className="flex items-center gap-2 mt-1">
                    <span className="text-sm font-bold text-foreground">
                      ${p.price?.toLocaleString()}
                    </span>
                    {priceDrop > 0 && (
                      <span className="text-[10px] font-bold text-emerald-600 bg-emerald-500/10 px-1.5 py-0.5 rounded-full">
                        ↓ ${priceDrop.toLocaleString()}
                      </span>
                    )}
                  </div>
                  {(p.beds || p.baths) && (
                    <p className="text-xs text-muted-foreground mt-0.5">
                      {p.beds ? `${p.beds}bd ` : ''}{p.baths ? `${p.baths}ba` : ''}
                    </p>
                  )}
                </div>
                <button
                  onClick={e => { e.preventDefault(); e.stopPropagation(); toggleSaved(item.property_id); }}
                  className="self-start p-1.5 text-destructive hover:bg-destructive/10 rounded-lg transition"
                >
                  <Heart className="w-4 h-4 fill-current" />
                </button>
              </Link>
            </div>
          );
        })}
      </div>
    </div>
  );
}
