import { useEffect, useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { Loader2, CheckCircle2, XCircle } from 'lucide-react';

const AuthConfirmPage = () => {
  const navigate = useNavigate();
  const [status, setStatus] = useState<
    'verifying' | 'success' | 'error'
  >('verifying');
  const [message, setMessage] = useState('');

  useEffect(() => {
    let timeout: ReturnType<typeof setTimeout>;

    const handleConfirmation = async () => {
      // Lovable's email proxy handles the token
      // and fires onAuthStateChange automatically.
      // We just need to check if a session exists.

      // Give Supabase a moment to process
      // the auth state change from Lovable
      await new Promise(r => setTimeout(r, 1500));

      const { data: { session } } =
        await supabase.auth.getSession();

      if (session?.user) {
        setStatus('success');
        setMessage(
          'Email confirmed! Taking you to your dashboard...'
        );
        setTimeout(() => {
          navigate('/dashboard', { replace: true });
        }, 1500);
      } else {
        // Listen for auth state change
        // in case Lovable fires it slightly later
        const { data: { subscription } } =
          supabase.auth.onAuthStateChange(
            (event, session) => {
              if (
                event === 'SIGNED_IN' &&
                session?.user
              ) {
                subscription.unsubscribe();
                setStatus('success');
                setMessage(
                  'Email confirmed! Taking you to your dashboard...'
                );
                setTimeout(() => {
                  navigate('/dashboard',
                    { replace: true });
                }, 1500);
              }
            }
          );

        // If still no session after 8 seconds
        // something genuinely went wrong
        timeout = setTimeout(() => {
          subscription.unsubscribe();
          setStatus('error');
          setMessage(
            'Confirmation link has expired or ' +
            'already been used. Please sign up again.'
          );
        }, 8000);
      }
    };

    handleConfirmation();

    return () => {
      if (timeout) clearTimeout(timeout);
    };
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
