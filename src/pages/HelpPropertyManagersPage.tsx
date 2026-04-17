import { Helmet } from 'react-helmet-async';
import { FaqAccordion } from '@/features/help/components/FaqAccordion';
import { HelpSearch } from '@/features/help/components/HelpSearch';
import { FAQ_ITEMS } from '@/data/faq';

const sections = [
  { title: 'Getting Started with Property Management', ids: ['pm-getting-started'] },
  { title: 'Rent Roll', ids: ['pm-rent-roll'] },
  { title: 'Trust Accounting', ids: ['pm-trust-accounting'] },
  { title: 'Arrears Management', ids: ['pm-arrears-detail', 'pm-arrears-automation'] },
  { title: 'Lease Renewals', ids: ['pm-lease-renewals'] },
  { title: 'Inspections', ids: ['pm-inspections'] },
  { title: 'Maintenance Requests', ids: ['pm-maintenance-detail', 'pm-maintenance-management'] },
  { title: 'Supplier Management', ids: ['pm-suppliers', 'pm-supplier-portal'] },
  { title: 'Vacancy Management', ids: ['pm-vacancies', 'pm-vacancy-kpi'] },
  { title: 'Owner Statements', ids: ['pm-owner-statements'] },
  { title: 'Automation Settings', ids: ['pm-automation-settings'] },
  { title: 'Tenant Portal', ids: ['pm-tenant-portal-detail', 'pm-tenant-portal-access'] },
  { title: 'Owner Portal', ids: ['pm-owner-portal-detail', 'pm-owner-portal-access'] },
  { title: 'Supplier Portal', ids: ['pm-supplier-portal-detail'] },
];

export default function HelpPropertyManagersPage() {
  return (
    <>
      <Helmet>
        <title>Property Manager Guide</title>
        <meta name="description" content="Complete guide for property managers using ListHQ — rent roll, trust accounting, arrears, maintenance, vacancies, inspections, suppliers and automation." />
        <link rel="canonical" href="https://listhq.com.au/help/property-managers" />
      </Helmet>
      <div className="min-h-screen bg-background">
        <div className="max-w-3xl mx-auto px-4 py-12">
          <h1 className="font-display text-2xl font-bold text-foreground mb-2">Property Manager Guide</h1>
          <p className="text-sm text-muted-foreground mb-8">Everything you need to know about running a rent roll on ListHQ — from trust accounting to tenant, owner and supplier portals.</p>
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
