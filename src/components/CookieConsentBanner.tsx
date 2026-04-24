import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';

const STORAGE_KEY = 'listhq-cookie-consent';

export function CookieConsentBanner() {
  const [visible, setVisible] = useState(false);
  const [closing, setClosing] = useState(false);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    const existing = typeof window !== 'undefined' ? localStorage.getItem(STORAGE_KEY) : null;
    if (!existing) {
      const t = setTimeout(() => {
        setMounted(true);
        setVisible(true);
      }, 400);
      return () => clearTimeout(t);
    }
  }, []);

  const dismiss = (value: 'accepted' | 'declined') => {
    try { localStorage.setItem(STORAGE_KEY, value); } catch { /* ignore */ }
    setClosing(true);
    setTimeout(() => setVisible(false), 200);
  };

  if (!visible) return null;

  return (
    <div
      role="dialog"
      aria-label="Cookie consent"
      className={`fixed z-[200] bottom-4 left-4 right-4 sm:right-auto sm:max-w-[380px] transition-all duration-300 ease-out ${
        mounted && !closing ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'
      }`}
    >
      <div className="bg-white border border-gray-200 shadow-lg rounded-xl p-4">
        <p className="text-sm text-gray-700 leading-snug mb-3">
          We use cookies to improve your experience.{' '}
          <Link to="/privacy" className="text-primary hover:underline font-medium">
            Privacy Policy
          </Link>
        </p>
        <div className="flex items-center justify-end gap-2">
          <button
            onClick={() => dismiss('declined')}
            className="px-4 py-2 text-sm font-medium text-gray-600 hover:text-gray-900 transition-colors"
          >
            Decline
          </button>
          <button
            onClick={() => dismiss('accepted')}
            className="px-4 py-2 text-sm font-semibold bg-primary text-primary-foreground rounded-md hover:bg-primary/90 transition-colors"
          >
            Accept All
          </button>
        </div>
      </div>
    </div>
  );
}

export default CookieConsentBanner;
