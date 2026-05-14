import { useEffect, useState } from 'react';
import { Helmet } from 'react-helmet-async';
import { Sparkles, Clock, CheckCircle2 } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/features/auth/AuthProvider';
import { supabase } from '@/integrations/supabase/client';
import { usePageTitle } from '@/lib/usePageTitle';

type Status = 'incomplete' | 'pending' | 'approved' | 'loading';

export default function PendingApprovalPage() {
  usePageTitle('Your ListHQ account');
  const { user, signOut } = useAuth();
  const navigate = useNavigate();
  const [status, setStatus] = useState<Status>('loading');

  useEffect(() => {
    if (!user?.id) return;
    supabase
      .from('agents')
      .select('approval_status, agency_id, agencies:agency_id(abn)')
      .eq('user_id', user.id)
      .maybeSingle()
      .then(({ data }) => {
        const abn = (data as any)?.agencies?.abn as string | undefined;
        if (!data || !data.agency_id || !abn) {
          setStatus('incomplete');
        } else if (data.approval_status === 'approved') {
          navigate('/dashboard', { replace: true });
        } else {
          setStatus('pending');
        }
      });
  }, [user?.id, navigate]);

  const handleSignOut = async () => {
    await signOut();
    navigate('/');
  };

  return (
    <>
      <Helmet>
        <title>Your ListHQ account · ListHQ</title>
        <meta name="robots" content="noindex,nofollow" />
      </Helmet>
      <div className="min-h-screen bg-background flex items-center justify-center px-6 py-12">
        <div className="w-full max-w-md text-center">
          <div className="text-2xl font-bold text-primary mb-8">ListHQ</div>

          {status === 'loading' && (
            <p className="text-muted-foreground">Loading your account…</p>
          )}

          {status === 'incomplete' && (
            <>
              <div className="mx-auto w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center mb-6">
                <Sparkles className="text-primary" size={32} />
              </div>
              <h1 className="text-2xl font-semibold text-foreground mb-3">Finish setting up your agency</h1>
              <p className="text-muted-foreground mb-8">
                We need a few details about your agency before you can publish your first listing. Takes about 3 minutes.
              </p>
              <a
                href="/onboarding/agency"
                className="inline-block w-full bg-primary text-primary-foreground rounded-xl py-3 px-6 font-medium hover:bg-primary/90 transition-colors mb-6"
              >
                Continue setup →
              </a>
            </>
          )}

          {status === 'pending' && (
            <>
              <div className="mx-auto w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center mb-6">
                <Clock className="text-primary" size={32} />
              </div>
              <h1 className="text-2xl font-semibold text-foreground mb-3">We're reviewing your application</h1>
              <p className="text-muted-foreground mb-8">
                Our team is verifying your licence and ABN. This usually takes 1–2 business days. You'll get an email the moment you're approved.
              </p>
              <div className="bg-card border border-border rounded-xl p-5 text-left mb-6">
                <p className="text-sm font-medium text-foreground mb-3">While you wait:</p>
                <ul className="space-y-2 text-sm text-muted-foreground">
                  <li className="flex items-start gap-2">
                    <CheckCircle2 size={16} className="text-primary mt-0.5 shrink-0" />
                    <span>Watch the 90-second product tour at listhq.com.au/agents/demo</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <CheckCircle2 size={16} className="text-primary mt-0.5 shrink-0" />
                    <span>Prep photos for your first listing</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <CheckCircle2 size={16} className="text-primary mt-0.5 shrink-0" />
                    <span>You'll get 3 free Halo credits the moment you're approved</span>
                  </li>
                </ul>
              </div>
            </>
          )}

          {user?.email && (
            <p className="text-xs text-muted-foreground mb-2">Signed in as {user.email}</p>
          )}
          <button
            onClick={handleSignOut}
            className="text-xs text-muted-foreground underline hover:text-foreground transition-colors mb-2"
          >
            Sign out
          </button>
          <p className="text-xs text-muted-foreground mt-4">
            Questions? Email{' '}
            <a href="mailto:hello@listhq.com.au" className="underline">hello@listhq.com.au</a>
          </p>
        </div>
      </div>
    </>
  );
}
