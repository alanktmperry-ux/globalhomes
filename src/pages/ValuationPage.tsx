import { useSearchParams } from 'react-router-dom';
import { Helmet } from 'react-helmet-async';
import PublicLayout from '@/shared/components/layout/PublicLayout';
import { ValuationFlow } from '@/features/valuation/components/ValuationFlow';
import { useTranslation } from '@/shared/lib/i18n/useTranslation';

export default function ValuationPage() {
  const { t } = useTranslation();
  const [params] = useSearchParams();
  const initialAddress = params.get('address') ?? '';

  return (
    <PublicLayout>
      <Helmet>
        <title>{`${t('valuation.title')} | ListHQ`}</title>
        <meta name="description" content={t('valuation.subtitle')} />
      </Helmet>
      <section className="bg-gradient-to-br from-slate-50 via-white to-blue-50/40 py-10 md:py-16 px-4">
        <div className="max-w-2xl mx-auto text-center mb-8">
          <h1 className="text-4xl md:text-5xl font-black tracking-tight text-slate-900">
            {t('valuation.title')}
          </h1>
          <p className="mt-3 text-lg text-slate-500">{t('valuation.subtitle')}</p>
        </div>
        <ValuationFlow initialAddress={initialAddress} />
      </section>
    </PublicLayout>
  );
}
