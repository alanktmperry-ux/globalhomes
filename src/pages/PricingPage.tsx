import { useState, useEffect, useRef } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Helmet } from 'react-helmet-async';
import { Check, ChevronDown } from 'lucide-react';
import { useTranslation } from '@/shared/lib/i18n/useTranslation';

type BillingCycle = 'monthly' | 'annual';
type CtaVariant = 'outline-blue' | 'filled-blue' | 'outline-border';

interface Plan {
  key: string;
  name: string;
  tagline: string;
  monthly: number | null;
  annual: number | null;
  trialBadge?: string;
  ctaLabel: string;
  ctaVariant: CtaVariant;
  ctaHref: string;
  microcopy?: string;
  features: string[];
  popular?: boolean;
}

const C = {
  blue: '#2563EB',
  blueL: '#EFF6FF',
  blueMid: '#DBEAFE',
  ink: '#0a0f1e',
  mid: '#374151',
  muted: '#6B7280',
  border: '#E5E7EB',
};

const formatPrice = (n: number) => `$${n.toLocaleString('en-AU')}`;

const PLANS: Plan[] = [
  {
    key: 'solo',
    name: 'Solo',
    tagline: 'For independent agents starting out',
    monthly: 799,
    annual: 7670,
    trialBadge: '30-day free trial',
    ctaLabel: 'Start Free Trial',
    ctaVariant: 'outline-blue',
    ctaHref: '/for-agents#register',
    microcopy: 'Credit card required · Cancels anytime before day 31',
    features: [
      '1 agent seat',
      'Up to 5 active listings',
      '20-language auto-translation',
      'AI listing descriptions (20 languages)',
      'CRM — up to 250 contacts',
      'Property management — up to 10 properties',
      'Trust accounting (full ledger)',
      'Halo™ board — 20 buyer briefs/mo',
      'Voice search',
      'Basic analytics',
      'Email support',
    ],
  },
  {
    key: 'agency',
    name: 'Agency',
    tagline: 'For growing agencies ready to scale',
    monthly: 1999,
    annual: 19190,
    popular: true,
    ctaLabel: 'Book a Demo',
    ctaVariant: 'filled-blue',
    ctaHref: '/for-agents#register',
    microcopy: 'Straight to paid · No trial · Demo available',
    features: [
      'Up to 5 agent seats',
      'Unlimited listings',
      '20-language auto-translation',
      'CRM — unlimited contacts + full pipeline',
      'Property management — unlimited properties',
      'Full PM automation (arrears, inspections, lease renewals)',
      'Tenant / owner / supplier no-login portals',
      'Bank reconciliation',
      'Pocket listings',
      'Vacancy KPI dashboard',
      'Halo™ board — 100 buyer briefs/mo',
      'Buyer concierge — 100 matches/mo',
      'Agency-branded profile page',
      'Full analytics dashboard',
      'Phone + email support',
    ],
  },
  {
    key: 'pro',
    name: 'Agency Pro',
    tagline: 'For established multi-office agencies',
    monthly: 3499,
    annual: 33590,
    ctaLabel: 'Talk to Sales',
    ctaVariant: 'outline-border',
    ctaHref: 'mailto:sales@listhq.com.au?subject=Agency%20Pro%20enquiry',
    microcopy: 'Sales call required · Custom onboarding included',
    features: [
      'Up to 15 agent seats',
      'Everything in Agency, plus:',
      'Multi-office management',
      'Halo™ board — 15 premium credits/mo',
      'Buyer concierge — unlimited',
      'Commission calculator',
      'Performance analytics',
      'White-label option',
      'API access + custom integrations',
      'Dedicated account manager',
      'SLA support',
    ],
  },
  {
    key: 'enterprise',
    name: 'Enterprise',
    tagline: 'For franchises and networks',
    monthly: null,
    annual: null,
    ctaLabel: 'Contact Sales',
    ctaVariant: 'outline-border',
    ctaHref: 'mailto:sales@listhq.com.au?subject=Enterprise%20enquiry',
    features: [
      'Unlimited agents',
      'Everything in Agency Pro, plus:',
      'Franchise / network management',
      'Custom white-label',
      'Custom SLA + uptime guarantee',
      'Dedicated success manager',
      'Volume pricing',
      'Custom integrations',
    ],
  },
];

const FAQS = [
  {
    q: 'What happens after my Solo trial?',
    a: "Seven days before your 30-day trial ends you'll receive an email and an in-app notification. At day 31 your card is charged for the first month. Cancel any time before day 31 to avoid charges.",
  },
  {
    q: 'What are Halo credits?',
    a: "Halo is ListHQ's reverse marketplace — buyers post exactly what property they want, and agents browse active buyer briefs on the Halo Board. Unlocking a buyer's contact details uses one credit. Plans include monthly credits; additional credits can be purchased from your dashboard.",
  },
  {
    q: 'Does ListHQ replace PropertyMe or Console Cloud?',
    a: 'Yes. ListHQ includes full trust accounting, property management, rent roll, arrears automation, inspection scheduling, and no-login portals for tenants, owners and suppliers — all state-specific and AFA 2014 compliant.',
  },
  {
    q: 'Can I change plans?',
    a: 'Yes — upgrade or downgrade at any time from your billing settings. Changes take effect immediately and are pro-rated to your current cycle.',
  },
];

function PlanCard({ plan, billing, index }: { plan: Plan; billing: BillingCycle; index: number }) {
  const navigate = useNavigate();
  const ref = useRef<HTMLDivElement>(null);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const io = new IntersectionObserver(
      ([e]) => {
        if (e.isIntersecting) {
          setTimeout(() => setVisible(true), index * 100);
          io.disconnect();
        }
      },
      { threshold: 0.1 },
    );
    io.observe(el);
    return () => io.disconnect();
  }, [index]);

  const isCustom = plan.monthly === null;
  const priceNumber = billing === 'annual' && plan.annual ? plan.annual : plan.monthly;
  const periodLabel = isCustom ? '' : billing === 'annual' ? '/yr' : '/mo';

  const ctaStyle: React.CSSProperties =
    plan.ctaVariant === 'filled-blue'
      ? { background: C.blue, color: '#fff', border: `1px solid ${C.blue}` }
      : plan.ctaVariant === 'outline-blue'
        ? { background: '#fff', color: C.blue, border: `1.5px solid ${C.blue}` }
        : { background: '#fff', color: C.ink, border: `1px solid ${C.border}` };

  const onCta = () => {
    if (plan.ctaHref.startsWith('mailto:')) window.location.href = plan.ctaHref;
    else navigate(plan.ctaHref);
  };

  return (
    <div
      ref={ref}
      className="relative bg-white flex flex-col"
      style={{
        border: plan.popular ? `2px solid ${C.blue}` : `1px solid ${C.border}`,
        borderRadius: 20,
        padding: '32px 28px',
        boxShadow: plan.popular ? `0 0 0 6px ${C.blue}15, 0 10px 30px -10px ${C.blue}40` : 'none',
        opacity: visible ? 1 : 0,
        transform: visible ? 'translateY(0)' : 'translateY(20px)',
        transition: 'opacity 0.5s ease, transform 0.5s ease, box-shadow 0.25s ease',
      }}
      onMouseEnter={(e) => {
        e.currentTarget.style.transform = 'translateY(-4px)';
        if (!plan.popular)
          e.currentTarget.style.boxShadow = '0 12px 30px -12px rgba(10,15,30,0.18)';
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.transform = 'translateY(0)';
        if (!plan.popular) e.currentTarget.style.boxShadow = 'none';
      }}
    >
      {plan.popular && (
        <div
          className="absolute"
          style={{
            top: -12,
            left: '50%',
            transform: 'translateX(-50%)',
            background: C.blue,
            color: '#fff',
            fontSize: 10,
            fontWeight: 800,
            letterSpacing: '1px',
            padding: '4px 12px',
            borderRadius: 999,
            textTransform: 'uppercase',
            whiteSpace: 'nowrap',
          }}
        >
          Most Popular
        </div>
      )}

      <div style={{ fontSize: 12, fontWeight: 700, textTransform: 'uppercase', color: C.muted, letterSpacing: '0.5px' }}>
        {plan.name}
      </div>
      <div style={{ fontSize: 13, color: C.muted, marginTop: 6, minHeight: 36 }}>{plan.tagline}</div>

      <div style={{ marginTop: 16, display: 'flex', alignItems: 'baseline', gap: 6 }}>
        <span style={{ fontSize: 44, fontWeight: 800, color: C.ink, lineHeight: 1 }}>
          {isCustom ? 'Custom' : formatPrice(priceNumber!)}
        </span>
        {periodLabel && <span style={{ fontSize: 13, color: C.muted }}>{periodLabel}</span>}
      </div>
      <div style={{ fontSize: 12, color: C.muted, marginTop: 6, minHeight: 18 }}>
        {isCustom
          ? 'Tailored to your network'
          : billing === 'annual'
            ? <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
                <span style={{ background: C.blueL, color: C.blue, padding: '2px 8px', borderRadius: 6, fontSize: 11, fontWeight: 700 }}>Save 20%</span>
                {`vs ${formatPrice(plan.monthly! * 12)}/yr monthly`}
              </span>
            : `or ${formatPrice(plan.annual!)}/yr — save 20%`}
      </div>

      {plan.trialBadge && (
        <span
          style={{
            marginTop: 14,
            alignSelf: 'flex-start',
            background: C.blueL,
            color: C.blue,
            fontSize: 11,
            fontWeight: 700,
            padding: '4px 10px',
            borderRadius: 999,
          }}
        >
          {plan.trialBadge}
        </span>
      )}

      <button
        onClick={onCta}
        style={{
          ...ctaStyle,
          marginTop: plan.trialBadge ? 14 : 24,
          padding: '12px 16px',
          borderRadius: 12,
          fontSize: 14,
          fontWeight: 700,
          cursor: 'pointer',
          transition: 'opacity 0.2s ease',
        }}
        onMouseEnter={(e) => (e.currentTarget.style.opacity = '0.9')}
        onMouseLeave={(e) => (e.currentTarget.style.opacity = '1')}
      >
        {plan.ctaLabel}
      </button>

      {plan.microcopy && (
        <div style={{ fontSize: 11, color: C.muted, marginTop: 8, lineHeight: 1.5 }}>
          {plan.microcopy}
        </div>
      )}

      <ul style={{ marginTop: 22, padding: 0, listStyle: 'none', display: 'flex', flexDirection: 'column', gap: 10 }}>
        {plan.features.map((f) => (
          <li key={f} style={{ display: 'flex', alignItems: 'flex-start', gap: 8, fontSize: 13, color: C.mid, lineHeight: 1.5 }}>
            <Check style={{ width: 16, height: 16, color: C.blue, flexShrink: 0, marginTop: 2 }} strokeWidth={2.5} />
            <span>{f}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}

export default function PricingPage() {
  const [billing, setBilling] = useState<BillingCycle>('monthly');
  const [openFaq, setOpenFaq] = useState<number | null>(0);
  const { t } = useTranslation();

  return (
    <>
      <Helmet>
        <title>Pricing — Replace your entire stack · ListHQ</title>
        <meta
          name="description"
          content="CRM, property management, trust accounting and 20-language portal — all in one platform. Plans from $799/mo. No contracts. Cancel anytime."
        />
      </Helmet>

      <div style={{ background: '#fff' }}>
        {/* Header */}
        <section className="max-w-6xl mx-auto px-4 pt-16 pb-10 text-center">
          <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: '1.5px', color: C.blue, textTransform: 'uppercase' }}>
            Pricing — No Contracts, Cancel Anytime
          </div>
          <h1
            className="font-display"
            style={{
              fontSize: 'clamp(32px, 5vw, 52px)',
              fontWeight: 800,
              color: C.ink,
              lineHeight: 1.05,
              letterSpacing: '-0.02em',
              marginTop: 14,
            }}
          >
            Replace your entire stack.
            <br />
            <span style={{ color: C.blue }}>For less than one REA listing.</span>
          </h1>
          <p style={{ marginTop: 18, fontSize: 16, color: C.mid, maxWidth: 720, marginInline: 'auto', lineHeight: 1.6 }}>
            CRM · Property management · Trust accounting · 20-language portal — all in one platform.
            <br />
            All plans billed monthly. Annual billing saves 20%.
          </p>

          {/* Billing toggle */}
          <div
            style={{
              marginTop: 28,
              display: 'inline-flex',
              gap: 4,
              background: '#F3F4F6',
              padding: 4,
              borderRadius: 999,
            }}
          >
            {(['monthly', 'annual'] as BillingCycle[]).map((b) => {
              const active = billing === b;
              return (
                <button
                  key={b}
                  onClick={() => setBilling(b)}
                  style={{
                    padding: '8px 18px',
                    borderRadius: 999,
                    fontSize: 13,
                    fontWeight: 600,
                    border: 'none',
                    cursor: 'pointer',
                    background: active ? '#fff' : 'transparent',
                    color: active ? C.ink : C.muted,
                    boxShadow: active ? '0 1px 3px rgba(0,0,0,0.08)' : 'none',
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: 8,
                    transition: 'all 0.2s ease',
                  }}
                >
                  {b === 'monthly' ? 'Monthly' : 'Annual'}
                  {b === 'annual' && (
                    <span
                      style={{
                        background: C.blueL,
                        color: C.blue,
                        fontSize: 10,
                        fontWeight: 700,
                        padding: '2px 6px',
                        borderRadius: 6,
                      }}
                    >
                      Save 20%
                    </span>
                  )}
                </button>
              );
            })}
          </div>
        </section>

        {/* Plan cards */}
        <section className="max-w-6xl mx-auto px-4 pb-10">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-5">
            {PLANS.map((plan, i) => (
              <PlanCard key={plan.key} plan={plan} billing={billing} index={i} />
            ))}
          </div>

          <p
            style={{
              textAlign: 'center',
              marginTop: 32,
              fontSize: 13,
              color: C.muted,
              lineHeight: 1.6,
            }}
          >
            All plans include 60-day listing guarantee · ACCC-compliant trust accounting · Australian data residency
          </p>
        </section>

        {/* FAQ */}
        <section className="max-w-3xl mx-auto px-4 pb-24 pt-10">
          <h2
            className="font-display"
            style={{ fontSize: 28, fontWeight: 800, color: C.ink, textAlign: 'center', marginBottom: 24 }}
          >
            {t('pricing.faqTitle') || 'Frequently asked questions'}
          </h2>

          <div className="space-y-3">
            {FAQS.map((faq, i) => {
              const open = openFaq === i;
              return (
                <div
                  key={faq.q}
                  style={{
                    background: '#fff',
                    border: `1px solid ${C.border}`,
                    borderRadius: 16,
                    overflow: 'hidden',
                  }}
                >
                  <button
                    onClick={() => setOpenFaq(open ? null : i)}
                    style={{
                      width: '100%',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      gap: 16,
                      padding: '16px 20px',
                      background: 'transparent',
                      border: 'none',
                      textAlign: 'left',
                      cursor: 'pointer',
                    }}
                  >
                    <span style={{ fontSize: 14, fontWeight: 600, color: C.ink }}>{faq.q}</span>
                    <ChevronDown
                      style={{
                        width: 16,
                        height: 16,
                        color: C.muted,
                        flexShrink: 0,
                        transform: open ? 'rotate(180deg)' : 'none',
                        transition: 'transform 0.2s ease',
                      }}
                    />
                  </button>
                  {open && (
                    <div style={{ padding: '0 20px 16px', fontSize: 13, color: C.mid, lineHeight: 1.6 }}>
                      {faq.a}
                    </div>
                  )}
                </div>
              );
            })}
          </div>

          <div className="mt-12 text-center">
            <p style={{ fontSize: 14, color: C.muted, marginBottom: 12 }}>Still have questions?</p>
            <Link
              to="/help/contact"
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                padding: '12px 20px',
                borderRadius: 12,
                border: `1px solid ${C.border}`,
                background: '#fff',
                fontSize: 14,
                fontWeight: 600,
                color: C.ink,
                textDecoration: 'none',
              }}
            >
              Contact us
            </Link>
          </div>
        </section>
      </div>
    </>
  );
}
