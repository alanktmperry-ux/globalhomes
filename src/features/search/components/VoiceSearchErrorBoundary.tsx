import React from 'react';
import { MicOff, Settings } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Tooltip, TooltipContent, TooltipTrigger, TooltipProvider } from '@/components/ui/tooltip';

interface Props {
  children: React.ReactNode;
  /** Fallback: render the hero in text-only mode */
  textOnlyFallback?: React.ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

export class VoiceSearchErrorBoundary extends React.Component<Props, State> {
  state: State = { hasError: false, error: null };

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, info: React.ErrorInfo) {
    console.error('[VoiceSearchErrorBoundary] Voice search failure:', {
      message: error.message,
      stack: error.stack,
      componentStack: info.componentStack,
      timestamp: new Date().toISOString(),
      userAgent: navigator.userAgent,
      url: window.location.href,
    });

    try {
      const payload = {
        level: 'error',
        source: 'VoiceSearchErrorBoundary',
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
      if (this.props.textOnlyFallback) {
        return this.props.textOnlyFallback;
      }

      return (
        <TooltipProvider delayDuration={300}>
          <div className="w-full py-8 px-4 flex flex-col items-center justify-center gap-3 bg-muted/30 border-b border-border">
            <div className="flex items-center gap-2 text-muted-foreground">
              <MicOff className="w-5 h-5" />
              <span className="text-sm font-medium">Voice search unavailable — using text input</span>
            </div>
            <div className="flex items-center gap-2">
              <Button variant="outline" size="sm" onClick={this.handleRetry} className="gap-2">
                Retry voice search
              </Button>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button variant="ghost" size="icon" className="w-8 h-8">
                    <Settings className="w-4 h-4 text-muted-foreground" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent className="max-w-[240px]">
                  <p className="text-xs">
                    To enable voice search, allow microphone access in your browser settings.
                    Look for the microphone icon in the address bar.
                  </p>
                </TooltipContent>
              </Tooltip>
            </div>
          </div>
        </TooltipProvider>
      );
    }

    return this.props.children;
  }
}
