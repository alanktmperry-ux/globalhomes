import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { toast } from 'sonner';
import { Loader2, ShieldCheck, LogOut } from 'lucide-react';
import { useAuth } from '@/features/auth/AuthProvider';

/**
 * Shown after the user signs in with email+password but their session is still
 * at AAL1 and a TOTP factor is enrolled (nextLevel === 'aal2').
 *
 * On success, Supabase upgrades the session to AAL2 — onAuthStateChange fires
 * MFA_CHALLENGE_VERIFIED and the app re-renders normally.
 */
export function MFAChallenge() {
  const { signOut } = useAuth();
  const [factorId, setFactorId] = useState<string | null>(null);
  const [challengeId, setChallengeId] = useState<string | null>(null);
  const [code, setCode] = useState('');
  const [loading, setLoading] = useState(true);
  const [verifying, setVerifying] = useState(false);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const { data, error } = await supabase.auth.mfa.listFactors();
        if (error) throw error;
        const totp = data.totp.find((f) => f.status === 'verified') ?? data.totp[0];
        if (!totp) {
          toast.error('No authenticator factor found');
          return;
        }
        const { data: chal, error: cErr } = await supabase.auth.mfa.challenge({ factorId: totp.id });
        if (cErr) throw cErr;
        if (cancelled) return;
        setFactorId(totp.id);
        setChallengeId(chal.id);
      } catch (err: any) {
        toast.error(err?.message ?? 'Could not start MFA challenge');
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, []);

  const verify = async () => {
    if (!factorId || !challengeId) return;
    if (code.length !== 6) { toast.error('Enter the 6-digit code'); return; }
    setVerifying(true);
    const { error } = await supabase.auth.mfa.verify({ factorId, challengeId, code });
    setVerifying(false);
    if (error) {
      toast.error('Incorrect code — try again');
      setCode('');
      return;
    }
    toast.success('Verified');
    // AuthProvider will react to the AAL upgrade automatically.
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-4 bg-background">
      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <ShieldCheck className="text-primary" /> Two-factor authentication
          </CardTitle>
          <CardDescription>
            Open your authenticator app and enter the 6-digit code for ListHQ.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {loading ? (
            <div className="flex justify-center py-6">
              <Loader2 className="animate-spin text-muted-foreground" />
            </div>
          ) : (
            <>
              <Input
                autoFocus
                value={code}
                onChange={(e) => setCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
                onKeyDown={(e) => e.key === 'Enter' && verify()}
                placeholder="123456"
                className="text-center text-2xl tracking-widest font-mono h-14"
                maxLength={6}
                inputMode="numeric"
                autoComplete="one-time-code"
              />
              <Button className="w-full" onClick={verify} disabled={verifying || code.length !== 6}>
                {verifying ? <Loader2 className="animate-spin" /> : 'Verify'}
              </Button>
              <Button variant="ghost" className="w-full" onClick={signOut}>
                <LogOut className="size-4" /> Sign out
              </Button>
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
