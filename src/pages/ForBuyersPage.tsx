import { Helmet } from 'react-helmet-async';
import { Link } from 'react-router-dom';
import SiteHeader from '@/shared/components/layout/SiteHeader';
import SiteFooter from '@/shared/components/layout/SiteFooter';
import { Globe, MessageSquare, Zap } from 'lucide-react';
import { Button } from '@/components/ui/button';

const LANGS = ['🇨🇳 Mandarin','🇻🇳 Vietnamese','🇮🇳 Hindi','🇰🇷 Korean','🇸🇦 Arabic','🇵🇭 Filipino','🇮🇩 Bahasa','🇮🇳 Punjabi'];

const BENEFITS = [
  { icon: Globe, title: 'Search in your language', body: 'Natural language search and fully translated listing descriptions in 30+ languages.' },
  { icon: MessageSquare, title: 'Agents who speak your language', body: 'Enquire in your language, get replies you can read. No language barrier.' },
  { icon: Zap, title: 'No account needed to search', body: "Browse freely. Create an account only when you're ready to save or enquire." },
];

const TRUST = ['Free for buyers', '30+ languages', 'Privacy protected'];

export default function ForBuyersPage() {
  return (
    <>
      <Helmet>
        <title>For Buyers — Search Australian property in 30+ languages | ListHQ</title>
        <meta name="description" content="Search Australian property in 30+ languages. Listings auto-translated. Agents who speak your language. Always free for buyers." />
        <link rel="canonical" href="https://listhq.com.au/for-buyers" />
      </Helmet>

      <SiteHeader />

      <main className="bg-background">
        {/* Hero */}
        <section className="px-4 sm:px-6 pt-12 pb-10 max-w-4xl mx-auto text-center">
          <h1 className="text-3xl sm:text-5xl font-bold tracking-tight text-foreground">
            Find your home in any language
          </h1>
          <p className="mt-4 text-base sm:text-lg text-muted-foreground max-w-2xl mx-auto">
            Search Australian property in 30+ languages. Listings auto-translated. Agents who speak your language. Always free for buyers.
          </p>
          <div className="mt-7 flex flex-col sm:flex-row gap-3 justify-center">
            <Button asChild size="lg" className="min-h-[44px]">
              <Link to="/buy">Search properties</Link>
            </Button>
            <Button asChild size="lg" variant="outline" className="min-h-[44px]">
              <Link to="/halo">Post a Halo brief</Link>
            </Button>
          </div>
        </section>

        {/* Language bar */}
        <section className="px-4 sm:px-6 pb-10 max-w-4xl mx-auto">
          <div className="flex flex-wrap gap-2 justify-center">
            {LANGS.map(lang => (
              <span key={lang} className="px-3 py-1.5 rounded-full bg-secondary text-secondary-foreground text-sm">
                {lang}
              </span>
            ))}
            <span className="px-3 py-1.5 rounded-full bg-primary/10 text-primary text-sm font-medium">
              + 22 more
            </span>
          </div>
        </section>

        {/* Benefits */}
        <section className="px-4 sm:px-6 py-12 bg-muted/30">
          <div className="max-w-5xl mx-auto grid gap-6 sm:grid-cols-3">
            {BENEFITS.map(({ icon: Icon, title, body }) => (
              <div key={title} className="bg-card border border-border rounded-2xl p-6">
                <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center mb-4">
                  <Icon className="w-5 h-5 text-primary" />
                </div>
                <h3 className="font-semibold text-foreground">{title}</h3>
                <p className="mt-2 text-sm text-muted-foreground">{body}</p>
              </div>
            ))}
          </div>
        </section>

        {/* Halo */}
        <section className="px-4 sm:px-6 py-14 max-w-3xl mx-auto text-center">
          <h2 className="text-2xl sm:text-3xl font-bold text-foreground">
            Tell us what you want. Agents come to you.
          </h2>
          <p className="mt-3 text-muted-foreground">
            Post a free Halo brief — your suburb, budget, and must-haves. Matched agents contact you directly. No spam, no cold calls.
          </p>
          <Button asChild size="lg" className="mt-6 min-h-[44px]">
            <Link to="/halo">Post a Halo (free)</Link>
          </Button>
        </section>

        {/* Trust strip */}
        <section className="px-4 sm:px-6 py-8 border-y border-border bg-muted/30">
          <div className="max-w-4xl mx-auto flex flex-wrap gap-4 justify-center text-sm text-muted-foreground">
            {TRUST.map(item => (
              <span key={item}>✓ {item}</span>
            ))}
          </div>
        </section>

        {/* Final CTA */}
        <section className="px-4 sm:px-6 py-14 text-center">
          <h2 className="text-2xl sm:text-3xl font-bold text-foreground">Ready to find your home?</h2>
          <Button asChild size="lg" className="mt-6 min-h-[44px]">
            <Link to="/buy">Start searching</Link>
          </Button>
        </section>
      </main>

      <SiteFooter />
    </>
  );
}
