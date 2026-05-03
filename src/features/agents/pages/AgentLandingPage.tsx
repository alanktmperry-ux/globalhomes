import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { SEO } from '@/shared/components/SEO';
import AgentRegistrationModal from '@/features/agents/components/AgentRegistrationModal';

const features = [
  {
    num: '01',
    icon: '🔮',
    tag: { text: 'Unique to ListHQ', color: 'blue' as const },
    title: 'Halo Board',
    body: 'Buyers post structured intent briefs — suburbs, budget, finance status, must-haves, preferred language. You browse live, see who\'s serious, and unlock full contact details with credits. Access buyers before they look at a single listing.',
    highlight: true,
  },
  {
    num: '02',
    icon: '🤖',
    tag: { text: 'Automated', color: 'blue' as const },
    title: 'AI Buyer Concierge',
    body: 'The platform matches your listings to buyers automatically — from their voice searches, saved criteria, and Halos. Qualified leads arrive in your inbox while you\'re at an open home. No cold outreach required.',
    highlight: true,
  },
  {
    num: '03',
    icon: '🌐',
    tag: null,
    title: '20-language auto-translation',
    body: 'Every listing is translated into Mandarin, Vietnamese, Hindi, Arabic, Tagalog and 15 more languages the moment it goes live. Reach 1.2 million multilingual buyers that REA and Domain simply cannot serve.',
    highlight: false,
  },
  {
    num: '04',
    icon: '🤫',
    tag: null,
    title: 'Pocket listings',
    body: 'List without a public days-on-market counter. Tell your vendor: "We\'ll test the market privately first." No price history, no stigma if you adjust. A genuine edge in your next listing presentation.',
    highlight: false,
  },
  {
    num: '05',
    icon: '🎤',
    tag: null,
    title: 'Voice-qualified leads',
    body: 'Every enquiry arrives with a voice transcript in the buyer\'s own language. You know their budget, timeline, and must-haves before you pick up the phone. No more tyre kickers disguised as hot leads.',
    highlight: false,
  },
  {
    num: '06',
    icon: '⚡',
    tag: null,
    title: '14-day exclusive window',
    body: 'Your listings reach the platform\'s premium buyer members 14 days before they go to any other portal. These buyers pay $29/month for early access — the highest-intent audience on the market.',
    highlight: false,
  },
  {
    num: '07',
    icon: '📊',
    tag: null,
    title: 'Lead pipeline CRM',
    body: 'Enquiries, open home sign-ins, and EOIs auto-sync into a Kanban board with urgency scoring. No manual entry, no spreadsheets. Your entire pipeline visible in one place — no third-party CRM needed.',
    highlight: false,
  },
  {
    num: '08',
    icon: '🏦',
    tag: null,
    title: 'Trust accounting + rent roll',
    body: 'Full Australian trust accounting, bank reconciliation, ledgers, owner statements, arrears, and a complete rent roll — all built in. Migrate your data from PropertyMe, Console Cloud, or Reapit via CSV. No extra software needed.',
    highlight: false,
  },
];

const themItems = [
  'English-only buyer pool — multilingual buyers go unserved',
  'Wait for buyers to find you — no reverse discovery',
  'Public days-on-market on every listing',
  'No lead transcripts — cold calls to qualify every enquiry',
  'Trust accounting is a separate $200–500/month subscription',
  'CRM is a separate subscription, updated manually',
  'Rent roll in a separate PM platform',
];

const usItems = [
  '1.2M multilingual buyers across 20 languages',
  'Halo Board — buyers come to you before they browse',
  'Pocket listings — no public counter, no stigma',
  'Voice transcript with every enquiry, in their language',
  'Trust accounting built in — no extra subscription',
  'CRM auto-synced from all enquiries and open homes',
  'Full rent roll and PM tools included',
];

const pricingItems = [
  'Unlimited listings — sale and rental',
  '20-language AI translation',
  'Halo Board access',
  'Lead pipeline CRM',
  'Trust accounting + rent roll',
  'Multilingual buyer pool access',
];

const AgentLandingPage = () => {
  const [showModal, setShowModal] = useState(false);
  const navigate = useNavigate();

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
        {/* Glow blobs */}
        <div className="pointer-events-none absolute -top-48 -right-36 w-[650px] h-[650px] rounded-full"
          style={{ background: 'radial-gradient(circle, rgba(59,91,219,0.18) 0%, transparent 70%)' }} />
        <div className="pointer-events-none absolute -bottom-24 -left-24 w-[500px] h-[500px] rounded-full"
          style={{ background: 'radial-gradient(circle, rgba(6,182,212,0.1) 0%, transparent 70%)' }} />

        <div className="relative z-10 max-w-2xl">
          {/* Eyebrow */}
          <div className="inline-flex items-center gap-2 mb-8 px-4 py-1.5 rounded-full text-xs font-bold tracking-widest uppercase"
            style={{ background: 'rgba(59,91,219,0.2)', border: '1px solid rgba(59,91,219,0.4)', color: '#93c5fd', letterSpacing: '1.2px' }}>
            <span className="w-1.5 h-1.5 rounded-full bg-blue-400 animate-pulse" />
            For agents
          </div>

          {/* H1 */}
          <h1 className="text-5xl md:text-[62px] font-black leading-[1.04] tracking-tight mb-6 text-white">
            Find your next buyer<br />
            <span style={{ color: '#60a5fa' }}>before they find a listing.</span>
          </h1>

          {/* Body */}
          <p className="text-lg md:text-xl mb-10 leading-relaxed max-w-lg" style={{ color: '#94a3b8' }}>
            ListHQ is a complete business platform built for Australian agents —{' '}
            <strong style={{ color: '#e2e8f0', fontWeight: 600 }}>
              Halo Board, AI buyer matching, 20-language auto-translation, trust accounting, and a CRM that runs itself.
            </strong>{' '}
            Everything you need. One subscription.
          </p>

          {/* Stats */}
          <div className="flex flex-wrap gap-3 mb-10">
            {[
              { n: '1.2M+', l: 'Multilingual buyers\nno other portal reaches' },
              { n: '20', l: 'Languages, every\nlisting auto-translated' },
              { n: '3 mo.', l: 'Free trial, no\ncredit card' },
            ].map((s) => (
              <div key={s.n} className="text-center px-5 py-4 rounded-2xl min-w-[110px]"
                style={{ background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.12)' }}>
                <div className="text-2xl font-black mb-1" style={{ color: '#60a5fa' }}>{s.n}</div>
                <div className="text-xs leading-tight whitespace-pre-line" style={{ color: '#64748b' }}>{s.l}</div>
              </div>
            ))}
          </div>

          {/* CTAs */}
          <div className="flex flex-col gap-3">
            <div className="flex flex-wrap items-center gap-3">
              <button
                onClick={() => setShowModal(true)}
                className="inline-flex items-center gap-2 px-8 py-4 rounded-full text-white font-bold text-base transition-all hover:scale-[1.02]"
                style={{ background: '#3b5bdb', boxShadow: '0 0 40px rgba(59,91,219,0.4)' }}
              >
                Start free trial — 3 months free →
              </button>
              <button
                onClick={() => navigate('/agents/login')}
                className="inline-flex items-center gap-2 px-7 py-4 rounded-full text-base font-semibold transition-colors"
                style={{ background: 'rgba(255,255,255,0.07)', border: '1px solid rgba(255,255,255,0.18)', color: '#cbd5e1' }}
              >
                🔒 Login to your account
              </button>
            </div>
            <p className="text-xs" style={{ color: '#475569' }}>
              <strong style={{ color: '#64748b' }}>No credit card required.</strong> Full access from day one. Cancel anytime.
            </p>
          </div>
        </div>
      </section>

      {/* ── FEATURES ── */}
      <section className="py-20 px-6 md:px-16" style={{ background: '#f8faff' }}>
        <div className="max-w-5xl mx-auto">
          <p className="text-xs font-bold uppercase tracking-widest mb-3" style={{ color: '#3b5bdb', letterSpacing: '1.5px' }}>
            What ListHQ does
          </p>
          <h2 className="text-3xl md:text-4xl font-black tracking-tight mb-4" style={{ color: '#0f172a', lineHeight: 1.1 }}>
            Your whole business.<br />One platform.
          </h2>
          <p className="text-base mb-14 max-w-xl leading-relaxed" style={{ color: '#64748b' }}>
            Eight capabilities that agents tell us changed the way they work — in the order they actually changed their business.
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
                {f.tag && (
                  <span className="inline-flex items-center mb-3 px-2 py-0.5 rounded text-[9px] font-black uppercase tracking-wider"
                    style={{ background: '#eff6ff', border: '1px solid #bfdbfe', color: '#1e40af', letterSpacing: '0.5px' }}>
                    {f.tag.text}
                  </span>
                )}
                <span className="block text-3xl mb-4">{f.icon}</span>
                <h3 className="text-base font-black mb-2" style={{ color: f.highlight ? '#1e3a8a' : '#0f172a', fontSize: '17px' }}>
                  {f.title}
                </h3>
                <p className="text-sm leading-relaxed" style={{ color: f.highlight ? '#475569' : '#64748b', lineHeight: '1.65' }}>
                  {f.body}
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
            The full picture
          </p>
          <h2 className="text-3xl font-black tracking-tight mb-4 text-white leading-tight">
            A portal gives you a listing page.<br />
            ListHQ runs your business.
          </h2>
          <p className="text-sm mb-12 max-w-lg leading-relaxed" style={{ color: '#64748b' }}>
            Most agents are paying for a listing portal, a CRM, and a trust accounting package separately. ListHQ replaces all three — and adds tools none of them have.
          </p>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Them */}
            <div className="rounded-[18px] p-7"
              style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.07)' }}>
              <p className="text-xs font-bold uppercase tracking-wider mb-5" style={{ color: '#475569', letterSpacing: '1px' }}>
                Typical agent stack
              </p>
              {themItems.map((item) => (
                <div key={item} className="flex items-start gap-3 mb-4 text-sm leading-snug" style={{ color: '#64748b' }}>
                  <span className="shrink-0 mt-0.5">✗</span>
                  {item}
                </div>
              ))}
            </div>
            {/* Us */}
            <div className="rounded-[18px] p-7"
              style={{ background: 'rgba(59,91,219,0.15)', border: '1px solid rgba(59,91,219,0.3)' }}>
              <p className="text-xs font-bold uppercase tracking-wider mb-5" style={{ color: '#93c5fd', letterSpacing: '1px' }}>
                ListHQ
              </p>
              {usItems.map((item) => (
                <div key={item} className="flex items-start gap-3 mb-4 text-sm leading-snug" style={{ color: '#e2e8f0' }}>
                  <span className="shrink-0 mt-0.5">✓</span>
                  {item}
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* ── PRICING ── */}
      <section className="py-20 px-6 text-center" style={{ background: '#f8faff' }}>
        <div className="max-w-lg mx-auto">
          <p className="text-xs font-bold uppercase tracking-widest mb-4" style={{ color: '#3b5bdb', letterSpacing: '1.5px' }}>
            Pricing
          </p>
          <div className="font-black tracking-tight mb-2" style={{ color: '#0f172a', fontSize: '42px', letterSpacing: '-1.5px' }}>
            Free
            <span className="block font-black" style={{ color: '#3b5bdb', fontSize: '26px', marginTop: '4px' }}>
              for 3 months
            </span>
          </div>
          <p className="text-sm mb-9" style={{ color: '#64748b' }}>
            No credit card required. Full access from day one. Cancel anytime.
          </p>
          <div className="flex flex-col gap-3 mb-9 text-left max-w-xs mx-auto">
            {pricingItems.map((item) => (
              <div key={item} className="flex items-center gap-3 text-sm" style={{ color: '#334155' }}>
                <span className="font-bold text-base" style={{ color: '#10b981' }}>✓</span>
                {item}
              </div>
            ))}
          </div>
          <button
            onClick={() => setShowModal(true)}
            className="inline-flex items-center gap-2 px-8 py-4 rounded-full text-white font-bold text-base transition-all hover:scale-[1.02]"
            style={{ background: '#3b5bdb', boxShadow: '0 4px 20px rgba(59,91,219,0.3)' }}
          >
            Start free trial →
          </button>
        </div>
      </section>

      {/* ── LOGIN ── */}
      <section className="py-10 px-6 text-center" style={{ background: 'white', borderTop: '1px solid #e2e8f0' }}>
        <p className="text-sm mb-4" style={{ color: '#64748b' }}>Already have an account?</p>
        <button
          onClick={() => navigate('/agents/login')}
          className="inline-flex items-center gap-2 px-7 py-3.5 rounded-full text-sm font-semibold transition-colors hover:bg-slate-50"
          style={{ background: 'white', border: '1.5px solid #e2e8f0', color: '#334155' }}
        >
          🔒 Login to your agency
        </button>
        <p className="mt-4 text-xs" style={{ color: '#94a3b8' }}>
          Trust accounting partner?{' '}
          <button onClick={() => navigate('/partner/login')} className="font-semibold" style={{ color: '#3b5bdb', background: 'none', border: 'none', cursor: 'pointer' }}>
            Partner portal →
          </button>
        </p>
      </section>

      <AgentRegistrationModal open={showModal} onOpenChange={setShowModal} />
    </div>
  );
};

export default AgentLandingPage;
