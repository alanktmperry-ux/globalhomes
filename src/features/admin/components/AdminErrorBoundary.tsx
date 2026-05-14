import React from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { AlertCircle } from 'lucide-react';

interface State {
  hasError: boolean;
  error: Error | null;
}

export class AdminErrorBoundary extends React.Component<{ children: React.ReactNode }, State> {
  state: State = { hasError: false, error: null };

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, info: React.ErrorInfo) {
    console.error('[AdminErrorBoundary]', error, info);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-[60vh] flex items-center justify-center p-6">
          <Card className="max-w-md w-full text-center p-8">
            <AlertCircle className="w-12 h-12 text-amber-500 mx-auto mb-4" />
            <h2 className="text-xl font-bold mb-2">Admin couldn't load this page</h2>
            <p className="text-sm text-muted-foreground mb-4">
              Something went wrong rendering this admin page. Try refreshing — if it keeps failing, sign in again.
            </p>
            {this.state.error?.message && (
              <p className="text-xs font-mono text-muted-foreground bg-muted rounded px-3 py-2 mb-6 break-words">
                {this.state.error.message}
              </p>
            )}
            <div className="flex gap-3 justify-center">
              <Button onClick={() => window.location.reload()}>Refresh</Button>
              <Button variant="outline" onClick={() => { window.location.href = '/admin/login'; }}>
                Sign in again
              </Button>
            </div>
          </Card>
        </div>
      );
    }
    return this.props.children;
  }
}

export default AdminErrorBoundary;
