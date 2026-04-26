import { motion } from 'framer-motion';
import { useNavigate, Link, useSearchParams } from 'react-router-dom';
import { Helmet } from 'react-helmet-async';
import { useState, useEffect } from 'react';
import { X } from 'lucide-react';

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
      <Helmet><title>Sign In</title></Helmet>

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

      {/* ── LEFT: Buyer — light, warm ── */}
      <motion.div
        initial={{ opacity: 0, x: -16 }}
        animate={{ opacity: 1, x: 0 }}
        transition={{ duration: 0.55, ease: [0.22, 1, 0.36, 1] }}
        className="flex-1 bg-white flex flex-col justify-center px-14 py-20 relative overflow-hidden"
      >
        {/* Subtle ambient */}
        <div className="absolute bottom-0 right-0 w-80 h-80 rounded-full pointer-events-none" style={{ background: 'radial-gradient(circle, rgba(59,130,246,0.06) 0%, transparent 70%)' }} />

        <div className="relative z-10 max-w-sm">
          {/* Badge */}
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full border border-slate-200 bg-slate-50 mb-7">
            <span className="w-1.5 h-1.5 rounded-full bg-slate-400" />
            <span className="text-[10px] font-medium tracking-widest uppercase text-slate-400">Find your next home</span>
          </div>

          {/* Headline */}
          <h1 className="text-[46px] font-light text-slate-900 leading-[1.05] mb-4" style={{ letterSpacing: '-2px' }}>
            Find your<br /><strong className="font-semibold">next home.</strong>
          </h1>

          <p className="text-[15px] text-slate-400 leading-relaxed mb-10 max-w-xs">
            Search in 24 languages, see prices in your currency, and get AI-powered recommendations.
          </p>

          {/* Features */}
          <div className="space-y-3 mb-11">
            {['Search thousands of properties', 'AI voice search in any language'].map(f => (
              <div key={f} className="flex items-center gap-2.5">
                <span className="w-1.5 h-1.5 rounded-full bg-blue-500 shrink-0" />
                <span className="text-[13px] text-slate-500">{f}</span>
              </div>
            ))}
            <div className="flex items-center gap-2.5">
              <span className="w-1.5 h-1.5 rounded-full bg-blue-500 shrink-0" />
              <span className="text-[13px] font-semibold text-slate-900">Save favourites & get alerts</span>
            </div>
            <p className="text-[11px] italic text-slate-400 pl-4 -mt-1">Sign in to unlock this</p>
          </div>

          <div className="flex flex-col gap-3">
            <button
              onClick={() => { dismissError(); navigate('/login'); }}
              className="inline-flex items-center gap-2 px-8 py-3.5 rounded-full bg-slate-900 text-white text-sm font-medium hover:bg-slate-700 transition-colors"
            >
              Sign in or create account
              <span>→</span>
            </button>
            <button
              onClick={() => navigate('/')}
              className="inline-flex items-center gap-2 px-6 py-2.5 rounded-full border border-slate-300 text-slate-500 text-xs font-medium hover:bg-slate-50 transition-colors"
            >
              Browse without signing in
              <span>→</span>
            </button>
          </div>
        </div>
      </motion.div>

      {/* ── AGENT side — dark, premium ── */}
      <motion.div
        initial={{ opacity: 0, x: 16 }}
        animate={{ opacity: 1, x: 0 }}
        transition={{ duration: 0.55, ease: [0.22, 1, 0.36, 1] }}
        className="flex-1 flex flex-col justify-center px-14 py-20 relative overflow-hidden"
        style={{ background: '#020817' }}
      >
        {/* Ambient glows */}
        <div className="absolute -top-24 -right-24 w-[400px] h-[400px] rounded-full pointer-events-none" style={{ background: 'radial-gradient(circle, rgba(37,99,235,0.15) 0%, transparent 70%)' }} />
        <div className="absolute -bottom-16 -left-16 w-[280px] h-[280px] rounded-full pointer-events-none" style={{ background: 'radial-gradient(circle, rgba(37,99,235,0.08) 0%, transparent 70%)' }} />
        {/* Left accent line */}
        <div className="absolute top-0 left-0 bottom-0 w-px hidden md:block" style={{ background: 'linear-gradient(to bottom, transparent, rgba(37,99,235,0.4) 30%, rgba(37,99,235,0.4) 70%, transparent)' }} />

        <div className="relative z-10 max-w-sm">
          {/* Badge */}
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full mb-7" style={{ border: '1px solid rgba(37,99,235,0.3)', background: 'rgba(37,99,235,0.08)' }}>
            <span className="w-1.5 h-1.5 rounded-full bg-blue-400" />
            <span className="text-[10px] font-medium tracking-widest uppercase text-blue-400">Agent Portal</span>
          </div>

          {/* Headline */}
          <h1 className="text-[46px] font-light text-white leading-[1.05] mb-4" style={{ letterSpacing: '-2px' }}>
            Built for agents<br />who move <strong className="font-semibold text-blue-400">fast.</strong>
          </h1>

          <p className="text-[15px] leading-relaxed mb-10 max-w-xs" style={{ color: 'rgba(255,255,255,0.4)' }}>
            Pocket listings, AI buyer matching, trust accounting, and live lead alerts — one platform.
          </p>

          {/* Features */}
          <div className="space-y-3 mb-11">
            {[
              'Manage listings & analytics',
              'AI buyer concierge & matching',
              'Trust accounting & rent roll',
            ].map(f => (
              <div key={f} className="flex items-center gap-2.5">
                <span className="w-1.5 h-1.5 rounded-full bg-blue-500 shrink-0" />
                <span className="text-[13px]" style={{ color: 'rgba(255,255,255,0.5)' }}>{f}</span>
              </div>
            ))}
          </div>

          <button
            onClick={() => { dismissError(); navigate('/agents/login'); }}
            className="inline-flex items-center gap-2 px-8 py-3.5 rounded-full bg-white text-slate-900 text-sm font-medium hover:bg-slate-100 transition-colors"
          >
            Agent sign in
            <span>→</span>
          </button>
        </div>
      </motion.div>

      {/* "Already have an account" — pinned bottom centre */}
      <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-20">
        <div className="flex items-center gap-1.5 text-xs text-slate-400 bg-white/90 backdrop-blur-sm px-4 py-2 rounded-full border border-slate-200 shadow-sm whitespace-nowrap">
          Already have an account?{' '}
          <Link to="/agents/login" className="text-blue-600 font-medium hover:underline ml-1">Sign in</Link>
        </div>
      </div>
    </div>
  );
};

export default AuthLandingPage;
