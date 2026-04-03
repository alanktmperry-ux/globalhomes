import { useState } from 'react';
import { useSearchParams, Link } from 'react-router-dom';
import { Helmet } from 'react-helmet-async';
import { BorrowingPowerCalculator } from '../components/BorrowingPowerCalculator';
import { RepaymentCalculator } from '../components/RepaymentCalculator';
import { Calculator } from 'lucide-react';

export default function MortgageCalculatorPage() {
  const [params] = useSearchParams();
  const initialAmount = params.get('amount') ? Number(params.get('amount')) : undefined;
  const [tab, setTab] = useState<'repayment' | 'borrowing'>(
    initialAmount ? 'repayment' : 'borrowing'
  );

  const structuredData = {
    '@context': 'https://schema.org',
    '@type': 'WebApplication',
    name: 'Australian Mortgage Calculator — ListHQ',
    applicationCategory: 'FinanceApplication',
    description: 'Calculate your borrowing power, monthly repayments, and total interest for Australian home loans.',
    offers: { '@type': 'Offer', price: '0', priceCurrency: 'AUD' },
    featureList: [
      'Borrowing power calculator',
      'Monthly repayment calculator',
      'Fortnightly & weekly repayments',
      'Offset account modelling',
      'LMI estimator',
      'APRA buffer calculation',
      'Amortisation chart',
    ],
  };

  return (
    <>
      <Helmet>
        <title>Mortgage Calculator Australia — Borrowing Power & Repayments</title>
        <meta name="description" content="Free Australian mortgage calculator. Calculate your borrowing power, monthly repayments, LMI, and offset savings. Includes APRA 3% serviceability buffer." />
        <link rel="canonical" href="https://listhq.com.au/mortgage-calculator" />
        <script type="application/ld+json">{JSON.stringify(structuredData)}</script>
      </Helmet>

      <div className="max-w-6xl mx-auto px-4 py-12">
        {/* Hero */}
        <div className="text-center mb-10">
          <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-primary bg-primary/10 px-3 py-1 rounded-full mb-4">
            <Calculator className="w-3.5 h-3.5" />
            Free Australian Calculator
          </span>
          <h1 className="text-4xl md:text-5xl font-display font-extrabold text-foreground tracking-tight">
            Mortgage Calculator Australia
          </h1>
          <p className="mt-4 text-muted-foreground max-w-2xl mx-auto leading-relaxed">
            Calculate your borrowing power and monthly repayments in seconds.
            Includes the APRA 3% serviceability buffer, LMI estimates, offset modelling,
            and a full amortisation chart.
          </p>
        </div>

        {/* Tab switcher */}
        <div className="flex flex-wrap justify-center gap-3 mb-10">
          {[
            { value: 'borrowing' as const, label: '💰 Borrowing Power', desc: 'How much can I borrow?' },
            { value: 'repayment' as const, label: '📅 Repayment Calculator', desc: 'What are my repayments?' },
          ].map(t => (
            <button key={t.value} onClick={() => setTab(t.value)}
              className={`px-6 py-3 rounded-2xl border text-sm font-semibold transition
                ${tab === t.value
                  ? 'bg-primary text-primary-foreground border-primary'
                  : 'bg-card text-foreground border-border hover:border-muted-foreground'
                }`}>
              <span className="block">{t.label}</span>
              <span className="block text-xs opacity-70 mt-0.5">{t.desc}</span>
            </button>
          ))}
        </div>

        {/* Calculator */}
        <div className="mb-16">
          {tab === 'borrowing'
            ? <BorrowingPowerCalculator />
            : <RepaymentCalculator initialAmount={initialAmount} />
          }
        </div>

        {/* Related tools */}
        <div className="grid sm:grid-cols-3 gap-4 mb-16">
          {[
            { href: '/stamp-duty-calculator', icon: '🏛', label: 'Stamp Duty Calculator',
              desc: 'Calculate stamp duty for all 8 states & territories' },
            { href: '/', icon: '🔍', label: 'Browse Properties',
              desc: 'Search for your next home across Australia' },
            { href: '/agents', icon: '👤', label: 'Find an Agent',
              desc: 'Connect with top local agents' },
          ].map(({ href, icon, label, desc }) => (
            <Link key={href} to={href}
              className="flex items-center gap-3 p-4 bg-card rounded-2xl border border-border hover:border-primary/30 transition">
              <span className="text-2xl">{icon}</span>
              <div>
                <p className="text-sm font-semibold text-foreground">{label}</p>
                <p className="text-xs text-muted-foreground">{desc}</p>
              </div>
            </Link>
          ))}
        </div>

        {/* SEO FAQ */}
        <div className="max-w-3xl mx-auto mb-16">
          <h2 className="text-2xl font-display font-bold text-foreground mb-6 text-center">
            Frequently Asked Questions
          </h2>
          {[
            {
              q: 'How much can I borrow for a home loan in Australia?',
              a: 'Your borrowing power depends on your income (after tax), living expenses, existing debts, deposit size, and the interest rate. Australian lenders also apply a 3% APRA serviceability buffer on top of your actual rate, which reduces your maximum borrowing capacity. Use the borrowing power calculator above to get an estimate.',
            },
            {
              q: 'What is the APRA 3% serviceability buffer?',
              a: 'Since November 2021, APRA requires Australian lenders to assess your ability to repay at your actual interest rate plus 3%. So if your home loan rate is 6.25%, lenders test whether you can afford repayments at 9.25%. This buffer ensures borrowers can still meet repayments if rates rise.',
            },
            {
              q: 'Do I need Lender\'s Mortgage Insurance (LMI)?',
              a: 'LMI applies when your loan-to-value ratio (LVR) exceeds 80% — that is, when your deposit is less than 20% of the property value. LMI protects the lender (not you) if you default. It can cost anywhere from 0.5% to 3.5% of the loan amount and can usually be added to the loan.',
            },
            {
              q: 'How do fortnightly repayments save money?',
              a: 'Paying fortnightly rather than monthly means you make 26 half-payments per year (equivalent to 13 monthly payments). That one extra monthly payment per year reduces your principal faster, saving thousands in interest and years off your loan term.',
            },
            {
              q: 'How does an offset account work?',
              a: 'An offset account is a transaction account linked to your mortgage. The balance in your offset account reduces the principal on which interest is calculated. For example, if your loan is $600,000 and you have $50,000 in an offset account, you only pay interest on $550,000.',
            },
          ].map(({ q, a }) => (
            <div key={q} className="border-b border-border py-5">
              <h3 className="text-base font-semibold text-foreground mb-2">{q}</h3>
              <p className="text-sm text-muted-foreground leading-relaxed">{a}</p>
            </div>
          ))}
        </div>

        {/* Disclaimer */}
        <p className="text-[10px] text-muted-foreground text-center max-w-2xl mx-auto">
          This calculator provides estimates only and does not constitute financial advice.
          Calculations are based on 2024–25 Australian tax rates, APRA guidelines, and simplified LMI scales.
          Your actual borrowing capacity may differ based on individual lender policies, credit history,
          and other factors. Always consult a licensed mortgage broker or financial adviser before making
          financial decisions.
        </p>
      </div>
    </>
  );
}
