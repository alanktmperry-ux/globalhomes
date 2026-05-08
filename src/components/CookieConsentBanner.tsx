import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { X } from 'lucide-react';
import { Button } from '@/components/ui/button';

const CONSENT_KEY = 'listhq_cookie_consent';

export function CookieConsentBanner() {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const stored = localStorage.getItem(CONSENT_KEY);
    if (!stored) setVisible(true);
  }, []);

  function accept() {
    localStorage.setItem(CONSENT_KEY, 'accepted');
    setVisible(false);
  }

  function decline() {
    localStorage.setItem(CONSENT_KEY, 'declined');
    setVisible(false);
  }

  if (!visible) return null;

  return (
    <div
      role="dialog"
      aria-label="Cookie consent"
      className="fixed inset-x-0 bottom-0 z-[200] p-3 sm:p-4 pointer-events-none"
    >
      <div className="pointer-events-auto mx-auto max-w-4xl rounded-xl border border-border bg-card shadow-lg p-4 sm:p-5">
        <div className="flex flex-col sm:flex-row sm:items-center gap-4">
          <p className="text-sm text-foreground flex-1 leading-relaxed">
            We use cookies to keep you logged in and improve your experience.
            By using ListHQ, you agree to our{' '}
            <Link to="/privacy" className="underline font-medium text-primary">
              Privacy Policy
            </Link>
            {' '}and{' '}
            <Link to="/terms" className="underline font-medium text-primary">
              Terms of Service
            </Link>
            {' '}in accordance with the Australian Privacy Act 1988.
          </p>
          <div className="flex items-center gap-2 shrink-0">
            <Button variant="outline" size="sm" onClick={decline}>
              Decline
            </Button>
            <Button size="sm" onClick={accept}>
              Accept cookies
            </Button>
            <button
              onClick={decline}
              aria-label="Close"
              className="ml-1 inline-flex items-center justify-center w-9 h-9 rounded-full text-muted-foreground hover:bg-accent transition-colors"
            >
              <X size={16} />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

export default CookieConsentBanner;
