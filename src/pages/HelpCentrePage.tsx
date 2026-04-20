import { Helmet } from 'react-helmet-async';
import { Link } from 'react-router-dom';
import { HelpSearch } from '@/features/help/components/HelpSearch';
import { HelpCategoryCard } from '@/features/help/components/HelpCategoryCard';
import { FAQ_ITEMS } from '@/data/faq';
import { ArrowRight, Mail } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { useTranslation } from '@/shared/lib/i18n/useTranslation';

const categories = [
  { title: 'Agents', description: 'Listing, CRM, auctions, and billing', icon: 'Building2', href: '/help/agents', key: 'agents' },
  { title: 'Property Managers', description: 'Rent roll, trust accounting, arrears, maintenance, vacancies and inspections', icon: 'ClipboardList', href: '/help/property-managers', key: 'property-managers' },
  { title: 'Buyers', description: 'Searching, saving, open homes, auctions, and finance tools', icon: 'Home', href: '/help/buyers', key: 'buyers' },
  { title: 'Renters', description: 'Finding rentals, applying, tracking applications', icon: 'Key', href: '/help/renters', key: 'renters' },
  { title: 'Vendors', description: 'Performance reports, auctions, and documents', icon: 'BarChart3', href: '/help/vendors', key: 'vendors' },
  { title: 'Partner Agencies', description: 'Rent roll, trust accounting, arrears and team management for accounting partners.', icon: 'Briefcase', href: '/help/property-managers', key: 'property-managers' },
];

const popularArticles = [
  { question: 'How does multilingual listing translation work?', id: 'agent-multilingual-translation' },
  { question: 'How do I create my first listing?', id: 'agent-create-listing' },
  { question: 'How does auction registration work?', id: 'buyer-auction-register' },
  { question: 'How do I apply for a rental property?', id: 'renter-apply' },
  { question: 'How do I set up saved search alerts?', id: 'buyer-saved-search' },
  { question: 'How do I track my vendor performance report?', id: 'vendor-report' },
  { question: 'How do I conduct a property inspection and condition report?', id: 'agent-inspection-reports' },
  { question: 'How does voice search work?', id: 'buyer-voice-search' },
  { question: 'How does routine inspection scheduling work?', id: 'agent-inspection-schedule' },
  { question: 'What notice do I need to give a tenant before an inspection?', id: 'agent-inspection-notice' },
];

export default function HelpCentrePage() {
  const { t } = useTranslation();
  return (
    <>
      <Helmet>
        <title>{t('help.pageTitle')}</title>
        <meta name="description" content="Find answers to common questions about using ListHQ — Australia's real estate marketplace for agents, buyers, renters, and vendors." />
        <link rel="canonical" href="https://listhq.com.au/help" />
      </Helmet>

      <div className="min-h-screen bg-background">
        {/* Hero */}
        <div className="bg-secondary/30 border-b border-border">
          <div className="max-w-3xl mx-auto px-4 py-16 text-center">
            <h1 className="font-display text-3xl font-bold text-foreground mb-4">How can we help?</h1>
            <HelpSearch />
          </div>
        </div>

        <div className="max-w-5xl mx-auto px-4 py-12 space-y-12">
          {/* Category cards */}
          <section>
            <h2 className="font-display text-lg font-semibold text-foreground mb-4">Browse by role</h2>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              {categories.map((cat) => (
                <HelpCategoryCard
                  key={cat.title}
                  {...cat}
                  count={FAQ_ITEMS.filter((f) => f.category === cat.key).length}
                />
              ))}
            </div>
          </section>

          {/* Popular articles */}
          <section>
            <h2 className="font-display text-lg font-semibold text-foreground mb-4">Popular articles</h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {popularArticles.map((a) => (
                <Link
                  key={a.id}
                  to={`/help/faq#faq-${a.id}`}
                  className="flex items-center gap-2 p-3 rounded-xl border border-border hover:bg-accent/50 transition-colors group"
                >
                  <span className="text-sm text-foreground flex-1">{a.question}</span>
                  <ArrowRight size={14} className="text-muted-foreground group-hover:text-primary shrink-0" />
                </Link>
              ))}
            </div>
          </section>

          {/* Contact CTA */}
          <Card className="p-8 text-center bg-secondary/20">
            <Mail className="mx-auto mb-3 text-primary" size={28} />
            <h3 className="font-display text-base font-semibold text-foreground mb-1">Can't find what you're looking for?</h3>
            <p className="text-sm text-muted-foreground mb-4">Our support team is here to help.</p>
            <Button asChild size="sm">
              <Link to="/help/contact">Contact Support</Link>
            </Button>
          </Card>
        </div>
      </div>
    </>
  );
}
