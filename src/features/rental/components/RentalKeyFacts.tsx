import { Calendar, PawPrint, Sofa, Clock, Zap, Cigarette, Car, WashingMachine, Wind, Users, DollarSign } from 'lucide-react';

interface Props { property: any; }

// Build utilities list from either array or individual boolean columns
function getUtilities(p: any): string | null {
  if (p.utilities_included?.length > 0) return p.utilities_included.join(', ');
  const items = [
    p.water_included && 'water',
    p.electricity_included && 'electricity',
    p.internet_included && 'internet',
  ].filter(Boolean) as string[];
  return items.length > 0 ? items.join(', ') : null;
}

// Build appliances list
function getAppliances(p: any): string | null {
  const items = [
    p.has_internal_laundry && 'laundry',
    p.has_dishwasher && 'dishwasher',
    p.has_washing_machine && 'washing machine',
  ].filter(Boolean) as string[];
  return items.length > 0 ? items.join(', ') : null;
}

export function RentalKeyFacts({ property: p }: Props) {
  const utilities = getUtilities(p);
  const appliances = getAppliances(p);

  const bondAmount = p.bond_amount ?? (p.rental_weekly ? p.rental_weekly * 4 : null);
  const bondWeeks = p.rental_weekly && bondAmount ? Math.round(bondAmount / p.rental_weekly) : 4;

  const facts = [
    ...(bondAmount != null ? [{
      icon: <DollarSign className="w-4 h-4" />,
      label: 'Bond',
      value: `$${bondAmount.toLocaleString('en-AU')} bond · ${bondWeeks} week${bondWeeks !== 1 ? 's' : ''}`,
    }] : []),
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
    ...(utilities ? [{
      icon: <Zap className="w-4 h-4" />,
      label: 'Includes',
      value: utilities,
      highlight: true,
    }] : []),
    {
      icon: <Cigarette className="w-4 h-4" />,
      label: 'Smoking',
      value: p.smoking_allowed ? 'Smoking permitted' : 'No smoking',
    },
    ...(p.rental_parking_type ? [{
      icon: <Car className="w-4 h-4" />,
      label: 'Parking',
      value: p.rental_parking_type,
    }] : []),
    ...(appliances ? [{
      icon: <WashingMachine className="w-4 h-4" />,
      label: 'Appliances',
      value: appliances,
    }] : []),
    ...(p.has_air_con ? [{
      icon: <Wind className="w-4 h-4" />,
      label: 'Cooling',
      value: 'Air conditioning',
      highlight: true,
    }] : []),
    ...(p.max_occupants > 0 ? [{
      icon: <Users className="w-4 h-4" />,
      label: 'Max occupants',
      value: `${p.max_occupants} people`,
    }] : []),
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
