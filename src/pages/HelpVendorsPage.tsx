import { Helmet } from 'react-helmet-async';
import { FaqAccordion } from '@/features/help/components/FaqAccordion';
import { HelpSearch } from '@/features/help/components/HelpSearch';
import { FAQ_ITEMS } from '@/data/faq';
import { useTranslation } from '@/shared/lib/i18n/useTranslation';

const sections = [
  { title: 'Understanding Your Performance Report', ids: ['vendor-report'] },
  { title: 'Auction — What to Expect', ids: ['vendor-auction', 'auction-reserve', 'auction-vendor-bid'] },
  { title: 'Documents & Contracts', ids: ['vendor-documents'] },
  { title: 'Cooling-Off & Legal Overview', ids: ['vendor-cooling-off', 'auction-cooling-off'] },
];

export default function HelpVendorsPage() {
  const { t } = useTranslation();
  return (
    <>
      <Helmet>
        <title>{t('help.vendors.title')}</title>
        <meta name="description" content="Guide for home sellers using ListHQ — performance reports, auctions, documents, and legal overview." />
        <link rel="canonical" href="https://listhq.com.au/help/vendors" />
      </Helmet>
      <div className="min-h-screen bg-background">
        <div className="max-w-3xl mx-auto px-4 py-12">
          <h1 className="font-display text-2xl font-bold text-foreground mb-2">{t('help.vendors.title')}</h1>
          <p className="text-sm text-muted-foreground mb-8">Everything you need to know about selling your property through ListHQ.</p>
          <HelpSearch className="mb-8" />
          <div className="space-y-8">
            {sections.map((section) => {
              const items = FAQ_ITEMS.filter((i) => section.ids.includes(i.id));
              if (!items.length) return null;
              return (
                <div key={section.title}>
                  <h2 className="font-display text-base font-semibold text-foreground mb-3">{section.title}</h2>
                  <FaqAccordion items={items} />
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </>
  );
}
