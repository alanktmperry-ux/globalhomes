import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';

const STORAGE_KEY = 'listhq-cookie-consent';

export function CookieConsentBanner() {
  const [visible, setVisible] = useState(false);
  const [closing, setClosing] = useState(false);

  useEffect(() => {
    const existing = typeof window !== 'undefined' ? localStorage.getItem(STORAGE_KEY) : null;
    if (!existing) {
      // Slight delay so it slides up after page paint
      const t = setTimeout(() => setVisible(true), 400);
      return () => clearTimeout(t);
    }
  }, []);

  const dismiss = (value: 'accepted' | 'declined') => {
    try { localStorage.setItem(STORAGE_KEY, value); } catch { /* ignore */ }
    setClosing(true);
    setTimeout(() => setVisible(false), 250);
  };

  if (!visible) return null;

  return (
    <div
      role="dialog"
      aria-label="Cookie consent"
      className="fixed inset-x-0 bottom-0 z-[200] px-4 pb-4 md:pb-6"
      style={{
        transform: closing ? 'translateY(100%)' : 'translateY(0)',
        transition: 'transform 250ms ease-out',
      }}
    >
      <div
        className="mx-auto max-w-5xl rounded-xl shadow-2xl border"
        style={{
          background: '#0f172a',
          borderColor: 'rgba(255,255,255,0.08)',
        }}
      >
        <div className="flex flex-col md:flex-row md:items-center gap-4 p-4 md:p-5">
          <p className="text-[13px] md:text-sm leading-relaxed flex-1" style={{ color: 'rgba(255,255,255,0.85)' }}>
            We use cookies to improve your experience and analyse site usage. By continuing, you agree to our use of cookies.{' '}
            <Link to="/privacy" className="underline" style={{ color: '#93c5fd' }}>
              Privacy Policy
            </Link>
          </p>
          <div className="flex flex-col sm:flex-row gap-2 sm:gap-3 md:flex-shrink-0">
            <button
              onClick={() => dismiss('declined')}
              className="px-4 py-2.5 rounded-md text-sm font-medium transition-colors min-h-[44px]"
              style={{
                background: 'transparent',
                border: '1px solid rgba(255,255,255,0.25)',
                color: 'rgba(255,255,255,0.9)',
              }}
            >
              Decline
            </button>
            <button
              onClick={() => dismiss('accepted')}
              className="px-4 py-2.5 rounded-md text-sm font-semibold bg-blue-600 hover:bg-blue-500 text-white transition-colors min-h-[44px]"
            >
              Accept All
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

export default CookieConsentBanner;
