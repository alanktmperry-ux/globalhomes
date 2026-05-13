import { useState, useEffect, useRef } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Helmet } from 'react-helmet-async';
import { ArrowRight } from 'lucide-react';
import { useTranslation } from '@/shared/lib/i18n/useTranslation';
import FinalCTA from '@/features/marketing/FinalCTA';

type BillingCycle = 'monthly' | 'annual';

const GRAD = 'linear-gradient(135deg, #2563EB 0%, #4F88FF 60%, #93C5FD 100%)';

// iconify-icon is a globally loaded web component
const Icon = ({ icon, size = 18, color }: { icon: string; size?: number; color?: string }) => (
  // @ts-expect-error — iconify-icon is a web component
  <iconify-icon icon={icon} style={{ fontSize: `${size}px`, color, display: 'inline-flex', lineHeight: 1 }} />
);

const gradientText: React.CSSProperties = {
  background: GRAD,
  WebkitBackgroundClip: 'text',
  backgroundClip: 'text',
  WebkitTextFillColor: 'transparent',
  color: 'transparent',
};

interface Plan {
  key: string;
  name: string;
  tagline: string;
  monthly: number;
  annual: number;
  ctaLabel: string;
  ctaHref: string;
  microcopy?: string;
  features: string[];
  featured?: boolean;
  trialBadge?: string;
}

const PLANS: Plan[] = [
  {
    key: 'solo',
    name: 'Solo',
    tagline: 'For independent agents starting out',
    monthly: 799,
    annual: 7670,
    trialBadge: '60-day free trial',
    ctaLabel: 'Start free trial',
    ctaHref: '/for-agents#register',
    microcopy: 'No charge until day 61 · Cancel anytime · All prices excl. GST',
    features: [
      '1 agent seat',
      'Up to 5 active listings',
      'Multilingual auto-translation',
      'CRM — up to 250 contacts',
      'Property management — up to 10 properties',
      'Trust accounting (full ledger)',
      'Halo™ board — 20 buyer briefs/mo',
      'Voice search',
      'Email support',
    ],
  },
  {
    key: 'agency',
    name: 'Agency',
    tagline: 'For growing agencies ready to scale',
    monthly: 1999,
    annual: 19190,
    featured: true,
    ctaLabel: 'Book a demo',
    ctaHref: '/for-agents#register',
    microcopy: 'Straight to paid · No trial · Demo available',
    features: [
      'Up to 5 agent seats',
      'Unlimited listings',
      'Full PM automation',
      'Bank reconciliation',
      'Pocket listings',
      'Halo™ — 100 buyer briefs/mo',
      'Buyer concierge — 100 matches/mo',
      'Agency-branded profile',
      'Phone + email support',
    ],
  },
  {
    key: 'pro',
    name: 'Agency Pro',
    tagline: 'For established multi-office agencies',
    monthly: 3499,
    annual: 33590,
    ctaLabel: 'Talk to sales',
    ctaHref: 'mailto:sales@listhq.com.au?subject=Agency%20Pro%20enquiry',
    microcopy: 'Sales call required · Custom onboarding included',
    features: [
      'Up to 15 agent seats',
      'Everything in Agency, plus:',
      'Multi-office management',
      'Buyer concierge — unlimited',
      'Commission calculator',
      'White-label option',
      'API access',
      'Dedicated account manager',
      'SLA support',
    ],
  },
];

const FAQS = [
  {
    q: 'What happens after my Solo trial?',
    a: "Seven days before your 60-day trial ends you'll receive an email and an in-app notification. At day 61 your card is charged for the first month. Cancel any time before day 61 to avoid charges.",
  },
  {
    q: 'What are Halo credits?',
    a: "Halo is ListHQ's reverse marketplace — buyers post exactly what property they want, and agents browse active buyer briefs on the Halo Board. Unlocking a buyer's contact details uses one credit. Plans include monthly credits; additional credits can be purchased from your dashboard.",
  },
  {
    q: 'Does ListHQ replace PropertyMe or Console Cloud?',
    a: 'Yes. ListHQ includes full trust accounting, property management, rent roll, arrears automation, inspection scheduling, and no-login portals for tenants, owners and suppliers — built to support state-specific trust accounting record-keeping requirements including AFA 2014 (QLD) and equivalent legislation in NSW, VIC, SA, and WA.',
  },
  {
    q: 'Can I change plans?',
    a: 'Yes — upgrade or downgrade at any time from your billing settings. Changes take effect immediately and are pro-rated to your current cycle.',
  },
];

const COMPARE_ROWS: Array<{ feature: string; solo: boolean | string; agency: boolean | string; pro: boolean | string }> = [
  { feature: 'Agent seats', solo: '1', agency: '5', pro: '15' },
  { feature: 'Active listings', solo: '5', agency: 'Unlimited', pro: 'Unlimited' },
  { feature: 'Multilingual auto-translation', solo: true, agency: true, pro: true },
  { feature: 'Voice search', solo: true, agency: true, pro: true },
  { feature: 'CRM contacts', solo: '250', agency: 'Unlimited', pro: 'Unlimited' },
  { feature: 'Property management', solo: '10 props', agency: 'Unlimited', pro: 'Unlimited' },
  { feature: 'Trust accounting', solo: true, agency: true, pro: true },
  { feature: 'Bank reconciliation', solo: false, agency: true, pro: true },
  { feature: 'Pocket listings', solo: false, agency: true, pro: true },
  { feature: 'Halo™ buyer briefs / mo', solo: '20', agency: '100', pro: 'Unlimited' },
  { feature: 'Buyer concierge', solo: false, agency: '100/mo', pro: 'Unlimited' },
  { feature: 'Multi-office management', solo: false, agency: false, pro: true },
  { feature: 'White-label option', solo: false, agency: false, pro: true },
  { feature: 'API access', solo: false, agency: false, pro: true },
  { feature: 'Dedicated account manager', solo: false, agency: false, pro: true },
];

const formatPrice = (n: number) => `$${n.toLocaleString('en-AU')}`;

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

  const priceNumber = billing === 'annual' ? plan.annual : plan.monthly;
  const periodLabel = billing === 'annual' ? '/yr' : '/mo';

  const onCta = () => {
    if (plan.ctaHref.startsWith('mailto:')) window.location.href = plan.ctaHref;
    else navigate(plan.ctaHref);
  };

  return (
    <div
      ref={ref}
      className={
        plan.featured
          ? 'relative rounded-3xl p-8 md:p-10 transition-all duration-300 bg-gradient-to-b from-white to-[#EFF6FF] border-2 border-[#2563EB] shadow-[0_24px_60px_rgba(37,99,235,0.15)]'
          : 'relative rounded-3xl p-8 md:p-10 bg-white border border-[#E5E5E5] transition-all duration-300 hover:border-[#2563EB] hover:-translate-y-1 hover:shadow-[0_24px_60px_rgba(37,99,235,0.10)]'
      }
      style={{
        opacity: visible ? 1 : 0,
        transform: visible ? undefined : 'translateY(20px)',
      }}
    >
      {plan.featured && (
        <span
          className="absolute -top-3.5 left-1/2 -translate-x-1/2 px-3.5 py-1.5 rounded-full text-white text-[10px] font-extrabold tracking-[0.14em] uppercase whitespace-nowrap shadow-[0_4px_14px_rgba(37,99,235,0.40)]"
          style={{ background: GRAD }}
        >
          Most Popular
        </span>
      )}

      <div className="text-[12px] font-bold tracking-[0.16em] uppercase text-[#6a6a6a]">{plan.name}</div>
      <p className="text-[13px] text-[#6a6a6a] mt-2 min-h-[36px] leading-[1.45]">{plan.tagline}</p>

      <div className="text-[56px] md:text-[64px] font-extrabold tracking-[-0.04em] text-black mt-4 leading-none tabular-nums">
        {formatPrice(priceNumber)}
        <span className="text-[16px] md:text-[18px] font-bold text-[#6a6a6a] ml-1">{periodLabel}</span>
      </div>

      {billing === 'annual' && (
        <div className="mt-2 text-[12px] text-[#065F46] inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-[#ECFDF5] font-bold">
          Save 20%
        </div>
      )}

      {plan.trialBadge && (
        <span className="inline-block mt-3 px-2.5 py-1 rounded-full bg-[#EFF6FF] text-[#1E40AF] text-[11px] font-bold">
          {plan.trialBadge}
        </span>
      )}

      <button
        type="button"
        onClick={onCta}
        className={
          plan.featured
            ? 'w-full mt-7 py-3.5 text-white rounded-xl text-[14px] font-bold cursor-pointer transition-all hover:-translate-y-0.5 hover:shadow-[0_8px_24px_rgba(37,99,235,0.40)] inline-flex items-center justify-center gap-2'
            : 'w-full mt-7 py-3.5 bg-white text-black border border-black rounded-xl text-[14px] font-bold cursor-pointer transition-all hover:bg-black hover:text-white inline-flex items-center justify-center gap-2'
        }
        style={plan.featured ? { background: GRAD } : undefined}
      >
        {plan.ctaLabel}
        <ArrowRight size={16} strokeWidth={2.2} />
      </button>

      {plan.microcopy && (
        <p className="text-[12px] text-[#6a6a6a] mt-3 leading-[1.5]">{plan.microcopy}</p>
      )}

      <div className="mt-8 pt-6 border-t border-[#E5E5E5] flex flex-col gap-3">
        {plan.features.map((f) => (
          <div key={f} className="flex items-start gap-2.5 text-[14px] text-[#4a4a4a]">
            <span className="mt-0.5 flex-shrink-0">
              <Icon icon="solar:check-circle-bold" size={18} color="#2563EB" />
            </span>
            <span>{f}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

function CompareCell({ value }: { value: boolean | string }) {
  if (value === true) return <Icon icon="solar:check-circle-bold" size={18} color="#2563EB" />;
  if (value === false) return <Icon icon="solar:close-circle-linear" size={18} color="#9CA3AF" />;
  return <span className="text-[14px] font-semibold text-[#0a0f1e]">{value}</span>;
}

export default function PricingPage() {
  const [billing, setBilling] = useState<BillingCycle>('monthly');
  const [openFaq, setOpenFaq] = useState<number | null>(0);
  const { t } = useTranslation();

  return (
    <>
      <Helmet>
        <title>Real Estate Agent Software Pricing — 60-Day Free Trial | ListHQ</title>
        <meta
          name="description"
          content="Australia's multilingual real estate platform — listings auto-translated into 30+ languages. Trust accounting, CRM, property management, and Halo buyer matching. 60-day free trial."
        />
        <meta property="og:title" content="Real Estate Agent Software Pricing | ListHQ" />
        <meta property="og:description" content="Replace your entire agent stack — trust accounting, CRM, Halo buyer matching, AI listings — from $299/month. 60-day free trial, no card required." />
        <meta property="og:type" content="website" />
        <meta property="og:image" content="https://listhq.com.au/og-image.png" />
        <meta property="og:url" content="https://listhq.com.au/for-agents/pricing" />
        <meta property="og:site_name" content="ListHQ" />
        <meta name="twitter:card" content="summary_large_image" />
        <meta name="twitter:title" content="Real Estate Agent Software Pricing | ListHQ" />
        <meta name="twitter:description" content="Replace your entire agent stack — trust accounting, CRM, Halo buyer matching, AI listings — from $799/month. 60-day free trial, no card required." />
        <meta name="twitter:image" content="https://listhq.com.au/og-image.png" />
      </Helmet>

      <div className="bg-white text-black">
        {/* ─── HERO ─── */}
        <section className="pt-[120px] md:pt-[140px] pb-16 px-6 md:px-8 bg-white text-center">
          <div className="max-w-[960px] mx-auto">
            <div className="inline-flex items-center gap-2.5 px-4 py-2 bg-[#EFF6FF] border border-[#2563EB]/20 rounded-full text-[11px] font-bold tracking-[0.06em] uppercase text-[#1E40AF]">
              <Icon icon="solar:tag-linear" size={13} />
              PRICING
            </div>
            <h1 className="text-[clamp(48px,8vw,120px)] font-extrabold leading-[0.92] tracking-[-0.05em] text-black mt-6">
              Pick your
              <br />
              <span style={gradientText}>plan.</span>
            </h1>
            <p className="text-[17px] md:text-[19px] text-[#4a4a4a] mt-6 max-w-[640px] mx-auto leading-[1.55]">
              {t('pricing.subheadline') || '60-day free trial · No charge until day 61 · Founding pricing locked for 24 months.'}
            </p>

            {/* Billing toggle */}
            <div className="inline-flex items-center bg-[#F9FAFB] rounded-full p-1 mt-10 border border-[#E5E5E5]">
              {(['monthly', 'annual'] as BillingCycle[]).map((b) => {
                const active = billing === b;
                return (
                  <button
                    key={b}
                    type="button"
                    onClick={() => setBilling(b)}
                    className={
                      active
                        ? 'bg-white text-[#0a0f1e] font-bold rounded-full px-5 md:px-6 py-2 text-sm shadow-sm inline-flex items-center gap-2'
                        : 'text-[#6a6a6a] font-medium px-5 md:px-6 py-2 text-sm inline-flex items-center gap-2'
                    }
                  >
                    {b === 'monthly' ? 'Monthly' : 'Annual'}
                    {b === 'annual' && (
                      <span className="bg-[#34D399]/15 text-[#065F46] text-[10px] font-bold px-2 py-0.5 rounded-full">
                        Save 20%
                      </span>
                    )}
                  </button>
                );
              })}
            </div>
          </div>
        </section>

        {/* ─── PRICING CARDS ─── */}
        <section className="px-6 md:px-8 pb-24 bg-white">
          <div className="max-w-[1280px] mx-auto">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mt-4">
              {PLANS.map((p, i) => (
                <PlanCard key={p.key} plan={p} billing={billing} index={i} />
              ))}
            </div>
            <p className="text-xs text-center text-muted-foreground mt-2">All prices in AUD, excluding GST.</p>
            <p className="text-center text-[13px] text-[#6a6a6a] mt-10">
              All plans include 60-day free trial · Trust accounting built for Australian compliance · Australian data residency
            </p>
          </div>
        </section>

        {/* ─── COMPARISON TABLE ─── */}
        <section className="bg-[#F9FAFB] py-[100px] md:py-[140px] px-6 md:px-8 border-y border-[#E5E5E5]">
          <div className="max-w-[1200px] mx-auto">
            <div className="text-center max-w-[720px] mx-auto">
              <div className="inline-flex items-center gap-2.5 px-4 py-2 bg-[#EFF6FF] border border-[#2563EB]/20 rounded-full text-[11px] font-bold tracking-[0.06em] uppercase text-[#1E40AF]">
                COMPARE PLANS
              </div>
              <h2 className="text-[clamp(36px,5vw,72px)] font-extrabold leading-[0.95] tracking-[-0.04em] text-black mt-5">
                {t('pricing.compareTitle') || 'Every feature,'}
                <br />
                <span style={gradientText}>side by side.</span>
              </h2>
              <p className="text-[15px] md:text-[17px] text-[#4a4a4a] mt-5 leading-[1.55]">
                {t('pricing.compareSubtitle') || 'Choose the plan that fits where your business is today. Upgrade anytime.'}
              </p>
            </div>

            <div className="mt-12 md:mt-16 bg-white rounded-3xl border border-[#E5E5E5] overflow-hidden overflow-x-auto">
              <table className="w-full min-w-[640px]">
                <thead>
                  <tr className="bg-[#F9FAFB] border-b border-[#E5E5E5]">
                    <th className="text-left text-[12px] font-bold uppercase tracking-[0.10em] text-[#6a6a6a] py-5 px-6">
                      Feature
                    </th>
                    <th className="text-center text-[12px] font-bold uppercase tracking-[0.10em] text-[#6a6a6a] py-5 px-6">Solo</th>
                    <th className="relative text-center text-[12px] font-bold uppercase tracking-[0.10em] text-[#1E40AF] py-5 px-6 bg-[#EFF6FF]/60">
                      <span
                        className="absolute -top-2.5 left-1/2 -translate-x-1/2 px-2.5 py-0.5 rounded-full text-white text-[9px] font-extrabold tracking-[0.14em] uppercase whitespace-nowrap"
                        style={{ background: GRAD }}
                      >
                        Most Popular
                      </span>
                      Agency
                    </th>
                    <th className="text-center text-[12px] font-bold uppercase tracking-[0.10em] text-[#6a6a6a] py-5 px-6">
                      Agency Pro
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {COMPARE_ROWS.map((row) => (
                    <tr key={row.feature} className="border-b border-[#F3F4F6] last:border-0">
                      <td className="py-4 px-6 text-[14px] font-semibold text-[#0a0f1e]">{row.feature}</td>
                      <td className="py-4 px-6 text-center"><CompareCell value={row.solo} /></td>
                      <td className="py-4 px-6 text-center bg-[#EFF6FF]/40"><CompareCell value={row.agency} /></td>
                      <td className="py-4 px-6 text-center"><CompareCell value={row.pro} /></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </section>

        {/* ─── FAQ ─── */}
        <section className="py-[100px] md:py-[120px] px-6 md:px-8 bg-white">
          <div className="max-w-[800px] mx-auto">
            <div className="text-center">
              <div className="inline-flex items-center gap-2.5 px-4 py-2 bg-[#EFF6FF] border border-[#2563EB]/20 rounded-full text-[11px] font-bold tracking-[0.06em] uppercase text-[#1E40AF]">
                FREQUENTLY ASKED
              </div>
              <h2 className="text-[clamp(36px,5vw,72px)] font-extrabold leading-[0.95] tracking-[-0.04em] text-black mt-5">
                Common{' '}
                <span style={gradientText}>questions.</span>
              </h2>
            </div>

            <div className="mt-12">
              {FAQS.map((faq, i) => {
                const open = openFaq === i;
                return (
                  <div key={faq.q} className="border-b border-[#E5E5E5] py-6">
                    <button
                      type="button"
                      onClick={() => setOpenFaq(open ? null : i)}
                      className="w-full text-[18px] font-bold text-[#0a0f1e] flex justify-between items-center gap-4 text-left cursor-pointer"
                    >
                      <span>{faq.q}</span>
                      <span
                        style={{
                          transform: open ? 'rotate(180deg)' : 'none',
                          transition: 'transform 0.2s ease',
                          display: 'inline-flex',
                        }}
                      >
                        <Icon icon="solar:alt-arrow-down-linear" size={20} color="#6a6a6a" />
                      </span>
                    </button>
                    {open && (
                      <p className="text-[15px] text-[#4a4a4a] mt-4 leading-[1.6]">{faq.a}</p>
                    )}
                  </div>
                );
              })}
            </div>

            <p className="text-center text-[14px] text-[#6a6a6a] mt-12">
              Still have questions?{' '}
              <Link to="/help/contact" className="text-[#2563EB] font-bold hover:underline inline-flex items-center gap-1">
                Contact us
                <ArrowRight size={14} strokeWidth={2.2} />
              </Link>
            </p>
          </div>
        </section>

        {/* ─── FINAL CTA (reused from homepage) ─── */}
        <FinalCTA />
      </div>
    </>
  );
}
