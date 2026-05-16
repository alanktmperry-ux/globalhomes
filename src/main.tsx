import * as Sentry from "@sentry/react";
import { createRoot, hydrateRoot } from "react-dom/client";
import { ThemeProvider } from "next-themes";
import { InvestorModeProvider } from "./context/InvestorModeContext";
import "./index.css";
import { getConsent, initPostHog } from "./shared/lib/analyticsConsent";

const BETA_STORAGE_KEY = 'listhq_beta_access_v2';
const LEGACY_BETA_STORAGE_KEYS = ['listhq_beta_access'];
const BETA_GRANTED_VALUE = 'granted';
const BETA_PASSWORD = 'listhq2026beta100%';
const AUTH_BYPASS_PATHS = [
  '/auth/callback',
  '/auth/confirm',
  '/auth/verify',
  '/auth/v1/verify',
  '/reset-password',
];

function hasBootstrapBetaAccess() {
  try {
    LEGACY_BETA_STORAGE_KEYS.forEach((key) => localStorage.removeItem(key));
    return localStorage.getItem(BETA_STORAGE_KEY) === BETA_GRANTED_VALUE;
  } catch {
    return false;
  }
}

function isAuthCallbackUrl(location: Location) {
  const path = location.pathname;
  const search = location.search;
  const hash = location.hash;
  const isAuthPath = AUTH_BYPASS_PATHS.some((p) => path.startsWith(p)) || path.startsWith('/auth/');

  return isAuthPath && (
    AUTH_BYPASS_PATHS.some((p) => path.startsWith(p)) ||
    search.includes('token_hash=') ||
    search.includes('access_token=') ||
    search.includes('code=') ||
    hash.includes('access_token=') ||
    hash.includes('type=signup') ||
    hash.includes('type=recovery') ||
    hash.includes('type=email')
  );
}

function renderBootstrapGate(rootEl: HTMLElement) {
  rootEl.innerHTML = `
    <div style="min-height:100vh;background:hsl(0 0% 100%);display:flex;align-items:center;justify-content:center;padding:16px;font-family:'Plus Jakarta Sans',Inter,system-ui,sans-serif;color:hsl(222 47% 11%)">
      <div style="width:100%;max-width:28rem">
        <div style="display:flex;flex-direction:column;align-items:center;gap:12px;margin-bottom:32px">
          <div style="display:flex;align-items:center;gap:8px">
            <div style="width:40px;height:40px;border-radius:12px;background:linear-gradient(135deg,hsl(221 83% 53%),hsl(189 94% 43%));display:flex;align-items:center;justify-content:center;color:white;font-size:20px">🌐</div>
            <span style="font-size:20px;font-weight:700">ListHQ</span>
          </div>
        </div>
        <div style="background:hsl(0 0% 100%);border:1px solid hsl(220 13% 91%);border-radius:24px;padding:32px;box-shadow:0 20px 50px rgba(15,23,42,0.08)">
          <h1 style="font-size:28px;line-height:1.2;font-weight:700;text-align:center;margin:0 0 8px">ListHQ — Closed Beta</h1>
          <p style="font-size:14px;line-height:1.5;color:hsl(215 16% 47%);text-align:center;margin:0 0 24px">Enter your access code to continue.</p>
          <form data-beta-gate-form style="display:flex;flex-direction:column;gap:16px">
            <input data-beta-gate-input type="password" placeholder="Access code" autocomplete="off" autofocus
              style="width:100%;box-sizing:border-box;border:1px solid hsl(220 13% 91%);border-radius:14px;padding:14px 16px;font-size:16px;text-align:center;outline:none" />
            <p data-beta-gate-error style="min-height:20px;font-size:14px;line-height:1.4;color:hsl(0 84% 60%);text-align:center;margin:0"></p>
            <button data-beta-gate-submit type="submit"
              style="width:100%;border:none;border-radius:14px;padding:14px 16px;background:hsl(221 83% 53%);color:white;font-size:15px;font-weight:700;cursor:pointer">
              Submit
            </button>
          </form>
          <p style="font-size:12px;line-height:1.5;color:hsl(215 16% 47%);text-align:center;margin:24px 0 0">
            Don't have a code? <a href="mailto:alan@listhq.com.au" style="color:hsl(221 83% 53%);font-weight:600">alan@listhq.com.au</a>
          </p>
        </div>
      </div>
    </div>
  `;

  const form = rootEl.querySelector<HTMLFormElement>('[data-beta-gate-form]');
  const input = rootEl.querySelector<HTMLInputElement>('[data-beta-gate-input]');
  const error = rootEl.querySelector<HTMLParagraphElement>('[data-beta-gate-error]');
  const submit = rootEl.querySelector<HTMLButtonElement>('[data-beta-gate-submit]');

  input?.addEventListener('input', () => {
    if (error) error.textContent = '';
  });

  form?.addEventListener('submit', (event) => {
    event.preventDefault();
    const value = input?.value.trim() ?? '';

    if (value === BETA_PASSWORD) {
      try {
        LEGACY_BETA_STORAGE_KEYS.forEach((key) => localStorage.removeItem(key));
        localStorage.setItem(BETA_STORAGE_KEY, BETA_GRANTED_VALUE);
      } catch {
        /* ignore */
      }
      window.location.reload();
      return;
    }

    if (error) error.textContent = 'Invalid code. Try again.';
    if (input) {
      input.animate(
        [
          { transform: 'translateX(0)' },
          { transform: 'translateX(-8px)' },
          { transform: 'translateX(8px)' },
          { transform: 'translateX(0)' },
        ],
        { duration: 300, easing: 'ease-in-out' }
      );
    }
  });

  if (submit && input) {
    const syncDisabled = () => {
      submit.disabled = !input.value.trim();
      submit.style.opacity = submit.disabled ? '0.6' : '1';
      submit.style.cursor = submit.disabled ? 'not-allowed' : 'pointer';
    };
    input.addEventListener('input', syncDisabled);
    syncDisabled();
  }
}

async function bootstrapApp(rootEl: HTMLElement) {
  const { default: App } = await import('./App.tsx');

  const prerenderInput = rootEl.querySelector('[data-prerender-shell="1"] input');
  let preHadFocus = false;
  let preTypedValue = '';
  if (prerenderInput instanceof HTMLInputElement) {
    preHadFocus = document.activeElement === prerenderInput;
    preTypedValue = prerenderInput.value;
    prerenderInput.removeAttribute('readonly');
  }

  const prerenderShell = rootEl.querySelector('[data-prerender-shell]');
  if (prerenderShell) prerenderShell.remove();

  const tree = (
    <ThemeProvider attribute="class" defaultTheme="light" enableSystem={false} forcedTheme="light">
      <InvestorModeProvider>
        <Sentry.ErrorBoundary fallback={<div className="flex items-center justify-center min-h-screen text-foreground">Something went wrong. Please refresh.</div>}>
          <App />
        </Sentry.ErrorBoundary>
      </InvestorModeProvider>
    </ThemeProvider>
  );

  if (rootEl.getAttribute('data-hydrate') === '1') {
    hydrateRoot(rootEl, tree);
  } else {
    createRoot(rootEl).render(tree);
  }

  if (preHadFocus || preTypedValue) {
    const tryForward = (attempt = 0) => {
      const liveInput = document.querySelector(
        'input[placeholder*="uburb"], input[placeholder*="ddress"]'
      );
      if (liveInput instanceof HTMLInputElement) {
        if (preTypedValue) {
          const setter = Object.getOwnPropertyDescriptor(
            window.HTMLInputElement.prototype,
            'value'
          )?.set;
          setter?.call(liveInput, preTypedValue);
          liveInput.dispatchEvent(new Event('input', { bubbles: true }));
        }
        if (preHadFocus) liveInput.focus();
      } else if (attempt < 20) {
        requestAnimationFrame(() => tryForward(attempt + 1));
      }
    };
    requestAnimationFrame(() => tryForward());
  }

  type IdleWindow = Window & {
    requestIdleCallback?: (cb: () => void, opts?: { timeout: number }) => void;
  };
  const w = window as IdleWindow;
  const warm = () => {
    import('@/pages/SeekerAuthPage').catch(() => {});
    import('@/pages/properties/PropertySearchPage').catch(() => {});
    import('@/features/marketing/FeaturedListings').catch(() => {});
  };
  if (typeof w.requestIdleCallback === 'function') {
    w.requestIdleCallback(warm, { timeout: 5000 });
  } else {
    setTimeout(warm, 3000);
  }
}

if (getConsent() === 'accepted') {
  initPostHog();
}

setTimeout(() => {
  Sentry.init({
    dsn: import.meta.env.VITE_SENTRY_DSN,
    environment: import.meta.env.MODE,
    tracesSampleRate: 0.05,
    integrations: [Sentry.browserTracingIntegration()],
  });
}, 0);

const rootEl = document.getElementById('root')!;

if (!isAuthCallbackUrl(window.location) && !hasBootstrapBetaAccess()) {
  renderBootstrapGate(rootEl);
} else {
  void bootstrapApp(rootEl);
}
