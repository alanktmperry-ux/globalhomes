import React from 'react';
import { MapOff, RefreshCw } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface Props {
  children: React.ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

export class MapErrorBoundary extends React.Component<Props, State> {
  state: State = { hasError: false, error: null };

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, info: React.ErrorInfo) {
    console.error('[MapErrorBoundary] Google Maps failure:', {
      message: error.message,
      stack: error.stack,
      componentStack: info.componentStack,
      timestamp: new Date().toISOString(),
      userAgent: navigator.userAgent,
      url: window.location.href,
    });

    // Beacon to any future Sentry/logging endpoint
    try {
      const payload = {
        level: 'error',
        source: 'MapErrorBoundary',
        message: error.message,
        stack: error.stack?.slice(0, 2000),
        componentStack: info.componentStack?.slice(0, 1000),
        timestamp: new Date().toISOString(),
        url: window.location.href,
      };
      if (navigator.sendBeacon) {
        navigator.sendBeacon('/api/log-error', JSON.stringify(payload));
      }
    } catch {}
  }

  handleRetry = () => {
    this.setState({ hasError: false, error: null });
  };

  render() {
    if (this.state.hasError) {
      return (
        <div className="w-full h-full min-h-[300px] rounded-xl border border-border bg-muted/50 flex flex-col items-center justify-center gap-4 p-6 text-center">
          <div className="w-14 h-14 rounded-full bg-destructive/10 flex items-center justify-center">
            <MapOff className="w-7 h-7 text-destructive" />
          </div>
          <div>
            <h3 className="text-base font-semibold text-foreground mb-1">
              Map temporarily unavailable
            </h3>
            <p className="text-sm text-muted-foreground max-w-xs">
              The map couldn't load due to a network error. You can still browse properties in list view.
            </p>
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={this.handleRetry}
            className="gap-2"
          >
            <RefreshCw className="w-4 h-4" />
            Retry loading map
          </Button>
          {this.state.error && (
            <p className="text-xs text-muted-foreground/60 font-mono max-w-sm truncate">
              {this.state.error.message}
            </p>
          )}
        </div>
      );
    }

    return this.props.children;
  }
}
