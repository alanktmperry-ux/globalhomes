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
        const hash = window.location.hash;
        const params = new URLSearchParams(hash.replace('#', '?'));
        const accessToken = params.get('access_token');
        const refreshToken = params.get('refresh_token');
        const errorDesc = params.get('error_description');

        if (errorDesc) {
          setStatus('error');
          setMessage(decodeURIComponent(errorDesc));
          return;
        }

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
        } else {
          setStatus('error');
          setMessage('Invalid confirmation link. Please try signing up again.');
        }
      } catch (err: any) {
        setStatus('error');
        setMessage(err.message || 'Confirmation failed.');
      }
    };

    handleConfirmation();
  }, [navigate]);

  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4">
      <div className="w-full max-w-md text-center space-y-6">
        <div className="flex justify-center">
          {status === 'verifying' && (
            <Loader2 className="h-12 w-12 animate-spin text-primary" />
          )}
          {status === 'success' && (
            <CheckCircle2 className="h-12 w-12 text-green-500" />
          )}
          {status === 'error' && (
            <XCircle className="h-12 w-12 text-destructive" />
          )}
        </div>

        <h1 className="text-2xl font-bold text-foreground">
          {status === 'verifying' && 'Confirming your email…'}
          {status === 'success' && 'Email confirmed!'}
          {status === 'error' && 'Confirmation failed'}
        </h1>

        <p className="text-muted-foreground">
          {status === 'verifying' && 'Please wait a moment.'}
          {message}
        </p>

        {status === 'error' && (
          <Link
            to="/agents/login"
            className="inline-block rounded-lg bg-primary px-6 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90 transition-colors"
          >
            Back to sign in
          </Link>
        )}
      </div>
    </div>
  );
};

export default AuthConfirmPage;
