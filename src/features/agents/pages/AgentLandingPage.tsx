import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowRight, MapPin, Wand2, Globe, Lock, Mic, Clock, BarChart2, Wallet, XCircle, CheckCircle2 } from 'lucide-react';

import { SEO } from '@/shared/components/SEO';
import AgentRegistrationModal from '@/features/agents/components/AgentRegistrationModal';
import { useTranslation } from '@/shared/lib/i18n/useTranslation';
import HomeCountUp from '@/components/HomeCountUp';
// PricingSection moved to dedicated /for-agents/pricing route
import FinalCTA from '@/features/marketing/FinalCTA';

const GRAD = 'linear-gradient(135deg, #2563EB 0%, #4F88FF 60%, #93C5FD 100%)';

// iconify-icon is a globally loaded web component
const Icon = ({ icon, size = 20, color }: { icon: string; size?: number; color?: string }) => (
  // @ts-expect-error — iconify-icon is a web component
  <iconify-icon icon={icon} style={{ fontSize: `${size}px`, color, display: 'inline-flex', lineHeight: 1 }} />
);

const CYCLING_LINES = [
  'who move fast.',
  'who think ahead.',
  'who serve every buyer.',
  'who close more deals.',
  'who speak every language.',
];

const FEATURES: Array<{ icon: string; titleKey: string; bodyKey: string; badge: 'unique' | 'automated' }> = [
  { icon: 'solar:streets-linear',         titleKey: 'agentLanding.feature1Title', bodyKey: 'agentLanding.feature1Body', badge: 'unique' },
  { icon: 'solar:magic-stick-3-linear',   titleKey: 'agentLanding.feature2Title', bodyKey: 'agentLanding.feature2Body', badge: 'automated' },
  { icon: 'solar:earth-linear',           titleKey: 'agentLanding.feature3Title', bodyKey: 'agentLanding.feature3Body', badge: 'unique' },
  { icon: 'solar:lock-keyhole-linear',    titleKey: 'agentLanding.feature4Title', bodyKey: 'agentLanding.feature4Body', badge: 'unique' },
  { icon: 'solar:microphone-3-linear',    titleKey: 'agentLanding.feature5Title', bodyKey: 'agentLanding.feature5Body', badge: 'unique' },
  { icon: 'solar:clock-circle-linear',    titleKey: 'agentLanding.feature6Title', bodyKey: 'agentLanding.feature6Body', badge: 'unique' },
  { icon: 'solar:chart-square-linear',    titleKey: 'agentLanding.feature7Title', bodyKey: 'agentLanding.feature7Body', badge: 'automated' },
  { icon: 'solar:wallet-2-linear',        titleKey: 'agentLanding.feature8Title', bodyKey: 'agentLanding.feature8Body', badge: 'automated' },
];

const CON_KEYS = ['agentLanding.con1','agentLanding.con2','agentLanding.con3','agentLanding.con4','agentLanding.con5','agentLanding.con6','agentLanding.con7'];
const PRO_KEYS = ['agentLanding.pro1','agentLanding.pro2','agentLanding.pro3','agentLanding.pro4','agentLanding.pro5','agentLanding.pro6','agentLanding.pro7'];

const gradientText: React.CSSProperties = {
  background: GRAD,
  WebkitBackgroundClip: 'text',
  backgroundClip: 'text',
  WebkitTextFillColor: 'transparent',
  color: 'transparent',
};

export default function AgentLandingPage() {
  const navigate = useNavigate();
  const { t } = useTranslation();
  const [showModal, setShowModal] = useState(false);
  const [lineIdx, setLineIdx] = useState(0);

  useEffect(() => {
    const id = setInterval(() => setLineIdx((i) => (i + 1) % CYCLING_LINES.length), 5000);
    return () => clearInterval(id);
  }, []);

  return (
    <div className="min-h-screen bg-white text-black overflow-x-hidden">
      <SEO
        title="Real Estate Agent Software Australia"
        description="Halo Board, AI buyer matching, multilingual translation, trust accounting, and CRM — built for Australian agents."
        path="/for-agents"
      />

      {/* ─── HERO ─── */}
      <section className="pt-[120px] md:pt-[140px] pb-20 px-6 md:px-8 bg-white">
        <div className="max-w-[1280px] mx-auto text-center">
          <div className="inline-flex items-center gap-2.5 px-4 py-2 bg-[#EFF6FF] border border-[#2563EB]/20 rounded-full text-[11px] font-bold tracking-[0.06em] uppercase text-[#1E40AF]">
            <span className="w-1.5 h-1.5 rounded-full bg-[#2563EB] animate-pulse" />
            BUILT FOR AGENTS
          </div>

          {/* Semantic H1 for screen readers and Google — hidden visually */}
          <h1 className="sr-only">Built for agents who serve every buyer — real estate software for multilingual Australia</h1>

          {/* Visual cycling headline — hidden from assistive tech */}
          <div aria-hidden="true" className="text-[clamp(48px,9vw,140px)] font-extrabold leading-[0.92] tracking-[-0.05em] text-black max-w-[1100px] mx-auto mt-6">
            Built for agents
            <br />
            <span className="relative inline-block">
              {CYCLING_LINES.map((line, i) => (
                <span
                  key={line}
                  style={{
                    ...gradientText,
                    position: i === 0 ? 'relative' : 'absolute',
                    inset: i === 0 ? undefined : 0,
                    opacity: i === lineIdx ? 1 : 0,
                    filter: i === lineIdx ? 'blur(0)' : 'blur(10px)',
                    transition: 'opacity 700ms ease, filter 700ms ease',
                    whiteSpace: 'nowrap',
                  }}
                >
                  {line}
                </span>
              ))}
            </span>
          </div>

          <p className="text-[17px] md:text-[19px] leading-[1.55] text-[#4a4a4a] max-w-[620px] mx-auto mt-8 font-normal">
            The tools no other portal offers. Any-language translation, AI buyer matching, full trust accounting, and the Halo reverse marketplace — all in one subscription.
          </p>

          <div className="flex flex-col items-center gap-5 mt-10">
            <button
              type="button"
              onClick={() => setShowModal(true)}
              className="px-8 md:px-9 py-4 bg-black text-white border-[1.5px] border-black rounded-full text-[15px] font-bold inline-flex items-center gap-2.5 hover:bg-white hover:text-black transition-all"
            >
              Start free trial — 60 days free
              <ArrowRight size={18} strokeWidth={2.2} />
            </button>
            <button
              type="button"
              onClick={() => navigate('/signup?role=agent')}
              className="text-[13px] font-bold text-[#4a4a4a] hover:text-[#2563EB] transition-colors inline-flex items-center gap-1.5"
            >
              <Icon icon="solar:lock-keyhole-linear" size={14} />
              {t('agentLanding.ctaLogin') || 'Sign in to your account'}
            </button>
            <p className="text-[12px] text-[#9CA3AF] mt-2">
              {t('agentLanding.disclaimer')}
            </p>
          </div>
        </div>
      </section>

      {/* ─── TRUST STATS ─── */}
      <section className="border-y border-[#E5E5E5] py-16 px-6 md:px-8 bg-white">
        <div className="max-w-[1200px] mx-auto grid grid-cols-2 md:grid-cols-4 gap-8 text-center">
          {[
            { target: 0, staticText: 'Active', label: 'Verified buyer network' },
            { target: 0, staticText: 'Any language', label: 'Auto-translated listings' },
            { target: 24, suffix: '', label: 'Communities served' },
            { target: 0, staticText: '60 days', label: 'Free trial, then price-locked for 24 months' },
          ].map((s) => (
            <div key={s.label}>
              <div
                className="text-[clamp(40px,6vw,72px)] font-extrabold tracking-[-0.04em] leading-none tabular-nums"
                style={gradientText}
              >
                <HomeCountUp target={s.target} suffix={s.suffix} staticText={s.staticText} duration={1600} />
              </div>
              <div className="text-[12px] md:text-[13px] text-[#6a6a6a] mt-3 font-medium">{s.label}</div>
            </div>
          ))}
        </div>
      </section>

      {/* ─── FEATURES ─── */}
      <section className="py-[100px] md:py-[140px] px-6 md:px-8 max-w-[1280px] mx-auto">
        <div className="text-center max-w-[720px] mx-auto">
          <div className="inline-flex items-center gap-2.5 px-4 py-2 bg-[#EFF6FF] border border-[#2563EB]/20 rounded-full text-[11px] font-bold tracking-[0.06em] uppercase text-[#1E40AF]">
            {t('agentLanding.featuresEyebrow') || 'ONE PLATFORM'}
          </div>
          <h2 className="text-[clamp(40px,6vw,96px)] font-extrabold leading-[0.95] tracking-[-0.04em] text-black mt-5">
            {t('agentLanding.featuresHeadline')}
            <br />
            <span style={gradientText}>{t('agentLanding.featuresHeadline2')}</span>
          </h2>
          <p className="text-[16px] md:text-[18px] text-[#4a4a4a] mt-5 leading-[1.55]">
            {t('agentLanding.featuresSub')}
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-5 mt-16 md:mt-20">
          {FEATURES.map((f) => (
            <div
              key={f.titleKey}
              className="relative bg-white border-2 border-[#E5E5E5] rounded-3xl p-7 cursor-default transition-all duration-300 hover:-translate-y-1 hover:border-[#2563EB] hover:shadow-[0_20px_50px_rgba(37,99,235,0.10)]"
            >
              <span
                className={
                  f.badge === 'unique'
                    ? 'absolute top-5 right-5 px-2 py-1 rounded-full text-[9px] font-bold tracking-[0.10em] uppercase bg-[#EFF6FF] text-[#1E40AF]'
                    : 'absolute top-5 right-5 px-2 py-1 rounded-full text-[9px] font-bold tracking-[0.10em] uppercase bg-[#ECFDF5] text-[#065F46]'
                }
              >
                {f.badge === 'unique' ? t('agentLanding.badgeUnique') || 'Unique' : t('agentLanding.badgeAutomated') || 'Automated'}
              </span>
              <div className="w-12 h-12 rounded-2xl bg-[#EFF6FF] flex items-center justify-center text-[#2563EB] mb-5">
                <Icon icon={f.icon} size={24} />
              </div>
              <h3 className="text-[18px] font-extrabold text-black tracking-[-0.02em] leading-tight">
                {t(f.titleKey)}
              </h3>
              <p className="text-[14px] font-normal text-[#4a4a4a] mt-2 leading-[1.55]">
                {t(f.bodyKey)}
              </p>
            </div>
          ))}
        </div>
      </section>

      {/* ─── COMPARISON ─── */}
      <section className="bg-[#F9FAFB] py-[100px] md:py-[140px] px-6 md:px-8 border-y border-[#E5E5E5]">
        <div className="max-w-[1280px] mx-auto">
          <div className="text-center max-w-[720px] mx-auto">
            <div className="inline-flex items-center gap-2.5 px-4 py-2 bg-[#EFF6FF] border border-[#2563EB]/20 rounded-full text-[11px] font-bold tracking-[0.06em] uppercase text-[#1E40AF]">
              {t('agentLanding.compareEyebrow') || 'The full picture'}
            </div>
            <h2 className="text-[clamp(40px,6vw,96px)] font-extrabold leading-[0.95] tracking-[-0.04em] text-black mt-5">
              {t('agentLanding.compareHeadline')}
              <br />
              <span style={gradientText}>{t('agentLanding.compareHeadline2')}</span>
            </h2>
            <p className="text-[16px] md:text-[18px] text-[#4a4a4a] mt-5 leading-[1.55]">
              {t('agentLanding.compareBody')}
            </p>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mt-16 md:mt-20">
            {/* LEFT — Other portals */}
            <div className="bg-white border border-[#E5E5E5] rounded-3xl p-8">
              <div className="flex items-center gap-3 mb-6 pb-5 border-b border-[#E5E5E5]">
                <Icon icon="solar:close-circle-linear" size={24} color="#6a6a6a" />
                <div className="text-[16px] font-bold text-[#0a0f1e]">REA / Domain / PropertyMe</div>
              </div>
              {CON_KEYS.map((k) => (
                <div
                  key={k}
                  className="flex items-start gap-3 py-3 border-b border-[#F3F4F6] last:border-0 text-[14px] text-[#6a6a6a]"
                >
                  <span className="mt-0.5 flex-shrink-0">
                    <Icon icon="solar:close-circle-linear" size={16} color="#F87171" />
                  </span>
                  <span>{t(k)}</span>
                </div>
              ))}
            </div>

            {/* RIGHT — ListHQ */}
            <div className="relative bg-white border-2 border-[#2563EB] rounded-3xl p-8 shadow-[0_20px_50px_rgba(37,99,235,0.10)]">
              <span
                className="absolute -top-3 right-6 px-3 py-1 rounded-full text-white text-[10px] font-bold tracking-[0.10em] uppercase"
                style={{ background: GRAD }}
              >
                Most chosen
              </span>
              <div className="flex items-center gap-3 mb-6 pb-5 border-b border-[#E5E5E5]">
                <Icon icon="solar:check-circle-linear" size={24} color="#2563EB" />
                <div className="text-[16px] font-bold text-[#0a0f1e]">ListHQ</div>
              </div>
              {PRO_KEYS.map((k) => (
                <div
                  key={k}
                  className="flex items-start gap-3 py-3 border-b border-[#F3F4F6] last:border-0 text-[14px] text-[#0a0f1e] font-medium"
                >
                  <span className="mt-0.5 flex-shrink-0">
                    <Icon icon="solar:check-circle-bold" size={16} color="#2563EB" />
                  </span>
                  <span>{t(k)}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* ─── FOUNDING CALLOUT ─── */}
      <section className="bg-white px-6 md:px-8 pt-[100px] md:pt-[140px]">
        <div className="bg-[#EFF6FF] border border-[#2563EB]/15 rounded-3xl p-8 md:p-10 max-w-[900px] mx-auto">
          <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full text-[10px] font-bold tracking-[0.10em] uppercase text-white" style={{ background: GRAD }}>
            FOUNDING 100 OFFER
          </div>
          <h3 className="text-[clamp(28px,4vw,42px)] font-extrabold leading-[1.05] tracking-[-0.03em] text-black mt-4">
            Lock in 30% lower pricing for 24 months.
          </h3>
          <p className="text-[15px] md:text-[16px] text-[#4a4a4a] mt-3 leading-[1.55] max-w-[640px]">
            First 100 paying agents get founding rates. Once they're gone, public pricing applies.
          </p>
          <button
            type="button"
            onClick={() => setShowModal(true)}
            className="mt-6 inline-flex items-center gap-2 px-7 py-3.5 bg-black text-white rounded-full text-[14px] font-bold hover:-translate-y-0.5 transition-all"
          >
            Reserve your founding spot
            <ArrowRight size={16} strokeWidth={2.2} />
          </button>
        </div>
      </section>

      {/* ─── SEE PRICING CTA ─── */}
      <section className="bg-white px-6 md:px-8 py-[80px] md:py-[120px]">
        <div className="max-w-[720px] mx-auto text-center">
          <h3 className="text-[clamp(28px,3.4vw,40px)] font-extrabold leading-[1.05] tracking-[-0.03em] text-black">
            See full pricing
          </h3>
          <p className="text-[15px] md:text-[16px] text-[#4a4a4a] mt-3 leading-[1.55]">
            Solo, Agency, and Agency Pro tiers. Founding rates locked for 24 months.
          </p>
          <button
            type="button"
            onClick={() => navigate('/for-agents/pricing')}
            className="mt-7 inline-flex items-center gap-2 text-white font-bold hover:-translate-y-0.5 transition-all"
            style={{ background: GRAD, padding: '16px 28px', borderRadius: 14, fontSize: 15 }}
          >
            See pricing
            <ArrowRight size={16} strokeWidth={2.2} />
          </button>
        </div>
      </section>

      {/* ─── FINAL CTA (reused from homepage) ─── */}
      <FinalCTA />

      <AgentRegistrationModal open={showModal} onOpenChange={setShowModal} />
    </div>
  );
}
