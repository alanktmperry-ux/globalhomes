import { useState, useEffect, useRef, useCallback } from 'react';
import { motion } from 'framer-motion';
import { Loader2, ArrowLeft } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { getErrorMessage } from '@/shared/lib/errorUtils';

interface Props {
  email: string;
  onVerified: () => void;
  onBack: () => void;
}

const RESEND_SECONDS = 60;

export const OTPVerificationScreen = ({ email, onVerified, onBack }: Props) => {
  const [digits, setDigits] = useState<string[]>(['', '', '', '', '', '']);
  const [verifying, setVerifying] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [shake, setShake] = useState(false);
  const [secondsLeft, setSecondsLeft] = useState(RESEND_SECONDS);
  const [resending, setResending] = useState(false);
  const inputsRef = useRef<(HTMLInputElement | null)[]>([]);

  // Focus first input on mount
  useEffect(() => {
    inputsRef.current[0]?.focus();
  }, []);

  // Resend countdown
  useEffect(() => {
    if (secondsLeft <= 0) return;
    const t = setTimeout(() => setSecondsLeft((s) => s - 1), 1000);
    return () => clearTimeout(t);
  }, [secondsLeft]);

  const code = digits.join('');
  const filled = code.length === 6 && digits.every((d) => d !== '');

  const handleChange = (i: number, raw: string) => {
    const v = raw.replace(/\D/g, '').slice(0, 1);
    setError(null);
    setDigits((prev) => {
      const next = [...prev];
      next[i] = v;
      return next;
    });
    if (v && i < 5) {
      inputsRef.current[i + 1]?.focus();
    }
  };

  const handleKeyDown = (i: number, e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Backspace' && !digits[i] && i > 0) {
      inputsRef.current[i - 1]?.focus();
    } else if (e.key === 'ArrowLeft' && i > 0) {
      inputsRef.current[i - 1]?.focus();
    } else if (e.key === 'ArrowRight' && i < 5) {
      inputsRef.current[i + 1]?.focus();
    } else if (e.key === 'Enter' && filled) {
      handleVerify();
    }
  };

  const handlePaste = (e: React.ClipboardEvent<HTMLInputElement>) => {
    const pasted = e.clipboardData.getData('text').replace(/\D/g, '').slice(0, 6);
    if (pasted.length === 0) return;
    e.preventDefault();
    const next = ['', '', '', '', '', ''];
    for (let i = 0; i < pasted.length; i++) next[i] = pasted[i];
    setDigits(next);
    setError(null);
    const focusIdx = Math.min(pasted.length, 5);
    inputsRef.current[focusIdx]?.focus();
  };

  const triggerShake = () => {
    setShake(true);
    setTimeout(() => setShake(false), 450);
  };

  const handleVerify = useCallback(async () => {
    if (verifying || !filled) return;
    setVerifying(true);
    setError(null);
    try {
      const { error: vErr } = await supabase.auth.verifyOtp({
        email,
        token: code,
        type: 'email',
      });
      if (vErr) throw vErr;
      onVerified();
    } catch (err) {
      triggerShake();
      setError('Incorrect code — please try again');
      setDigits(['', '', '', '', '', '']);
      setTimeout(() => inputsRef.current[0]?.focus(), 50);
      // Avoid noisy toast on common wrong-code errors
      if (!/invalid|expired|otp/i.test(getErrorMessage(err))) {
        toast.error('Verification failed', { description: getErrorMessage(err) });
      }
    } finally {
      setVerifying(false);
    }
  }, [code, email, filled, onVerified, verifying]);

  // Auto-submit once all 6 digits entered
  useEffect(() => {
    if (filled && !verifying) {
      handleVerify();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filled]);

  const handleResend = async () => {
    if (secondsLeft > 0 || resending) return;
    setResending(true);
    try {
      const { error: rErr } = await supabase.auth.signInWithOtp({
        email,
        options: { shouldCreateUser: true },
      });
      if (rErr) throw rErr;
      toast.success('New code sent', { description: `Check ${email}` });
      setSecondsLeft(RESEND_SECONDS);
      setDigits(['', '', '', '', '', '']);
      setError(null);
      inputsRef.current[0]?.focus();
    } catch (err) {
      toast.error('Could not resend', { description: getErrorMessage(err) });
    } finally {
      setResending(false);
    }
  };

  const mm = Math.floor(secondsLeft / 60);
  const ss = (secondsLeft % 60).toString().padStart(2, '0');

  return (
    <div className="min-h-screen bg-stone-50 flex items-center justify-center px-4 py-12">
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.25 }}
        className="w-full max-w-[400px] bg-white rounded-3xl border border-stone-200 shadow-sm p-8 sm:p-10"
      >
        <button
          type="button"
          onClick={onBack}
          className="flex items-center gap-1.5 text-[13px] text-stone-500 hover:text-stone-800 mb-8 transition-colors"
        >
          <ArrowLeft size={14} /> Wrong email? Go back
        </button>

        <h1 className="text-[28px] font-semibold tracking-[-0.5px] text-stone-900 leading-tight">
          Check your email
        </h1>
        <p className="text-[14px] text-stone-500 mt-2">
          We sent a 6-digit code to{' '}
          <span className="text-stone-800 font-medium">{email}</span>
        </p>

        <motion.div
          animate={shake ? { x: [0, -8, 8, -6, 6, -3, 3, 0] } : { x: 0 }}
          transition={{ duration: 0.4 }}
          className="mt-8 flex gap-2 sm:gap-2.5 justify-between"
        >
          {digits.map((d, i) => (
            <input
              key={i}
              ref={(el) => (inputsRef.current[i] = el)}
              type="text"
              inputMode="numeric"
              autoComplete={i === 0 ? 'one-time-code' : 'off'}
              maxLength={1}
              value={d}
              onChange={(e) => handleChange(i, e.target.value)}
              onKeyDown={(e) => handleKeyDown(i, e)}
              onPaste={handlePaste}
              disabled={verifying}
              aria-label={`Digit ${i + 1}`}
              className={`w-[48px] h-[60px] sm:w-[52px] sm:h-[64px] text-center text-[24px] font-semibold rounded-2xl border-2 bg-stone-50 text-stone-900 transition-all focus:outline-none focus:bg-white focus:ring-4 focus:ring-blue-500/15 ${
                error
                  ? 'border-red-400 focus:border-red-500'
                  : d
                  ? 'border-blue-500 focus:border-blue-500'
                  : 'border-stone-200 focus:border-blue-400'
              } disabled:opacity-50`}
            />
          ))}
        </motion.div>

        {error && (
          <p className="text-[13px] text-red-500 mt-3 text-center">{error}</p>
        )}

        <button
          type="button"
          onClick={handleVerify}
          disabled={!filled || verifying}
          className="mt-7 w-full h-[52px] rounded-2xl bg-blue-600 hover:bg-blue-700 text-white text-[15px] font-medium transition-colors disabled:opacity-40 flex items-center justify-center gap-2"
        >
          {verifying ? (
            <>
              <Loader2 size={16} className="animate-spin" /> Verifying…
            </>
          ) : (
            'Verify'
          )}
        </button>

        <div className="mt-6 text-center text-[13px]">
          {secondsLeft > 0 ? (
            <span className="text-stone-400">
              Resend in {mm}:{ss}
            </span>
          ) : (
            <button
              type="button"
              onClick={handleResend}
              disabled={resending}
              className="text-blue-600 font-medium hover:underline underline-offset-2 disabled:opacity-50"
            >
              {resending ? 'Sending…' : 'Resend code'}
            </button>
          )}
        </div>
      </motion.div>
    </div>
  );
};

export default OTPVerificationScreen;
