import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { Building2, Loader2, KeyRound } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

const DemoAccessPage = () => {
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [code, setCode] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim() || !code.trim()) return;
    setLoading(true);
    setError('');

    try {
      // Look up matching demo request
      const { data, error: queryErr } = await supabase
        .from('demo_requests' as any)
        .select('*')
        .eq('email', email.trim().toLowerCase())
        .eq('demo_code', code.trim().toUpperCase())
        .eq('status', 'approved')
        .gte('demo_code_expires_at', new Date().toISOString())
        .maybeSingle();

      if (queryErr) throw queryErr;

      if (!data) {
        setError('This code is invalid or has expired. Please contact alan@squaredevelopment.com.au');
        setLoading(false);
        return;
      }

      // Seed/reset demo agent for this email
      const { data: seedResult, error: seedErr } = await supabase.functions.invoke('seed-demo-agent', {
        body: { email: email.trim().toLowerCase(), reset: true },
      });
      if (seedErr) throw seedErr;
      if (seedResult?.error) throw new Error(seedResult.error);

      // Sign in as the demo agent
      const { error: signInErr } = await supabase.auth.signInWithPassword({
        email: email.trim().toLowerCase(),
        password: 'DemoAccess2024!',
      });
      if (signInErr) throw signInErr;

      toast.success('Welcome to your demo!');
      navigate('/dashboard');
    } catch (err: any) {
      console.error('Demo access error:', err);
      setError('Something went wrong. Please try again or contact us at sales@everythingeco.com.au');
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
            <span className="text-xs font-semibold text-primary uppercase tracking-wider">Access Demo</span>
          </div>
        </div>

        {/* Form */}
        <div className="bg-card border border-border rounded-2xl p-6 shadow-sm">
          <p className="text-sm text-muted-foreground mb-5 text-center">
            Enter your email and access code to explore the agent platform.
          </p>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="text-sm font-medium text-foreground mb-1.5 block">Email Address</label>
              <Input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="your@email.com"
                autoFocus
              />
            </div>
            <div>
              <label className="text-sm font-medium text-foreground mb-1.5 block">Access Code</label>
              <Input
                type="text"
                required
                value={code}
                onChange={(e) => setCode(e.target.value.toUpperCase())}
                placeholder="RB7X2KPQ"
                maxLength={8}
                className="font-mono text-center text-lg tracking-widest"
              />
            </div>

            {error && (
              <div className="bg-destructive/10 border border-destructive/20 rounded-lg p-3 text-sm text-destructive">
                {error}
              </div>
            )}

            <Button type="submit" disabled={loading} className="w-full">
              {loading ? <><Loader2 className="h-4 w-4 animate-spin mr-2" /> Verifying...</> : 'Access Demo'}
            </Button>
          </form>
        </div>

        <p className="text-xs text-muted-foreground text-center mt-4">
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
