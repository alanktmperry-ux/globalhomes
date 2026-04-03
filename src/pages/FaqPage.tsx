import { useMemo, useEffect } from 'react';
import { Helmet } from 'react-helmet-async';
import { useSearchParams, useLocation } from 'react-router-dom';
import { HelpSearch } from '@/features/help/components/HelpSearch';
import { FaqAccordion } from '@/features/help/components/FaqAccordion';
import { FAQ_ITEMS, FAQ_CATEGORIES } from '@/data/faq';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';

export default function FaqPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const { hash } = useLocation();
  const activeCategory = searchParams.get('category') || 'all';

  const defaultOpen = useMemo(() => {
    if (hash?.startsWith('#faq-')) return hash.replace('#faq-', '');
    return undefined;
  }, [hash]);

  const filteredItems = useMemo(() => {
    if (activeCategory === 'all') return FAQ_ITEMS;
    return FAQ_ITEMS.filter((i) => i.category === activeCategory);
  }, [activeCategory]);

  const faqSchema = {
    '@context': 'https://schema.org',
    '@type': 'FAQPage',
    mainEntity: FAQ_ITEMS.map((item) => ({
      '@type': 'Question',
      name: item.question,
      acceptedAnswer: { '@type': 'Answer', text: item.answer.replace(/\n/g, ' ') },
    })),
  };

  return (
    <>
      <Helmet>
        <title>FAQ — Frequently Asked Questions</title>
        <meta name="description" content="Find answers to frequently asked questions about ListHQ — property listings, auctions, rentals, CMA reports, and more." />
        <link rel="canonical" href="https://listhq.com.au/help/faq" />
        <script type="application/ld+json">{JSON.stringify(faqSchema)}</script>
      </Helmet>

      <div className="min-h-screen bg-background">
        <div className="max-w-3xl mx-auto px-4 py-12">
          <h1 className="font-display text-2xl font-bold text-foreground mb-6">Frequently Asked Questions</h1>

          <HelpSearch className="mb-8" />

          <Tabs value={activeCategory} onValueChange={(v) => setSearchParams(v === 'all' ? {} : { category: v })}>
            <TabsList className="flex flex-wrap h-auto gap-1 mb-6 bg-transparent p-0">
              <TabsTrigger value="all" className="text-xs data-[state=active]:bg-primary data-[state=active]:text-primary-foreground rounded-full px-3 py-1.5">
                All ({FAQ_ITEMS.length})
              </TabsTrigger>
              {FAQ_CATEGORIES.map((cat) => {
                const count = FAQ_ITEMS.filter((i) => i.category === cat.key).length;
                return (
                  <TabsTrigger key={cat.key} value={cat.key} className="text-xs data-[state=active]:bg-primary data-[state=active]:text-primary-foreground rounded-full px-3 py-1.5">
                    {cat.label} ({count})
                  </TabsTrigger>
                );
              })}
            </TabsList>

            <FaqAccordion items={filteredItems} defaultOpen={defaultOpen} showCategory={activeCategory === 'all'} />
          </Tabs>
        </div>
      </div>
    </>
  );
}
