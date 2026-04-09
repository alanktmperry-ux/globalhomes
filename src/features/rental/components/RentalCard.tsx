import { Link } from 'react-router-dom';
import { Calendar, PawPrint } from 'lucide-react';

interface Props {
  property: any;
}

export function RentalCard({ property: p }: Props) {
  const availStr = p.available_from
    ? new Date(p.available_from) <= new Date()
      ? 'Available now'
      : `Available ${new Date(p.available_from).toLocaleDateString('en-AU', { day: 'numeric', month: 'short' })}`
    : 'Available now';

  const imgUrl = p.images?.[0] || p.image_url;

  return (
    <Link
      to={`/rent/property/${p.id}`}
      className="group block bg-card border border-border rounded-2xl overflow-hidden hover:shadow-lg transition-shadow"
    >
      {/* Image */}
      <div className="relative aspect-[4/3] bg-muted overflow-hidden">
        {imgUrl ? (
          <img
            src={imgUrl}
            alt={p.address}
            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center text-3xl">🏠</div>
        )}
        {p.pets_allowed && (
          <span className="absolute top-2 left-2 bg-green-600 text-white text-[10px] font-bold px-2 py-0.5 rounded-full flex items-center gap-1">
            <PawPrint className="w-3 h-3" /> Pets OK
          </span>
        )}
      </div>

      {/* Details */}
      <div className="p-4">
        <div className="flex items-baseline justify-between mb-1">
          <div>
            <span className="text-lg font-bold text-foreground">
              {p.rental_weekly?.toLocaleString('en-AU', { style: 'currency', currency: 'AUD' })}/wk
            </span>
            {p.rental_weekly > 0 && (
              <p className="text-xs text-muted-foreground">
                {(p.rental_weekly * 2).toLocaleString('en-AU', { style: 'currency', currency: 'AUD' })} per fortnight
              </p>
            )}
          </div>
          <span className="text-[10px] font-medium text-muted-foreground bg-secondary px-2 py-0.5 rounded-full uppercase">
            {p.property_type ?? 'Property'}
          </span>
        </div>

        <p className="text-sm font-medium text-foreground truncate">{p.address}</p>
        <p className="text-xs text-muted-foreground">{p.suburb}, {p.state}</p>

        {/* Stats */}
        <div className="flex items-center gap-3 mt-2 text-xs text-muted-foreground">
          {p.beds > 0 && <span>{p.beds} 🛏</span>}
          {p.baths > 0 && <span>{p.baths} 🚿</span>}
          {p.parking > 0 && <span>{p.parking} 🚗</span>}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between mt-3 text-xs text-muted-foreground">
          <span className="flex items-center gap-1">
            <Calendar className="w-3 h-3" />
            {availStr}
          </span>
        </div>
      </div>
    </Link>
  );
}
