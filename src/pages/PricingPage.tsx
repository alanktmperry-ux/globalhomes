import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Helmet } from 'react-helmet-async';
import { Check, X, ChevronDown, Sparkles } from 'lucide-react';
import { useTranslation } from '@/shared/lib/i18n/useTranslation';

type BillingCycle = 'monthly' | 'annual';

interface Plan {
  key: string;
  name: string;
  monthly: number | null; // null = custom
  blurb: string;
  features: string[];
  popular?: boolean;
  ctaLabel: string;
  ctaHref: string;
}

type CompareCell = string | boolean;

const formatPrice = (n: number) => `$${n.toLocaleString('en-AU')}`;

export default function PricingPage() {
  const [billing, setBilling] = useState<BillingCycle>('monthly');
  const [openFaq, setOpenFaq] = useState<number | null>(0);
  const [showCompare, setShowCompare] = useState(false);
  const navigate = useNavigate();
  const { t } = useTranslation();

  const PLANS: Plan[] = [
    {
      key: 'solo',
      name: t('pricing.plan1Name'),
      monthly: 299,
      blurb: t('pricing.plan1Desc'),
      features: [
        '1 agent seat',
        'Up to 3 active listings',
        'Trust accounting',
        'CRM & contacts (up to 200)',
        'AI listing descriptions (5 languages)',
        'Email support',
      ],
      ctaLabel: t('pricing.startTrial'),
      ctaHref: '/for-agents#register',
    },
    {
      key: 'agency',
      name: t('pricing.plan2Name'),
      monthly: 899,
      blurb: t('pricing.plan2Desc'),
      popular: true,
      features: [
        'Up to 5 agent seats',
        'Unlimited listings',
        'Buyer concierge (100 matches/mo)',
        'Full CRM (unlimited contacts)',
        'Pipeline & rent roll',
        'Bank reconciliation',
        'Off-market / pocket listings',
        'Priority support',
      ],
      ctaLabel: t('pricing.startTrial'),
      ctaHref: '/for-agents#register',
    },
    {
      key: 'pro',
      name: t('pricing.plan3Name'),
      monthly: 1999,
      blurb: t('pricing.plan3Desc'),
      features: [
        'Up to 15 agent seats',
        'Unlimited everything',
        'Buyer concierge (unlimited)',
        'Exclusive listing access',
        'Commission calculator',
        'Performance analytics',
        'Dedicated account manager',
      ],
      ctaLabel: t('pricing.startTrial'),
      ctaHref: '/for-agents#register',
    },
    {
      key: 'enterprise',
      name: t('pricing.plan4Name'),
      monthly: null,
      blurb: t('pricing.plan4Desc'),
      features: [
        'Unlimited agents',
        'White-label option',
        'Custom integrations & API',
        'SLA support',
        'Contact sales',
      ],
      ctaLabel: t('pricing.contactSales'),
      ctaHref: 'mailto:sales@listhq.com.au?subject=Enterprise%20enquiry',
    },
  ];

  const COMPARE_ROWS: { label: string; values: [CompareCell, CompareCell, CompareCell, CompareCell] }[] = [
    { label: 'Agent seats',                values: ['1', '5', '15', 'Unlimited'] },
    { label: 'Active listings',            values: ['3', 'Unlimited', 'Unlimited', 'Unlimited'] },
    { label: 'Buyer concierge matches',    values: ['—', '100/mo', 'Unlimited', 'Unlimited'] },
    { label: 'CRM contacts',               values: ['200', 'Unlimited', 'Unlimited', 'Unlimited'] },
    { label: 'Trust accounting',           values: [true, true, true, true] },
    { label: 'Bank reconciliation',        values: [false, true, true, true] },
    { label: 'Pocket listings',            values: [false, true, true, true] },
    { label: 'AI descriptions (languages)',values: ['5', '24', '24', '24'] },
    { label: 'Commission calculator',      values: [false, false, true, true] },
    { label: 'Dedicated manager',          values: [false, false, true, true] },
  ];

  const FAQS = [
    { q: t('pricing.faq1Q'), a: t('pricing.faq1A') },
    { q: t('pricing.faq2Q'), a: t('pricing.faq2A') },
    { q: t('pricing.faq3Q'), a: t('pricing.faq3A') },
    { q: t('pricing.faq4Q'), a: t('pricing.faq4A') },
  ];

  const renderCell = (v: CompareCell) => {
    if (typeof v === 'boolean') {
      return v ? (
        <Check className="w-4 h-4 text-primary mx-auto" />
      ) : (
        <X className="w-4 h-4 text-muted-foreground/40 mx-auto" />
      );
    }
    return <span className="text-sm text-foreground">{v}</span>;
  };

  return (
    <>
      <Helmet>
        <title>Pricing — Plans for every agency · ListHQ</title>
        <meta
          name="description"
          content="Simple, transparent pricing for Australian real estate agencies. 60-day free trial, no credit card required. Plans from $299/mo."
        />
      </Helmet>

      <div className="bg-background">
        {/* Hero */}
        <section className="max-w-6xl mx-auto px-4 pt-16 pb-10 text-center">
          <h1 className="font-display text-4xl md:text-5xl font-bold text-foreground tracking-tight">
            Plans for every agency
          </h1>
          <p className="mt-4 text-base md:text-lg text-muted-foreground">
            60-day free trial · No credit card required
          </p>

          {/* Billing toggle */}
          <div className="mt-8 inline-flex items-center gap-1 bg-muted/60 p-1 rounded-full">
            <button
              onClick={() => setBilling('monthly')}
              className={`px-5 py-2 rounded-full text-sm font-medium transition ${
                billing === 'monthly'
                  ? 'bg-card text-foreground shadow-sm'
                  : 'text-muted-foreground'
              }`}
            >
              Monthly
            </button>
            <button
              onClick={() => setBilling('annual')}
              className={`px-5 py-2 rounded-full text-sm font-medium transition inline-flex items-center gap-2 ${
                billing === 'annual'
                  ? 'bg-card text-foreground shadow-sm'
                  : 'text-muted-foreground'
              }`}
            >
              Annual
              <span className="inline-flex items-center text-[10px] font-bold px-2 py-0.5 rounded-full bg-primary/10 text-primary">
                Save 20%
              </span>
            </button>
          </div>
        </section>

        {/* Plan cards */}
        <section className="max-w-6xl mx-auto px-4 pb-16">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-5">
            {PLANS.map((plan) => {
              const annual = plan.monthly !== null ? plan.monthly * 12 * 0.8 : null;
              const displayPrice =
                plan.monthly === null
                  ? 'Custom'
                  : billing === 'monthly'
                    ? `${formatPrice(plan.monthly)}`
                    : `${formatPrice(Math.round(annual!))}`;
              const priceSuffix =
                plan.monthly === null
                  ? ''
                  : billing === 'monthly'
                    ? '/mo'
                    : '/yr';
              const subPrice =
                plan.monthly !== null && billing === 'monthly'
                  ? `or ${formatPrice(Math.round(plan.monthly * 12 * 0.8))}/yr`
                  : plan.monthly !== null && billing === 'annual'
                    ? `${formatPrice(plan.monthly)}/mo billed monthly`
                    : 'Tailored to your needs';

              return (
                <div
                  key={plan.key}
                  className={`relative rounded-2xl border bg-card p-6 flex flex-col ${
                    plan.popular
                      ? 'border-primary shadow-lg lg:scale-[1.02] ring-1 ring-primary/20'
                      : 'border-border'
                  }`}
                >
                  {plan.popular && (
                    <div className="absolute -top-3 left-1/2 -translate-x-1/2 inline-flex items-center gap-1 px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider bg-primary text-primary-foreground shadow">
                      <Sparkles className="w-3 h-3" /> Most Popular
                    </div>
                  )}
                  <h3 className="font-display text-xl font-bold text-foreground">{plan.name}</h3>
                  <p className="mt-1 text-xs text-muted-foreground min-h-[32px]">{plan.blurb}</p>

                  <div className="mt-5">
                    <div className="flex items-baseline gap-1">
                      <span className="text-3xl font-bold text-foreground">{displayPrice}</span>
                      {priceSuffix && (
                        <span className="text-sm text-muted-foreground">{priceSuffix}</span>
                      )}
                    </div>
                    <p className="mt-1 text-xs text-muted-foreground">{subPrice}</p>
                  </div>

                  <span className="mt-4 inline-flex items-center self-start gap-1 text-[10px] font-semibold px-2 py-1 rounded-full bg-primary/10 text-primary">
                    60-day free trial
                  </span>

                  <button
                    onClick={() => {
                      if (plan.ctaHref.startsWith('mailto:')) {
                        window.location.href = plan.ctaHref;
                      } else {
                        navigate(plan.ctaHref);
                      }
                    }}
                    className={`mt-5 w-full px-4 py-2.5 rounded-xl text-sm font-semibold transition ${
                      plan.popular
                        ? 'bg-primary text-primary-foreground hover:bg-primary/90'
                        : 'bg-secondary text-foreground hover:bg-accent border border-border'
                    }`}
                  >
                    {plan.ctaLabel}
                  </button>

                  <ul className="mt-6 space-y-2.5">
                    {plan.features.map((f) => (
                      <li key={f} className="flex items-start gap-2 text-sm text-foreground">
                        <Check className="w-4 h-4 text-primary mt-0.5 flex-shrink-0" />
                        <span>{f}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              );
            })}
          </div>
        </section>

        {/* Comparison table */}
        <section className="max-w-6xl mx-auto px-4 pb-16">
          <div className="text-center mb-6">
            <h2 className="font-display text-2xl md:text-3xl font-bold text-foreground">
              Compare plans
            </h2>
            <p className="mt-2 text-sm text-muted-foreground">
              Every feature, side by side
            </p>
          </div>

          {/* Mobile collapse trigger */}
          <button
            onClick={() => setShowCompare((v) => !v)}
            className="md:hidden w-full flex items-center justify-between px-4 py-3 rounded-xl border border-border bg-card text-sm font-medium text-foreground mb-4"
          >
            {showCompare ? 'Hide' : 'Show'} feature comparison
            <ChevronDown
              className={`w-4 h-4 transition-transform ${showCompare ? 'rotate-180' : ''}`}
            />
          </button>

          <div className={`${showCompare ? 'block' : 'hidden'} md:block overflow-x-auto`}>
            <table className="w-full border border-border rounded-2xl overflow-hidden bg-card">
              <thead className="bg-muted/50">
                <tr>
                  <th className="text-left text-xs font-semibold text-muted-foreground uppercase tracking-wider px-4 py-3">
                    Feature
                  </th>
                  {PLANS.map((p) => (
                    <th
                      key={p.key}
                      className={`text-center text-xs font-semibold uppercase tracking-wider px-4 py-3 ${
                        p.popular ? 'text-primary' : 'text-muted-foreground'
                      }`}
                    >
                      {p.name}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {COMPARE_ROWS.map((row, i) => (
                  <tr key={row.label} className={i % 2 === 0 ? 'bg-background' : 'bg-muted/20'}>
                    <td className="text-sm text-foreground px-4 py-3 font-medium">{row.label}</td>
                    {row.values.map((v, j) => (
                      <td key={j} className="text-center px-4 py-3">
                        {renderCell(v)}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>

        {/* FAQ */}
        <section className="max-w-3xl mx-auto px-4 pb-24">
          <div className="text-center mb-8">
            <h2 className="font-display text-2xl md:text-3xl font-bold text-foreground">
              Frequently asked questions
            </h2>
          </div>

          <div className="space-y-3">
            {FAQS.map((faq, i) => {
              const open = openFaq === i;
              return (
                <div
                  key={faq.q}
                  className="rounded-2xl border border-border bg-card overflow-hidden"
                >
                  <button
                    onClick={() => setOpenFaq(open ? null : i)}
                    className="w-full flex items-center justify-between gap-4 px-5 py-4 text-left"
                  >
                    <span className="text-sm font-semibold text-foreground">{faq.q}</span>
                    <ChevronDown
                      className={`w-4 h-4 text-muted-foreground transition-transform flex-shrink-0 ${
                        open ? 'rotate-180' : ''
                      }`}
                    />
                  </button>
                  {open && (
                    <div className="px-5 pb-4 text-sm text-muted-foreground">{faq.a}</div>
                  )}
                </div>
              );
            })}
          </div>

          <div className="mt-12 text-center">
            <p className="text-sm text-muted-foreground mb-4">
              Still have questions? We're happy to help.
            </p>
            <Link
              to="/help/contact"
              className="inline-flex items-center px-5 py-2.5 rounded-xl border border-border bg-card text-sm font-semibold text-foreground hover:bg-accent transition"
            >
              Contact us
            </Link>
          </div>
        </section>
      </div>
    </>
  );
}
