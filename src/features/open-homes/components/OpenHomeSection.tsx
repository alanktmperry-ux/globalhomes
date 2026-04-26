import { Home } from 'lucide-react';
import { OpenHomeCard } from './OpenHomeCard';
import { useOpenHomes } from '../hooks/useOpenHomes';
import { useTranslation } from '@/shared/lib/i18n/useTranslation';

interface Props {
  propertyId: string;
  propertyAddress: string;
}

export function OpenHomeSection({ propertyId, propertyAddress }: Props) {
  const { sessions, loading } = useOpenHomes(propertyId);
  const { t } = useTranslation();

  if (loading) return (
    <div className="space-y-3">
      <div className="h-6 w-40 bg-muted rounded animate-pulse" />
      <div className="h-32 bg-muted rounded-xl animate-pulse" />
    </div>
  );

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Home size={18} className="text-primary" />
          <h2 className="font-display text-lg font-semibold text-foreground">{t('property.section.openHomes')}</h2>
        </div>
        {sessions.length > 0 && (
          <span className="text-xs text-muted-foreground font-medium px-2 py-0.5 rounded-full bg-secondary">
            {t('property.section.openHomesUpcoming', { count: sessions.length })}
          </span>
        )}
      </div>

      {sessions.length === 0 ? (
        <div className="text-center py-6 rounded-xl bg-secondary/50">
          <p className="text-sm font-medium text-muted-foreground">{t('property.openHomes.empty')}</p>
          <p className="text-xs text-muted-foreground mt-1">{t('property.openHomes.emptySub')}</p>
        </div>
      ) : (
        <div className="space-y-3">
          {sessions.map(session => (
            <OpenHomeCard key={session.id} session={session} propertyAddress={propertyAddress} />
          ))}
        </div>
      )}
    </div>
  );
}

