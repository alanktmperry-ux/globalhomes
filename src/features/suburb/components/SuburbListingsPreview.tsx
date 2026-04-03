import { Link } from 'react-router-dom';

interface MiniListing {
  id: string;
  address: string;
  price?: number;
  price_formatted?: string;
  sold_price?: number;
  sold_at?: string;
  beds?: number;
  baths?: number;
  property_type?: string;
  images?: string[];
  image_url?: string;
  slug?: string;
}

interface Props {
  listings: MiniListing[];
  mode: 'active' | 'sold';
  suburbName: string;
  state: string;
}

export function SuburbListingsPreview({ listings, mode, suburbName, state }: Props) {
  if (!listings.length) return null;

  return (
    <div>
      <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
        {listings.map((p) => {
          const img = p.image_url || p.images?.[0] || '';
          return (
            <Link
              key={p.id}
              to={`/property/${p.slug ?? p.id}`}
              className="group rounded-xl border border-border overflow-hidden bg-card hover:border-primary/40 transition-colors"
            >
              <div className="aspect-[4/3] bg-secondary overflow-hidden">
                {img ? (
                  <img src={img} alt={p.address} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300" loading="lazy" />
                ) : (
                  <div className="w-full h-full flex items-center justify-center text-xs text-muted-foreground">No photo</div>
                )}
              </div>
              <div className="p-3">
                {mode === 'sold' && p.sold_price ? (
                  <div className="flex items-baseline gap-2">
                    <p className="font-display font-bold text-foreground text-sm">${p.sold_price.toLocaleString()}</p>
                    <span className="text-[10px] text-muted-foreground">
                      {new Date(p.sold_at!).toLocaleDateString('en-AU', { month: 'short', year: 'numeric' })}
                    </span>
                  </div>
                ) : (
                  <p className="font-display font-bold text-foreground text-sm">
                    {p.price ? `$${p.price.toLocaleString()}` : p.price_formatted || 'Contact agent'}
                  </p>
                )}
                <p className="text-xs text-muted-foreground mt-1 truncate">{p.address}</p>
                {(p.beds || p.baths) && (
                  <p className="text-[10px] text-muted-foreground mt-0.5">
                    {p.beds ? `${p.beds}bd ` : ''}
                    {p.baths ? `${p.baths}ba` : ''}
                  </p>
                )}
              </div>
            </Link>
          );
        })}
      </div>
      <div className="mt-4 text-center">
        <Link
          to={`/buy/${state.toLowerCase()}/${suburbName.toLowerCase().replace(/\s+/g, '-')}`}
          className="text-sm text-primary hover:underline font-medium"
        >
          View all {mode === 'sold' ? 'recent sales' : 'active listings'} in {suburbName} →
        </Link>
      </div>
    </div>
  );
}
