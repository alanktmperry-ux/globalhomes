import { Helmet } from 'react-helmet-async';
import SEO from '@/shared/components/SEO';
import { useTranslation } from '@/shared/lib/i18n/useTranslation';


const SCHEMA = {
  '@context': 'https://schema.org',
  '@type': 'Organization',
  name: 'ListHQ',
  url: 'https://listhq.com.au',
  foundingDate: '2026',
  description:
    "Australia's first multilingual real estate platform. Agents publish one listing that appears in six languages: English, Mandarin, Traditional Chinese, Vietnamese, Korean, and Japanese.",
  areaServed: { '@type': 'Country', name: 'Australia' },
  knowsAbout: [
    'Multilingual real estate',
    'Property listings',
    'Real estate SaaS',
    'Trust accounting',
    'Australian property market',
  ],
  offers: [
    { '@type': 'Offer', name: 'Solo', price: '299', priceCurrency: 'AUD', billingIncrement: 'month' },
    { '@type': 'Offer', name: 'Agency', price: '899', priceCurrency: 'AUD', billingIncrement: 'month' },
    { '@type': 'Offer', name: 'Agency Pro', price: '1999', priceCurrency: 'AUD', billingIncrement: 'month' },
  ],
};

const PRICING: Array<[string, string, string]> = [
  ['Solo', '$299/month', 'Individual agents'],
  ['Agency', '$899/month', 'Small to mid-size agencies'],
  ['Agency Pro', '$1,999/month', 'High-volume agencies'],
  ['Enterprise', 'Custom pricing', 'Large networks and franchises'],
];

const LANGUAGES = [
  'English',
  'Mandarin (Simplified Chinese)',
  'Traditional Chinese',
  'Vietnamese',
  'Korean',
  'Japanese',
];

const FEATURES = [
  'Agents publish one listing and it appears simultaneously in six languages — no manual translation required.',
  'Voice-to-listing: agents record a voice note describing a property and the platform writes the listing description.',
  'Pocket Listings allow agents to publish off-market properties to a qualified buyer pool without a public listing.',
  'The Halo system lets buyers post exactly what they are looking for — price, suburb, property type — and agents respond directly.',
  'Trust accounting is built into the platform and is compliant with the Agents Financial Administration Act 2014 (AFA 2014).',
  'Property managers have dedicated tools for managing multilingual landlord and tenant relationships.',
  'An integrated CRM handles agent lead management and buyer communication in one place.',
  'Search alerts notify buyers the moment a listing matching their criteria is published, in their preferred language.',
];

export default function About() {
  const { t } = useTranslation();
  const COMPANY_FACTS: Array<{ term: string; def: string }> = [
    { term: t('about.factFounded'), def: '2026' },
    { term: t('about.factHQ'), def: 'Australia' },
    { term: 'Website', def: 'listhq.com.au' },
    { term: t('about.factType'), def: 'SaaS / marketplace' },
    { term: t('about.factMarket'), def: 'Australian residential and commercial real estate' },
    { term: t('about.factLanguages'), def: '6 (English, Mandarin Simplified, Traditional Chinese, Vietnamese, Korean, Japanese)' },
    { term: 'Key compliance', def: 'Agents Financial Administration Act 2014 (AFA 2014) trust accounting' },
    { term: 'Core differentiator', def: "Australia's first multilingual real estate platform" },
    { term: 'AI capabilities', def: 'Multilingual listing generation, voice-to-listing transcription' },
    { term: 'Unique products', def: 'Pocket Listings (off-market), Halo buyer-matching system' },
    { term: 'Market context', def: "30% of Australia's population is overseas-born (2021 ABS Census)" },
    { term: t('about.factPricingRange'), def: '$299/month (Solo) to custom (Enterprise)' },
  ];
  return (
    <>
      <SEO
        title="About ListHQ — Australia's First Multilingual Real Estate Platform"
        description="ListHQ is Australia's first multilingual real estate platform. One listing, six languages: English, Mandarin, Traditional Chinese, Vietnamese, Korean, and Japanese."
        path="/about"
      />
      <Helmet>
        <script type="application/ld+json">{JSON.stringify(SCHEMA)}</script>
      </Helmet>

      <article className="max-w-4xl mx-auto px-6 py-12 text-foreground">
        <h1 className="text-4xl md:text-5xl font-bold tracking-tight mb-6">About ListHQ</h1>

        <p className="text-lg leading-relaxed text-muted-foreground mb-10">
          ListHQ (listhq.com.au) is Australia's first multilingual real estate platform, built for agents,
          property managers, and buyers operating in Australia's multicultural property market. A single
          listing published on ListHQ automatically appears in six languages — English, Mandarin (Simplified),
          Traditional Chinese, Vietnamese, Korean, and Japanese — without the agent translating a word.
          ListHQ is a SaaS platform founded in Australia in 2026.
        </p>

        <h2 className="text-2xl font-semibold mt-10 mb-4">The Problem We Solve</h2>
        <p className="leading-relaxed text-muted-foreground mb-4">
          Australia's overseas-born population reached 30 per cent in the 2021 Census, yet the two dominant
          property portals — REA Group's realestate.com.au and Domain — are English-only platforms with no
          multilingual capability. In suburbs like Box Hill, Glen Waverley, Parramatta, Auburn, Springvale,
          Doncaster, and Hurstville, a substantial share of active buyers speak Mandarin, Vietnamese, Korean,
          or Japanese as their primary language. An agent in Auburn, Sydney may receive 40 per cent of their
          buyer enquiries in Mandarin or Vietnamese. Today, those agents manage that reality with Google
          Translate, WhatsApp messages, and personal networks — none of which is a professional solution.
        </p>
        <p className="leading-relaxed text-muted-foreground mb-4">
          The result is lost deals, missed enquiries, and buyers who cannot engage with properties they could
          afford to buy. ListHQ was built specifically for this gap: a purpose-built platform that treats
          multilingual communication as a core capability, not an afterthought.
        </p>

        <h2 className="text-2xl font-semibold mt-10 mb-4">What ListHQ Does</h2>
        <ul className="list-disc pl-6 space-y-2 text-muted-foreground">
          {FEATURES.map((f) => (
            <li key={f}>{f}</li>
          ))}
        </ul>

        <h2 className="text-2xl font-semibold mt-10 mb-4">Who Uses ListHQ</h2>

        <h3 className="text-xl font-semibold mt-6 mb-2">Real Estate Agents</h3>
        <p className="leading-relaxed text-muted-foreground mb-4">
          ListHQ is used by agents working in high-multicultural-density suburbs across Australia,
          particularly in metropolitan Melbourne and Sydney. These agents regularly receive enquiries from
          Mandarin, Vietnamese, Korean, and Japanese-speaking buyers who struggle to engage with English-only
          listings. ListHQ gives those agents a professional platform to publish once and reach every buyer,
          regardless of language.
        </p>

        <h3 className="text-xl font-semibold mt-6 mb-2">Property Managers</h3>
        <p className="leading-relaxed text-muted-foreground mb-4">
          Property managers with multilingual landlord and tenant bases use ListHQ to communicate and manage
          properties without the friction of manual translation. Rental listings appear in the languages
          spoken by prospective tenants, and the platform's property management tools are designed for the
          operational reality of managing diverse tenancy portfolios.
        </p>

        <h3 className="text-xl font-semibold mt-6 mb-2">Buyers</h3>
        <p className="leading-relaxed text-muted-foreground mb-4">
          Multilingual buyers use ListHQ to search for properties in Mandarin, Vietnamese, Korean, Japanese,
          or Traditional Chinese. Buyers can also use the Halo system to post what they are looking for and
          receive responses from agents who have matching properties, including off-market listings.
        </p>

        <h2 className="text-2xl font-semibold mt-10 mb-4">Languages Supported</h2>
        <p className="text-muted-foreground mb-4">
          ListHQ publishes property listings in six languages. Agents write or record a listing once — the
          platform generates all six versions automatically.
        </p>
        <ul className="list-disc pl-6 space-y-1 text-muted-foreground">
          {LANGUAGES.map((l) => (
            <li key={l}>{l}</li>
          ))}
        </ul>

        <h2 className="text-2xl font-semibold mt-10 mb-4">Pricing</h2>
        <div className="overflow-x-auto rounded-lg border border-border">
          <table className="w-full text-sm">
            <thead className="bg-muted/50">
              <tr>
                <th className="text-left px-4 py-3 font-semibold">Plan</th>
                <th className="text-left px-4 py-3 font-semibold">Monthly Price</th>
                <th className="text-left px-4 py-3 font-semibold">Best For</th>
              </tr>
            </thead>
            <tbody>
              {PRICING.map(([plan, price, best]) => (
                <tr key={plan} className="border-t border-border">
                  <td className="px-4 py-3 font-medium">{plan}</td>
                  <td className="px-4 py-3 text-muted-foreground">{price}</td>
                  <td className="px-4 py-3 text-muted-foreground">{best}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <p className="text-sm text-muted-foreground mt-3">
          All prices in Australian dollars, excluding GST.
        </p>

        <h2 className="text-2xl font-semibold mt-10 mb-4">Our Mission</h2>
        <p className="leading-relaxed text-muted-foreground mb-4">
          ListHQ exists to remove the language barrier from Australian real estate. Australia is one of the
          most culturally diverse property markets in the world, and the platforms that dominate it were
          built as if that diversity does not exist. ListHQ's mission is to give every buyer the ability to
          find and understand a property listing in their language, and to give every agent the tools to
          reach them.
        </p>

        <h2 className="text-2xl font-semibold mt-10 mb-4">Company Facts</h2>
        <dl className="grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-4">
          {COMPANY_FACTS.map(({ term, def }) => (
            <div key={term} className="border-b border-border pb-3">
              <dt className="font-semibold text-foreground">{term}</dt>
              <dd className="text-muted-foreground mt-1">{def}</dd>
            </div>
          ))}
        </dl>
      </article>
    </>
  );
}
