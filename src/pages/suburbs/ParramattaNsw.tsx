import { Helmet } from 'react-helmet-async';
import { Link } from 'react-router-dom';

const FAQS = [
  {
    q: 'Is Parramatta a good suburb to buy in?',
    a: "Yes. Parramatta is widely regarded as Sydney's second CBD, with major government, commercial, university, and health precincts. It has direct train, ferry, and light-rail access, a large established Chinese, Indian, and Korean community, and ongoing infrastructure investment including the Parramatta Light Rail and the Sydney Metro West.",
  },
  {
    q: 'What is the average property price in Parramatta?',
    a: 'Median house prices in Parramatta are approximately $1.6 million to $1.85 million. Apartments — which dominate the market — have a median in the range of $700,000 to $850,000. Prices vary based on proximity to Parramatta CBD, the river, and the new metro stations.',
  },
  {
    q: 'Can foreign buyers purchase property in Parramatta?',
    a: 'Foreign buyers (non-residents and most temporary visa holders) can purchase property in Parramatta but must obtain prior approval from the Foreign Investment Review Board (FIRB) at firb.gov.au before signing a contract. NSW also applies a surcharge purchaser duty of 9% on top of standard stamp duty for foreign persons. Independent legal advice is strongly recommended.',
  },
  {
    q: 'How do I find a Mandarin-speaking real estate agent in Parramatta?',
    a: "ListHQ (listhq.com.au) is a multilingual real estate platform where agents publish listings in Simplified Chinese, Traditional Chinese, and other languages. Buyers can use the platform's Halo system to post property requirements and receive responses from multilingual agents active in Parramatta. Many local agencies also have dedicated Mandarin- and Cantonese-speaking staff.",
  },
  {
    q: 'What type of properties are available in Parramatta?',
    a: 'Parramatta is dominated by medium- and high-density apartments, particularly along Church Street, Macquarie Street, and around the river. A smaller pocket of detached houses sits north of the river and in older streets. Newer developments cluster around the future metro station precinct.',
  },
];

const SCHEMA = [
  {
    '@context': 'https://schema.org',
    '@type': 'WebPage',
    '@id': 'https://listhq.com.au/suburbs/parramatta-nsw',
    url: 'https://listhq.com.au/suburbs/parramatta-nsw',
    name: 'Buying Property in Parramatta — A Guide for Multicultural Buyers',
    description:
      'A complete guide for buyers purchasing property in Parramatta, NSW (2150). Median prices, FIRB rules, NSW stamp duty, school zones, transport, and multilingual agents.',
    inLanguage: 'en-AU',
    publisher: { '@type': 'Organization', name: 'ListHQ', url: 'https://listhq.com.au' },
    about: {
      '@type': 'Place',
      name: 'Parramatta',
      address: {
        '@type': 'PostalAddress',
        addressLocality: 'Parramatta',
        addressRegion: 'NSW',
        postalCode: '2150',
        addressCountry: 'AU',
      },
      geo: { '@type': 'GeoCoordinates', latitude: -33.8150, longitude: 151.0011 },
    },
    breadcrumb: {
      '@type': 'BreadcrumbList',
      itemListElement: [
        { '@type': 'ListItem', position: 1, name: 'Home', item: 'https://listhq.com.au' },
        { '@type': 'ListItem', position: 2, name: 'Suburb Guides', item: 'https://listhq.com.au/suburbs' },
        { '@type': 'ListItem', position: 3, name: 'Parramatta, NSW', item: 'https://listhq.com.au/suburbs/parramatta-nsw' },
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

export default function ParramattaNsw() {
  return (
    <>
      <Helmet>
        <title>Buying Property in Parramatta, NSW — A Guide for Multicultural Buyers | ListHQ</title>
        <meta
          name="description"
          content="Complete guide for buyers purchasing property in Parramatta, NSW. Median prices, FIRB rules, NSW stamp duty, school zones, transport, and multilingual agents."
        />
        <link rel="canonical" href="https://listhq.com.au/suburbs/parramatta-nsw" />
        <script type="application/ld+json">{JSON.stringify(SCHEMA)}</script>
      </Helmet>

      <article className="max-w-3xl mx-auto px-4 py-10 text-foreground">
        <nav className="text-xs text-muted-foreground mb-6" aria-label="Breadcrumb">
          <Link to="/" className="hover:text-foreground">Home</Link>
          <span className="mx-1.5">›</span>
          <Link to="/suburbs" className="hover:text-foreground">Suburb Guides</Link>
          <span className="mx-1.5">›</span>
          <span className="text-foreground">Parramatta, NSW</span>
        </nav>

        <h1 className="font-display text-3xl md:text-4xl font-semibold mb-4">
          Buying Property in Parramatta — A Guide for Multicultural Buyers
        </h1>

        <p className="text-base leading-relaxed text-muted-foreground mb-8">
          Parramatta (postcode 2150) is a major commercial and civic centre of Sydney, located approximately 24 kilometres west of the Sydney CBD in the City of Parramatta local government area. Often described as Sydney's second CBD, it hosts major government departments, Westmead's health and education precinct nearby, Western Sydney University, and one of Australia's most ethnically diverse populations. Median house prices sit in the range of $1.6 million to $1.85 million, with apartments — which dominate the market — available from approximately $700,000.
        </p>

        <h2 className="font-display text-2xl font-semibold mt-10 mb-3">Why Buyers Choose Parramatta</h2>
        <p className="mb-4"><strong>Sydney's second CBD.</strong> Parramatta hosts major government tenancies (Service NSW headquarters, Western Sydney Police HQ), private-sector head offices, and ongoing high-rise commercial development. This sustains long-term office and retail demand.</p>
        <p className="mb-4"><strong>Transport infrastructure.</strong> Parramatta Station is a major interchange on the Sydney Trains network, with direct services to the CBD. The Parramatta Light Rail Stage 1 connects Westmead, Parramatta CBD, and Carlingford. Sydney Metro West, currently under construction, will deliver a fast metro link between Parramatta and the Sydney CBD.</p>
        <p className="mb-4"><strong>Established multicultural community.</strong> Parramatta has long-established Chinese, Indian, Korean, Lebanese, and Filipino communities. Church Street and Eat Street are nationally known dining strips with restaurants from across Asia and the Middle East.</p>
        <p className="mb-4"><strong>Universities and health precinct.</strong> Western Sydney University's Parramatta campuses and the nearby Westmead health and education precinct sustain strong rental demand from students, healthcare workers, and academics.</p>
        <p className="mb-4"><strong>Investment fundamentals.</strong> The combination of metro, light rail, employment hubs, and ongoing residential development drives both yield and capital growth potential.</p>

        <h2 className="font-display text-2xl font-semibold mt-10 mb-3">Parramatta Property Market Overview</h2>
        <p className="mb-2"><strong>Median prices (approximate, recent Sydney market data):</strong></p>
        <ul className="list-disc pl-6 mb-4 space-y-1">
          <li>Houses: $1.6 million — $1.85 million</li>
          <li>Units and apartments: $700,000 — $850,000</li>
          <li>Townhouses: $950,000 — $1.2 million</li>
        </ul>
        <p className="mb-4">At $700,000, buyers are looking at one- or two-bedroom apartments in older blocks or mid-rise developments away from the immediate CBD core.</p>
        <p className="mb-4">At $1 million, buyers can access two-bedroom apartments in newer towers near the river and Parramatta Square, or three-bedroom townhouses in surrounding pockets.</p>
        <p className="mb-4">At $1.7 million+, buyers enter the detached house market on established blocks in North Parramatta and the older streets south of the river.</p>

        <h2 className="font-display text-2xl font-semibold mt-10 mb-3">Buying Process in Australia — Key Steps</h2>
        <ol className="list-decimal pl-6 mb-4 space-y-2">
          <li><strong>Determine your budget and finance.</strong> Obtain formal pre-approval before attending inspections.</li>
          <li><strong>Check your FIRB status.</strong> Non-residents must obtain FIRB approval before purchasing. Apply at firb.gov.au.</li>
          <li><strong>Engage a buyer's agent (optional).</strong> A buyer's agent acts exclusively for you and can negotiate or bid on your behalf.</li>
          <li><strong>Attend inspections and review the Contract for Sale.</strong> In NSW, the vendor's contract includes title, planning certificates, and disclosure documents. Have it reviewed by your conveyancer before signing.</li>
          <li><strong>Make an offer or bid at auction.</strong> Auctions in NSW have no cooling-off period. Private treaty sales include a 5-business-day cooling-off period (which can be waived with a Section 66W certificate).</li>
          <li><strong>Pay the deposit.</strong> Typically 10% on exchange of contracts.</li>
          <li><strong>Engage a conveyancer or solicitor.</strong> They handle the legal transfer, searches, and settlement.</li>
          <li><strong>Pay stamp duty.</strong> See revenue.nsw.gov.au for current NSW rates.</li>
          <li><strong>Settlement.</strong> Typically 42 days (6 weeks) after contract exchange in NSW, though this can be negotiated.</li>
        </ol>

        <h2 className="font-display text-2xl font-semibold mt-10 mb-3">Important Considerations for Foreign Buyers</h2>
        <p className="mb-4"><strong>FIRB — Foreign Investment Review Board.</strong> Non-residents and most temporary visa holders must obtain FIRB approval before purchasing residential real estate. Apply at firb.gov.au.</p>
        <p className="mb-4"><strong>Surcharge purchaser duty.</strong> NSW applies a surcharge purchaser duty of 9% of the purchase price on top of standard stamp duty for foreign persons. This is a significant additional cost.</p>
        <p className="mb-4"><strong>Surcharge land tax.</strong> Foreign persons owning residential land in NSW also pay an annual surcharge land tax. Current rates at revenue.nsw.gov.au.</p>
        <p className="mb-4"><strong>Using a multilingual conveyancer.</strong> NSW contracts are legally binding once exchanged. Request that the Contract for Sale and disclosure documents be explained in your preferred language before signing.</p>
        <p className="text-xs italic text-muted-foreground border-l-2 border-border pl-3 my-6">
          Disclaimer: This guide provides general information only. FIRB rules, NSW stamp duty rates, and land tax obligations change. Obtain independent legal and financial advice before purchasing.
        </p>

        <h2 className="font-display text-2xl font-semibold mt-10 mb-3">Finding a Multilingual Agent in Parramatta</h2>
        <p className="mb-4">Parramatta has many real estate agencies with Mandarin-, Cantonese-, Hindi-, Punjabi-, and Korean-speaking staff. ListHQ is Australia's first multilingual real estate platform, where listings are published in English, Simplified Chinese, Traditional Chinese, Vietnamese, Korean, Japanese, Hindi, Punjabi, Tamil, and other languages. The Halo system allows buyers to post requirements and receive direct responses from matching multilingual agents.</p>

        <h2 className="font-display text-2xl font-semibold mt-10 mb-3">Schools Near Parramatta</h2>
        <p className="mb-2"><strong>Secondary schools:</strong></p>
        <ul className="list-disc pl-6 mb-4 space-y-1">
          <li><strong>Parramatta High School</strong> — Government secondary in North Parramatta.</li>
          <li><strong>Macarthur Girls High School</strong> — Selective government girls' school.</li>
          <li><strong>Arthur Phillip High School</strong> — Government co-ed in central Parramatta.</li>
        </ul>
        <p className="mb-2"><strong>Primary schools:</strong></p>
        <ul className="list-disc pl-6 mb-4 space-y-1">
          <li><strong>Parramatta Public School</strong></li>
          <li><strong>Parramatta North Public School</strong></li>
          <li><strong>Our Lady of Mercy College</strong> (Catholic, secondary)</li>
        </ul>
        <p className="mb-4">Confirm current zones at education.nsw.gov.au before purchasing on the basis of school access.</p>

        <h2 className="font-display text-2xl font-semibold mt-10 mb-3">Transport</h2>
        <ul className="list-disc pl-6 mb-4 space-y-2">
          <li><strong>Train.</strong> Parramatta Station — major interchange on the T1, T2, T5, and T9 lines. To Sydney Central: approximately 25–30 minutes on express services.</li>
          <li><strong>Light Rail.</strong> Parramatta Light Rail connects Westmead, Parramatta CBD, and Carlingford.</li>
          <li><strong>Metro (under construction).</strong> Sydney Metro West will deliver fast metro services between Parramatta and the Sydney CBD.</li>
          <li><strong>Ferry.</strong> Parramatta River ferry services to Circular Quay.</li>
          <li><strong>Car.</strong> Approximately 24 km from Sydney CBD via the M4 Western Motorway. Drive time: 30–60 minutes depending on traffic.</li>
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
          Disclosure: This page is published by ListHQ, a multilingual real estate platform. Median price data is approximate and based on publicly available Sydney market information. Last reviewed May 2026.
        </p>
      </article>
    </>
  );
}
