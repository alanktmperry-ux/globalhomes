import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Lock, AlertTriangle } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

const ResetPasswordPage = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [ready, setReady] = useState(false);
  const [expired, setExpired] = useState(false);

  useEffect(() => {
    let mounted = true;

    // Check hash for errors (token already consumed by email client prefetch)
    const hash = window.location.hash;
    if (hash.includes('error=') || hash.includes('error_code=')) {
      setExpired(true);
      return;
    }

    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (!mounted) return;
      if (event === 'PASSWORD_RECOVERY') {
        setReady(true);
      }
      if ((event === 'INITIAL_SESSION' || event === 'SIGNED_IN') && session) {
        setReady(true);
      }
    });

    if (hash.includes('type=recovery')) {
      setReady(true);
    }

    // Check for existing session
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (mounted && session) setReady(true);
    });

    // Timeout: if nothing works after 5s, show expired message
    const timeout = setTimeout(() => {
      if (mounted && !ready) setExpired(true);
    }, 5000);

    return () => {
      mounted = false;
      subscription.unsubscribe();
      clearTimeout(timeout);
    };
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      const { error } = await supabase.auth.updateUser({ password });
      if (error) throw error;
      toast({ title: 'Password updated!', description: 'You can now sign in with your new password.' });
      navigate('/');
    } catch (err: any) {
      toast({ title: 'Error', description: err.message, variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  };

  if (expired) {
    return (
      <div className="min-h-screen bg-background flex flex-col items-center justify-center px-6">
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="max-w-sm w-full text-center space-y-4">
          <AlertTriangle size={40} className="mx-auto text-destructive" />
          <h1 className="font-display text-xl font-bold text-foreground">Reset link expired</h1>
          <p className="text-sm text-muted-foreground">
            This password reset link has expired or was already used. Some email clients pre-scan links which can invalidate them.
          </p>
          <button
            onClick={() => navigate('/forgot-password')}
            className="w-full py-3 rounded-xl bg-primary text-primary-foreground font-semibold text-sm"
          >
            Request a new reset link
          </button>
        </motion.div>
      </div>
    );
  }

  if (!ready) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <p className="text-muted-foreground text-sm">Verifying reset link...</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <main className="flex-1 flex flex-col justify-center max-w-sm mx-auto w-full px-6 py-8">
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
          <h1 className="font-display text-2xl font-bold text-foreground mb-1">Set new password</h1>
          <p className="text-sm text-muted-foreground mb-6">Enter your new password below.</p>
          <form onSubmit={handleSubmit} className="space-y-3">
            <div className="relative">
              <Lock size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-muted-foreground" />
              <input
                type="password" placeholder="New password" required minLength={6} value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full pl-10 pr-4 py-3 rounded-xl bg-secondary text-foreground text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/30"
              />
            </div>
            <button type="submit" disabled={loading}
              className="w-full py-3 rounded-xl bg-primary text-primary-foreground font-semibold text-sm disabled:opacity-50">
              {loading ? 'Updating...' : 'Update Password'}
            </button>
          </form>
        </motion.div>
      </main>
    </div>
  );
};

export default ResetPasswordPage;
