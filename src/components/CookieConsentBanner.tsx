import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useTranslation } from '@/shared/lib/i18n';

const CONSENT_KEY = 'listhq_cookie_consent';

export function CookieConsentBanner() {
  const { t } = useTranslation();
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
      aria-label={t('layout.cookieBanner.ariaLabel')}
      className="fixed inset-x-0 bottom-0 z-[200] p-3 sm:p-4 pointer-events-none"
    >
      <div className="pointer-events-auto mx-auto max-w-4xl rounded-xl border border-border bg-card shadow-lg p-4 sm:p-5">
        <div className="flex flex-col sm:flex-row sm:items-center gap-4">
          <p className="text-sm text-foreground flex-1 leading-relaxed">
            {t('layout.cookieBanner.body')}{' '}
            <Link to="/privacy" className="underline font-medium text-primary">
              {t('layout.cookieBanner.privacyPolicy')}
            </Link>
            {' · '}
            <Link to="/terms" className="underline font-medium text-primary">
              {t('layout.cookieBanner.terms')}
            </Link>
          </p>
          <div className="flex items-center gap-2 shrink-0">
            <Button variant="outline" size="sm" onClick={decline}>
              {t('layout.cookieBanner.decline')}
            </Button>
            <Button size="sm" onClick={accept}>
              {t('layout.cookieBanner.accept')}
            </Button>
            <button
              onClick={decline}
              aria-label={t('layout.cookieBanner.closeAria')}
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
