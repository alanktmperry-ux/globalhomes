import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { SEO } from '@/shared/components/SEO';
import AgentRegistrationModal from '@/features/agents/components/AgentRegistrationModal';
import { useTranslation } from '@/shared/lib/i18n/useTranslation';

const AgentLandingPage = () => {
  const [showModal, setShowModal] = useState(false);
  const navigate = useNavigate();
  const { t } = useTranslation();

  const features: Array<{ num: string; icon: string; tagKey: string | null; titleKey: string; bodyKey: string; highlight: boolean }> = [
    { num: '01', icon: '🔮', tagKey: 'agentLanding.badgeUnique', titleKey: 'agentLanding.feature1Title', bodyKey: 'agentLanding.feature1Body', highlight: true },
    { num: '02', icon: '🤖', tagKey: 'agentLanding.badgeAutomated', titleKey: 'agentLanding.feature2Title', bodyKey: 'agentLanding.feature2Body', highlight: true },
    { num: '03', icon: '🌐', tagKey: null, titleKey: 'agentLanding.feature3Title', bodyKey: 'agentLanding.feature3Body', highlight: false },
    { num: '04', icon: '🤫', tagKey: null, titleKey: 'agentLanding.feature4Title', bodyKey: 'agentLanding.feature4Body', highlight: false },
    { num: '05', icon: '🎤', tagKey: null, titleKey: 'agentLanding.feature5Title', bodyKey: 'agentLanding.feature5Body', highlight: false },
    { num: '06', icon: '⚡', tagKey: null, titleKey: 'agentLanding.feature6Title', bodyKey: 'agentLanding.feature6Body', highlight: false },
    { num: '07', icon: '📊', tagKey: null, titleKey: 'agentLanding.feature7Title', bodyKey: 'agentLanding.feature7Body', highlight: false },
    { num: '08', icon: '🏦', tagKey: null, titleKey: 'agentLanding.feature8Title', bodyKey: 'agentLanding.feature8Body', highlight: false },
  ];

  const themKeys = ['agentLanding.con1','agentLanding.con2','agentLanding.con3','agentLanding.con4','agentLanding.con5','agentLanding.con6','agentLanding.con7'];
  const usKeys = ['agentLanding.pro1','agentLanding.pro2','agentLanding.pro3','agentLanding.pro4','agentLanding.pro5','agentLanding.pro6','agentLanding.pro7'];
  const pricingKeys = ['agentLanding.tableRow1','agentLanding.tableRow2','agentLanding.tableRow3','agentLanding.tableRow4','agentLanding.tableRow5','agentLanding.tableRow6'];

  return (
    <div className="min-h-screen overflow-x-hidden" style={{ background: '#0f172a', color: 'white' }}>
      <SEO
        title="Real Estate Agent Software Australia | ListHQ"
        description="Halo Board, AI buyer matching, 20-language translation, trust accounting, and CRM — built for Australian agents."
        path="/for-agents"
      />

      {/* ── HERO ── */}
      <section
        className="relative min-h-screen flex items-center px-6 md:px-16 py-24 overflow-hidden"
        style={{ background: 'linear-gradient(135deg, #0f172a 0%, #1e1b4b 60%, #0f172a 100%)' }}
      >
        <div className="pointer-events-none absolute -top-48 -right-36 w-[650px] h-[650px] rounded-full"
          style={{ background: 'radial-gradient(circle, rgba(59,91,219,0.18) 0%, transparent 70%)' }} />
        <div className="pointer-events-none absolute -bottom-24 -left-24 w-[500px] h-[500px] rounded-full"
          style={{ background: 'radial-gradient(circle, rgba(6,182,212,0.1) 0%, transparent 70%)' }} />

        <div className="relative z-10 max-w-2xl">
          <div className="inline-flex items-center gap-2 mb-8 px-4 py-1.5 rounded-full text-xs font-bold tracking-widest uppercase"
            style={{ background: 'rgba(59,91,219,0.2)', border: '1px solid rgba(59,91,219,0.4)', color: '#93c5fd', letterSpacing: '1.2px' }}>
            <span className="w-1.5 h-1.5 rounded-full bg-blue-400 animate-pulse" />
            {t('agentLanding.eyebrow')}
          </div>

          <h1 className="text-5xl md:text-[62px] font-black leading-[1.04] tracking-tight mb-6 text-white">
            {t('agentLanding.headline')}<br />
            <span style={{ color: '#60a5fa' }}>{t('agentLanding.headlineSub')}</span>
          </h1>

          <p className="text-lg md:text-xl mb-10 leading-relaxed max-w-lg" style={{ color: '#94a3b8' }}>
            {t('agentLanding.body')}
          </p>

          <div className="flex flex-wrap gap-3 mb-10">
            {[
              { n: '1.2M+', l: t('agentLanding.stat1Label') },
              { n: '20', l: t('agentLanding.stat2Label') },
              { n: '3 mo.', l: t('agentLanding.stat3Label') },
            ].map((s) => (
              <div key={s.n} className="text-center px-5 py-4 rounded-2xl min-w-[110px]"
                style={{ background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.12)' }}>
                <div className="text-2xl font-black mb-1" style={{ color: '#60a5fa' }}>{s.n}</div>
                <div className="text-xs leading-tight whitespace-pre-line" style={{ color: '#64748b' }}>{s.l}</div>
              </div>
            ))}
          </div>

          <div className="flex flex-col gap-3">
            <div className="flex flex-wrap items-center gap-3">
              <button
                onClick={() => setShowModal(true)}
                className="inline-flex items-center gap-2 px-8 py-4 rounded-full text-white font-bold text-base transition-all hover:scale-[1.02]"
                style={{ background: '#3b5bdb', boxShadow: '0 0 40px rgba(59,91,219,0.4)' }}
              >
                {t('agentLanding.ctaPrimary')}
              </button>
              <button
                onClick={() => navigate('/agents/login')}
                className="inline-flex items-center gap-2 px-7 py-4 rounded-full text-base font-semibold transition-colors"
                style={{ background: 'rgba(255,255,255,0.07)', border: '1px solid rgba(255,255,255,0.18)', color: '#cbd5e1' }}
              >
                {t('agentLanding.ctaLogin')}
              </button>
            </div>
            <p className="text-xs" style={{ color: '#475569' }}>
              {t('agentLanding.disclaimer')}
            </p>
          </div>
        </div>
      </section>

      {/* ── FEATURES ── */}
      <section className="py-20 px-6 md:px-16" style={{ background: '#f8faff' }}>
        <div className="max-w-5xl mx-auto">
          <p className="text-xs font-bold uppercase tracking-widest mb-3" style={{ color: '#3b5bdb', letterSpacing: '1.5px' }}>
            {t('agentLanding.featuresEyebrow')}
          </p>
          <h2 className="text-3xl md:text-4xl font-black tracking-tight mb-4" style={{ color: '#0f172a', lineHeight: 1.1 }}>
            {t('agentLanding.featuresHeadline')}<br />{t('agentLanding.featuresHeadline2')}
          </h2>
          <p className="text-base mb-14 max-w-xl leading-relaxed" style={{ color: '#64748b' }}>
            {t('agentLanding.featuresSub')}
          </p>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            {features.map((f) => (
              <div
                key={f.num}
                className="relative rounded-[22px] p-8"
                style={f.highlight
                  ? { background: 'linear-gradient(135deg, #eff6ff, #f8faff)', border: '1px solid #bfdbfe' }
                  : { background: 'white', border: '1px solid #e2e8f0', boxShadow: '0 1px 4px rgba(0,0,0,0.04)' }
                }
              >
                <span className="absolute top-5 right-6 text-xs font-black tracking-wider"
                  style={{ color: f.highlight ? '#93c5fd' : '#cbd5e1' }}>
                  {f.num}
                </span>
                {f.tagKey && (
                  <span className="inline-flex items-center mb-3 px-2 py-0.5 rounded text-[9px] font-black uppercase tracking-wider"
                    style={{ background: '#eff6ff', border: '1px solid #bfdbfe', color: '#1e40af', letterSpacing: '0.5px' }}>
                    {t(f.tagKey)}
                  </span>
                )}
                <span className="block text-3xl mb-4">{f.icon}</span>
                <h3 className="text-base font-black mb-2" style={{ color: f.highlight ? '#1e3a8a' : '#0f172a', fontSize: '17px' }}>
                  {t(f.titleKey)}
                </h3>
                <p className="text-sm leading-relaxed" style={{ color: f.highlight ? '#475569' : '#64748b', lineHeight: '1.65' }}>
                  {t(f.bodyKey)}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── COMPARISON ── */}
      <section className="py-20 px-6 md:px-16" style={{ background: '#0f172a' }}>
        <div className="max-w-4xl mx-auto">
          <p className="text-xs font-bold uppercase tracking-widest mb-3" style={{ color: '#60a5fa', letterSpacing: '1.5px' }}>
            {t('agentLanding.compareEyebrow')}
          </p>
          <h2 className="text-3xl font-black tracking-tight mb-4 text-white leading-tight">
            {t('agentLanding.compareHeadline')}<br />
            {t('agentLanding.compareHeadline2')}
          </h2>
          <p className="text-sm mb-12 max-w-lg leading-relaxed" style={{ color: '#64748b' }}>
            {t('agentLanding.compareBody')}
          </p>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="rounded-[18px] p-7"
              style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.07)' }}>
              <p className="text-xs font-bold uppercase tracking-wider mb-5" style={{ color: '#475569', letterSpacing: '1px' }}>
                {t('agentLanding.compareCol1')}
              </p>
              {themKeys.map((k) => (
                <div key={k} className="flex items-start gap-3 mb-4 text-sm leading-snug" style={{ color: '#64748b' }}>
                  <span className="shrink-0 mt-0.5">✗</span>
                  {t(k)}
                </div>
              ))}
            </div>
            <div className="rounded-[18px] p-7"
              style={{ background: 'rgba(59,91,219,0.15)', border: '1px solid rgba(59,91,219,0.3)' }}>
              <p className="text-xs font-bold uppercase tracking-wider mb-5" style={{ color: '#93c5fd', letterSpacing: '1px' }}>
                ListHQ
              </p>
              {usKeys.map((k) => (
                <div key={k} className="flex items-start gap-3 mb-4 text-sm leading-snug" style={{ color: '#e2e8f0' }}>
                  <span className="shrink-0 mt-0.5">✓</span>
                  {t(k)}
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* ── PRICING ── */}
      <section className="py-20 px-6" style={{ background: '#f8faff' }}>
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-10">
            <p className="text-xs font-bold uppercase tracking-widest mb-3" style={{ color: '#2563EB', letterSpacing: '1.5px' }}>
              Pricing — no contracts, cancel anytime
            </p>
            <h2 className="font-black tracking-tight" style={{ color: '#0a0f1e', fontSize: '38px', letterSpacing: '-1.5px' }}>
              Built for the way you work.
            </h2>
            <p className="mt-3 text-sm" style={{ color: '#6B7280' }}>
              All plans include 20 languages · trust accounting · AI matching
            </p>
          </div>

          {/* Value prop callout */}
          <div className="mx-auto mb-10" style={{ maxWidth: 760, background: '#EFF6FF', border: '1px solid #DBEAFE', borderRadius: 16, padding: '20px 24px' }}>
            <div className="font-extrabold mb-1.5" style={{ color: '#0a0f1e', fontSize: 15 }}>
              Why $799/mo is a no-brainer for agents
            </div>
            <p className="text-sm" style={{ color: '#374151', lineHeight: 1.55 }}>
              REA.com.au and Domain charge $1,500–$7,000 per listing. A CRM costs $300–$600/mo. Property management software another $200–$400/mo. ListHQ replaces all three — CRM, PM platform, and multilingual listing portal — in one subscription, reaching 7M+ multilingual buyers no other portal can find.
            </p>
          </div>

          <div className="grid gap-4" style={{ gridTemplateColumns: 'repeat(3, 1fr)' }}>
            {[
              { name: 'Solo', price: '$799/mo', desc: 'Independent agents running their own shop',
                feats: ['1 agent seat · up to 10 active listings','Full CRM — pipeline, contacts, deal tracking','Full trust accounting (complete ledger)','20-language auto-translation on every listing','AI buyer matching + voice search','Halo™ buyer matching board','Email support'],
                cta: 'Start 30-day free trial →', sub: 'Credit card required · auto-charges $799 on day 31 · cancel anytime',
                action: () => setShowModal(true), filled: true, popular: false },
              { name: 'Agency', price: '$1,999/mo', desc: 'For growing agencies ready to scale',
                feats: ['Up to 5 agent seats','Unlimited listings','Full CRM for the whole team','Full PM automation + trust accounting','20-language auto-translation','Priority AI matching + lead analytics','Agency-branded profile page','Phone & email support'],
                cta: 'Book a demo →', sub: 'No free trial · talk to us first · onboarding included',
                action: () => navigate('/contact'), filled: true, popular: true },
              { name: 'Agency Pro', price: '$3,499/mo', desc: 'Established multi-office agencies',
                feats: ['Up to 15 agent seats','Unlimited everything','Full PM automation + trust accounting','Multi-branch dashboard','White-label option','API access + custom integrations','Dedicated account manager'],
                cta: 'Talk to sales →', sub: 'Custom onboarding · SLA available',
                action: () => navigate('/contact'), filled: false, popular: false },
            ].map((p) => (
              <div key={p.name} style={{
                background: p.popular ? '#F8FBFF' : '#fff',
                border: `${p.popular ? 2 : 1.5}px solid ${p.popular ? '#2563EB' : '#E5E7EB'}`,
                borderRadius: 20, padding: '32px 28px', position: 'relative',
                boxShadow: p.popular ? '0 8px 28px rgba(37,99,235,.12)' : 'none',
              }}>
                {p.popular && (
                  <div style={{ position: 'absolute', top: -12, right: 20, background: '#2563EB', color: '#fff', fontSize: 10, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '.08em', padding: '5px 12px', borderRadius: 100 }}>
                    Most popular
                  </div>
                )}
                <div style={{ fontSize: 12, fontWeight: 700, color: '#6B7280', textTransform: 'uppercase', letterSpacing: '.08em', marginBottom: 12 }}>{p.name}</div>
                <div style={{ fontSize: 36, fontWeight: 800, color: '#0a0f1e', letterSpacing: '-1px', marginBottom: 8 }}>{p.price}</div>
                <p style={{ fontSize: 13, color: '#6B7280', margin: '0 0 20px', lineHeight: 1.5 }}>{p.desc}</p>
                <ul style={{ listStyle: 'none', padding: 0, margin: '0 0 22px' }}>
                  {p.feats.map((f) => (
                    <li key={f} style={{ display: 'flex', gap: 10, alignItems: 'flex-start', fontSize: 13.5, color: '#374151', padding: '6px 0' }}>
                      <span style={{ color: '#2563EB', fontWeight: 700, flexShrink: 0 }}>✓</span>{f}
                    </li>
                  ))}
                </ul>
                <button onClick={p.action} style={{
                  width: '100%', padding: '12px 18px', borderRadius: 12, fontSize: 14, fontWeight: 700, cursor: 'pointer',
                  background: p.filled ? '#2563EB' : 'transparent',
                  color: p.filled ? '#fff' : '#2563EB',
                  border: p.filled ? 'none' : '1.5px solid #2563EB',
                }}>{p.cta}</button>
                <p style={{ fontSize: 11.5, color: '#6B7280', margin: '10px 0 0', lineHeight: 1.45, textAlign: 'center' }}>{p.sub}</p>
              </div>
            ))}
          </div>
        </div>
        <style>{`@media (max-width:880px){section .grid{grid-template-columns:1fr !important;max-width:420px;margin:0 auto}}`}</style>
      </section>

      {/* ── LOGIN ── */}
      <section className="py-10 px-6 text-center" style={{ background: 'white', borderTop: '1px solid #e2e8f0' }}>
        <p className="text-sm mb-4" style={{ color: '#64748b' }}>{t('agentLanding.pricingLogin')}</p>
        <button
          onClick={() => navigate('/agents/login')}
          className="inline-flex items-center gap-2 px-7 py-3.5 rounded-full text-sm font-semibold transition-colors hover:bg-slate-50"
          style={{ background: 'white', border: '1.5px solid #e2e8f0', color: '#334155' }}
        >
          {t('agentLanding.pricingLoginCta')}
        </button>
        <p className="mt-4 text-xs" style={{ color: '#94a3b8' }}>
          {t('agentLanding.partnerLabel')}{' '}
          <button onClick={() => navigate('/partner/login')} className="font-semibold" style={{ color: '#3b5bdb', background: 'none', border: 'none', cursor: 'pointer' }}>
            {t('agentLanding.partnerCta')}
          </button>
        </p>
      </section>

      <AgentRegistrationModal open={showModal} onOpenChange={setShowModal} />
    </div>
  );
};

export default AgentLandingPage;
