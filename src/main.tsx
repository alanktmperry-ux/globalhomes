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
    tracesSampleRate: 0.05,
    integrations: [
      Sentry.browserTracingIntegration(),
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

