import { Calendar, PawPrint, Sofa, Clock, Zap, Cigarette } from 'lucide-react';

interface Props { property: any; }

export function RentalKeyFacts({ property: p }: Props) {
  const facts = [
    {
      icon: <Calendar className="w-4 h-4" />,
      label: 'Available',
      value: p.available_from
        ? new Date(p.available_from) <= new Date()
          ? 'Now'
          : new Date(p.available_from).toLocaleDateString('en-AU', { day: 'numeric', month: 'long', year: 'numeric' })
        : 'Immediately',
    },
    { icon: <Clock className="w-4 h-4" />, label: 'Lease term', value: p.lease_term ?? 'Negotiable' },
    {
      icon: <Sofa className="w-4 h-4" />,
      label: 'Furnishings',
      value: p.furnished ? 'Furnished' : 'Unfurnished',
    },
    {
      icon: <PawPrint className="w-4 h-4" />,
      label: 'Pets',
      value: p.pets_allowed ? 'Pets considered' : 'No pets',
      highlight: p.pets_allowed,
    },
    ...(p.utilities_included?.length > 0 ? [{
      icon: <Zap className="w-4 h-4" />,
      label: 'Includes',
      value: p.utilities_included.join(', '),
      highlight: true,
    }] : []),
    {
      icon: <Cigarette className="w-4 h-4" />,
      label: 'Smoking',
      value: p.smoking_allowed ? 'Smoking permitted' : 'No smoking',
    },
  ];

  return (
    <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
      {facts.map(({ icon, label, value, highlight }) => (
        <div key={label} className="flex items-start gap-3 p-3 bg-secondary rounded-xl">
          <span className="text-muted-foreground mt-0.5">{icon}</span>
          <div>
            <p className="text-xs text-muted-foreground">{label}</p>
            <p className={`text-sm font-medium ${highlight ? 'text-green-600' : 'text-foreground'}`}>
              {value}
            </p>
          </div>
        </div>
      ))}
    </div>
  );
}
