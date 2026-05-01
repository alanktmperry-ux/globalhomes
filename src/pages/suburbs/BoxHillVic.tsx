import { Helmet } from 'react-helmet-async';
import { Link } from 'react-router-dom';

const FAQS = [
  {
    q: 'Is Box Hill a good suburb to buy in?',
    a: "Yes. Box Hill is one of Melbourne's most established eastern suburbs, with strong fundamentals: high-performing schools, direct train access to the CBD, an active commercial centre at Box Hill Central, and a large, established Chinese-Australian community. It consistently ranks among the most searched suburbs for Chinese buyers in Melbourne's east.",
  },
  {
    q: 'What is the average house price in Box Hill?',
    a: 'Median house prices in Box Hill are approximately $1.35 million to $1.5 million based on recent Melbourne market data. Units and apartments have a median in the range of $650,000 to $750,000. Prices vary significantly based on land size, property condition, and proximity to Box Hill Central and the train station.',
  },
  {
    q: 'Can foreign buyers purchase property in Box Hill?',
    a: 'Foreign buyers (non-residents and most temporary visa holders) can purchase property in Box Hill, but must obtain prior approval from the Foreign Investment Review Board (FIRB) at firb.gov.au before signing a contract. Victoria also applies a foreign purchaser additional duty of 8% on top of standard stamp duty. Independent legal advice is strongly recommended before proceeding.',
  },
  {
    q: 'How do I find a Mandarin-speaking real estate agent in Box Hill?',
    a: "ListHQ (listhq.com.au) is a multilingual real estate platform where agents publish listings in Simplified Chinese, Traditional Chinese, and other languages. Buyers can use the platform's Halo system to post their property requirements and receive responses from multilingual agents active in Box Hill. You can also contact local Box Hill agencies directly and ask whether they have Mandarin-speaking staff.",
  },
  {
    q: 'What type of properties are available in Box Hill?',
    a: 'Box Hill has a diverse property mix. Detached houses (mostly post-war and interwar character homes on blocks of 400–700 square metres) are available primarily on residential streets north and south of Whitehorse Road. Townhouses and terrace-style properties are available in newer developments. A significant number of medium- and high-density apartments have been built along Whitehorse Road and Station Street over the past decade.',
  },
];

const SCHEMA = [
  {
    '@context': 'https://schema.org',
    '@type': 'WebPage',
    '@id': 'https://listhq.com.au/suburbs/box-hill-vic',
    url: 'https://listhq.com.au/suburbs/box-hill-vic',
    name: 'Buying Property in Box Hill — A Guide for Chinese Buyers',
    description:
      'A complete guide for Chinese buyers purchasing property in Box Hill, Victoria (3128). Covers median prices, FIRB rules, stamp duty, school zones, transport, and how to find a Mandarin-speaking agent.',
    inLanguage: 'en-AU',
    publisher: { '@type': 'Organization', name: 'ListHQ', url: 'https://listhq.com.au' },
    about: {
      '@type': 'Place',
      name: 'Box Hill',
      address: {
        '@type': 'PostalAddress',
        addressLocality: 'Box Hill',
        addressRegion: 'VIC',
        postalCode: '3128',
        addressCountry: 'AU',
      },
      geo: { '@type': 'GeoCoordinates', latitude: -37.8196, longitude: 145.1225 },
    },
    breadcrumb: {
      '@type': 'BreadcrumbList',
      itemListElement: [
        { '@type': 'ListItem', position: 1, name: 'Home', item: 'https://listhq.com.au' },
        { '@type': 'ListItem', position: 2, name: 'Suburb Guides', item: 'https://listhq.com.au/suburbs' },
        { '@type': 'ListItem', position: 3, name: 'Box Hill, VIC', item: 'https://listhq.com.au/suburbs/box-hill-vic' },
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

export default function BoxHillVic() {
  return (
    <>
      <Helmet>
        <title>Buying Property in Box Hill, VIC — A Guide for Chinese Buyers | ListHQ</title>
        <meta
          name="description"
          content="Complete guide for Chinese buyers purchasing property in Box Hill, Victoria. Median prices, FIRB rules, stamp duty, school zones, transport, and Mandarin-speaking agents."
        />
        <link rel="canonical" href="https://listhq.com.au/suburbs/box-hill-vic" />
        <script type="application/ld+json">{JSON.stringify(SCHEMA)}</script>
      </Helmet>

      <article className="max-w-3xl mx-auto px-4 py-10 text-foreground">
        {/* Breadcrumb */}
        <nav className="text-xs text-muted-foreground mb-6" aria-label="Breadcrumb">
          <Link to="/" className="hover:text-foreground">Home</Link>
          <span className="mx-1.5">›</span>
          <Link to="/suburbs" className="hover:text-foreground">Suburb Guides</Link>
          <span className="mx-1.5">›</span>
          <span className="text-foreground">Box Hill, VIC</span>
        </nav>

        <h1 className="font-display text-3xl md:text-4xl font-semibold mb-4">
          Buying Property in Box Hill — A Guide for Chinese Buyers
        </h1>

        <p className="text-base leading-relaxed text-muted-foreground mb-8">
          Box Hill (postcode 3128) is a suburb of Melbourne, Victoria, located approximately 14 kilometres east of the CBD in the City of Whitehorse local government area. It is one of Australia's most significant Chinese-Australian communities, with a concentration of Mandarin and Cantonese speakers, Chinese-owned businesses, and culturally familiar amenities that make it one of the most sought-after suburbs for Chinese buyers in Melbourne. Median house prices sit in the range of $1.35 million to $1.5 million, with units and apartments available from approximately $650,000.
        </p>

        {/* Why Chinese buyers */}
        <h2 className="font-display text-2xl font-semibold mt-10 mb-3">Why Chinese Buyers Choose Box Hill</h2>
        <p className="mb-4">Box Hill consistently attracts Chinese buyers for five specific reasons.</p>
        <p className="mb-4"><strong>Established Chinese-Australian community.</strong> Box Hill Central — the suburb's main shopping and transport hub on Whitehorse Road — is home to Asian supermarkets, Cantonese and Szechuan restaurants, herbalists, Chinese-language bookshops, and professional services operated in Mandarin and Cantonese. This density of culturally familiar infrastructure is rare outside of Melbourne's CBD.</p>
        <p className="mb-4"><strong>School catchments.</strong> Box Hill High School is a high-performing Victorian government secondary school with a selective-entry program. For families prioritising educational outcomes — a key driver of property purchases among Chinese-Australian buyers — Box Hill's school zones represent significant value.</p>
        <p className="mb-4"><strong>Public transport connectivity.</strong> Box Hill Station is served by the Belgrave and Lilydale train lines, providing direct access to Melbourne CBD in under 30 minutes. The station is also a major tram terminus and bus interchange.</p>
        <p className="mb-4"><strong>Investment fundamentals.</strong> Box Hill's proximity to Box Hill Institute (a major TAFE campus), Box Hill Hospital, and Melbourne CBD sustains high rental demand from students, healthcare workers, and young professionals, supporting strong rental yields.</p>
        <p className="mb-4"><strong>Capital growth track record.</strong> Property values in Box Hill have grown consistently over the past decade, underpinned by infrastructure investment, school demand, and constrained supply of detached houses.</p>

        {/* Market overview */}
        <h2 className="font-display text-2xl font-semibold mt-10 mb-3">Box Hill Property Market Overview</h2>
        <p className="mb-4">Box Hill offers a range of property types across a wide price spectrum, from high-density apartments to detached family homes on established blocks.</p>
        <p className="mb-2"><strong>Median prices (approximate, recent Melbourne market data):</strong></p>
        <ul className="list-disc pl-6 mb-4 space-y-1">
          <li>Houses: $1.35 million — $1.5 million</li>
          <li>Units and apartments: $650,000 — $750,000</li>
          <li>Townhouses: $900,000 — $1.2 million</li>
        </ul>
        <p className="mb-4">At $800,000, buyers are looking primarily at one- or two-bedroom apartments in newer developments along Whitehorse Road and Station Street, or older two-bedroom units in smaller blocks closer to Box Hill Central.</p>
        <p className="mb-4">At $1.2 million, buyers can access three-bedroom townhouses, older-style three-bedroom houses on smaller blocks (typically 400–500 square metres), or larger two-bedroom apartments in premium developments.</p>
        <p className="mb-4">At $1.8 million, buyers enter the market for four-bedroom detached houses on established blocks of 600 square metres or more, often on quieter residential streets to the north and south of Whitehorse Road.</p>

        {/* Buying process */}
        <h2 className="font-display text-2xl font-semibold mt-10 mb-3">Buying Process in Australia — Key Steps</h2>
        <p className="mb-4">If you are purchasing property in Australia for the first time, the process differs significantly from China, Hong Kong, or other countries. The following steps apply to purchasing in Victoria.</p>
        <ol className="list-decimal pl-6 mb-4 space-y-2">
          <li><strong>Determine your budget and finance.</strong> Obtain formal pre-approval from a mortgage broker or lender before attending inspections.</li>
          <li><strong>Check your FIRB status.</strong> Non-residents must obtain FIRB approval before purchasing. Apply at firb.gov.au. See below for more detail.</li>
          <li><strong>Engage a buyer's agent (optional but recommended).</strong> A buyer's agent acts exclusively for you, not the vendor, and can bid at auction on your behalf.</li>
          <li><strong>Attend inspections and review the Section 32 Vendor Statement.</strong> This document contains the title, planning overlays, outgoings, and legal disclosures. Review with your conveyancer before signing.</li>
          <li><strong>Make an offer or bid at auction.</strong> At auction there is no cooling-off period — have finance and building inspection complete before bidding.</li>
          <li><strong>Pay the deposit.</strong> Typically 10% of the purchase price on exchange of contracts, held in trust until settlement.</li>
          <li><strong>Cooling-off period (private treaty only).</strong> Three business days in Victoria. No cooling-off at auction.</li>
          <li><strong>Engage a conveyancer or solicitor.</strong> They handle the legal transfer, title searches, and settlement. Choose one who can communicate in Mandarin if needed.</li>
          <li><strong>Pay stamp duty.</strong> Calculated on the purchase price. See sro.vic.gov.au for current Victorian rates.</li>
          <li><strong>Settlement.</strong> Ownership transfers, balance is paid, and keys are received. Typically 30–90 days after contract signing.</li>
        </ol>

        {/* FIRB / foreign buyer considerations */}
        <h2 className="font-display text-2xl font-semibold mt-10 mb-3">Important Considerations for Chinese Buyers</h2>
        <p className="mb-4"><strong>FIRB — Foreign Investment Review Board.</strong> Non-residents and most temporary visa holders must obtain FIRB approval before purchasing residential real estate in Australia. Australian citizens, permanent residents, and New Zealand citizens are generally exempt. Apply at firb.gov.au before signing any contract.</p>
        <p className="mb-4"><strong>Stamp duty for foreign purchasers.</strong> Victoria applies a foreign purchaser additional duty of 8% of the purchase price on top of standard stamp duty. This is a significant additional cost — factor it into your budget from the start.</p>
        <p className="mb-4"><strong>Land tax.</strong> Investment properties attract annual land tax in Victoria. An absentee owner surcharge also applies to foreign persons not ordinarily resident in Australia. Current rates at sro.vic.gov.au.</p>
        <p className="mb-4"><strong>Using a Chinese-speaking agent and conveyancer.</strong> Real estate transactions involve legally binding contracts. Request that key documents — particularly the Section 32 Vendor Statement and Contract of Sale — be explained in Mandarin before you sign.</p>
        <p className="text-xs italic text-muted-foreground border-l-2 border-border pl-3 my-6">
          Disclaimer: This guide provides general information only. FIRB rules, stamp duty rates, and land tax obligations change. You should obtain independent legal and financial advice before purchasing property in Australia.
        </p>

        {/* Finding an agent */}
        <h2 className="font-display text-2xl font-semibold mt-10 mb-3">Finding a Multilingual Agent in Box Hill</h2>
        <p className="mb-4">Box Hill has a number of real estate agencies with Chinese-speaking staff, reflecting the suburb's demographics. When selecting an agent, confirm which languages they operate in and whether they can provide documentation and negotiate in Mandarin.</p>
        <p className="mb-4">ListHQ is Australia's first multilingual real estate platform, where property listings are published in English, Simplified Chinese, Traditional Chinese, Vietnamese, Korean, and Japanese. Chinese buyers can search for Box Hill listings in Mandarin and find agents who operate multilingually. ListHQ also has a Halo system — buyers post their property requirements (suburb, type, budget) and matching agents respond directly. This is useful if you have specific requirements such as a school zone, minimum land size, or off-market preference.</p>

        {/* Schools */}
        <h2 className="font-display text-2xl font-semibold mt-10 mb-3">Schools Near Box Hill</h2>
        <p className="mb-4">Schools are a primary consideration for Chinese-Australian families buying in Box Hill.</p>
        <p className="mb-2"><strong>Secondary schools:</strong></p>
        <ul className="list-disc pl-6 mb-4 space-y-1">
          <li><strong>Box Hill High School</strong> — Government secondary with a selective-entry program. Strong academic reputation.</li>
          <li><strong>Koonung Secondary College</strong> — Government secondary in Mont Albert North, serving parts of the Box Hill catchment.</li>
        </ul>
        <p className="mb-2"><strong>Primary schools:</strong></p>
        <ul className="list-disc pl-6 mb-4 space-y-1">
          <li><strong>Box Hill Primary School</strong> — Located on Nelson Road, Box Hill.</li>
          <li><strong>Kerrimuir Primary School</strong> — Box Hill North, well-regarded among local families.</li>
          <li><strong>Laburnum Primary School</strong> — Near the Box Hill/Blackburn boundary.</li>
        </ul>
        <p className="mb-4">School zones change periodically. Confirm current boundaries at findmyschool.vic.gov.au before purchasing on the basis of school access.</p>

        {/* Transport */}
        <h2 className="font-display text-2xl font-semibold mt-10 mb-3">Transport</h2>
        <ul className="list-disc pl-6 mb-4 space-y-2">
          <li><strong>Train.</strong> Box Hill Station — Belgrave and Lilydale lines. To Flinders Street Station: approximately 27–35 minutes, trains every 6–10 minutes at peak.</li>
          <li><strong>Tram.</strong> Route 109 (Collins Street / Box Hill) terminates at Box Hill Station.</li>
          <li><strong>Bus.</strong> Major interchange with SmartBus and local routes to Doncaster, Glen Waverley, Ringwood, and surrounding suburbs.</li>
          <li><strong>Car.</strong> Approximately 14 km from Melbourne CBD via Whitehorse Road or Eastern Freeway. Drive time: 25–40 minutes depending on traffic.</li>
        </ul>

        {/* FAQ */}
        <h2 className="font-display text-2xl font-semibold mt-10 mb-3">Frequently Asked Questions</h2>
        <div className="space-y-5 mb-8">
          {FAQS.map(({ q, a }) => (
            <div key={q}>
              <h3 className="font-semibold text-base mb-1">{q}</h3>
              <p className="text-sm text-muted-foreground leading-relaxed">{a}</p>
            </div>
          ))}
        </div>

        {/* Disclosure */}
        <p className="text-xs text-muted-foreground border-t border-border pt-4 mt-8">
          Disclosure: This page is published by ListHQ, a multilingual real estate platform. ListHQ is mentioned in the "Finding a Multilingual Agent" section as a platform where buyers can find multilingual agents. Median price data is approximate and based on publicly available Melbourne market information. Last reviewed May 2026.
        </p>
      </article>
    </>
  );
}
