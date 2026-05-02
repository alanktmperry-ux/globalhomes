import { useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { QRCodeSVG } from 'qrcode.react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { toast } from 'sonner';
import { Loader2, ShieldCheck } from 'lucide-react';
import { getErrorMessage } from '@/shared/lib/errorUtils';

interface Props {
  onEnrolled: () => void;
  onCancel?: () => void;
}

export function MFASetup({ onEnrolled, onCancel }: Props) {
  const [step, setStep] = useState<'start' | 'scan'>('start');
  const [factorId, setFactorId] = useState('');
  const [qrUri, setQrUri] = useState('');
  const [secret, setSecret] = useState('');
  const [challengeId, setChallengeId] = useState('');
  const [code, setCode] = useState('');
  const [loading, setLoading] = useState(false);

  const cleanupOrphan = async (id: string) => {
    try { await supabase.auth.mfa.unenroll({ factorId: id }); } catch { /* ignore */ }
  };

  const startEnroll = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase.auth.mfa.enroll({
        factorType: 'totp',
        friendlyName: `Authenticator (${new Date().toISOString().slice(0, 10)})`,
      });
      if (error) { toast.error(error.message); return; }
      setFactorId(data.id);
      setQrUri(data.totp.qr_code);
      setSecret(data.totp.secret);
      const { data: chal, error: cErr } = await supabase.auth.mfa.challenge({ factorId: data.id });
      if (cErr) { await cleanupOrphan(data.id); toast.error(cErr.message); return; }
      setChallengeId(chal.id);
      setStep('scan');
    } catch (err) {
      toast.error(getErrorMessage(err));
    } finally {
      setLoading(false);
    }
  };

  const verifyCode = async () => {
    if (code.length !== 6) { toast.error('Enter the 6-digit code from your app'); return; }
    setLoading(true);
    try {
      const { error } = await supabase.auth.mfa.verify({ factorId, challengeId, code });
      if (error) { toast.error('Incorrect code — try again'); setCode(''); return; }
      toast.success('Two-factor authentication enabled');
      onEnrolled();
    } finally {
      setLoading(false);
    }
  };

  const cancel = async () => {
    if (factorId) await cleanupOrphan(factorId);
    onCancel?.();
  };

  if (step === 'start') {
    return (
      <div className="space-y-4">
        <p className="text-sm text-muted-foreground">
          Use an authenticator app (Google Authenticator, Authy, 1Password) to generate a
          time-based code each time you log in.
        </p>
        <div className="flex gap-2">
          <Button onClick={startEnroll} disabled={loading}>
            {loading ? <Loader2 className="animate-spin" /> : <ShieldCheck />}
            Set up authenticator app
          </Button>
          {onCancel && (
            <Button variant="ghost" onClick={onCancel} disabled={loading}>Cancel</Button>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <p className="text-sm">
        Scan this QR code with your authenticator app, then enter the 6-digit code it shows.
      </p>
      <div className="flex justify-center bg-white p-4 rounded-md border w-fit">
        <QRCodeSVG value={qrUri} size={192} />
      </div>
      <details className="text-xs text-muted-foreground">
        <summary className="cursor-pointer">Can't scan? Enter key manually</summary>
        <code className="block mt-2 p-2 bg-muted rounded font-mono break-all">{secret}</code>
      </details>
      <div className="flex items-center gap-2">
        <Input
          value={code}
          onChange={(e) => setCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
          onKeyDown={(e) => e.key === 'Enter' && verifyCode()}
          placeholder="123456"
          className="w-32 text-center text-lg tracking-widest font-mono"
          maxLength={6}
          inputMode="numeric"
          autoComplete="one-time-code"
        />
        <Button onClick={verifyCode} disabled={loading || code.length !== 6}>
          {loading ? <Loader2 className="animate-spin" /> : 'Verify & enable'}
        </Button>
        <Button variant="ghost" onClick={cancel} disabled={loading}>Cancel</Button>
      </div>
    </div>
  );
}
