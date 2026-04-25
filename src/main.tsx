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

if ('serviceWorker' in navigator) {
  navigator.serviceWorker.getRegistrations().then(regs => {
    regs.forEach(reg => {
      reg.unregister();
    });
  });
  if ('caches' in window) {
    caches.keys().then(keys => keys.forEach(k => caches.delete(k)));
  }
}
