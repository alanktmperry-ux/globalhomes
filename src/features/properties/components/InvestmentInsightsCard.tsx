import { TrendingUp, Home, Globe, CalendarDays, Receipt, Building2 } from 'lucide-react';
import { Property } from '@/shared/lib/types';

function calcGrade(p: Property): { grade: 'A' | 'B' | 'C'; score: number } {
  let score = 0;
  if ((p.rentalYieldPct || 0) >= 8) score += 40;
  else if ((p.rentalYieldPct || 0) >= 5) score += 20;
  if (p.strPermitted === true) score += 25;
  if (p.country && p.country !== 'Australia') score += 20;
  if ((p.rentalWeekly || 0) > 0) score += 15;
  const grade = score >= 60 ? 'A' : score >= 30 ? 'B' : 'C';
  return { grade, score };
}

const gradeColors = {
  A: 'bg-emerald-500/15 text-emerald-600 border-emerald-500/30',
  B: 'bg-amber-500/15 text-amber-600 border-amber-500/30',
  C: 'bg-muted text-muted-foreground border-border',
};

interface Props {
  property: Property;
  compact?: boolean;
}

export function InvestmentInsightsCard({ property, compact }: Props) {
  const { grade } = calcGrade(property);
  const hasAnyData = property.rentalYieldPct || property.strPermitted !== null || property.yearBuilt || property.councilRatesAnnual || property.strataFeesQuarterly;

  if (!hasAnyData) return null;

  const items = [
    property.rentalYieldPct != null && {
      icon: TrendingUp,
      label: 'Rental Yield',
      value: `${property.rentalYieldPct.toFixed(1)}%`,
      highlight: property.rentalYieldPct >= 5,
    },
    property.strPermitted !== null && property.strPermitted !== undefined && {
      icon: Home,
      label: 'STR Permitted',
      value: property.strPermitted ? 'Yes' : 'No',
      highlight: property.strPermitted,
    },
    {
      icon: Globe,
      label: 'Foreign Buyer',
      value: property.country && property.country !== 'Australia' ? 'Eligible' : 'Check State Rules',
      highlight: property.country !== 'Australia',
    },
    property.yearBuilt && {
      icon: CalendarDays,
      label: 'Year Built',
      value: String(property.yearBuilt),
      highlight: false,
    },
    property.councilRatesAnnual != null && {
      icon: Receipt,
      label: 'Council Rates',
      value: `$${property.councilRatesAnnual.toLocaleString()}/yr`,
      highlight: false,
    },
    property.strataFeesQuarterly != null && {
      icon: Building2,
      label: 'Strata Fees',
      value: `$${property.strataFeesQuarterly.toLocaleString()}/qtr`,
      highlight: false,
    },
  ].filter(Boolean) as { icon: any; label: string; value: string; highlight: boolean }[];

  if (compact) {
    return (
      <div className="flex items-center gap-2 flex-wrap">
        <span className={`px-2 py-0.5 rounded-md text-[11px] font-bold border ${gradeColors[grade]}`}>
          Score {grade}
        </span>
        {property.rentalYieldPct != null && (
          <span className="text-[11px] text-muted-foreground">
            Yield {property.rentalYieldPct.toFixed(1)}%
          </span>
        )}
        {property.strPermitted === true && (
          <span className="text-[11px] text-emerald-600">STR ✓</span>
        )}
      </div>
    );
  }

  return (
    <div className="p-4 rounded-2xl bg-secondary/50 border border-border">
      <div className="flex items-center justify-between mb-3">
        <h3 className="font-display font-semibold text-foreground text-sm flex items-center gap-2">
          <TrendingUp size={16} className="text-primary" />
          Investment Insights
        </h3>
        <span className={`px-2.5 py-1 rounded-lg text-xs font-bold border ${gradeColors[grade]}`}>
          Score {grade}
        </span>
      </div>
      <div className="grid grid-cols-2 gap-2">
        {items.map(item => (
          <div key={item.label} className="flex items-center gap-2 p-2 rounded-xl bg-background/50">
            <item.icon size={14} className={item.highlight ? 'text-primary' : 'text-muted-foreground'} />
            <div>
              <p className="text-[10px] text-muted-foreground uppercase tracking-wider">{item.label}</p>
              <p className={`text-xs font-semibold ${item.highlight ? 'text-primary' : 'text-foreground'}`}>{item.value}</p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
