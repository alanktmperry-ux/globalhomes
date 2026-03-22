import { useEffect, useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { Loader2, CheckCircle2, XCircle } from 'lucide-react';

const AuthConfirmPage = () => {
  const navigate = useNavigate();
  const [status, setStatus] = useState<'verifying' | 'success' | 'error'>('verifying');
  const [message, setMessage] = useState('');

  useEffect(() => {
    const handleConfirmation = async () => {
      try {
        // Supabase v2 sends token_hash as a query param (?token_hash=...&type=signup)
        // Older format sent access_token in the hash fragment (#access_token=...)
        // We handle both.

        const queryParams = new URLSearchParams(window.location.search);
        const hashParams = new URLSearchParams(
          window.location.hash.replace('#', '?')
        );

        // Check for error in either location
        const errorDesc =
          queryParams.get('error_description') ||
          hashParams.get('error_description');

        if (errorDesc) {
          setStatus('error');
          setMessage(decodeURIComponent(errorDesc));
          return;
        }

        // Format 1 — Supabase v2 query param style
        const tokenHash = queryParams.get('token_hash');
        const type = queryParams.get('type');

        if (tokenHash && type) {
          const { error } = await supabase.auth.verifyOtp({
            token_hash: tokenHash,
            type: type as any,
          });

          if (error) throw error;

          setStatus('success');
          setMessage('Email confirmed! Taking you to your dashboard...');
          setTimeout(() => {
            navigate('/dashboard', { replace: true });
          }, 1500);
          return;
        }

        // Format 2 — hash fragment style (older Supabase / PKCE)
        const accessToken = hashParams.get('access_token');
        const refreshToken = hashParams.get('refresh_token');

        if (accessToken && refreshToken) {
          const { data, error } = await supabase.auth.setSession({
            access_token: accessToken,
            refresh_token: refreshToken,
          });

          if (error) throw error;

          if (data.session) {
            setStatus('success');
            setMessage('Email confirmed! Taking you to your dashboard...');
            setTimeout(() => {
              navigate('/dashboard', { replace: true });
            }, 1500);
          }
          return;
        }

        // Nothing found in URL
        setStatus('error');
        setMessage('Invalid confirmation link. Please try signing up again or contact support@listhq.com.au');

      } catch (err: any) {
        setStatus('error');
        setMessage(err.message || 'Confirmation failed. Please try again.');
      }
    };

    handleConfirmation();
  }, [navigate]);

  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4">
      <div className="w-full max-w-md text-center space-y-6">

        <div className="flex justify-center">
          {status === 'verifying' && (
            <div className="w-16 h-16 rounded-2xl bg-primary/10 flex items-center justify-center">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
          )}
          {status === 'success' && (
            <div className="w-16 h-16 rounded-2xl bg-emerald-500/10 flex items-center justify-center">
              <CheckCircle2 className="h-8 w-8 text-emerald-500" />
            </div>
          )}
          {status === 'error' && (
            <div className="w-16 h-16 rounded-2xl bg-destructive/10 flex items-center justify-center">
              <XCircle className="h-8 w-8 text-destructive" />
            </div>
          )}
        </div>

        <div>
          <h1 className="text-2xl font-bold text-foreground mb-2">
            {status === 'verifying' && 'Confirming your email…'}
            {status === 'success' && 'Email confirmed!'}
            {status === 'error' && 'Confirmation failed'}
          </h1>
          <p className="text-muted-foreground text-sm">
            {status === 'verifying' && 'Please wait a moment.'}
            {message}
          </p>
        </div>

        {status === 'error' && (
          <Link
            to="/agents/login"
            className="inline-flex items-center justify-center rounded-full bg-primary px-8 py-3 text-sm font-semibold text-primary-foreground hover:opacity-90 transition-opacity"
          >
            Back to sign in
          </Link>
        )}

      </div>
    </div>
  );
};

export default AuthConfirmPage;
