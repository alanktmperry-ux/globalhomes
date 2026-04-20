import { useState } from 'react';
import { Helmet } from 'react-helmet-async';
import { StampDutyCalculator } from '@/components/StampDutyCalculator';
import { FIRBCalculator } from '@/components/FIRBCalculator';
import { MortgageBrokerCTA } from '@/features/mortgage/components/MortgageBrokerCTA';
import { MortgageReferralModal } from '@/components/MortgageReferralModal';
import { Button } from '@/components/ui/button';
import { useTranslation } from '@/shared/lib/i18n';

export default function StampDutyPage() {
  const [mortgageOpen, setMortgageOpen] = useState(false);
  const { t } = useTranslation();
  return (
    <>
      <Helmet>
        <title>{t('stampDuty.pageTitle')} | ListHQ</title>
        <meta name="description" content={t('stampDuty.pageSubtitle')} />
        <link rel="canonical" href="https://listhq.com.au/stamp-duty-calculator" />
        <script type="application/ld+json">{JSON.stringify({
          "@context": "https://schema.org",
          "@type": "WebApplication",
          "name": t('stampDuty.pageTitle'),
          "description": t('stampDuty.pageSubtitle'),
          "url": "https://listhq.com.au/stamp-duty-calculator",
          "applicationCategory": "FinanceApplication",
          "operatingSystem": "Web",
          "offers": { "@type": "Offer", "price": "0", "priceCurrency": "AUD" }
        })}</script>
      </Helmet>

      <div className="min-h-screen bg-background">
        <div className="max-w-2xl mx-auto px-4 py-12">
          <h1 className="font-display text-3xl md:text-4xl font-bold text-foreground mb-3">
            {t('stampDuty.pageTitle')}
          </h1>
          <p className="text-muted-foreground mb-8 leading-relaxed">
            {t('stampDuty.pageSubtitle')}
          </p>

          <StampDutyCalculator propertyPrice={null} propertyAddress="" />

          <div className="mt-4">
            <FIRBCalculator propertyPrice={null} propertyAddress="" />
          </div>

          <div className="mt-6 p-4 rounded-xl border border-primary/20 bg-primary/5">
            <p className="text-sm font-medium">{t('stampDuty.cta.broker')}</p>
            <p className="text-xs text-muted-foreground mb-2">{t('stampDuty.cta.brokerSub')}</p>
            <Button size="sm" onClick={() => setMortgageOpen(true)}>{t('stampDuty.cta.brokerButton')}</Button>
          </div>
          <MortgageReferralModal
            open={mortgageOpen}
            onOpenChange={setMortgageOpen}
            sourceLabel="stamp_duty_calculator"
          />

          <div className="mt-6">
            <MortgageBrokerCTA
              title={t('stampDuty.cta.broker')}
              description={t('stampDuty.cta.brokerSub')}
              buttonLabel={t('stampDuty.cta.brokerButton')}
              sourcePage="stamp_duty"
            />
          </div>

          {/* SEO content */}
          <div className="mt-12 space-y-6 text-muted-foreground">
            <h2 className="font-display text-xl font-semibold text-foreground">
              {t('stampDuty.seo.howItWorksTitle')}
            </h2>
            <p className="leading-relaxed">
              {t('stampDuty.seo.howItWorksText')}
            </p>

            <h2 className="font-display text-xl font-semibold text-foreground">
              {t('stampDuty.seo.concessionsTitle')}
            </h2>
            <p className="leading-relaxed">
              {t('stampDuty.seo.concessionsText')}
            </p>

            <h2 className="font-display text-xl font-semibold text-foreground">
              {t('stampDuty.seo.whenPaidTitle')}
            </h2>
            <p className="leading-relaxed">
              {t('stampDuty.seo.whenPaidText')}
            </p>
          </div>
        </div>
      </div>
    </>
  );
}
