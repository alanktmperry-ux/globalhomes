import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { Building2, Loader2, KeyRound, Eye, EyeOff } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

const DemoAccessPage = () => {
  const navigate = useNavigate();
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [code, setCode] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [showPassword, setShowPassword] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!fullName.trim() || !email.trim() || !password.trim() || !code.trim()) return;
    if (password.length < 6) {
      setError('Password must be at least 6 characters.');
      return;
    }
    setLoading(true);
    setError('');

    try {
      // 1. Validate the demo code
      const { data: demoReq, error: queryErr } = await supabase
        .from('demo_requests' as any)
        .select('*')
        .eq('email', email.trim().toLowerCase())
        .eq('demo_code', code.trim().toUpperCase())
        .eq('status', 'approved')
        .gte('demo_code_expires_at', new Date().toISOString())
        .maybeSingle();

      if (queryErr) throw queryErr;

      if (!demoReq) {
        setError('This code is invalid, expired, or doesn\'t match this email. Please contact sales@everythingeco.com.au');
        setLoading(false);
        return;
      }

      // 2. Register a new account
      const { data: signUpData, error: signUpErr } = await supabase.auth.signUp({
        email: email.trim().toLowerCase(),
        password,
        options: {
          data: { display_name: fullName.trim(), phone: '' },
          emailRedirectTo: window.location.origin,
        },
      });
      if (signUpErr) throw signUpErr;

      const userId = signUpData.user?.id;
      if (!userId) throw new Error('Account creation failed.');

      // 3. Seed demo data for this user
      const { data: seedResult, error: seedErr } = await supabase.functions.invoke('seed-demo-agent', {
        body: {
          user_id: userId,
          display_name: fullName.trim(),
          email: email.trim().toLowerCase(),
        },
      });
      if (seedErr) throw seedErr;
      if (seedResult?.error) throw new Error(seedResult.error);

      // 4. Mark demo request as used
      await supabase
        .from('demo_requests' as any)
        .update({ status: 'redeemed' } as any)
        .eq('id', (demoReq as any).id);

      toast.success('Account created! Please check your email to verify, then log in.');
      navigate('/agents/login');
    } catch (err: any) {
      console.error('Demo registration error:', err);
      if (err.message?.includes('already registered')) {
        setError('This email is already registered. Please log in instead.');
      } else {
        setError(err.message || 'Something went wrong. Please try again.');
      }
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
            <span className="text-xs font-semibold text-primary uppercase tracking-wider">Demo Registration</span>
          </div>
        </div>

        {/* Form */}
        <div className="bg-card border border-border rounded-2xl p-6 shadow-sm">
          <p className="text-sm text-muted-foreground mb-5 text-center">
            Create your demo account to explore the agent platform.
          </p>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="text-sm font-medium text-foreground mb-1.5 block">Full Name</label>
              <Input
                type="text"
                required
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                placeholder="Jane Smith"
                autoFocus
              />
            </div>
            <div>
              <label className="text-sm font-medium text-foreground mb-1.5 block">Email Address</label>
              <Input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="your@email.com"
              />
            </div>
            <div>
              <label className="text-sm font-medium text-foreground mb-1.5 block">Create Password</label>
              <div className="relative">
                <Input
                  type={showPassword ? 'text' : 'password'}
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Min 6 characters"
                  minLength={6}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                >
                  {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
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
              {loading ? <><Loader2 className="h-4 w-4 animate-spin mr-2" /> Creating Account...</> : 'Create Demo Account'}
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
