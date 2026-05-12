import React, { Component, ErrorInfo, ReactNode } from "react";
import { useTranslation } from "@/shared/lib/i18n";

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

function ErrorFallback({ error }: { error: Error | null }) {
  const { t } = useTranslation();
  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-6 bg-background px-6 text-center">
      <div className="rounded-2xl border border-border bg-card p-10 shadow-lg max-w-md w-full">
        <div className="mb-4 text-5xl"></div>
        <h1 className="text-2xl font-bold text-foreground mb-2">{t('errors.errorBoundary.title')}</h1>
        <p className="text-muted-foreground mb-6">{t('errors.errorBoundary.body')}</p>
        {error && (
          <pre className="mb-6 max-h-24 overflow-auto rounded-lg bg-muted p-3 text-left text-xs text-muted-foreground">
            {error.message}
          </pre>
        )}
        <div className="flex flex-col gap-3 sm:flex-row sm:justify-center">
          <button
            onClick={() => window.location.reload()}
            className="rounded-lg bg-primary px-5 py-2.5 text-sm font-medium text-primary-foreground hover:opacity-90 transition-opacity"
          >
            {t('errors.errorBoundary.reload')}
          </button>
          <button
            onClick={() => { window.location.href = "/"; }}
            className="rounded-lg border border-border bg-background px-5 py-2.5 text-sm font-medium text-foreground hover:bg-muted transition-colors"
          >
            {t('errors.errorBoundary.goHome')}
          </button>
        </div>
      </div>
    </div>
  );
}

class AppErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error("[AppErrorBoundary]", error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      if (this.props.fallback) return this.props.fallback;
      return <ErrorFallback error={this.state.error} />;
    }
    return this.props.children;
  }
}

export default AppErrorBoundary;
