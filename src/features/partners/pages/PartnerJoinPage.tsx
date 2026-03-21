import { useState, useEffect } from 'react';
import { useSearchParams, useNavigate, Link } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/features/auth/AuthProvider';
import { Loader2, CheckCircle, XCircle } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { toast } from 'sonner';

const PartnerJoinPage = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const token = searchParams.get('token');

  const [status, setStatus] = useState<'loading' | 'form' | 'success' | 'error'>('loading');
  const [errorMsg, setErrorMsg] = useState('');
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (!token) {
      setErrorMsg('No invitation token found in the URL.');
      setStatus('error');
      return;
    }

    // If user is already signed in, auto-accept
    if (user) {
      const accept = async () => {
        try {
          const { data, error } = await supabase.functions.invoke('accept-partner-member-invite', {
            body: { token },
          });
          if (error) throw new Error(error.message);
          if (data?.error) throw new Error(data.error);
          setStatus('success');
          setTimeout(() => navigate('/partner/dashboard'), 2000);
        } catch (err: any) {
          setErrorMsg(err.message || 'Failed to accept invitation.');
          setStatus('error');
        }
      };
      accept();
    } else {
      setStatus('form');
    }
  }, [token, user, navigate]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (password !== confirmPassword) {
      toast.error('Passwords do not match');
      return;
    }
    if (password.length < 6) {
      toast.error('Password must be at least 6 characters');
      return;
    }
    setSubmitting(true);
    try {
      const { data, error } = await supabase.functions.invoke('accept-partner-member-invite', {
        body: { token, password, name, email },
      });
      if (error) throw new Error(error.message);
      if (data?.error) throw new Error(data.error);

      // Sign in the new user
      await supabase.auth.signInWithPassword({ email, password });
      setStatus('success');
      setTimeout(() => navigate('/partner/dashboard'), 2000);
    } catch (err: any) {
      toast.error(err.message || 'Failed to accept invitation.');
    }
    setSubmitting(false);
  };

  return (
    <div className="min-h-screen bg-background flex items-center justify-center px-6">
      {status === 'loading' && (
        <div className="text-center space-y-4">
          <Loader2 className="animate-spin text-primary mx-auto" size={32} />
          <p className="text-sm text-muted-foreground">Accepting invitation…</p>
        </div>
      )}

      {status === 'success' && (
        <Card className="max-w-md w-full border-emerald-500/30 bg-emerald-500/5">
          <CardContent className="py-10 text-center space-y-4">
            <div className="w-14 h-14 rounded-full bg-emerald-500/10 flex items-center justify-center mx-auto">
              <CheckCircle className="text-emerald-500" size={28} />
            </div>
            <h1 className="font-display text-xl font-bold text-foreground">You're in!</h1>
            <p className="text-sm text-muted-foreground leading-relaxed">
              You've joined the team. Redirecting to your portal…
            </p>
          </CardContent>
        </Card>
      )}

      {status === 'error' && (
        <Card className="max-w-md w-full border-destructive/30 bg-destructive/5">
          <CardContent className="py-10 text-center space-y-4">
            <div className="w-14 h-14 rounded-full bg-destructive/10 flex items-center justify-center mx-auto">
              <XCircle className="text-destructive" size={28} />
            </div>
            <h1 className="font-display text-xl font-bold text-foreground">Unable to accept invitation</h1>
            <p className="text-sm text-muted-foreground leading-relaxed">{errorMsg}</p>
            <div className="flex gap-3 justify-center mt-2">
              <Button variant="outline" asChild>
                <Link to="/partner/login">Sign in</Link>
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {status === 'form' && (
        <Card className="max-w-md w-full">
          <CardContent className="py-8 space-y-6">
            <div className="text-center">
              <div className="w-10 h-10 rounded-lg bg-primary flex items-center justify-center mx-auto mb-3">
                <span className="text-primary-foreground text-[10px] font-bold">LHQ</span>
              </div>
              <h1 className="font-display text-xl font-bold text-foreground">Join your team on ListHQ</h1>
              <p className="text-sm text-muted-foreground mt-1">Create your account to get started.</p>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <Label className="text-sm">Full name</Label>
                <Input value={name} onChange={e => setName(e.target.value)} required autoFocus />
              </div>
              <div>
                <Label className="text-sm">Email address</Label>
                <Input type="email" value={email} onChange={e => setEmail(e.target.value)} required />
              </div>
              <div>
                <Label className="text-sm">Password</Label>
                <Input type="password" value={password} onChange={e => setPassword(e.target.value)} required minLength={6} />
              </div>
              <div>
                <Label className="text-sm">Confirm password</Label>
                <Input type="password" value={confirmPassword} onChange={e => setConfirmPassword(e.target.value)} required minLength={6} />
              </div>
              <Button type="submit" className="w-full" disabled={submitting}>
                {submitting ? <><Loader2 className="animate-spin mr-2" size={14} /> Joining…</> : 'Join team'}
              </Button>
            </form>

            <p className="text-center text-sm text-muted-foreground">
              Already have an account?{' '}
              <Link to="/partner/login" className="text-primary font-medium underline underline-offset-2">Sign in</Link>
            </p>
          </CardContent>
        </Card>
      )}
    </div>
  );
};

export default PartnerJoinPage;
