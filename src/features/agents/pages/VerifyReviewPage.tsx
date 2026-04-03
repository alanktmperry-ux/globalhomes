import { useEffect, useState } from 'react';
import { useSearchParams, Link } from 'react-router-dom';
import { CheckCircle, XCircle } from 'lucide-react';

export default function VerifyReviewPage() {
  const [params] = useSearchParams();
  const token = params.get('token');
  const [status, setStatus] = useState<'loading' | 'success' | 'error'>('loading');

  useEffect(() => {
    if (!token) { setStatus('error'); return; }

    // The verify-review edge function handles verification via redirect,
    // so if we land here with ?review=verified in the URL, it succeeded.
    const reviewParam = params.get('review');
    if (reviewParam === 'verified') {
      setStatus('success');
    } else if (reviewParam === 'expired' || reviewParam === 'invalid') {
      setStatus('error');
    } else {
      // Direct call to edge function
      const url = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/verify-review?token=${token}`;
      window.location.href = url;
    }
  }, [token, params]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-4">
      <div className="max-w-md w-full text-center space-y-4">
        {status === 'loading' && (
          <div className="w-10 h-10 border-4 border-primary border-t-transparent rounded-full animate-spin mx-auto" />
        )}
        {status === 'success' && (
          <>
            <CheckCircle size={48} className="mx-auto text-green-500" />
            <h1 className="text-xl font-bold text-foreground">Review Verified! ✅</h1>
            <p className="text-muted-foreground">Your review has been published.</p>
            <Link to="/" className="inline-block px-6 py-2.5 bg-primary text-primary-foreground rounded-xl text-sm font-medium">
              Back to ListHQ
            </Link>
          </>
        )}
        {status === 'error' && (
          <>
            <XCircle size={48} className="mx-auto text-destructive" />
            <h1 className="text-xl font-bold text-foreground">Link Expired or Invalid</h1>
            <p className="text-muted-foreground">This verification link has expired or is invalid.</p>
            <Link to="/" className="inline-block px-6 py-2.5 bg-primary text-primary-foreground rounded-xl text-sm font-medium">
              Back to ListHQ
            </Link>
          </>
        )}
      </div>
    </div>
  );
}
