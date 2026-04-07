import { useState, useEffect } from 'react';
import { useSearchParams, useNavigate, Link } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { Loader2, CheckCircle, XCircle } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { getErrorMessage } from '@/shared/lib/errorUtils';

const PartnerAcceptPage = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const token = searchParams.get('token');

  const [status, setStatus] = useState<'loading' | 'success' | 'error'>('loading');
  const [agencyName, setAgencyName] = useState('');
  const [errorMsg, setErrorMsg] = useState('');

  useEffect(() => {
    if (!token) {
      setErrorMsg('No invitation token found in the URL.');
      setStatus('error');
      return;
    }

    const accept = async () => {
      try {
        const { data, error } = await supabase.functions.invoke('accept-partner-invite', {
          body: { token },
        });

        if (error) throw new Error(error.message);
        if (data?.error) throw new Error(data.error);

        setAgencyName(data.agencyName || 'the agency');
        setStatus('success');
      } catch (err: unknown) {
        setErrorMsg(getErrorMessage(err) || 'Failed to accept invitation.');
        setStatus('error');
      }
    };

    accept();
  }, [token]);

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
            <h1 className="font-display text-xl font-bold text-foreground">Invitation accepted</h1>
            <p className="text-sm text-muted-foreground leading-relaxed">
              You now have access to <strong className="text-foreground">{agencyName}</strong>'s trust accounting.
            </p>
            <Button onClick={() => navigate('/partner/dashboard')} className="mt-2">
              Go to portal →
            </Button>
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
              <Button asChild>
                <Link to="/partner/dashboard">Go to portal</Link>
              </Button>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
};

export default PartnerAcceptPage;
