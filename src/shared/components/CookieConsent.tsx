import { useState, useEffect, createContext, useContext, ReactNode } from 'react';
import { useLocation } from 'react-router-dom';
import { MapPin, Shield } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface ConsentState {
  decided: boolean;
  maps: boolean;
}

interface ConsentContextType {
  consent: ConsentState;
  acceptAll: () => void;
  declineMaps: () => void;
  resetConsent: () => void;
}

const STORAGE_KEY = 'listhq-cookie-consent';

const ConsentContext = createContext<ConsentContextType | undefined>(undefined);

export function useConsent() {
  const ctx = useContext(ConsentContext);
  if (!ctx) throw new Error('useConsent must be used within ConsentProvider');
  return ctx;
}

export function ConsentProvider({ children }: { children: ReactNode }) {
  const [consent, setConsent] = useState<ConsentState>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) return JSON.parse(saved) as ConsentState;
    } catch {}
    return { decided: false, maps: false };
  });

  const save = (next: ConsentState) => {
    setConsent(next);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
  };

  const acceptAll = () => save({ decided: true, maps: true });
  const declineMaps = () => save({ decided: true, maps: false });
  const resetConsent = () => {
    localStorage.removeItem(STORAGE_KEY);
    setConsent({ decided: false, maps: false });
  };

  return (
    <ConsentContext.Provider value={{ consent, acceptAll, declineMaps, resetConsent }}>
      {children}
      {!consent.decided && <ConsentBanner onAccept={acceptAll} onDecline={declineMaps} />}
    </ConsentContext.Provider>
  );
}

// Routes where Google Maps is not used — suppress the banner on these pages
const AUTH_ROUTES = ['/auth', '/login', '/forgot-password', '/reset-password', '/auth/confirm'];

function ConsentBanner({
  onAccept,
  onDecline,
}: {
  onAccept: () => void;
  onDecline: () => void;
}) {
  const { pathname } = useLocation();
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const path = pathname;
    const isAuthPage = AUTH_ROUTES.some((r) => path.startsWith(r));
    setVisible(false);
    if (isAuthPage) return;

    const t = setTimeout(() => setVisible(true), 800);
    return () => clearTimeout(t);
  }, [pathname]);

  if (!visible) return null;

  return (
    <div className="fixed inset-x-0 bottom-0 z-[100] px-3 pb-3 sm:px-4 sm:pb-4 animate-in slide-in-from-bottom-4 duration-500">
      <div className="max-w-sm mx-auto sm:max-w-md">
        <div className="rounded-xl sm:rounded-2xl border border-border bg-card shadow-lg p-3.5 sm:p-5 space-y-3 sm:space-y-4">
          <div className="flex items-start gap-2.5">
            <div className="w-8 h-8 sm:w-9 sm:h-9 rounded-full bg-primary/10 flex items-center justify-center shrink-0 mt-0.5">
              <Shield size={15} className="text-primary" />
            </div>
            <div className="space-y-0.5 sm:space-y-1">
              <p className="text-xs sm:text-sm font-semibold text-foreground">
                We use Google Maps for property search
              </p>
              <p className="text-[11px] sm:text-xs text-muted-foreground leading-relaxed">
                Google Maps shows property locations and address suggestions. It sends your approximate location to Google. All other features work without it.{' '}
                <a
                  href="/privacy"
                  className="underline underline-offset-2 hover:text-foreground transition-colors"
                >
                  Privacy Policy
                </a>
              </p>
            </div>
          </div>

          <div className="flex items-center gap-1.5 text-[11px] sm:text-xs text-muted-foreground">
            <MapPin size={11} className="shrink-0" />
            <span>Address autocomplete, property map, territory drawing</span>
          </div>

          <div className="flex gap-2">
            <Button onClick={onAccept} size="sm" className="flex-1 text-xs h-8 sm:h-9">
              Accept Google Maps
            </Button>
            <Button onClick={onDecline} variant="outline" size="sm" className="flex-1 text-xs h-8 sm:h-9">
              Without Maps
            </Button>
          </div>

          <p className="text-[10px] text-muted-foreground text-center">
            Your choice is saved. Change anytime in Settings → Privacy.
          </p>
        </div>
      </div>
    </div>
  );
}
