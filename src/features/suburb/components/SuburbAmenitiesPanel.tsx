import type { SuburbAmenities } from '../types';

interface Props {
  amenities: SuburbAmenities;
}

const scoreColor = (n?: number) => {
  if (!n) return 'bg-muted';
  if (n >= 70) return 'bg-green-500';
  if (n >= 40) return 'bg-amber-400';
  return 'bg-red-400';
};

export function SuburbAmenitiesPanel({ amenities }: Props) {
  const categories = [
    { icon: '🎓', label: 'Schools', value: amenities.schools_count, detail: `${amenities.primary_schools} primary · ${amenities.secondary_schools} secondary · ${amenities.private_schools} private` },
    { icon: '🚆', label: 'Train Stations', value: amenities.train_stations },
    { icon: '🚌', label: 'Bus Stops', value: amenities.bus_stops },
    { icon: '🛒', label: 'Supermarkets', value: amenities.supermarkets },
    { icon: '🏥', label: 'Hospitals', value: amenities.hospitals },
    { icon: '🌳', label: 'Parks & Reserves', value: amenities.parks },
    { icon: '☕', label: 'Cafes & Restaurants', value: amenities.cafes_restaurants },
  ].filter((c) => c.value > 0);

  return (
    <div>
      {(amenities.walk_score != null || amenities.transit_score != null) && (
        <div className="flex gap-4 mb-6">
          {amenities.walk_score != null && (
            <div className="flex-1 p-4 rounded-xl bg-card border border-border text-center">
              <div className={`inline-flex items-center justify-center w-14 h-14 rounded-full text-xl font-bold text-white ${scoreColor(amenities.walk_score)}`}>
                {amenities.walk_score}
              </div>
              <p className="font-display font-semibold text-foreground mt-2 text-sm">Walk Score</p>
              <p className="text-xs text-muted-foreground">
                {amenities.walk_score >= 90 ? "Walker's Paradise" : amenities.walk_score >= 70 ? 'Very Walkable' : amenities.walk_score >= 50 ? 'Somewhat Walkable' : 'Car-Dependent'}
              </p>
            </div>
          )}
          {amenities.transit_score != null && (
            <div className="flex-1 p-4 rounded-xl bg-card border border-border text-center">
              <div className={`inline-flex items-center justify-center w-14 h-14 rounded-full text-xl font-bold text-white ${scoreColor(amenities.transit_score)}`}>
                {amenities.transit_score}
              </div>
              <p className="font-display font-semibold text-foreground mt-2 text-sm">Transit Score</p>
              <p className="text-xs text-muted-foreground">
                {amenities.transit_score >= 70 ? 'Excellent Transit' : amenities.transit_score >= 50 ? 'Good Transit' : 'Some Transit'}
              </p>
            </div>
          )}
        </div>
      )}

      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
        {categories.map(({ icon, label, value, detail }) => (
          <div key={label} className="p-3 rounded-xl bg-secondary border border-border">
            <div className="flex items-center gap-2 mb-1">
              <span className="text-lg">{icon}</span>
              <p className="font-display text-xl font-bold text-foreground">{value}</p>
            </div>
            <p className="text-xs text-muted-foreground">{label}</p>
            {detail && <p className="text-[10px] text-muted-foreground mt-0.5">{detail}</p>}
          </div>
        ))}
      </div>
    </div>
  );
}
