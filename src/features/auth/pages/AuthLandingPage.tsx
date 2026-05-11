import { motion } from 'framer-motion';
import { useNavigate, Link, useSearchParams } from 'react-router-dom';
import { Helmet } from 'react-helmet-async';
import { useState, useEffect } from 'react';
import { X } from 'lucide-react';
import { useTranslation } from '@/shared/lib/i18n/useTranslation';

type Feature = { icon: string; title: string; desc: string };

const buyerFeatures: Feature[] = [
  { icon: 'solar:streets-linear', title: 'Post a Halo', desc: 'Tell agents what you want — they come to you' },
  { icon: 'solar:microphone-3-linear', title: 'Voice search', desc: 'Speak in any language' },
  { icon: 'solar:earth-linear', title: 'Listings in your language', desc: 'Every property auto-translated' },
  { icon: 'solar:dollar-linear', title: 'Prices in your currency', desc: 'Live conversion, 20+ currencies' },
  { icon: 'solar:shield-check-linear', title: 'Rental bond guarantee', desc: 'No 4-week bond upfront — from $8/week' },
  { icon: 'solar:case-round-linear', title: 'Multilingual brokers', desc: 'Finance help in your language, free' },
];

const agentFeatures: Feature[] = [
  { icon: 'solar:streets-linear', title: 'Halo Board', desc: 'See buyers before they look at a listing' },
  { icon: 'solar:magic-stick-3-linear', title: 'AI Buyer Concierge', desc: 'Matched leads arrive automatically' },
  { icon: 'solar:earth-linear', title: 'multilingual translation', desc: 'Reach 1.2M buyers no other portal reaches' },
  { icon: 'solar:lock-keyhole-linear', title: 'Pocket listings', desc: 'No public days-on-market counter' },
  { icon: 'solar:microphone-3-linear', title: 'Voice-qualified leads', desc: 'Transcript with every enquiry' },
  { icon: 'solar:clock-circle-linear', title: '14-day exclusive window', desc: 'Your listing, before any other portal' },
  { icon: 'solar:chart-square-linear', title: 'Lead pipeline CRM', desc: 'Enquiries auto-sync into Kanban' },
  { icon: 'solar:wallet-2-linear', title: 'Built-in trust accounting', desc: 'Migrate from PropertyMe in one step' },
];

// iconify-icon is a globally loaded web component
const IconifyIcon = ({ icon, size = 18, color }: { icon: string; size?: number; color?: string }) => (
  // @ts-expect-error — iconify-icon is a web component
  <iconify-icon icon={icon} style={{ fontSize: `${size}px`, color, display: 'inline-flex', lineHeight: 1 }} />
);

const AuthLandingPage = () => {
  const navigate = useNavigate();
  const { t } = useTranslation();
  const [searchParams] = useSearchParams();
  const errorParam = searchParams.get('error');
  const [showError, setShowError] = useState(false);

  useEffect(() => {
    setShowError(!!errorParam);
  }, [errorParam]);

  const errorMessage =
    errorParam === 'oauth_failed'
      ? t('auth.landing.errorOauth')
      : errorParam === 'email_not_confirmed'
      ? t('auth.landing.errorEmailNotConfirmed')
      : null;

  const dismissError = () => setShowError(false);

  const gradientText = {
    background: 'linear-gradient(135deg, #2563EB 0%, #4F88FF 60%, #93C5FD 100%)',
    WebkitBackgroundClip: 'text' as const,
    backgroundClip: 'text' as const,
    WebkitTextFillColor: 'transparent' as const,
  };

  return (
    <div className="min-h-screen bg-white">
      <Helmet><title>{t('auth.landing.title')}</title></Helmet>

      {showError && errorMessage && (
        <div className="fixed top-20 left-1/2 -translate-x-1/2 z-30 max-w-md w-[92%]">
          <div className="flex items-start gap-3 px-4 py-3 rounded-xl bg-red-50 border border-red-200 text-red-700 text-sm shadow-lg">
            <span className="flex-1">{errorMessage}</span>
            <button onClick={dismissError} className="shrink-0 opacity-70 hover:opacity-100" aria-label="Dismiss">
              <X size={16} />
            </button>
          </div>
        </div>
      )}

      {/* Top centred wordmark */}
      <button
        onClick={() => navigate('/')}
        className="absolute top-7 left-1/2 -translate-x-1/2 z-30 text-[20px] font-extrabold uppercase tracking-[0.06em] cursor-pointer bg-transparent border-0"
        style={gradientText}
      >
        ListHQ
      </button>

      <div className="auth-split flex flex-col lg:flex-row min-h-screen">
        {/* LEFT — Buyer */}
        <motion.div
          initial={{ opacity: 0, x: -16 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.55, ease: [0.22, 1, 0.36, 1] }}
          className="flex-1 min-h-screen bg-white flex flex-col justify-center px-[7vw] py-24"
        >
          <div className="inline-flex items-center gap-2.5 px-4 py-2 bg-[#EFF6FF] border border-[#2563EB]/20 rounded-full text-[11px] font-bold tracking-[0.06em] uppercase text-[#1E40AF] self-start">
            <IconifyIcon icon="solar:home-2-linear" size={13} />
            FIND YOUR NEXT HOME
          </div>

          <h1 className="text-[clamp(40px,5vw,72px)] font-extrabold leading-[1.0] tracking-[-0.04em] text-black mt-6">
            Find your next home.
          </h1>
          <p className="text-[17px] font-normal text-[#4a4a4a] mt-4 leading-[1.55] max-w-[420px]">
            Tell agents what you want — they find you.
          </p>

          <div className="auth-features-grid grid grid-cols-1 sm:grid-cols-2 gap-3 mt-10 max-w-[540px]">
            {buyerFeatures.map((f) => (
              <div
                key={f.title}
                className="bg-[#EFF6FF] border border-[#2563EB]/15 rounded-2xl p-5 transition-all hover:border-[#2563EB] hover:-translate-y-0.5"
              >
                <div className="w-9 h-9 rounded-[10px] bg-white flex items-center justify-center text-[#2563EB] mb-3">
                  <IconifyIcon icon={f.icon} size={18} color="#2563EB" />
                </div>
                <div className="text-[15px] font-bold text-[#0a0f1e] leading-tight">{f.title}</div>
                <div className="text-[12px] text-[#4a4a4a] mt-1 leading-[1.45]">{f.desc}</div>
              </div>
            ))}
          </div>

          <button
            onClick={() => { dismissError(); navigate('/login'); }}
            className="w-full bg-[#0a0f1e] text-white rounded-full py-4 text-[15px] font-bold cursor-pointer transition-all hover:bg-white hover:text-[#0a0f1e] border border-[#0a0f1e] inline-flex items-center justify-center gap-2.5 max-w-[540px] mt-10"
          >
            Sign in or create account
            <IconifyIcon icon="solar:arrow-right-linear" size={16} />
          </button>
          <button
            onClick={() => navigate('/')}
            className="w-full bg-white text-[#4a4a4a] rounded-full py-4 text-[15px] font-semibold cursor-pointer transition-all hover:text-[#0a0f1e] max-w-[540px] mt-3 inline-flex items-center justify-center gap-2"
          >
            Browse without signing in
            <IconifyIcon icon="solar:arrow-right-linear" size={14} />
          </button>
        </motion.div>

        {/* RIGHT — Agent */}
        <motion.div
          initial={{ opacity: 0, x: 16 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.55, ease: [0.22, 1, 0.36, 1] }}
          className="flex-1 min-h-screen text-white px-[7vw] py-24 flex flex-col justify-center relative overflow-hidden"
          style={{ background: '#0a0f1e' }}
        >
          <div
            className="absolute inset-0 pointer-events-none z-0"
            style={{
              backgroundImage:
                'radial-gradient(circle at 20% 30%, rgba(37,99,235,0.30) 0%, transparent 40%), radial-gradient(circle at 80% 70%, rgba(79,136,255,0.20) 0%, transparent 40%)',
            }}
          />

          <div className="relative z-10">
            <div className="inline-flex items-center gap-2.5 px-4 py-2 bg-white/10 border border-white/15 rounded-full text-[11px] font-bold tracking-[0.06em] uppercase text-[#93C5FD] backdrop-blur">
              <span className="relative flex h-1.5 w-1.5">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-[#93C5FD] opacity-75" />
                <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-[#93C5FD]" />
              </span>
              AGENT PORTAL
            </div>

            <h1 className="text-[clamp(40px,5vw,72px)] font-extrabold leading-[1.0] tracking-[-0.04em] text-white mt-6">
              Built for agents<br />
              who move{' '}
              <span
                style={{
                  background: 'linear-gradient(135deg, #93C5FD 0%, #4F88FF 100%)',
                  WebkitBackgroundClip: 'text',
                  backgroundClip: 'text',
                  WebkitTextFillColor: 'transparent',
                }}
              >
                fast.
              </span>
            </h1>
            <p className="text-[17px] font-normal text-white/65 mt-4 leading-[1.55] max-w-[420px]">
              The tools no other portal offers.
            </p>

            <div className="auth-features-grid grid grid-cols-1 sm:grid-cols-2 gap-3 mt-10 max-w-[600px]">
              {agentFeatures.map((f) => (
                <div
                  key={f.title}
                  className="bg-white/[0.04] border border-white/10 rounded-2xl p-5 transition-all hover:border-[#2563EB]/40 hover:-translate-y-0.5 cursor-pointer"
                >
                  <div className="w-9 h-9 rounded-[10px] bg-[#2563EB]/15 flex items-center justify-center text-[#93C5FD] mb-3">
                    <IconifyIcon icon={f.icon} size={18} color="#93C5FD" />
                  </div>
                  <div className="text-[15px] font-bold text-white leading-tight">{f.title}</div>
                  <div className="text-[12px] text-white/65 mt-1 leading-[1.45]">{f.desc}</div>
                </div>
              ))}
            </div>

            <button
              onClick={() => { dismissError(); navigate('/agents/login'); }}
              className="w-full bg-white text-[#0a0f1e] rounded-full py-4 text-[15px] font-bold cursor-pointer transition-all hover:bg-white/95 inline-flex items-center justify-center gap-2.5 max-w-[600px] mt-10"
            >
              <IconifyIcon icon="solar:lock-keyhole-linear" size={16} color="#0a0f1e" />
              Agent sign in
              <IconifyIcon icon="solar:arrow-right-linear" size={16} color="#0a0f1e" />
            </button>
            <button
              onClick={() => navigate('/')}
              className="w-full text-center text-[14px] font-semibold text-[#93C5FD] hover:text-white transition-colors cursor-pointer max-w-[600px] mt-4 inline-flex items-center justify-center gap-2 bg-transparent border-0"
            >
              See everything on ListHQ
              <IconifyIcon icon="solar:arrow-right-linear" size={14} />
            </button>
          </div>
        </motion.div>
      </div>

      {/* Bottom pill */}
      <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 bg-white border border-[#E5E5E5] rounded-full px-5 py-2.5 flex items-center gap-3 shadow-[0_8px_24px_rgba(15,23,42,0.12)] text-[13px]">
        <span className="text-[#4a4a4a] font-medium">Already have an account?</span>
        <Link to="/login" className="text-[#2563EB] font-bold hover:underline cursor-pointer">Buyer sign in</Link>
        <span className="text-[#9CA3AF]">·</span>
        <Link to="/agents/login" className="text-[#2563EB] font-bold hover:underline cursor-pointer">Agent sign in</Link>
      </div>
    </div>
  );
};

export default AuthLandingPage;
