import { Helmet } from 'react-helmet-async';
import { FaqAccordion } from '@/features/help/components/FaqAccordion';
import { HelpSearch } from '@/features/help/components/HelpSearch';
import { FAQ_ITEMS } from '@/data/faq';

const sections = [
  { title: 'Searching Rental Properties', ids: ['renter-search', 'renter-pets'] },
  { title: 'Applying for a Rental', ids: ['renter-apply'] },
  { title: 'Tracking Your Application', ids: ['renter-application-status'] },
  { title: 'Moving In', ids: ['renter-documents', 'renter-bond'] },
  { title: 'Account & Alerts', ids: ['create-account', 'buyer-saved-search', 'tech-notifications'] },
];

export default function HelpRentersPage() {
  return (
    <>
      <Helmet>
        <title>Renter Guide</title>
        <meta name="description" content="Guide for renters using ListHQ — searching, applying, tracking applications, and managing your tenancy." />
        <link rel="canonical" href="https://listhq.com.au/help/renters" />
      </Helmet>
      <div className="min-h-screen bg-background">
        <div className="max-w-3xl mx-auto px-4 py-12">
          <h1 className="font-display text-2xl font-bold text-foreground mb-2">Renter Guide</h1>
          <p className="text-sm text-muted-foreground mb-8">Everything you need to know about finding and applying for rental properties on ListHQ.</p>
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
