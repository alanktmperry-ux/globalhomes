import { Helmet } from 'react-helmet-async';
import { Link } from 'react-router-dom';

const FAQS = [
  {
    q: 'Can foreign buyers purchase property in Parramatta?',
    a: "Yes, subject to FIRB approval. Foreign nationals and temporary visa holders must apply to the Foreign Investment Review Board at firb.gov.au before signing any contract. Foreign purchasers in NSW pay an additional 8% Foreign Buyer Duty surcharge on top of standard NSW stamp duty. A 4% Surcharge Land Tax may also apply to absentee owners. Always obtain independent legal advice before signing.",
  },
  {
    q: 'What is the median house price in Parramatta?',
    a: 'As of 2025–2026, the median house price in Parramatta is approximately $1.1M–$1.4M depending on land size, street, and proximity to transport. Median unit prices are approximately $550,000–$700,000, driven by significant apartment supply in the CBD area. Parramatta is considered significantly more affordable than equivalent inner-west or lower north shore suburbs in Sydney.',
  },
  {
    q: 'What are the best schools in Parramatta for Chinese and Vietnamese families?',
    a: "Arthur Phillip High School in Parramatta is a selective government secondary school — one of NSW's top-performing public schools. James Ruse Agricultural High School, located in neighbouring Carlingford, is consistently ranked as NSW's highest-performing government school by HSC results, and is accessible to students across the state by examination. Western Sydney University's Parramatta campus provides tertiary options locally.",
  },
  {
    q: 'How does the buying process in NSW differ from Victoria?',
    a: "Key differences: NSW uses a solicitor (not just a conveyancer) for contract review, which is strongly recommended before signing. In private treaty sales, there is a 5-business-day cooling-off period (compared to 3 business days in Victoria). Properties sold at auction have no cooling-off period and are unconditional — bring a 10% deposit to auction. The Section 32 equivalent in NSW is the Contract for Sale of Land — your solicitor must review this before you sign.",
  },
  {
    q: 'Is Parramatta a good investment suburb for 2025–2030?',
    a: "Parramatta is widely regarded as Sydney's second CBD. State and federal infrastructure investment includes the Parramatta Light Rail, the Western Sydney Airport at Badgerys Creek (opening 2026), and billions in urban renewal through the Parramatta Square development. These factors drive long-term price growth and rental demand. The suburb's affordability relative to eastern Sydney, combined with strong infrastructure investment, makes it a commonly cited investment target.",
  },
];

const SCHEMA = [
  {
    '@context': 'https://schema.org',
    '@type': 'WebPage',
    name: 'Buying Property in Parramatta — A Guide for Chinese and Vietnamese Buyers',
    url: 'https://listhq.com.au/suburbs/parramatta-nsw',
    description:
      "A complete guide to buying property in Parramatta, NSW for Mandarin-speaking, Cantonese-speaking, and Vietnamese buyers. Covers median prices, FIRB rules, NSW stamp duty surcharge, selective schools, transport, and how to find a multilingual agent.",
    inLanguage: 'en-AU',
    datePublished: '2026-05-02',
    dateModified: '2026-05-02',
    publisher: { '@type': 'Organization', name: 'ListHQ', url: 'https://listhq.com.au' },
    about: {
      '@type': 'Place',
      name: 'Parramatta',
      address: {
        '@type': 'PostalAddress',
        postalCode: '2150',
        addressLocality: 'Parramatta',
        addressRegion: 'NSW',
        addressCountry: 'AU',
      },
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

const PRICE_ROWS: Array<[string, string, string]> = [
  ['House', '$1.1M–$1.4M', '3–4 bedroom on 400–600 sqm'],
  ['Townhouse', '$800K–$1.1M', '3 bedroom, low-maintenance, often dual garage'],
  ['Unit / Apartment', '$550K–$700K', '2 bedroom in CBD or near-CBD high-rise'],
];

export default function ParramattaNsw() {
  return (
    <>
      <Helmet>
        <title>Buying Property in Parramatta, NSW — A Guide for Chinese and Vietnamese Buyers | ListHQ</title>
        <meta
          name="description"
          content="Complete guide to buying property in Parramatta, NSW for Mandarin, Cantonese and Vietnamese-speaking buyers. Median prices, FIRB rules, NSW surcharge duty, selective schools and multilingual agents."
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
          Buying Property in Parramatta — A Guide for Chinese and Vietnamese Buyers
        </h1>

        <p className="text-base leading-relaxed text-muted-foreground mb-8">
          Parramatta is Sydney's second CBD — a major urban centre 23 kilometres west of the Sydney CBD (postcode 2150) undergoing one of Australia's largest infrastructure investments. For Chinese-Australian and Vietnamese-Australian buyers, Parramatta combines genuine affordability relative to inner-city Sydney, established multilingual communities, selective school access, and exceptional infrastructure tailwinds from the Western Sydney Airport development. Median house prices of $1.1M–$1.4M make it one of the most accessible entry points into the greater Sydney market for families.
        </p>

        <h2 className="font-display text-2xl font-semibold mt-10 mb-3">Why Chinese and Vietnamese Buyers Choose Parramatta</h2>
        <p className="mb-4"><strong>1. Sydney's most affordable major urban centre.</strong> Parramatta offers comparable infrastructure to the inner city at significantly lower price points. Median house prices are 40–60% lower than comparable properties in the inner west or lower north shore.</p>
        <p className="mb-4"><strong>2. Established Chinese and Vietnamese communities.</strong> Greater Western Sydney — including Parramatta, Auburn, Cabramatta, and Fairfield — is home to some of Australia's largest Chinese and Vietnamese diaspora communities. Mandarin and Vietnamese are widely spoken in the area's businesses, medical services, and community organisations.</p>
        <p className="mb-4"><strong>3. Western Sydney Airport (Badgerys Creek) — opening 2026.</strong> The new Western Sydney International Airport, located approximately 40 kilometres south-west of Parramatta, is expected to dramatically increase demand for residential and commercial property across greater western Sydney, with Parramatta positioned as a key beneficiary of the associated urban growth.</p>
        <p className="mb-4"><strong>4. Parramatta Light Rail Stage 1.</strong> Connecting Westmead to Carlingford via Parramatta CBD, the light rail improves connectivity within the precinct and reduces car dependency. Stage 2 extensions are planned.</p>
        <p className="mb-4"><strong>5. Selective school access.</strong> Arthur Phillip High School (selective) and James Ruse Agricultural High School (state's top school by HSC results) are accessible to families in the Parramatta region. Unlike school zone-based admissions in Victoria, NSW selective schools are open to students state-wide by merit examination, removing the need to purchase within a specific zone.</p>
        <p className="mb-4"><strong>6. Parramatta Square and CBD renewal.</strong> The Parramatta Square development — a $3.2 billion mixed-use urban precinct in the heart of the CBD — is one of Australia's largest urban renewal projects, anchoring long-term commercial and residential demand in the area.</p>

        <h2 className="font-display text-2xl font-semibold mt-10 mb-3">Parramatta Property Market Overview</h2>

        <div className="overflow-x-auto mb-6">
          <table className="w-full text-sm border border-border">
            <thead className="bg-muted/50">
              <tr>
                <th className="text-left p-2 border-b border-border">Property Type</th>
                <th className="text-left p-2 border-b border-border">Approximate Median</th>
                <th className="text-left p-2 border-b border-border">What It Buys</th>
              </tr>
            </thead>
            <tbody>
              {PRICE_ROWS.map(([type, price, desc]) => (
                <tr key={type} className="border-b border-border last:border-0">
                  <td className="p-2 font-medium">{type}</td>
                  <td className="p-2">{price}</td>
                  <td className="p-2 text-muted-foreground">{desc}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <p className="mb-4">At $700,000 you can access a 2-bedroom apartment in the Parramatta CBD area. Ideal for investors or singles — strong rental demand from Western Sydney University students and government workers.</p>
        <p className="mb-4">At $1.1M–$1.3M you are competitive for a 3–4 bedroom house in suburban Parramatta streets. Private treaty sales at this price point are common; auction clearance rates are lower than in Melbourne's eastern suburbs.</p>
        <p className="mb-4">At $1.5M+ you can access larger blocks, renovated homes, or properties on prestige streets closer to the river. Development sites in this range attract significant investor interest.</p>

        <h2 className="font-display text-2xl font-semibold mt-10 mb-3">Buying Process in NSW — Key Steps</h2>
        <ol className="list-decimal pl-6 mb-4 space-y-2">
          <li><strong>Engage a solicitor before you inspect.</strong> In NSW, you need a solicitor (not just a conveyancer) for contract review. Engage one who speaks Mandarin or Vietnamese before you begin inspecting properties.</li>
          <li><strong>Obtain finance pre-approval.</strong> Australian lenders assess foreign income differently from Australian income. If financing foreign-source income, consider Australian branches of Chinese banks (Bank of China Australia, ICBC Australia) or brokers who specialise in non-resident lending.</li>
          <li><strong>Apply for FIRB approval if required.</strong> Apply at <a href="https://firb.gov.au" className="underline hover:text-primary" target="_blank" rel="noopener noreferrer">firb.gov.au</a> before signing any contract. Allow 30 days for processing. Purchasing without required FIRB approval is a criminal offence under the Foreign Acquisitions and Takeovers Act 1975.</li>
          <li><strong>Review the Contract for Sale of Land.</strong> The NSW equivalent of Victoria's Section 32. Your solicitor must review this document — it discloses title, zoning, easements, and any encumbrances on the property.</li>
          <li><strong>Make an offer (private treaty) or bid at auction.</strong> Private treaty sales in NSW include a 5-business-day cooling-off period. Auction sales are unconditional — no cooling-off period applies. Bring a 10% deposit cheque to auction.</li>
          <li><strong>Exchange contracts and pay the deposit.</strong> On exchange, both parties sign identical contracts and swap copies. The 10% deposit is held in trust until settlement.</li>
          <li><strong>Pay stamp duty.</strong> NSW stamp duty applies to all purchases. Foreign buyers pay an additional 8% Foreign Buyer Duty. Your solicitor will calculate the total amount payable.</li>
          <li><strong>Arrange building and pest inspection.</strong> For private treaty sales, complete inspections before exchange or within the cooling-off period. Parramatta's older housing stock frequently has termite and rising damp issues requiring professional inspection.</li>
          <li><strong>Settle.</strong> Typically 42 days from exchange. Keys are released at settlement.</li>
        </ol>

        <p className="text-xs italic text-muted-foreground border-l-2 border-border pl-3 my-6">
          Legal disclaimer: The buying process above is a general guide only and does not constitute legal advice. NSW property law, stamp duty rates, and FIRB requirements are subject to change. Always obtain independent legal and financial advice before signing any contract.
        </p>

        <h2 className="font-display text-2xl font-semibold mt-10 mb-3">Important Considerations for Foreign and Chinese Buyers</h2>
        <p className="mb-4"><strong>FIRB.</strong> Foreign nationals and temporary visa holders must apply for FIRB approval before purchasing established dwellings. Australian permanent residents and citizens are exempt. Apply at <a href="https://firb.gov.au" className="underline hover:text-primary" target="_blank" rel="noopener noreferrer">firb.gov.au</a>.</p>
        <p className="mb-4"><strong>NSW Foreign Buyer Duty — 8%.</strong> On a $1.2M purchase, this is $96,000 in additional duty on top of standard NSW transfer duty (stamp duty). This applies to foreign nationals and certain temporary visa holders. Always confirm your eligibility status with your solicitor before signing.</p>
        <p className="mb-4"><strong>Surcharge Land Tax — 4%.</strong> Foreign owners of NSW residential land may be liable for a 4% annual surcharge on the land value of their NSW residential property, in addition to standard land tax. Current rates are available at <a href="https://revenue.nsw.gov.au" className="underline hover:text-primary" target="_blank" rel="noopener noreferrer">revenue.nsw.gov.au</a>.</p>
        <p className="mb-4"><strong>Strata levies.</strong> Parramatta CBD has significant apartment stock. For units, confirm quarterly strata levies (administration fund + capital works fund) and review the strata report for any special levies or building defects before exchanging.</p>

        <p className="text-xs italic text-muted-foreground border-l-2 border-border pl-3 my-6">
          Disclaimer: Duty rates, FIRB thresholds, and surcharge rates are subject to change. Always verify current rates with <a href="https://revenue.nsw.gov.au" className="underline hover:text-primary" target="_blank" rel="noopener noreferrer">revenue.nsw.gov.au</a> and seek independent legal advice from a qualified NSW solicitor.
        </p>

        <h2 className="font-display text-2xl font-semibold mt-10 mb-3">Finding a Multilingual Agent in Parramatta</h2>
        <p className="mb-4">Greater western Sydney has a large number of real estate agents who speak Mandarin, Cantonese, and Vietnamese. However, finding an agent who understands your specific priorities — development potential, investment yield, or school proximity — requires more than community language ability alone.</p>
        <p className="mb-4"><strong>ListHQ</strong> is Australia's first multilingual real estate platform. Parramatta listings on ListHQ are published in English, Simplified Chinese, Traditional Chinese, and Vietnamese. ListHQ's Halo system lets you post your buyer requirements — suburb, budget, property type, investment or owner-occupied — and receive direct responses from multilingual agents actively selling in greater western Sydney.</p>

        <h2 className="font-display text-2xl font-semibold mt-10 mb-3">Schools Near Parramatta</h2>

        <h3 className="font-semibold text-lg mt-4 mb-2">Arthur Phillip High School</h3>
        <p className="mb-4">Arthur Phillip High School in Parramatta is a fully selective NSW government secondary school for Years 7–12, accessible by merit examination to students across greater Sydney. It consistently ranks among the top 10 NSW government schools by HSC performance. Unlike Victorian school zones, a property purchase in Parramatta does not guarantee selective school entry — students sit the NSW Selective High School Placement Test.</p>

        <h3 className="font-semibold text-lg mt-4 mb-2">James Ruse Agricultural High School</h3>
        <p className="mb-4">Located in neighbouring Carlingford, James Ruse is consistently ranked as NSW's highest-performing government school by HSC results. Fully selective and state-wide entry — admission is by merit examination only. Proximity to the school provides no advantage in the selection process. Families considering James Ruse should plan for examination preparation from Years 4–5.</p>

        <h3 className="font-semibold text-lg mt-4 mb-2">Parramatta High School</h3>
        <p className="mb-4">A non-selective government secondary school in the Parramatta CBD area, serving the local zone. A strong multicultural school community with significant Chinese-Australian and Vietnamese-Australian enrolment.</p>

        <h3 className="font-semibold text-lg mt-4 mb-2">Western Sydney University — Parramatta Campus</h3>
        <p className="mb-4">Western Sydney University's Parramatta campus provides tertiary education locally, supporting rental demand for units and apartments in the surrounding streets.</p>

        <h3 className="font-semibold text-lg mt-4 mb-2">Primary Schools</h3>
        <ul className="list-disc pl-6 mb-4 space-y-1">
          <li><strong>Parramatta Public School</strong> — central to the suburb</li>
          <li><strong>Woodville Public School</strong> — strong NAPLAN performance</li>
          <li><strong>Leigh Public School</strong> — local zone option</li>
        </ul>

        <h2 className="font-display text-2xl font-semibold mt-10 mb-3">Transport</h2>
        <ul className="list-disc pl-6 mb-4 space-y-2">
          <li><strong>Train.</strong> Parramatta Station serves the T1 Western Line and T5 Cumberland Line. Direct services to the Sydney CBD (Town Hall / Central) take approximately 35 minutes during off-peak. Multiple services per hour during peak.</li>
          <li><strong>Parramatta Light Rail Stage 1.</strong> Connects Westmead to Carlingford via Parramatta CBD, with stops at Parramatta Station and key precincts. Stage 2 extensions planned to Sydney Olympic Park.</li>
          <li><strong>Bus.</strong> Extensive Parramatta bus network connecting to surrounding suburbs including Blacktown, Merrylands, and Liverpool. The Parramatta bus interchange is one of Sydney's largest.</li>
          <li><strong>Road.</strong> M4 Western Motorway provides direct access to the Sydney CBD via the WestConnex tunnel. Great Western Highway connects to the Blue Mountains.</li>
          <li><strong>Western Sydney Airport (Badgerys Creek).</strong> Under construction, expected to open in 2026 — approximately 40 km from Parramatta via the M7 Motorway. Expected to generate significant employment and residential demand across greater western Sydney.</li>
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
          Disclosure: This page is published by ListHQ, a multilingual real estate platform mentioned in the "Finding a Multilingual Agent" section. Median price data is approximate and based on publicly available Sydney market information. School rankings and infrastructure project details are based on publicly available information at time of publication. Last reviewed May 2026.
        </p>
      </article>
    </>
  );
}
