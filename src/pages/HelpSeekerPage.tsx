import { Helmet } from 'react-helmet-async';
import { FaqAccordion } from '@/features/help/components/FaqAccordion';
import { HelpSearch } from '@/features/help/components/HelpSearch';
import { FAQ_ITEMS } from '@/data/faq';
import { useTranslation } from '@/shared/lib/i18n/useTranslation';

const sections = [
  { title: 'What is Halo?', ids: ['halo-what-is', 'halo-vs-search', 'halo-free'] },
  { title: 'Creating Your Halo', ids: ['halo-how-create', 'halo-wizard-steps'] },
  { title: 'Managing Your Halos', ids: ['halo-manage', 'halo-responses'] },
  { title: 'Your Halo Inbox', ids: ['halo-seeker-inbox'] },
  { title: 'Account & Privacy', ids: ['create-account', 'reset-password', 'tech-data-privacy', 'tech-notifications', 'tech-delete-account'] },
];

export default function HelpSeekerPage() {
  const { t: _t } = useTranslation();
  return (
    <>
      <Helmet>
        <title>Halo Help — ListHQ</title>
        <meta name="description" content="Help for Halo seekers — create a brief, let agents find you, and manage responses on ListHQ." />
        <link rel="canonical" href="https://listhq.com.au/help/seekers" />
      </Helmet>
      <div className="min-h-screen bg-background">
        <div className="max-w-3xl mx-auto px-4 py-12">
          <h1 className="font-display text-2xl font-bold text-foreground mb-2">Halo Help</h1>
          <p className="text-sm text-muted-foreground mb-8">
            Halo: buyers find you. You don't chase them. Everything you need to know about creating and managing your Halo brief.
          </p>
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
