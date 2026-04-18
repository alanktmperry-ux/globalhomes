import { Helmet } from 'react-helmet-async';
import { StampDutyCalculator } from '@/components/StampDutyCalculator';
import { FIRBCalculator } from '@/components/FIRBCalculator';
import { MortgageBrokerCTA } from '@/features/mortgage/components/MortgageBrokerCTA';

export default function StampDutyPage() {
  return (
    <>
      <Helmet>
        <title>Stamp Duty Calculator Australia 2026 — All States</title>
        <meta name="description" content="Calculate stamp duty for NSW, VIC, QLD, WA, SA, TAS, ACT and NT. Includes first home buyer exemptions, grants, and upfront cost estimates for 2026." />
        <link rel="canonical" href="https://listhq.com.au/stamp-duty-calculator" />
        <script type="application/ld+json">{JSON.stringify({
          "@context": "https://schema.org",
          "@type": "WebApplication",
          "name": "ListHQ Stamp Duty Calculator",
          "description": "Free Australian stamp duty calculator for all states and territories, including first home buyer concessions.",
          "url": "https://listhq.com.au/stamp-duty-calculator",
          "applicationCategory": "FinanceApplication",
          "operatingSystem": "Web",
          "offers": { "@type": "Offer", "price": "0", "priceCurrency": "AUD" }
        })}</script>
      </Helmet>

      <div className="min-h-screen bg-background">
        <div className="max-w-2xl mx-auto px-4 py-12">
          <h1 className="font-display text-3xl md:text-4xl font-bold text-foreground mb-3">
            Stamp Duty Calculator
          </h1>
          <p className="text-muted-foreground mb-8 leading-relaxed">
            Estimate your stamp duty across all Australian states and territories.
            Includes first home buyer concessions and grants for 2026.
          </p>

          <StampDutyCalculator propertyPrice={null} propertyAddress="" />

          <div className="mt-4">
            <FIRBCalculator propertyPrice={null} propertyAddress="" />
          </div>

          <div className="mt-6">
            <MortgageBrokerCTA
              title="Find out your borrowing power"
              description="Speak to a licensed mortgage broker and learn how much you can borrow."
              buttonLabel="Connect with a broker"
              sourcePage="stamp_duty"
            />
          </div>

          {/* SEO content */}
          <div className="mt-12 space-y-6 text-muted-foreground">
            <h2 className="font-display text-xl font-semibold text-foreground">
              How stamp duty works in Australia
            </h2>
            <p className="leading-relaxed">
              Stamp duty (also called transfer duty or land transfer duty) is a state government
              tax paid when you purchase a property. Each state and territory sets its own rates,
              thresholds, and concessions. Rates are applied progressively — similar to income tax
              — with higher marginal rates on higher price brackets.
            </p>

            <h2 className="font-display text-xl font-semibold text-foreground">
              First Home Buyer concessions by state
            </h2>
            <p className="leading-relaxed">
              Most states offer significant stamp duty relief for first home buyers purchasing
              below a price threshold. NSW offers full exemption up to $800,000. Victoria waives
              duty on purchases up to $600,000. Queensland provides concessions on the first
              $350,000 of the price for eligible buyers.
            </p>

            <h2 className="font-display text-xl font-semibold text-foreground">
              When is stamp duty paid?
            </h2>
            <p className="leading-relaxed">
              Stamp duty is typically due within 30 days of settlement in most states. Your
              conveyancer or solicitor will handle the payment on your behalf. It must be paid
              before the property transfer is registered with the state land titles office.
            </p>
          </div>
        </div>
      </div>
    </>
  );
}
