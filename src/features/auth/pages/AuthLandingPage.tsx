import { motion } from 'framer-motion';
import { useNavigate, Link, useSearchParams } from 'react-router-dom';
import { Helmet } from 'react-helmet-async';
import { useState, useEffect } from 'react';
import { X } from 'lucide-react';

const buyerChips = [
  { icon: '🔮', title: 'Post a Halo', desc: 'Tell agents what you want — they come to you', top: true },
  { icon: '🎤', title: 'Voice search', desc: 'Speak in 24 languages', top: true },
  { icon: '🌐', title: 'Listings in your language', desc: 'Every property auto-translated', top: false },
  { icon: '💱', title: 'Prices in your currency', desc: 'Live conversion, 20+ currencies', top: false },
  { icon: '🛡️', title: 'Rental bond guarantee', desc: 'No 4-week bond upfront — from $8/week', top: false },
  { icon: '🏦', title: 'Multilingual brokers', desc: 'Finance help in your language, free', top: false },
];

const agentChips = [
  { icon: '🔮', title: 'Halo Board', desc: 'See buyers before they look at a listing', top: true },
  { icon: '🤖', title: 'AI Buyer Concierge', desc: 'Matched leads arrive automatically', top: true },
  { icon: '🌐', title: '20-language translation', desc: 'Reach 1.2M buyers no other portal reaches', top: false },
  { icon: '🤫', title: 'Pocket listings', desc: 'No public days-on-market counter', top: false },
  { icon: '🎤', title: 'Voice-qualified leads', desc: 'Transcript with every enquiry', top: false },
  { icon: '⚡', title: '14-day exclusive window', desc: 'Your listing, before any other portal', top: false },
  { icon: '📊', title: 'Lead pipeline CRM', desc: 'Enquiries auto-sync into Kanban', top: false },
  { icon: '🏦', title: 'Built-in trust accounting', desc: 'Migrate from PropertyMe in one step', top: false },
];

const AuthLandingPage = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const errorParam = searchParams.get('error');
  const [showError, setShowError] = useState(false);

  useEffect(() => {
    setShowError(!!errorParam);
  }, [errorParam]);

  const errorMessage =
    errorParam === 'oauth_failed'
      ? 'There was a problem signing in. Please try again or use email/password.'
      : errorParam === 'email_not_confirmed'
      ? 'Please check your email and click the confirmation link before signing in.'
      : null;

  const dismissError = () => setShowError(false);

  return (
    <div className="min-h-screen flex flex-col md:flex-row" style={{ background: '#020817' }}>
      <Helmet><title>Sign In — ListHQ</title></Helmet>

      {showError && errorMessage && (
        <div className="fixed top-16 left-1/2 -translate-x-1/2 z-30 max-w-md w-[92%]">
          <div className="flex items-start gap-3 px-4 py-3 rounded-xl bg-destructive/10 border border-destructive/30 text-destructive text-sm shadow-lg backdrop-blur-sm">
            <span className="flex-1">{errorMessage}</span>
            <button onClick={dismissError} className="shrink-0 opacity-70 hover:opacity-100" aria-label="Dismiss">
              <X size={16} />
            </button>
          </div>
        </div>
      )}

      {/* ListHQ wordmark — centred top */}
      <div className="absolute top-6 left-1/2 -translate-x-1/2 z-20 flex items-center gap-2">
        <div className="w-6 h-6 rounded-lg flex items-center justify-center text-[10px] font-bold text-white" style={{ background: 'linear-gradient(135deg, #2563eb, #06b6d4)' }}>L</div>
        <span className="text-sm font-semibold text-white/90 tracking-tight">ListHQ</span>
      </div>

      {/* ── LEFT: Buyer — light ── */}
      <motion.div
        initial={{ opacity: 0, x: -16 }}
        animate={{ opacity: 1, x: 0 }}
        transition={{ duration: 0.55, ease: [0.22, 1, 0.36, 1] }}
        className="flex-1 bg-white flex flex-col justify-center px-10 py-20 relative overflow-hidden"
      >
        <div className="absolute bottom-0 right-0 w-80 h-80 rounded-full pointer-events-none" style={{ background: 'radial-gradient(circle, rgba(59,130,246,0.06) 0%, transparent 70%)' }} />

        <div className="relative z-10 max-w-sm">
          {/* Badge */}
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full border border-slate-200 bg-slate-50 mb-6">
            <span className="w-1.5 h-1.5 rounded-full bg-blue-500" />
            <span className="text-[10px] font-medium tracking-widest uppercase text-slate-500">Find your next home</span>
          </div>

          {/* Headline */}
          <h1 className="text-[42px] font-light text-slate-900 leading-[1.05] mb-2" style={{ letterSpacing: '-2px' }}>
            Find your<br /><strong className="font-semibold">next home.</strong>
          </h1>
          <p className="text-[13px] text-slate-400 mb-6">Tell agents what you want — they find you.</p>

          {/* Buyer chips */}
          <div className="grid grid-cols-2 gap-2 mb-8">
            {buyerChips.map((chip) => (
              <div
                key={chip.title}
                className="rounded-xl px-3 py-2.5"
                style={chip.top
                  ? { background: '#eff6ff', border: '1px solid #bfdbfe' }
                  : { background: '#f8faff', border: '1px solid #e2e8f0' }
                }
              >
                <div className="text-[11px] font-bold mb-0.5" style={{ color: chip.top ? '#1e40af' : '#0f172a' }}>
                  {chip.icon} {chip.title}
                </div>
                <div className="text-[10px] text-slate-400 leading-snug">{chip.desc}</div>
              </div>
            ))}
          </div>

          <div className="flex flex-col gap-2.5">
            <button
              onClick={() => { dismissError(); navigate('/login'); }}
              className="inline-flex items-center justify-center gap-2 px-7 py-3.5 rounded-full bg-slate-900 text-white text-sm font-medium hover:bg-slate-700 transition-colors"
            >
              Sign in or create account →
            </button>
            <button
              onClick={() => navigate('/')}
              className="inline-flex items-center justify-center gap-2 px-6 py-2.5 rounded-full border border-slate-200 text-slate-400 text-xs font-medium hover:bg-slate-50 transition-colors"
            >
              Browse without signing in →
            </button>
          </div>
        </div>
      </motion.div>

      {/* ── RIGHT: Agent — dark ── */}
      <motion.div
        initial={{ opacity: 0, x: 16 }}
        animate={{ opacity: 1, x: 0 }}
        transition={{ duration: 0.55, ease: [0.22, 1, 0.36, 1] }}
        className="flex-1 flex flex-col justify-center px-10 py-20 relative overflow-hidden"
        style={{ background: '#0f172a' }}
      >
        {/* Ambient glows */}
        <div className="absolute -top-24 -right-24 w-[400px] h-[400px] rounded-full pointer-events-none" style={{ background: 'radial-gradient(circle, rgba(59,91,219,0.15) 0%, transparent 70%)' }} />
        <div className="absolute -bottom-16 -left-16 w-[280px] h-[280px] rounded-full pointer-events-none" style={{ background: 'radial-gradient(circle, rgba(6,182,212,0.08) 0%, transparent 70%)' }} />
        <div className="absolute top-0 left-0 bottom-0 w-px hidden md:block" style={{ background: 'linear-gradient(to bottom, transparent, rgba(59,91,219,0.4) 30%, rgba(59,91,219,0.4) 70%, transparent)' }} />

        <div className="relative z-10 max-w-sm">
          {/* Badge */}
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full mb-6" style={{ border: '1px solid rgba(59,91,219,0.4)', background: 'rgba(59,91,219,0.2)' }}>
            <span className="w-1.5 h-1.5 rounded-full bg-blue-400" />
            <span className="text-[10px] font-medium tracking-widest uppercase text-blue-400">Agent Portal</span>
          </div>

          {/* Headline */}
          <h1 className="text-[42px] font-light text-white leading-[1.05] mb-2" style={{ letterSpacing: '-2px' }}>
            Built for agents<br />who move <strong className="font-semibold" style={{ color: '#60a5fa' }}>fast.</strong>
          </h1>
          <p className="text-[13px] mb-6" style={{ color: 'rgba(255,255,255,0.35)' }}>The tools no other portal offers.</p>

          {/* Agent chips */}
          <div className="grid grid-cols-2 gap-2 mb-8">
            {agentChips.map((chip) => (
              <div
                key={chip.title}
                className="rounded-xl px-3 py-2.5"
                style={chip.top
                  ? { background: 'rgba(59,91,219,0.14)', border: '1px solid rgba(59,91,219,0.5)' }
                  : { background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)' }
                }
              >
                <div className="text-[11px] font-bold mb-0.5" style={{ color: chip.top ? '#93c5fd' : '#e2e8f0' }}>
                  {chip.icon} {chip.title}
                </div>
                <div className="text-[10px] leading-snug" style={{ color: '#64748b' }}>{chip.desc}</div>
              </div>
            ))}
          </div>

          <div className="flex flex-col gap-2.5">
            <button
              onClick={() => { dismissError(); navigate('/agents/login'); }}
              className="inline-flex items-center justify-center gap-2 px-7 py-3.5 rounded-full bg-white text-slate-900 text-sm font-medium hover:bg-slate-100 transition-colors"
            >
              🔒 Agent sign in →
            </button>
            <button
              onClick={() => navigate('/for-agents')}
              className="inline-flex items-center justify-center gap-2 px-6 py-2.5 rounded-full text-xs font-medium transition-opacity hover:opacity-70"
              style={{ color: '#60a5fa', background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)' }}
            >
              See everything on ListHQ →
            </button>
          </div>
        </div>
      </motion.div>

      {/* Bottom hint */}
      <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-20">
        <div className="flex items-center gap-1.5 text-xs text-slate-400 bg-white/90 backdrop-blur-sm px-4 py-2 rounded-full border border-slate-200 shadow-sm whitespace-nowrap">
          Already have an account?{' '}
          <Link to="/login" className="text-blue-600 font-medium hover:underline ml-1">Buyer sign in</Link>
          <span className="mx-1">·</span>
          <Link to="/agents/login" className="text-blue-600 font-medium hover:underline">Agent sign in</Link>
        </div>
      </div>
    </div>
  );
};

export default AuthLandingPage;
