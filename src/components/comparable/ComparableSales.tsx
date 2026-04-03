import { useState } from 'react';
import { BarChart2, MapPin, ChevronDown, ChevronUp, ExternalLink, TrendingUp } from 'lucide-react';
import { Link } from 'react-router-dom';
import { useComparableSales, type ComparableSale } from '@/hooks/useComparableSales';
import { ComparableSalesMap } from './ComparableSalesMap';

interface Props {
  propertyId: string;
  lat: number | null;
  lng: number | null;
  bedrooms: number;
  price: number | null;
  suburb: string;
  state: string;
  subjectAddress: string;
}

function formatPrice(n: number) {
  if (n >= 1_000_000) return `$${(n / 1_000_000).toFixed(2)}M`;
  return `$${(n / 1000).toFixed(0)}k`;
}

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString('en-AU', { month: 'short', year: 'numeric' });
}

function CompCard({ comp, subjectPrice }: { comp: ComparableSale; subjectPrice: number | null }) {
  const coverImage = comp.images?.[0];
  const distLabel = comp.distance_km < 0.1
    ? `${Math.round(comp.distance_km * 1000)}m away`
    : `${comp.distance_km.toFixed(1)}km away`;

  const priceDiffPct = subjectPrice
    ? Math.round(((comp.sold_price - subjectPrice) / subjectPrice) * 100)
    : null;

  return (
    <div className="flex gap-3 p-3 rounded-xl border border-border bg-card hover:border-primary/30 transition-colors">
      {/* Thumbnail */}
      <div className="w-20 h-16 rounded-lg overflow-hidden shrink-0 bg-secondary">
        {coverImage ? (
          <img src={coverImage} alt={comp.address} className="w-full h-full object-cover" />
        ) : (
          <div className="w-full h-full flex items-center justify-center text-muted-foreground text-lg">🏠</div>
        )}
      </div>

      {/* Details */}
      <div className="flex-1 min-w-0">
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0">
            <p className="text-sm font-bold text-foreground">{formatPrice(comp.sold_price)}</p>
            <p className="text-xs text-muted-foreground truncate">{comp.address}</p>
            <div className="flex items-center gap-2 mt-1 text-xs text-muted-foreground">
              <span>{comp.beds}bd · {comp.baths}ba{comp.parking ? ` · ${comp.parking}🚗` : ''}</span>
              {comp.floor_area_sqm && <span>{comp.floor_area_sqm}m²</span>}
              {comp.price_per_sqm && (
                <span className="text-primary font-medium">${Math.round(comp.price_per_sqm).toLocaleString()}/m²</span>
              )}
            </div>
          </div>
          <div className="text-right shrink-0">
            <p className="text-[11px] text-muted-foreground">{formatDate(comp.sold_at)}</p>
            <p className="text-[11px] text-muted-foreground flex items-center gap-0.5 justify-end">
              <MapPin size={10} /> {distLabel}
            </p>
            {priceDiffPct !== null && (
              <span className={`inline-block mt-0.5 text-[10px] font-semibold ${priceDiffPct >= 0 ? 'text-amber-600' : 'text-green-600'}`}>
                {priceDiffPct >= 0 ? '▲' : '▼'} {Math.abs(priceDiffPct)}% vs listing
              </span>
            )}
            {comp.slug && (
              <Link to={`/property/${comp.slug}`} className="text-[10px] text-primary hover:underline flex items-center gap-0.5 justify-end mt-0.5">
                View <ExternalLink size={8} />
              </Link>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

export function ComparableSales({ propertyId, lat, lng, bedrooms, price, suburb, state, subjectAddress }: Props) {
  const { comps, stats, loading, radiusKm } = useComparableSales(propertyId, lat, lng, bedrooms, suburb, state);
  const [open, setOpen] = useState(false);
  const [showMap, setShowMap] = useState(false);

  if (!lat || !lng) return null;

  const medianPrice = stats?.median_price ?? null;

  let pricePosition: string | null = null;
  if (price && medianPrice) {
    const diff = ((price - medianPrice) / medianPrice) * 100;
    pricePosition = diff >= 0
      ? `${Math.abs(diff).toFixed(0)}% above suburb median`
      : `${Math.abs(diff).toFixed(0)}% below suburb median`;
  }

  return (
    <div className="rounded-2xl border border-border bg-card shadow-card overflow-hidden">
      {/* Header */}
      <button
        onClick={() => setOpen(!open)}
        className="w-full flex items-center justify-between px-5 py-4 hover:bg-secondary/50 transition-colors"
      >
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-lg bg-primary/10 flex items-center justify-center">
            <BarChart2 size={18} className="text-primary" />
          </div>
          <div className="text-left">
            <p className="text-sm font-semibold text-foreground">Comparable Sales</p>
            {!open && (
              <p className="text-xs text-muted-foreground">
                {loading
                  ? 'Loading nearby sold properties…'
                  : stats?.count
                  ? `${stats.count} sold in ${suburb} last 12mo · Median ${medianPrice ? formatPrice(medianPrice) : 'N/A'}`
                  : `Recent sales within ${radiusKm}km`}
              </p>
            )}
          </div>
        </div>
        {open ? <ChevronUp size={18} className="text-muted-foreground" /> : <ChevronDown size={18} className="text-muted-foreground" />}
      </button>

      {open && (
        <div className="px-5 pb-5 space-y-4">
          {/* Suburb Stats */}
          {stats && stats.count > 0 && (
            <div className="p-4 rounded-xl bg-secondary/50">
              <p className="text-xs font-medium text-muted-foreground mb-3">
                {suburb} · {bedrooms} bedroom · last 12 months
              </p>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                <div>
                  <p className="text-[11px] text-muted-foreground uppercase tracking-wider">Median price</p>
                  <p className="text-base font-bold text-foreground">{medianPrice ? formatPrice(medianPrice) : '—'}</p>
                </div>
                <div>
                  <p className="text-[11px] text-muted-foreground uppercase tracking-wider">Sales volume</p>
                  <p className="text-base font-bold text-foreground">{stats.count}</p>
                </div>
                <div>
                  <p className="text-[11px] text-muted-foreground uppercase tracking-wider">Avg DOM</p>
                  <p className="text-base font-bold text-foreground">
                    {stats.avg_days_on_market ? Math.round(stats.avg_days_on_market) : '—'}
                  </p>
                </div>
                <div>
                  <p className="text-[11px] text-muted-foreground uppercase tracking-wider">Avg $/m²</p>
                  <p className="text-base font-bold text-foreground">
                    {stats.avg_price_sqm ? `$${Math.round(stats.avg_price_sqm).toLocaleString()}` : '—'}
                  </p>
                </div>
              </div>

              {pricePosition && price && (
                <p className={`mt-3 text-xs font-semibold inline-flex items-center gap-1.5 rounded-full px-3 py-1 ${
                  price >= (medianPrice ?? 0) ? 'bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-300' : 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300'
                }`}>
                  <TrendingUp size={12} />
                  This listing is {pricePosition}
                </p>
              )}
            </div>
          )}

          {/* Map / List toggle */}
          <div className="flex border-b border-border">
            <button
              onClick={() => setShowMap(false)}
              className={`flex-1 py-2.5 text-sm font-medium border-b-2 transition-colors ${
                !showMap ? 'border-primary text-primary' : 'border-transparent text-muted-foreground hover:text-foreground'
              }`}
            >
              List view
            </button>
            <button
              onClick={() => setShowMap(true)}
              className={`flex-1 py-2.5 text-sm font-medium border-b-2 transition-colors ${
                showMap ? 'border-primary text-primary' : 'border-transparent text-muted-foreground hover:text-foreground'
              }`}
            >
              Map view
            </button>
          </div>

          {/* Map view */}
          {showMap && lat && lng && (
            <ComparableSalesMap
              subjectLat={lat}
              subjectLng={lng}
              subjectAddress={subjectAddress}
              comps={comps}
            />
          )}

          {/* List view */}
          {!showMap && (
            <div>
              {loading ? (
                <div className="space-y-3">
                  {[1, 2, 3].map(i => (
                    <div key={i} className="flex gap-3 p-3 rounded-xl border border-border animate-pulse">
                      <div className="w-20 h-16 rounded-lg bg-secondary" />
                      <div className="flex-1 space-y-2">
                        <div className="h-4 bg-secondary rounded w-1/3" />
                        <div className="h-3 bg-secondary rounded w-2/3" />
                        <div className="h-3 bg-secondary rounded w-1/2" />
                      </div>
                    </div>
                  ))}
                </div>
              ) : comps.length === 0 ? (
                <div className="text-center py-8">
                  <BarChart2 size={32} className="mx-auto text-muted-foreground mb-2" />
                  <p className="text-sm font-medium text-foreground">No comparable sales found nearby</p>
                  <p className="text-xs text-muted-foreground mt-1">This may be a unique property or a low-turnover area.</p>
                </div>
              ) : (
                <div className="space-y-2">
                  <p className="text-xs text-muted-foreground">
                    {comps.length} sold propert{comps.length !== 1 ? 'ies' : 'y'} within {radiusKm}km
                    · {bedrooms} bed ±1 · sold in last 24 months
                  </p>
                  {comps.map(comp => (
                    <CompCard key={comp.id} comp={comp} subjectPrice={price} />
                  ))}
                </div>
              )}
            </div>
          )}

          <div className="pt-2 border-t border-border">
            <p className="text-[11px] text-muted-foreground leading-relaxed">
              Comparable sales are properties sold within {radiusKm}km with similar bedroom count,
              sold in the last 24 months. Data sourced from ListHQ sold listings.
              This is not a formal valuation.
            </p>
          </div>
        </div>
      )}
    </div>
  );
}
