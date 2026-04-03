import { GraduationCap, ExternalLink, MapPin, CheckCircle } from 'lucide-react';
import { usePropertySchools, type PropertySchool } from '@/hooks/usePropertySchools';

interface Props {
  propertyId: string;
}

const SCHOOL_TYPE_LABEL: Record<string, string> = {
  primary: 'Primary',
  secondary: 'Secondary',
  combined: 'P–12',
  special: 'Special',
};

const SECTOR_COLORS: Record<string, string> = {
  government: 'bg-primary/10 text-primary',
  independent: 'bg-accent text-accent-foreground',
  catholic: 'bg-warning/10 text-warning-foreground',
};

function IcseaBar({ score }: { score: number | null }) {
  if (!score) return null;
  const pct = Math.min(100, Math.max(0, ((score - 500) / 800) * 100));
  const color = score >= 1100 ? 'bg-success' : score >= 950 ? 'bg-primary' : 'bg-warning';
  return (
    <div className="flex items-center gap-2">
      <div className="flex-1 h-1.5 bg-secondary rounded-full overflow-hidden">
        <div className={`h-full rounded-full ${color}`} style={{ width: `${pct}%` }} />
      </div>
      <span className="text-[11px] font-medium text-muted-foreground">{score}</span>
    </div>
  );
}

function SchoolRow({
  name, type, sector, icsea, distanceKm, websiteUrl, inCatchment,
}: {
  name: string; type: string; sector: string; icsea: number | null;
  distanceKm: number; websiteUrl: string | null; inCatchment: boolean;
}) {
  return (
    <div className="p-3 rounded-xl border border-border bg-card">
      <div className="flex items-start justify-between gap-2">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <p className="text-sm font-semibold text-foreground">{name}</p>
            {inCatchment && (
              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-success/10 text-success text-[10px] font-bold uppercase tracking-wider">
                <CheckCircle size={10} /> Catchment
              </span>
            )}
          </div>
          <div className="flex flex-wrap items-center gap-2 mt-1 text-xs text-muted-foreground">
            <span className={`px-1.5 py-0.5 rounded text-[10px] font-medium ${SECTOR_COLORS[sector] ?? 'bg-secondary text-secondary-foreground'}`}>
              {sector.charAt(0).toUpperCase() + sector.slice(1)}
            </span>
            <span>{SCHOOL_TYPE_LABEL[type] ?? type}</span>
            <span className="flex items-center gap-0.5">
              <MapPin size={10} />
              {distanceKm < 1 ? `${Math.round(distanceKm * 1000)}m` : `${distanceKm.toFixed(1)}km`}
            </span>
          </div>
          {icsea && (
            <div className="mt-2">
              <p className="text-[10px] text-muted-foreground mb-0.5">ICSEA {icsea}</p>
              <IcseaBar score={icsea} />
            </div>
          )}
        </div>
        {websiteUrl && (
          <a href={websiteUrl} target="_blank" rel="noopener noreferrer" className="shrink-0 text-muted-foreground hover:text-primary transition-colors">
            <ExternalLink size={14} />
          </a>
        )}
      </div>
    </div>
  );
}

export function SchoolsNearby({ propertyId }: Props) {
  const { schools, loading } = usePropertySchools(propertyId);

  if (loading) return (
    <div className="space-y-3 animate-pulse">
      <div className="h-5 w-24 bg-secondary rounded" />
      <div className="space-y-2">
        {[1, 2, 3].map(i => <div key={i} className="h-20 bg-secondary rounded-xl" />)}
      </div>
    </div>
  );

  if (!schools.length) return null;

  const catchmentSchools = schools.filter(s => s.in_catchment);
  const nearbySchools = schools.filter(s => !s.in_catchment);

  return (
    <div className="rounded-2xl border border-border bg-card p-5 shadow-card">
      <div className="flex items-center gap-2 mb-4">
        <GraduationCap size={18} className="text-primary" />
        <h2 className="font-display text-lg font-semibold text-foreground">Schools</h2>
      </div>

      {catchmentSchools.length > 0 && (
        <div className="mb-4">
          <p className="text-xs font-bold uppercase tracking-wider text-success mb-2">
            <CheckCircle size={12} className="inline mr-1" /> In catchment zone
          </p>
          <div className="space-y-2">
            {catchmentSchools.map(({ school_id, distance_km, school }) => (
              <SchoolRow
                key={school_id}
                name={school.name}
                type={school.type}
                sector={school.sector}
                icsea={school.icsea}
                distanceKm={distance_km}
                websiteUrl={school.website_url}
                inCatchment
              />
            ))}
          </div>
        </div>
      )}

      {nearbySchools.length > 0 && (
        <div>
          {catchmentSchools.length > 0 && (
            <p className="text-xs font-bold uppercase tracking-wider text-muted-foreground mb-2">Other nearby schools</p>
          )}
          <div className="space-y-2">
            {nearbySchools.slice(0, 5).map(({ school_id, distance_km, school }) => (
              <SchoolRow
                key={school_id}
                name={school.name}
                type={school.type}
                sector={school.sector}
                icsea={school.icsea}
                distanceKm={distance_km}
                websiteUrl={school.website_url}
                inCatchment={false}
              />
            ))}
          </div>
        </div>
      )}

      <p className="text-[10px] text-muted-foreground mt-4 leading-relaxed">
        Catchment zones are indicative only. Always confirm enrolment eligibility
        directly with the school before purchasing. Data sourced from state education
        departments and ACARA.
      </p>
    </div>
  );
}
