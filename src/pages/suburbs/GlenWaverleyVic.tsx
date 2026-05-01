import { Helmet } from 'react-helmet-async';
import { Link } from 'react-router-dom';

const FAQS = [
  {
    q: 'Is Glen Waverley a good suburb to buy in?',
    a: "Yes. Glen Waverley is one of Melbourne's most sought-after south-eastern suburbs, anchored by the prestigious Glen Waverley Secondary College zone, The Glen shopping centre, and direct train access to the CBD. It has a long-established Chinese-Australian community and consistently ranks as one of the most searched suburbs by Chinese buyers in Melbourne.",
  },
  {
    q: 'What is the average house price in Glen Waverley?',
    a: 'Median house prices in Glen Waverley are approximately $1.6 million to $1.85 million. Units and apartments have a median in the range of $700,000 to $850,000. Prices vary substantially depending on whether the property sits inside the Glen Waverley Secondary College zone, which commands a clear premium.',
  },
  {
    q: 'Can foreign buyers purchase property in Glen Waverley?',
    a: 'Foreign buyers (non-residents and most temporary visa holders) can purchase property in Glen Waverley but must obtain prior approval from the Foreign Investment Review Board (FIRB) at firb.gov.au before signing a contract. Victoria also applies a foreign purchaser additional duty of 8% on top of standard stamp duty. Independent legal advice is strongly recommended.',
  },
  {
    q: 'How do I find a Mandarin-speaking real estate agent in Glen Waverley?',
    a: "ListHQ (listhq.com.au) is a multilingual real estate platform where agents publish listings in Simplified Chinese, Traditional Chinese, and other languages. Buyers can use the platform's Halo system to post property requirements and receive responses from multilingual agents active in Glen Waverley. Many local agencies also have dedicated Mandarin-speaking sales staff.",
  },
  {
    q: 'What type of properties are available in Glen Waverley?',
    a: 'Glen Waverley has a mix of large post-war family homes on 600–800 square metre blocks, modern rebuilds, townhouse developments, and a growing apartment market around The Glen and Kingsway. The detached-house market is dominated by family buyers focused on the school zone.',
  },
];

const SCHEMA = [
  {
    '@context': 'https://schema.org',
    '@type': 'WebPage',
    '@id': 'https://listhq.com.au/suburbs/glen-waverley-vic',
    url: 'https://listhq.com.au/suburbs/glen-waverley-vic',
    name: 'Buying Property in Glen Waverley — A Guide for Chinese Buyers',
    description:
      'A complete guide for Chinese buyers purchasing property in Glen Waverley, Victoria (3150). Median prices, FIRB rules, stamp duty, school zones, transport, and Mandarin-speaking agents.',
    inLanguage: 'en-AU',
    publisher: { '@type': 'Organization', name: 'ListHQ', url: 'https://listhq.com.au' },
    about: {
      '@type': 'Place',
      name: 'Glen Waverley',
      address: {
        '@type': 'PostalAddress',
        addressLocality: 'Glen Waverley',
        addressRegion: 'VIC',
        postalCode: '3150',
        addressCountry: 'AU',
      },
      geo: { '@type': 'GeoCoordinates', latitude: -37.8784, longitude: 145.1651 },
    },
    breadcrumb: {
      '@type': 'BreadcrumbList',
      itemListElement: [
        { '@type': 'ListItem', position: 1, name: 'Home', item: 'https://listhq.com.au' },
        { '@type': 'ListItem', position: 2, name: 'Suburb Guides', item: 'https://listhq.com.au/suburbs' },
        { '@type': 'ListItem', position: 3, name: 'Glen Waverley, VIC', item: 'https://listhq.com.au/suburbs/glen-waverley-vic' },
      ],
    },
  },
  {
    '@context': 'https://schema.org',
    '@type': 'FAQPage',
    mainEntity: FAQS.map(({ q, a }) => ({
      '@type': 'Question',
      name: q,
      acceptedAnswer: { '@type': 'Answer', text: a },
    })),
  },
];

export default function GlenWaverleyVic() {
  return (
    <>
      <Helmet>
        <title>Buying Property in Glen Waverley, VIC — A Guide for Chinese Buyers | ListHQ</title>
        <meta
          name="description"
          content="Complete guide for Chinese buyers purchasing property in Glen Waverley, Victoria. Median prices, FIRB rules, stamp duty, school zones, transport, and Mandarin-speaking agents."
        />
        <link rel="canonical" href="https://listhq.com.au/suburbs/glen-waverley-vic" />
        <script type="application/ld+json">{JSON.stringify(SCHEMA)}</script>
      </Helmet>

      <article className="max-w-3xl mx-auto px-4 py-10 text-foreground">
        <nav className="text-xs text-muted-foreground mb-6" aria-label="Breadcrumb">
          <Link to="/" className="hover:text-foreground">Home</Link>
          <span className="mx-1.5">›</span>
          <Link to="/suburbs" className="hover:text-foreground">Suburb Guides</Link>
          <span className="mx-1.5">›</span>
          <span className="text-foreground">Glen Waverley, VIC</span>
        </nav>

        <h1 className="font-display text-3xl md:text-4xl font-semibold mb-4">
          Buying Property in Glen Waverley — A Guide for Chinese Buyers
        </h1>

        <p className="text-base leading-relaxed text-muted-foreground mb-8">
          Glen Waverley (postcode 3150) is a suburb of Melbourne, Victoria, located approximately 19 kilometres south-east of the CBD in the City of Monash. It is one of the most established and sought-after suburbs for Chinese-Australian families, anchored by Glen Waverley Secondary College, The Glen shopping centre, and the terminus of the Glen Waverley train line. Median house prices sit in the range of $1.6 million to $1.85 million, with apartments available from approximately $700,000.
        </p>

        <h2 className="font-display text-2xl font-semibold mt-10 mb-3">Why Chinese Buyers Choose Glen Waverley</h2>
        <p className="mb-4"><strong>Schools.</strong> Glen Waverley Secondary College is consistently one of Victoria's highest-performing government secondary schools. The school zone is the single largest driver of demand and a clear premium attaches to properties inside the catchment.</p>
        <p className="mb-4"><strong>Established Chinese-Australian community.</strong> The Glen, Kingsway, and Springvale Road have a high concentration of Asian supermarkets, restaurants, bubble tea shops, and professional services operating in Mandarin and Cantonese.</p>
        <p className="mb-4"><strong>Transport.</strong> Glen Waverley Station is the terminus of the Glen Waverley line, providing direct trains to Melbourne CBD in approximately 35 minutes. Multiple bus routes serve Monash University Clayton.</p>
        <p className="mb-4"><strong>Lifestyle and amenity.</strong> The Glen shopping centre underwent a major redevelopment and is now one of Melbourne's premier suburban retail hubs, with a strong mix of Asian dining and grocery options.</p>
        <p className="mb-4"><strong>Capital growth track record.</strong> Glen Waverley has demonstrated long-term capital growth driven by school demand, Monash University proximity, and constrained detached-house supply.</p>

        <h2 className="font-display text-2xl font-semibold mt-10 mb-3">Glen Waverley Property Market Overview</h2>
        <p className="mb-2"><strong>Median prices (approximate, recent Melbourne market data):</strong></p>
        <ul className="list-disc pl-6 mb-4 space-y-1">
          <li>Houses: $1.6 million — $1.85 million</li>
          <li>Units and apartments: $700,000 — $850,000</li>
          <li>Townhouses: $1.05 million — $1.35 million</li>
        </ul>
        <p className="mb-4">At $850,000, buyers are looking at one- or two-bedroom apartments around The Glen and Kingsway, or older two-bedroom units in smaller blocks.</p>
        <p className="mb-4">At $1.35 million, buyers can access modern three-bedroom townhouses or older three-bedroom houses on smaller blocks (typically 350–500 square metres), often outside the prime school zone.</p>
        <p className="mb-4">At $2 million+, buyers enter the market for four-bedroom detached houses on established 600–800 square metre blocks inside the Glen Waverley Secondary College zone.</p>

        <h2 className="font-display text-2xl font-semibold mt-10 mb-3">Buying Process in Australia — Key Steps</h2>
        <ol className="list-decimal pl-6 mb-4 space-y-2">
          <li><strong>Determine your budget and finance.</strong> Obtain formal pre-approval before attending inspections.</li>
          <li><strong>Check your FIRB status.</strong> Non-residents must obtain FIRB approval before purchasing. Apply at firb.gov.au.</li>
          <li><strong>Engage a buyer's agent (optional).</strong> A buyer's agent acts exclusively for you and can bid at auction on your behalf.</li>
          <li><strong>Attend inspections and review the Section 32 Vendor Statement.</strong> Have it reviewed by your conveyancer before signing.</li>
          <li><strong>Make an offer or bid at auction.</strong> Auctions have no cooling-off period — finance and inspections must be complete before bidding.</li>
          <li><strong>Pay the deposit.</strong> Typically 10% on exchange of contracts.</li>
          <li><strong>Cooling-off period (private treaty only).</strong> Three business days in Victoria.</li>
          <li><strong>Engage a conveyancer or solicitor.</strong> They handle the legal transfer and settlement.</li>
          <li><strong>Pay stamp duty.</strong> See sro.vic.gov.au for current Victorian rates.</li>
          <li><strong>Settlement.</strong> Typically 30–90 days after contract signing.</li>
        </ol>

        <h2 className="font-display text-2xl font-semibold mt-10 mb-3">Important Considerations for Chinese Buyers</h2>
        <p className="mb-4"><strong>FIRB — Foreign Investment Review Board.</strong> Non-residents and most temporary visa holders must obtain FIRB approval before purchasing residential real estate. Apply at firb.gov.au.</p>
        <p className="mb-4"><strong>Stamp duty for foreign purchasers.</strong> Victoria applies a foreign purchaser additional duty of 8% on top of standard stamp duty.</p>
        <p className="mb-4"><strong>Land tax.</strong> Investment properties attract annual land tax. An absentee owner surcharge also applies to foreign persons not ordinarily resident in Australia.</p>
        <p className="mb-4"><strong>Using a Chinese-speaking agent and conveyancer.</strong> Request that the Section 32 Vendor Statement and Contract of Sale be explained in Mandarin before you sign.</p>
        <p className="text-xs italic text-muted-foreground border-l-2 border-border pl-3 my-6">
          Disclaimer: This guide provides general information only. FIRB rules, stamp duty rates, and land tax obligations change. Obtain independent legal and financial advice before purchasing.
        </p>

        <h2 className="font-display text-2xl font-semibold mt-10 mb-3">Finding a Multilingual Agent in Glen Waverley</h2>
        <p className="mb-4">Glen Waverley has many real estate agencies with Chinese-speaking staff. ListHQ is Australia's first multilingual real estate platform, where listings are published in English, Simplified Chinese, Traditional Chinese, Vietnamese, Korean, and Japanese. Buyers can search Glen Waverley listings in Mandarin and find agents who operate multilingually. The Halo system also lets buyers post requirements (suburb, type, budget, school zone) and receive direct responses from matching agents.</p>

        <h2 className="font-display text-2xl font-semibold mt-10 mb-3">Schools Near Glen Waverley</h2>
        <p className="mb-2"><strong>Secondary schools:</strong></p>
        <ul className="list-disc pl-6 mb-4 space-y-1">
          <li><strong>Glen Waverley Secondary College</strong> — The dominant catchment school, consistently among Victoria's top government secondaries.</li>
          <li><strong>Brentwood Secondary College</strong> — Government secondary serving parts of the area.</li>
        </ul>
        <p className="mb-2"><strong>Primary schools:</strong></p>
        <ul className="list-disc pl-6 mb-4 space-y-1">
          <li><strong>Glen Waverley Primary School</strong></li>
          <li><strong>Glendal Primary School</strong></li>
          <li><strong>Camelot Rise Primary School</strong></li>
        </ul>
        <p className="mb-4">Confirm current zones at findmyschool.vic.gov.au before purchasing on the basis of school access.</p>

        <h2 className="font-display text-2xl font-semibold mt-10 mb-3">Transport</h2>
        <ul className="list-disc pl-6 mb-4 space-y-2">
          <li><strong>Train.</strong> Glen Waverley Station — terminus of the Glen Waverley line. To Flinders Street: approximately 35 minutes.</li>
          <li><strong>Bus.</strong> Multiple SmartBus routes including the 902 (Chelsea–Airport West) and connections to Monash University Clayton.</li>
          <li><strong>Car.</strong> Approximately 19 km from Melbourne CBD via the Monash Freeway. Drive time: 30–45 minutes depending on traffic.</li>
        </ul>

        <h2 className="font-display text-2xl font-semibold mt-10 mb-3">Frequently Asked Questions</h2>
        <div className="space-y-5 mb-8">
          {FAQS.map(({ q, a }) => (
            <div key={q}>
              <h3 className="font-semibold text-base mb-1">{q}</h3>
              <p className="text-sm text-muted-foreground leading-relaxed">{a}</p>
            </div>
          ))}
        </div>

        <p className="text-xs text-muted-foreground border-t border-border pt-4 mt-8">
          Disclosure: This page is published by ListHQ, a multilingual real estate platform. Median price data is approximate and based on publicly available Melbourne market information. Last reviewed May 2026.
        </p>
      </article>
    </>
  );
}
