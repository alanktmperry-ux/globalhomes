import { Building2, MapPin, Home } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { StrataHealthBadge } from './StrataHealthBadge';
import { useNavigate } from 'react-router-dom';

interface Scheme {
  id: string;
  scheme_name: string;
  suburb: string;
  state: string;
  total_lots: number;
  admin_fund_levy_per_lot: number | null;
  capital_works_levy_per_lot: number | null;
  strata_health_score: number | null;
  building_type: string | null;
}

export function StrataSchemeCard({ scheme }: { scheme: Scheme }) {
  const navigate = useNavigate();
  const totalLevy = (Number(scheme.admin_fund_levy_per_lot || 0) + Number(scheme.capital_works_levy_per_lot || 0));

  return (
    <Card
      className="cursor-pointer hover:shadow-lg transition-shadow border-border/60"
      onClick={() => navigate(`/schemes/${scheme.id}`)}
    >
      <CardContent className="p-4 space-y-3">
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0">
            <h3 className="font-semibold text-foreground truncate">{scheme.scheme_name}</h3>
            <p className="text-xs text-muted-foreground flex items-center gap-1 mt-0.5">
              <MapPin size={12} /> {scheme.suburb}, {scheme.state}
            </p>
          </div>
          <StrataHealthBadge score={scheme.strata_health_score} size="sm" />
        </div>

        <div className="flex items-center gap-4 text-xs text-muted-foreground">
          <span className="flex items-center gap-1"><Home size={12} /> {scheme.total_lots} lots</span>
          {scheme.building_type && (
            <span className="flex items-center gap-1"><Building2 size={12} /> {scheme.building_type}</span>
          )}
        </div>

        {totalLevy > 0 && (
          <div className="text-sm font-medium text-foreground">
            ${totalLevy.toLocaleString()}<span className="text-xs text-muted-foreground font-normal">/qtr/lot</span>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
