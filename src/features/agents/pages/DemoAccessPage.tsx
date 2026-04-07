import { useState, useEffect, useRef } from 'react';
import { useNavigate, Link, useSearchParams } from 'react-router-dom';
import { Loader2, KeyRound, Sparkles } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

const DemoAccessPage = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const prefillEmail = searchParams.get('email') || '';

  const [email, setEmail] = useState(prefillEmail);
  const [code, setCode] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const codeRef = useRef<HTMLInputElement>(null);

  const isEmailPrefilled = !!prefillEmail;

  useEffect(() => {
    codeRef.current?.focus();
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim() || !code.trim()) return;

    setLoading(true);
    setError('');

    try {
      const { data: fnData, error: fnError } = await supabase.functions.invoke('handle-demo-request', {
        body: { action: 'validate_code', email: email.trim(), code: code.trim().toUpperCase() },
      });

      if (fnError) {
        let serverMessage = 'Something went wrong. Please try again.';
        try {
          const bodyText = await (fnError as any)?.context?.text?.();
          if (bodyText) {
            const parsed = JSON.parse(bodyText);
            serverMessage = parsed?.error || serverMessage;
          }
        } catch (_) {
          // ignore parse error
        }
        setError(serverMessage);
        return;
      }

      const payload = typeof fnData === 'string' ? JSON.parse(fnData) : fnData;
      if (!payload?.success || !payload?.request_id) {
        setError('Something went wrong. Please try again.');
        return;
      }

      await supabase.auth.signOut();

      const { error: signInErr } = await supabase.auth.signInWithPassword({
        email: payload.demo_email || 'demo@listhq.com.au',
        password: payload.demo_password || 'DemoAccess2024!',
      });

      if (signInErr) {
        setError('Something went wrong. Please try again.');
        return;
      }

      await supabase.functions.invoke('handle-demo-request', {
        body: { action: 'redeem_code', request_id: payload.request_id },
      });

      toast.success('Welcome to the demo!');
      navigate('/dashboard');
    } catch (err: unknown) {
      console.error('Demo access error:', err);
      setError('Something went wrong. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-background flex items-center justify-center px-4">
      <div className="w-full max-w-sm">
        <div className="text-center mb-8">
          <Link to="/" className="inline-flex items-center gap-2 mb-4">
            <div className="w-10 h-10 rounded-full bg-primary flex items-center justify-center">
              <span className="text-primary-foreground text-sm font-bold">W</span>
            </div>
          </Link>
          <h1 className="font-display text-2xl font-bold text-foreground">ListHQ</h1>
          <div className="flex items-center justify-center gap-2 mt-2">
            <KeyRound size={14} className="text-primary" />
            <span className="text-xs font-semibold text-primary uppercase tracking-wider">Demo Access</span>
          </div>
        </div>

        <div className="bg-card border border-border rounded-2xl p-6 shadow-sm">
          <div className="bg-amber-500/10 border border-amber-500/20 rounded-lg p-3 mb-5 flex items-start gap-2">
            <Sparkles className="h-4 w-4 text-amber-600 dark:text-amber-400 shrink-0 mt-0.5" />
            <p className="text-xs text-amber-700 dark:text-amber-300">
              You are about to access a demo environment. To go live, subscribe after exploring.
            </p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="text-sm font-medium text-foreground mb-1.5 block">Email Address</label>
              <Input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="your@email.com"
                readOnly={isEmailPrefilled}
                className={isEmailPrefilled ? 'bg-muted cursor-not-allowed' : ''}
              />
            </div>

            <div>
              <label className="text-sm font-medium text-foreground mb-1.5 block">Access Code</label>
              <Input
                ref={codeRef}
                type="text"
                required
                value={code}
                onChange={(e) => setCode(e.target.value.toUpperCase())}
                placeholder="RB7X2KPQ"
                maxLength={8}
                className="font-mono text-center text-lg tracking-widest"
                autoFocus
              />
            </div>

            {error && (
              <div className="bg-destructive/10 border border-destructive/20 rounded-lg p-3 text-sm text-destructive">
                {error}
              </div>
            )}

            <Button type="submit" disabled={loading} className="w-full">
              {loading ? (
                <><Loader2 className="h-4 w-4 animate-spin mr-2" /> Accessing...</>
              ) : (
                'Access My Demo →'
              )}
            </Button>
          </form>
        </div>

        <p className="text-xs text-muted-foreground text-center mt-4">
          Already have an account?{' '}
          <Link to="/agents/login" className="text-primary font-medium underline underline-offset-2">
            Log in
          </Link>
        </p>
        <p className="text-xs text-muted-foreground text-center mt-2">
          Don't have a code?{' '}
          <Link to="/agents/login" className="text-primary font-medium underline underline-offset-2">
            Request a demo
          </Link>
        </p>
      </div>
    </div>
  );
};

export default DemoAccessPage;
