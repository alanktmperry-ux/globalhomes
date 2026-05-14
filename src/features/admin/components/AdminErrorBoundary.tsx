import React from 'react';
import { AlertCircle } from 'lucide-react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';

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
        <div className="min-h-screen flex items-center justify-center p-6">
          <Card className="max-w-md text-center p-8">
            <AlertCircle className="w-12 h-12 text-amber-500 mx-auto mb-4" />
            <h2 className="text-xl font-bold mb-2">Admin couldn't load</h2>
            <p className="text-sm text-muted-foreground mb-6">
              Something went wrong loading this admin page. Try refreshing, or sign in again.
            </p>
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
