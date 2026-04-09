import { useMemo } from 'react';
import { Helmet } from 'react-helmet-async';
import { FaqAccordion } from '@/features/help/components/FaqAccordion';
import { HelpSearch } from '@/features/help/components/HelpSearch';
import { FAQ_ITEMS } from '@/data/faq';

const sections = [
  { title: 'Getting Started', ids: ['agent-create-listing', 'agent-profile', 'agent-billing'] },
  { title: 'Managing Listings', ids: ['agent-listing-types', 'agent-photos', 'agent-off-market'] },
  { title: 'Open Homes', ids: ['agent-open-home'] },
  { title: 'Auctions', ids: ['agent-auction-setup', 'agent-auction-registration'] },
  { title: 'CRM & Leads', ids: ['agent-crm', 'agent-saved-searches'] },
  { title: 'Rentals & Property Management', ids: ['agent-rental-pm'] },
  { title: 'Market Tools', ids: ['agent-suburb-intelligence'] },
  { title: 'Client Reporting', ids: ['agent-vendor-dashboard', 'agent-documents'] },
  { title: 'Reviews & Profile', ids: ['agent-reviews'] },
  { title: 'Billing & Support', ids: ['agent-billing', 'billing-plans', 'billing-cancel', 'billing-invoices', 'billing-update-card'] },
];

export default function HelpAgentsPage() {
  return (
    <>
      <Helmet>
        <title>Agent Guide</title>
        <meta name="description" content="Complete guide for real estate agents using ListHQ — listings, auctions, CRM, CMA reports, vendor dashboards, and more." />
        <link rel="canonical" href="https://listhq.com.au/help/agents" />
      </Helmet>
      <div className="min-h-screen bg-background">
        <div className="max-w-3xl mx-auto px-4 py-12">
          <h1 className="font-display text-2xl font-bold text-foreground mb-2">Agent Guide</h1>
          <p className="text-sm text-muted-foreground mb-8">Everything you need to know about using ListHQ as a real estate agent.</p>
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
