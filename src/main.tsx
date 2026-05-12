import * as Sentry from "@sentry/react";
import { createRoot, hydrateRoot } from "react-dom/client";
import { ThemeProvider } from "next-themes";
import { InvestorModeProvider } from "./context/InvestorModeContext";
import App from "./App.tsx";
import "./index.css";
import { getConsent, initPostHog } from "./shared/lib/analyticsConsent";

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

const rootEl = document.getElementById("root")!;

// index.html ships a static prerender shell inside #root to crush FCP
// (FCP < 1s on mobile cold cache). The live React tree intentionally diverges
// from that shell (SiteHeader + custom Index hero), so hydrating would mismatch
// and re-render anyway — we strip the shell and use createRoot, which cleanly
// replaces it on first commit. If a future build-time prerender produces a tree
// that matches React, set `data-hydrate="1"` on #root to attach in place.
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

// Warm likely-next chunks during browser idle so the first navigation off the
// homepage doesn't pay the chunk-download cost on click. All ignored on error
// (e.g. offline / chunk hash mismatch after a deploy).
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

