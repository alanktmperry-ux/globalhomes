import { useState, useEffect, useRef } from 'react';
import { useNavigate, Link, useSearchParams } from 'react-router-dom';
import { Building2, Loader2, KeyRound, Sparkles } from 'lucide-react';
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
      // 1. Validate demo code
      const { data: demoReq, error: queryErr } = await supabase
        .from('demo_requests' as any)
        .select('*')
        .ilike('email', email.trim())
        .eq('demo_code', code.trim().toUpperCase())
        .eq('status', 'approved')
        .gte('demo_code_expires_at', new Date().toISOString())
        .maybeSingle();

      if (queryErr) throw queryErr;

      if (!demoReq) {
        setError('Invalid or expired code. Please check your email or contact sales@everythingeco.com.au');
        setLoading(false);
        return;
      }

      // 2. Sign in with shared demo account
      const { error: signInErr } = await supabase.auth.signInWithPassword({
        email: 'demo@globalhomes.app',
        password: 'DemoAccess2024!',
      });
      if (signInErr) throw signInErr;

      // 3. Mark as redeemed
      await supabase
        .from('demo_requests' as any)
        .update({ status: 'redeemed' } as any)
        .eq('id', (demoReq as any).id);

      // 4. Navigate to dashboard
      toast.success('Welcome to the demo!');
      navigate('/dashboard');
    } catch (err: any) {
      console.error('Demo access error:', err);
      setError(err.message || 'Something went wrong. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-background flex items-center justify-center px-4">
      <div className="w-full max-w-sm">
        {/* Brand */}
        <div className="text-center mb-8">
          <Link to="/" className="inline-flex items-center gap-2 mb-4">
            <div className="w-10 h-10 rounded-full bg-primary flex items-center justify-center">
              <span className="text-primary-foreground text-sm font-bold">W</span>
            </div>
          </Link>
          <h1 className="font-display text-2xl font-bold text-foreground">Global Homes</h1>
          <div className="flex items-center justify-center gap-2 mt-2">
            <KeyRound size={14} className="text-primary" />
            <span className="text-xs font-semibold text-primary uppercase tracking-wider">Demo Access</span>
          </div>
        </div>

        {/* Form */}
        <div className="bg-card border border-border rounded-2xl p-6 shadow-sm">
          {/* Demo Mode notice */}
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
