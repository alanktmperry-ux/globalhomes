import { useNavigate } from 'react-router-dom';
import { CheckCircle2, Sparkles, Inbox, Gift } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useTranslation } from '@/shared/lib/i18n';

export default function HaloSuccessPage() {
  const navigate = useNavigate();
  const { t } = useTranslation();
  return (
    <div className="min-h-screen bg-background py-12 px-4">
      <div className="max-w-xl mx-auto text-center">
        <div className="mx-auto mb-6 h-16 w-16 rounded-full bg-primary/10 flex items-center justify-center">
          <CheckCircle2 className="text-primary" size={36} />
        </div>
        <h1 className="text-2xl sm:text-3xl font-bold mb-3">{t('halo.success.title')}</h1>
        <p className="text-muted-foreground mb-6">
          {t('halo.success.body')}
        </p>

        <div className="flex flex-wrap justify-center gap-2 mb-8">
          <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-muted text-sm font-medium">
            <Sparkles size={14} /> {t('halo.success.pill.ai')}
          </span>
          <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-muted text-sm font-medium">
            <Inbox size={14} /> {t('halo.success.pill.inbox')}
          </span>
          <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-muted text-sm font-medium">
            <Gift size={14} /> {t('halo.success.pill.free')}
          </span>
        </div>

        <div className="flex flex-col sm:flex-row gap-3 justify-center">
          <Button onClick={() => navigate('/dashboard/my-halos')}>{t('halo.success.cta.view')}</Button>
          <Button variant="outline" onClick={() => navigate('/halo/new')}>{t('halo.success.cta.another')}</Button>
        </div>
      </div>
    </div>
  );
}
