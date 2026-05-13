import { useState } from 'react';
import { Helmet } from 'react-helmet-async';
import { Link, Navigate, useNavigate, useParams } from 'react-router-dom';
import { Search } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { findLandingLanguage } from '@/config/landingLanguages';

export default function PropertyLandingPage() {
  const { language } = useParams<{ language: string }>();
  const entry = findLandingLanguage(language);
  const navigate = useNavigate();
  const [query, setQuery] = useState('');

  if (!entry) {
    return <Navigate to="/buy" replace />;
  }

  const url = `https://listhq.com.au/property-australia/${entry.slug}`;
  const schema = {
    '@context': 'https://schema.org',
    '@type': 'WebPage',
    name: entry.metaTitle,
    description: entry.metaDescription,
    inLanguage: entry.isoCode,
    url,
    isPartOf: { '@id': 'https://listhq.com.au/#website' },
    about: {
      '@type': 'Thing',
      name: `Australian real estate for ${entry.englishName}-speaking buyers`,
    },
  };

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    const params = new URLSearchParams();
    if (query.trim()) params.set('q', query.trim());
    params.set('lang', entry.isoCode);
    navigate(`/buy?${params.toString()}`);
  };

  return (
    <>
      <Helmet>
        <html lang={entry.isoCode} />
        <title>{entry.metaTitle}</title>
        <meta name="description" content={entry.metaDescription} />
        <link rel="canonical" href={url} />
        <meta property="og:title" content={entry.metaTitle} />
        <meta property="og:description" content={entry.metaDescription} />
        <meta property="og:url" content={url} />
        <meta property="og:type" content="website" />
        <meta name="twitter:card" content="summary_large_image" />
        <meta name="twitter:title" content={entry.metaTitle} />
        <meta name="twitter:description" content={entry.metaDescription} />
        <script type="application/ld+json">{JSON.stringify(schema)}</script>
      </Helmet>

      <div className="bg-[#FAFAF7] min-h-screen">
        {/* Hero */}
        <section className="max-w-4xl mx-auto px-4 py-16 md:py-24 text-center">
          <h1
            lang={entry.isoCode}
            className="font-display text-4xl md:text-6xl font-bold text-[#0a0f1e] mb-4 leading-tight"
          >
            {entry.heroHeadlineNative}
          </h1>
          <p className="text-xl md:text-2xl font-semibold text-[#0a0f1e] mb-4">
            {entry.heroHeadlineEnglish}
          </p>
          <p className="text-base md:text-lg text-[#6B7280] max-w-2xl mx-auto mb-10 leading-relaxed">
            {entry.heroSubheadEnglish}
          </p>

          {/* Search */}
          <form
            onSubmit={handleSearch}
            className="bg-white rounded-2xl shadow-lg border border-[#E5E7EB] p-2 flex items-center gap-2 max-w-2xl mx-auto"
          >
            <Search className="ml-3 text-[#6B7280] shrink-0" size={20} />
            <input
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search suburb, postcode, or address"
              className="flex-1 bg-transparent border-0 outline-none text-base text-[#0a0f1e] placeholder:text-[#9CA3AF] py-3"
              aria-label="Search properties"
            />
            <Button
              type="submit"
              className="bg-[#3B82F6] hover:bg-[#2563EB] text-white rounded-xl px-6 h-11 font-semibold"
            >
              Search
            </Button>
          </form>
        </section>

        {/* Popular Suburbs */}
        <section className="max-w-4xl mx-auto px-4 py-10">
          <div className="bg-white rounded-2xl shadow-sm border border-[#E5E7EB] p-6 md:p-8">
            <h2 className="font-display text-2xl md:text-3xl font-bold text-[#0a0f1e] mb-2">
              Popular suburbs for the {entry.englishName}-speaking community
            </h2>
            <p className="text-[#6B7280] mb-6">
              Communities where {entry.englishName} buyers most often search.
            </p>
            <div className="flex flex-wrap gap-2">
              {entry.popularSuburbs.map((s) => (
                <Link
                  key={s}
                  to={`/buy?suburb=${encodeURIComponent(s)}&lang=${entry.isoCode}`}
                  className="inline-flex items-center px-4 py-2 rounded-full bg-[#EFF6FF] text-[#1D4ED8] text-sm font-medium hover:bg-[#DBEAFE] transition"
                >
                  {s}
                </Link>
              ))}
            </div>
          </div>
        </section>

        {/* CTAs */}
        <section className="max-w-4xl mx-auto px-4 py-6 grid md:grid-cols-2 gap-4">
          <Link
            to={`/agents?language=${entry.slug}`}
            className="block bg-white rounded-2xl shadow-sm border border-[#E5E7EB] p-6 hover:shadow-md transition"
          >
            <h3 className="font-display text-xl font-bold text-[#0a0f1e] mb-2">
              Find a {entry.englishName}-speaking agent
            </h3>
            <p className="text-[#6B7280] text-sm mb-4">
              Browse agents who speak {entry.nativeName} and know your community.
            </p>
            <span className="inline-block text-[#3B82F6] font-semibold text-sm">Browse agents →</span>
          </Link>
          <Link
            to={`/halo/new?lang=${entry.isoCode}`}
            className="block bg-[#3B82F6] rounded-2xl shadow-sm p-6 hover:bg-[#2563EB] transition text-white"
          >
            <h3 className="font-display text-xl font-bold mb-2">
              Post a buyer brief in {entry.nativeName}
            </h3>
            <p className="text-white/85 text-sm mb-4">
              Tell agents what you're looking for. They'll come to you — in your language.
            </p>
            <span className="inline-block font-semibold text-sm">Get matched →</span>
          </Link>
        </section>

        {/* Cultural Notes */}
        <section className="max-w-4xl mx-auto px-4 py-10">
          <div className="bg-white rounded-2xl shadow-sm border border-[#E5E7EB] p-6 md:p-8">
            <h2 className="font-display text-2xl md:text-3xl font-bold text-[#0a0f1e] mb-6">
              What {entry.englishName}-speaking buyers look for
            </h2>
            <ul className="space-y-3">
              {entry.culturalNotes.map((note) => (
                <li key={note} className="flex items-start gap-3 text-[#374151] leading-relaxed">
                  <span className="mt-2 w-1.5 h-1.5 rounded-full bg-[#3B82F6] shrink-0" />
                  <span>{note}</span>
                </li>
              ))}
            </ul>
          </div>
        </section>

        {/* Footer CTA */}
        <section className="max-w-4xl mx-auto px-4 py-16 text-center">
          <h2 className="font-display text-2xl md:text-3xl font-bold text-[#0a0f1e] mb-4">
            Start your search now
          </h2>
          <form
            onSubmit={handleSearch}
            className="bg-white rounded-2xl shadow-lg border border-[#E5E7EB] p-2 flex items-center gap-2 max-w-2xl mx-auto"
          >
            <Search className="ml-3 text-[#6B7280] shrink-0" size={20} />
            <input
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search suburb, postcode, or address"
              className="flex-1 bg-transparent border-0 outline-none text-base text-[#0a0f1e] placeholder:text-[#9CA3AF] py-3"
              aria-label="Search properties"
            />
            <Button
              type="submit"
              className="bg-[#3B82F6] hover:bg-[#2563EB] text-white rounded-xl px-6 h-11 font-semibold"
            >
              Search
            </Button>
          </form>
        </section>
      </div>
    </>
  );
}
