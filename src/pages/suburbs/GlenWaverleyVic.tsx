import { Helmet } from 'react-helmet-async';
import { Link } from 'react-router-dom';

const FAQS = [
  {
    q: 'Is Glen Waverley worth the premium over Box Hill?',
    a: "For families prioritising school zones, yes. Glen Waverley Secondary College consistently ranks among Victoria's top government schools by ATAR results, and the school zone directly drives a price premium. Buyers who purchase within the GWSC zone are paying for access that holds its value in resale. If school zoning is not a priority, Box Hill offers similar amenities at a lower median price point.",
  },
  {
    q: 'What is the median house price in Glen Waverley?',
    a: 'As of 2025–2026, the median house price in Glen Waverley sits at approximately $1.5M–$1.8M depending on block size, school zone position, and renovation status. Median unit prices are approximately $700,000–$850,000. Properties within the GWSC zone on larger blocks regularly exceed $2M at auction.',
  },
  {
    q: 'Can foreign buyers purchase property in Glen Waverley?',
    a: 'Yes, subject to FIRB approval. Foreign nationals and temporary residents must apply to the Foreign Investment Review Board before signing a contract. Foreign purchasers also pay an additional 8% Foreign Purchaser Additional Duty on top of standard Victorian stamp duty. An annual Land Tax Absentee Owner Surcharge of 4% of land value may also apply. Always obtain independent legal advice before proceeding.',
  },
  {
    q: 'How do I find a Mandarin-speaking agent in Glen Waverley?',
    a: "ListHQ (listhq.com.au) is Australia's first multilingual real estate platform. You can search for Glen Waverley listings in Simplified or Traditional Chinese, and use the Halo system to post your buyer requirements — budget, school zone priority, property type — so that Mandarin-speaking agents contact you directly.",
  },
  {
    q: 'What makes Glen Waverley Secondary College special?',
    a: "GWSC is one of Victoria's highest-performing government secondary schools by ATAR results. Unlike selective-entry schools, GWSC admits students purely on residential zone — any family that purchases within the catchment has guaranteed access. The school is co-educational, well-resourced, and has a large Chinese-Australian student community. Zone boundaries are verified at findmyschool.vic.gov.au.",
  },
];

const SCHEMA = [
  {
    '@context': 'https://schema.org',
    '@type': 'WebPage',
    name: 'Buying Property in Glen Waverley — A Guide for Chinese Buyers',
    url: 'https://listhq.com.au/suburbs/glen-waverley-vic',
    description:
      'A complete guide to buying property in Glen Waverley, VIC for Mandarin-speaking and Chinese-Australian buyers. Covers schools, median prices, FIRB rules, the buying process, and how to find a multilingual agent.',
    inLanguage: 'en-AU',
    datePublished: '2026-05-02',
    dateModified: '2026-05-02',
    publisher: { '@type': 'Organization', name: 'ListHQ', url: 'https://listhq.com.au' },
    about: {
      '@type': 'Place',
      name: 'Glen Waverley',
      address: {
        '@type': 'PostalAddress',
        postalCode: '3150',
        addressLocality: 'Glen Waverley',
        addressRegion: 'VIC',
        addressCountry: 'AU',
      },
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

const PRICE_ROWS: Array<[string, string, string]> = [
  ['House', '$1.5M–$1.8M', '3–4 bedroom on 500–700 sqm'],
  ['Townhouse', '$1.0M–$1.3M', '3 bedroom, double garage, low-maintenance'],
  ['Unit / Apartment', '$700K–$850K', '2 bedroom, close to The Glen or the station'],
];

export default function GlenWaverleyVic() {
  return (
    <>
      <Helmet>
        <title>Buying Property in Glen Waverley, VIC — A Guide for Chinese Buyers | ListHQ</title>
        <meta
          name="description"
          content="Complete guide to buying property in Glen Waverley, VIC for Mandarin-speaking and Chinese-Australian buyers. Schools, median prices, FIRB rules, and multilingual agents."
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
          Glen Waverley is Melbourne's most sought-after suburb for Chinese-Australian families, combining one of Victoria's top-performing government school zones with direct train access to the CBD and a well-established Mandarin-speaking community. Located approximately 22 kilometres south-east of Melbourne's CBD in the City of Monash (postcode 3150), the suburb commands median house prices of $1.5M–$1.8M — a premium that reflects consistent demand and limited supply within its school zones.
        </p>

        <h2 className="font-display text-2xl font-semibold mt-10 mb-3">Why Chinese Buyers Choose Glen Waverley</h2>
        <p className="mb-4">Glen Waverley has earned the informal title of "the Chinese Beverly Hills of Melbourne" for five specific, well-documented reasons.</p>
        <p className="mb-4"><strong>1. Glen Waverley Secondary College school zone.</strong> GWSC is a non-selective government secondary school that consistently produces ATAR results ranking it among Victoria's top 10 government schools. Unlike select-entry schools, admission is purely zone-based — the property address is the entry ticket. Families regard GWSC zone properties as a long-term education investment.</p>
        <p className="mb-4"><strong>2. Established Chinese-Australian community.</strong> Mandarin is spoken widely in local supermarkets, medical clinics, restaurants, and community groups. The suburb has a high proportion of Chinese-Australian residents, making it one of the easiest suburbs for new arrivals from China, Hong Kong, and Taiwan to settle into quickly.</p>
        <p className="mb-4"><strong>3. The Glen shopping centre.</strong> The Glen on Springvale Road is a major regional shopping centre with strong representation of Asian grocery stores and food courts serving the local community.</p>
        <p className="mb-4"><strong>4. Direct train to Melbourne CBD.</strong> Glen Waverley Station is the terminus of the Glen Waverley train line, with direct services to Flinders Street Station in approximately 35 minutes during off-peak travel.</p>
        <p className="mb-4"><strong>5. Monash University proximity and rental demand.</strong> Monash University's Clayton campus is approximately 5 kilometres away, sustaining consistent rental demand for units and townhouses.</p>

        <h2 className="font-display text-2xl font-semibold mt-10 mb-3">Glen Waverley Property Market Overview</h2>

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

        <p className="mb-4">At $900,000 you are looking at a 2-bedroom unit or older townhouse requiring renovation. School zone access at this price is unlikely unless on the outer edge of the GWSC catchment.</p>
        <p className="mb-4">At $1.5M you are competitive for a standard 3–4 bedroom house on a 500+ sqm block. Most auctions at this range attract 3–5 registered bidders.</p>
        <p className="mb-4">At $2M+ you are looking at renovated 4–5 bedroom homes on 600–800 sqm blocks or development sites. Zone proximity to GWSC is a key price driver.</p>
        <p className="mb-4">Properties within the GWSC zone consistently command a 10–20% premium over comparable properties just outside the catchment boundary. Verify zone status at findmyschool.vic.gov.au before making any offer.</p>

        <h2 className="font-display text-2xl font-semibold mt-10 mb-3">Buying Process in Victoria — Key Steps</h2>
        <ol className="list-decimal pl-6 mb-4 space-y-2">
          <li><strong>Engage a conveyancer or solicitor first.</strong> Contracts of sale are available at open inspections. Engage a Mandarin-speaking conveyancer before you begin inspecting.</li>
          <li><strong>Obtain finance pre-approval.</strong> Australian lenders assess foreign income differently. Consider Australian branches of Chinese banks (Bank of China Australia) if financing foreign income.</li>
          <li><strong>Apply for FIRB approval if required.</strong> Apply at firb.gov.au before signing any contract. Allow 30 days for processing.</li>
          <li><strong>Review the Section 32 Vendor's Statement.</strong> Discloses title, planning overlays, encumbrances, and owners corporation fees. Your conveyancer must review this before you sign.</li>
          <li><strong>Verify the school zone.</strong> Use findmyschool.vic.gov.au with the exact property address. Do not rely on agent representations alone.</li>
          <li><strong>Make an offer or bid at auction.</strong> Auction purchases are unconditional — no cooling-off period. Bring a 10% deposit cheque to auction.</li>
          <li><strong>Sign contracts and pay the deposit.</strong> Private sales include a 3-business-day cooling-off period in Victoria. The 10% deposit is held in trust until settlement.</li>
          <li><strong>Pay stamp duty.</strong> Foreign purchasers pay an additional 8% Foreign Purchaser Additional Duty. Your conveyancer will calculate the full amount.</li>
          <li><strong>Arrange building and pest inspection.</strong> For private sales, complete inspections before signing or within the cooling-off period.</li>
          <li><strong>Settle.</strong> Typically 30–90 days from contract signing. Keys are released at settlement.</li>
        </ol>

        <p className="text-xs italic text-muted-foreground border-l-2 border-border pl-3 my-6">
          Legal disclaimer: The buying process above is a general guide only and does not constitute legal advice. Laws, duties, and FIRB requirements change. Always obtain independent legal and financial advice before signing any contract.
        </p>

        <h2 className="font-display text-2xl font-semibold mt-10 mb-3">Important Considerations for Chinese Buyers</h2>
        <p className="mb-4"><strong>FIRB.</strong> Foreign nationals and temporary visa holders must apply for FIRB approval before purchasing. Apply at firb.gov.au. Purchasing without approval where required is a criminal offence.</p>
        <p className="mb-4"><strong>Foreign Purchaser Additional Duty — 8%.</strong> On a $1.5M purchase this is $120,000 in additional duty. Applies to foreign nationals and some temporary visa holders. Australian permanent residents and citizens are exempt.</p>
        <p className="mb-4"><strong>Absentee Owner Surcharge.</strong> If the property is not your principal place of residence and you qualify as an absentee owner, a 4% annual surcharge on land value applies on top of standard land tax. Current rates at sro.vic.gov.au.</p>
        <p className="mb-4"><strong>Chinese-speaking professionals.</strong> Engage a conveyancer and solicitor fluent in Mandarin. Several Melbourne south-east firms specialise in acting for Chinese-Australian buyers.</p>

        <p className="text-xs italic text-muted-foreground border-l-2 border-border pl-3 my-6">
          Disclaimer: Duty rates, FIRB thresholds, and surcharge rates are subject to change. Always verify current rates with sro.vic.gov.au and seek independent legal advice.
        </p>

        <h2 className="font-display text-2xl font-semibold mt-10 mb-3">Finding a Multilingual Agent in Glen Waverley</h2>
        <p className="mb-4">Glen Waverley has many agencies with Mandarin-speaking staff, but finding the right agent for your specific requirements — school zone, block size, development potential — requires more than a Google search. Working with an agent who can explain auction strategy and contract conditions in Mandarin reduces the risk of costly misunderstandings on a $1.5M+ purchase.</p>
        <p className="mb-4">ListHQ is Australia's first multilingual real estate platform, and Glen Waverley is one of its most active markets. Agents publish listings in English, Simplified Chinese, and Traditional Chinese. ListHQ's Halo system lets you post your buying requirements — school zone priority, budget, property type — and receive direct responses from Mandarin-speaking agents who are actively selling in Glen Waverley.</p>

        <h2 className="font-display text-2xl font-semibold mt-10 mb-3">Schools Near Glen Waverley</h2>

        <h3 className="font-semibold text-lg mt-4 mb-2">Glen Waverley Secondary College (GWSC)</h3>
        <p className="mb-4">GWSC is a non-selective co-educational government school for Years 7–12, consistently ranking among Victoria's top 10 government schools by median ATAR. Admission is zone-based only — your address determines eligibility. Zone boundaries are published and searchable at findmyschool.vic.gov.au. Always verify with the specific property address before purchasing.</p>

        <h3 className="font-semibold text-lg mt-4 mb-2">Highvale Secondary College</h3>
        <p className="mb-4">A select-entry government secondary school in Glen Waverley, open to students across Victoria via an application process — not zone-based. Highvale consistently ranks among Melbourne's top government schools for VCE performance.</p>

        <h3 className="font-semibold text-lg mt-4 mb-2">Mount Waverley Secondary College</h3>
        <p className="mb-4">Located in neighbouring Mount Waverley, another high-performing government school with a large Chinese-Australian student cohort. Buyers who cannot secure a GWSC-zone property sometimes consider the Mount Waverley zone as a comparable alternative at a slightly lower median price.</p>

        <h3 className="font-semibold text-lg mt-4 mb-2">Primary Schools</h3>
        <ul className="list-disc pl-6 mb-4 space-y-1">
          <li><strong>Glen Waverley Primary School</strong> — central to the suburb</li>
          <li><strong>Highvale Primary School</strong> — feeds into GWSC and Highvale Secondary</li>
        </ul>

        <h2 className="font-display text-2xl font-semibold mt-10 mb-3">Transport</h2>
        <ul className="list-disc pl-6 mb-4 space-y-2">
          <li><strong>Train.</strong> Glen Waverley Station — direct to Flinders Street Station in ~35 minutes. Frequent services during peak hours.</li>
          <li><strong>Bus.</strong> SmartBus 900 orbital route. Local buses to Clayton, Oakleigh, and Monash University Clayton campus.</li>
          <li><strong>Road.</strong> Monash Freeway (M1) nearby, providing direct access to Melbourne CBD and Melbourne Airport via CityLink.</li>
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
          Disclosure: This page is published by ListHQ, a multilingual real estate platform mentioned in the "Finding a Multilingual Agent" section. Median price data is approximate and based on publicly available Melbourne market information. Last reviewed May 2026.
        </p>
      </article>
    </>
  );
}
