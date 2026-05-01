import { Helmet } from 'react-helmet-async';
import { Link } from 'react-router-dom';
import { MapPin, ArrowRight, School, Train, Home } from 'lucide-react';

const SCHEMA = {
  '@context': 'https://schema.org',
  '@type': 'WebPage',
  name: 'Australian Suburb Guides for Chinese and Vietnamese Property Buyers | ListHQ',
  description:
    'Detailed suburb guides for Chinese and Vietnamese buyers purchasing property in Australia. Covers Box Hill VIC, Glen Waverley VIC, and Parramatta NSW — with median prices, school information, FIRB rules, and buying process guides.',
  url: 'https://listhq.com.au/suburbs',
  datePublished: '2026-05-02',
  publisher: {
    '@type': 'Organization',
    name: 'ListHQ',
    url: 'https://listhq.com.au',
  },
  breadcrumb: {
    '@type': 'BreadcrumbList',
    itemListElement: [
      { '@type': 'ListItem', position: 1, name: 'Home', item: 'https://listhq.com.au' },
      { '@type': 'ListItem', position: 2, name: 'Suburb Guides', item: 'https://listhq.com.au/suburbs' },
    ],
  },
};

const SUBURBS = [
  {
    name: 'Box Hill',
    state: 'VIC',
    postcode: '3128',
    slug: 'box-hill-vic',
    tagline: "Melbourne's most established Chinese-Australian suburb",
    medianHouse: '$1.6M–$1.9M',
    medianUnit: '$600K–$750K',
    highlights: [
      { icon: School, text: 'Box Hill High School zone (selective feeder)' },
      { icon: Train, text: 'Box Hill station — Belgrave/Lilydale lines, SmartBus hub' },
      { icon: Home, text: 'Mandarin and Cantonese services throughout the suburb' },
    ],
    badge: 'Most popular',
    badgeColor: 'bg-blue-600',
  },
  {
    name: 'Glen Waverley',
    state: 'VIC',
    postcode: '3150',
    slug: 'glen-waverley-vic',
    tagline: 'Premium south-east Melbourne — the GWSC school zone',
    medianHouse: '$1.5M–$1.8M',
    medianUnit: '$700K–$850K',
    highlights: [
      { icon: School, text: "Glen Waverley Secondary College — Victoria's top public school" },
      { icon: Train, text: 'Glen Waverley line direct to CBD (~35 min)' },
      { icon: Home, text: 'Strong Chinese buyer community, lower density than Box Hill' },
    ],
    badge: 'Top school zone',
    badgeColor: 'bg-emerald-600',
  },
  {
    name: 'Parramatta',
    state: 'NSW',
    postcode: '2150',
    slug: 'parramatta-nsw',
    tagline: "Sydney's second CBD — affordable entry with infrastructure tailwinds",
    medianHouse: '$1.1M–$1.4M',
    medianUnit: '$550K–$700K',
    highlights: [
      { icon: School, text: 'Arthur Phillip High (selective) + James Ruse Agricultural HS' },
      { icon: Train, text: 'T1 Western Line to CBD + Parramatta Light Rail + Metro West' },
      { icon: Home, text: 'Western Sydney Airport (Badgerys Creek) — opening 2026' },
    ],
    badge: 'Best value',
    badgeColor: 'bg-violet-600',
  },
];

const FAQS = [
  {
    q: 'Which Australian suburbs are best for Chinese buyers?',
    a: 'Box Hill VIC, Glen Waverley VIC, and Parramatta NSW are consistently the most sought-after suburbs among Chinese-Australian buyers. Box Hill and Glen Waverley offer established Mandarin and Cantonese communities in Melbourne, while Parramatta offers comparable affordability in Sydney with strong Chinese and Vietnamese community networks.',
  },
  {
    q: 'Do foreign buyers need FIRB approval to buy in these suburbs?',
    a: 'Yes. Foreign nationals and temporary visa holders must apply for Foreign Investment Review Board (FIRB) approval before purchasing established dwellings anywhere in Australia, including Box Hill, Glen Waverley, and Parramatta. Australian permanent residents and citizens are exempt. Both VIC and NSW charge an additional 8% foreign buyer surcharge on top of standard stamp duty.',
  },
  {
    q: 'Is it better to buy in Melbourne or Sydney for Chinese buyers?',
    a: 'Melbourne (Box Hill, Glen Waverley) and Sydney (Parramatta) suit different needs. Melbourne suburbs offer stronger school zone value — particularly GWSC — and are typically 20–30% more affordable than equivalent Sydney locations. Sydney offers better long-term infrastructure tailwinds, especially in Parramatta with the Western Sydney Airport opening in 2026 and the Sydney Metro West under construction.',
  },
  {
    q: 'Can I find Mandarin-speaking real estate agents in these suburbs?',
    a: "Yes. All three suburbs have established multilingual agent communities. ListHQ is Australia's first multilingual property platform — listings in Box Hill, Glen Waverley, and Parramatta are published in Simplified Chinese, Traditional Chinese, and Vietnamese. The ListHQ Halo system lets you post your buyer requirements and receive responses from Mandarin- and Vietnamese-speaking agents actively selling in your target suburb.",
  },
];

const FAQ_SCHEMA = {
  '@context': 'https://schema.org',
  '@type': 'FAQPage',
  mainEntity: FAQS.map(({ q, a }) => ({
    '@type': 'Question',
    name: q,
    acceptedAnswer: { '@type': 'Answer', text: a },
  })),
};

const SuburbsIndex = () => (
  <>
    <Helmet>
      <title>Australian Suburb Guides for Chinese & Vietnamese Buyers | ListHQ</title>
      <meta
        name="description"
        content="Detailed suburb guides for Chinese and Vietnamese buyers purchasing property in Australia. Box Hill, Glen Waverley, Parramatta — median prices, schools, FIRB and buying process."
      />
      <link rel="canonical" href="https://listhq.com.au/suburbs" />
      <script type="application/ld+json">{JSON.stringify(SCHEMA)}</script>
      <script type="application/ld+json">{JSON.stringify(FAQ_SCHEMA)}</script>
    </Helmet>

    <div className="max-w-5xl mx-auto px-4 py-10 text-foreground">
      {/* Breadcrumb */}
      <nav className="text-xs text-muted-foreground mb-6" aria-label="Breadcrumb">
        <Link to="/" className="hover:text-foreground">Home</Link>
        <span className="mx-1.5">›</span>
        <span className="text-foreground">Suburb Guides</span>
      </nav>

      {/* Header */}
      <header className="mb-10">
        <h1 className="font-display text-3xl md:text-4xl font-semibold mb-3">
          Australian Suburb Guides for Chinese and Vietnamese Buyers
        </h1>
        <p className="text-base leading-relaxed text-muted-foreground max-w-3xl">
          Detailed, independently researched guides to buying property in Australia's most popular
          suburbs for Chinese and Vietnamese families. Each guide covers median prices, schools,
          transport, FIRB rules, and the complete buying process — in plain English.
        </p>
      </header>

      {/* Suburb cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5 mb-12">
        {SUBURBS.map((s) => (
          <Link
            key={s.slug}
            to={`/suburbs/${s.slug}`}
            className="group block border border-border rounded-lg p-5 bg-card hover:shadow-md hover:border-primary/40 transition-all"
          >
            <div className="flex items-start justify-between mb-3">
              <div>
                <h2 className="font-display text-xl font-semibold text-foreground group-hover:text-primary transition-colors">
                  {s.name}
                </h2>
                <p className="text-xs text-muted-foreground mt-0.5">{s.state} {s.postcode}</p>
                <span className={`inline-block mt-2 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-white rounded ${s.badgeColor}`}>
                  {s.badge}
                </span>
                <p className="text-sm text-muted-foreground mt-3 leading-snug">{s.tagline}</p>
              </div>
              <ArrowRight size={18} className="text-muted-foreground group-hover:text-primary group-hover:translate-x-0.5 transition-all flex-shrink-0 mt-1" />
            </div>

            {/* Price pills */}
            <div className="flex flex-wrap gap-2 mb-4">
              <span className="text-xs px-2 py-1 rounded bg-muted text-foreground">
                🏠 House {s.medianHouse}
              </span>
              <span className="text-xs px-2 py-1 rounded bg-muted text-foreground">
                🏢 Unit {s.medianUnit}
              </span>
            </div>

            {/* Highlights */}
            <ul className="space-y-2">
              {s.highlights.map(({ icon: Icon, text }) => (
                <li key={text} className="flex items-start gap-2 text-xs text-muted-foreground">
                  <Icon size={14} className="text-primary flex-shrink-0 mt-0.5" />
                  <span>{text}</span>
                </li>
              ))}
            </ul>
          </Link>
        ))}
      </div>

      {/* About section */}
      <section className="border border-border rounded-lg p-6 bg-muted/30 mb-12">
        <div className="flex items-center gap-2 mb-3">
          <MapPin size={18} className="text-primary" />
          <h2 className="font-display text-xl font-semibold">About these guides</h2>
        </div>
        <p className="text-sm text-muted-foreground leading-relaxed mb-3">
          These guides are written specifically for Chinese-Australian and Vietnamese-Australian
          buyers navigating the Australian property market. They cover suburb-specific information
          that generic portals don't provide — including how school zones actually work, what FIRB
          approval means in practice, and how the buying process differs between NSW and VIC.
        </p>
        <p className="text-sm text-muted-foreground leading-relaxed">
          ListHQ is Australia's first multilingual property platform. Listings are published in
          Simplified Chinese, Traditional Chinese, and Vietnamese. Use the{' '}
          <Link to="/halo" className="text-primary hover:underline">Halo system</Link>{' '}
          to post your buyer requirements and receive direct responses from Mandarin- and
          Vietnamese-speaking agents in your target suburb.
        </p>
      </section>

      {/* FAQs */}
      <section>
        <h2 className="font-display text-2xl font-semibold mb-5">Frequently Asked Questions</h2>
        <div className="space-y-5">
          {FAQS.map(({ q, a }) => (
            <div key={q}>
              <h3 className="font-semibold text-base mb-1">{q}</h3>
              <p className="text-sm text-muted-foreground leading-relaxed">{a}</p>
            </div>
          ))}
        </div>
      </section>
    </div>
  </>
);

export default SuburbsIndex;
