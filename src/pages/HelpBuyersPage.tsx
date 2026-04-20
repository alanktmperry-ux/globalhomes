import { Helmet } from 'react-helmet-async';
import { FaqAccordion } from '@/features/help/components/FaqAccordion';
import { HelpSearch } from '@/features/help/components/HelpSearch';
import { FAQ_ITEMS } from '@/data/faq';
import { useTranslation } from '@/shared/lib/i18n/useTranslation';

const sections = [
  { title: 'Searching for Properties', ids: ['buyer-search', 'buyer-suburb-research'] },
  { title: 'Sharing Properties', ids: ['buyer-share-property', 'buyer-share-wechat', 'pm-share-whatsapp-line'] },
  { title: 'Saving & Alerts', ids: ['buyer-save-property', 'buyer-saved-search'] },
  { title: 'Open Homes & Inspections', ids: ['buyer-open-home', 'buyer-enquire'] },
  { title: 'Auctions & Bidding', ids: ['buyer-auction-register', 'buyer-pre-auction-offer', 'auction-reserve', 'auction-vendor-bid', 'auction-cooling-off', 'auction-deposit', 'auction-live-watch'] },
  { title: 'Research Tools', ids: ['buyer-what-sold', 'buyer-school-catchment', 'buyer-firb-calculator'] },
  { title: 'Documents', ids: ['buyer-documents'] },
  { title: 'Finance', ids: ['buyer-mortgage-calc'] },
  { title: 'International Buyers', ids: ['buyer-international', 'buyer-listings-chinese', 'buyer-currency-display'] },
  { title: 'Account & Privacy', ids: ['create-account', 'reset-password', 'buyer-language-currency', 'tech-notifications', 'tech-data-privacy', 'tech-delete-account'] },
];

export default function HelpBuyersPage() {
  const { t } = useTranslation();
  return (
    <>
      <Helmet>
        <title>{t('help.buyers.title')}</title>
        <meta name="description" content="Guide for home buyers using ListHQ — searching, saving, open homes, auctions, finance tools, and more." />
        <link rel="canonical" href="https://listhq.com.au/help/buyers" />
      </Helmet>
      <div className="min-h-screen bg-background">
        <div className="max-w-3xl mx-auto px-4 py-12">
          <h1 className="font-display text-2xl font-bold text-foreground mb-2">{t('help.buyers.title')}</h1>
          <p className="text-sm text-muted-foreground mb-8">Everything you need to know about finding and purchasing property on ListHQ.</p>
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
