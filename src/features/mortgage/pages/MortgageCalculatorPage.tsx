import { useState } from 'react';
import { useSearchParams, Link } from 'react-router-dom';
import { Helmet } from 'react-helmet-async';
import { BorrowingPowerCalculator } from '../components/BorrowingPowerCalculator';
import { RepaymentCalculator } from '../components/RepaymentCalculator';
import { Calculator } from 'lucide-react';
import { useTranslation } from '@/shared/lib/i18n/useTranslation';

export default function MortgageCalculatorPage() {
  const [params] = useSearchParams();
  const { t } = useTranslation();
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
            {t('mortgage.badge')}
          </span>
          <h1 className="text-4xl md:text-5xl font-display font-extrabold text-foreground tracking-tight">
            {t('mortgage.title')}
          </h1>
          <p className="mt-4 text-muted-foreground max-w-2xl mx-auto leading-relaxed">
            {t('mortgage.subtitle')}
          </p>
        </div>

        {/* Tab switcher */}
        <div className="flex flex-wrap justify-center gap-3 mb-10">
          {[
            { value: 'borrowing' as const, label: t('mortgage.tab.borrowing'), desc: t('mortgage.tab.borrowing.desc') },
            { value: 'repayment' as const, label: t('mortgage.tab.repayment'), desc: t('mortgage.tab.repayment.desc') },
          ].map(t2 => (
            <button key={t2.value} onClick={() => setTab(t2.value)}
              className={`px-6 py-3 rounded-2xl border text-sm font-semibold transition
                ${tab === t2.value
                  ? 'bg-primary text-primary-foreground border-primary'
                  : 'bg-card text-foreground border-border hover:border-muted-foreground'
                }`}>
              <span className="block">{t2.label}</span>
              <span className="block text-xs opacity-70 mt-0.5">{t2.desc}</span>
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
            { href: '/stamp-duty-calculator', icon: '🏛', label: t('mortgage.related.stampDuty'), desc: t('mortgage.related.stampDuty.desc') },
            { href: '/', icon: '🔍', label: t('mortgage.related.browse'), desc: t('mortgage.related.browse.desc') },
            { href: '/agents', icon: '👤', label: t('mortgage.related.agent'), desc: t('mortgage.related.agent.desc') },
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
            {t('mortgage.faq.title')}
          </h2>
          {[
            { q: t('mortgage.faq.q1'), a: t('mortgage.faq.a1') },
            { q: t('mortgage.faq.q2'), a: t('mortgage.faq.a2') },
            { q: t('mortgage.faq.q3'), a: t('mortgage.faq.a3') },
            { q: t('mortgage.faq.q4'), a: t('mortgage.faq.a4') },
            { q: t('mortgage.faq.q5'), a: t('mortgage.faq.a5') },
          ].map(({ q, a }) => (
            <div key={q} className="border-b border-border py-5">
              <h3 className="text-base font-semibold text-foreground mb-2">{q}</h3>
              <p className="text-sm text-muted-foreground leading-relaxed">{a}</p>
            </div>
          ))}
        </div>

        {/* Disclaimer */}
        <p className="text-[10px] text-muted-foreground text-center max-w-2xl mx-auto">
          {t('mortgage.disclaimer')}
        </p>
      </div>
    </>
  );
}
