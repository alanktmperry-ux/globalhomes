import * as Sentry from "@sentry/react";
import { createRoot } from "react-dom/client";
import { ThemeProvider } from "next-themes";
import { InvestorModeProvider } from "./context/InvestorModeContext";
import App from "./App.tsx";
import "./index.css";

setTimeout(() => {
  Sentry.init({
    dsn: import.meta.env.VITE_SENTRY_DSN,
    environment: import.meta.env.MODE,
    tracesSampleRate: 0.2,
    replaysOnErrorSampleRate: 1.0,
    integrations: [
      Sentry.browserTracingIntegration(),
      Sentry.replayIntegration({ maskAllInputs: false }),
    ],
  });
}, 0);

createRoot(document.getElementById("root")!).render(
  <ThemeProvider attribute="class" defaultTheme="light" enableSystem={false} forcedTheme="light">
    <InvestorModeProvider>
      <Sentry.ErrorBoundary
        fallback={
          <div className="flex items-center justify-center min-h-screen text-foreground">
            Something went wrong. Please refresh.
          </div>
        }
      >
        <App />
      </Sentry.ErrorBoundary>
    </InvestorModeProvider>
  </ThemeProvider>
);

// Register service worker only in production (not in iframes / Lovable preview)
const isInIframe = (() => { try { return window.self !== window.top; } catch { return true; } })();
const isPreviewHost = window.location.hostname.includes('id-preview--') || window.location.hostname.includes('lovableproject.com');

if ('serviceWorker' in navigator && !isInIframe && !isPreviewHost) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('/sw.js').catch(err => console.warn('SW registration failed:', err));
  });
} else if (isInIframe || isPreviewHost) {
  navigator.serviceWorker?.getRegistrations().then(regs => regs.forEach(r => r.unregister()));
}
