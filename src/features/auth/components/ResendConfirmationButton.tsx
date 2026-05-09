import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

interface Props {
  email: string;
}

const COOLDOWN_SECONDS = 60;

const ResendConfirmationButton = ({ email }: Props) => {
  const [cooldown, setCooldown] = useState(0);
  const [sending, setSending] = useState(false);

  useEffect(() => {
    if (cooldown <= 0) return;
    const id = setInterval(() => setCooldown((c) => (c > 0 ? c - 1 : 0)), 1000);
    return () => clearInterval(id);
  }, [cooldown]);

  const handleResend = async () => {
    if (cooldown > 0 || sending || !email) return;
    setSending(true);
    try {
      const { error } = await supabase.auth.resend({ type: 'signup', email });
      if (error) {
        toast.error('Could not resend. Try again in a minute.');
      } else {
        toast.success('Sent — check your inbox.');
        setCooldown(COOLDOWN_SECONDS);
      }
    } catch {
      toast.error('Could not resend. Try again in a minute.');
    } finally {
      setSending(false);
    }
  };

  const disabled = cooldown > 0 || sending;

  return (
    <button
      type="button"
      onClick={handleResend}
      disabled={disabled}
      className="mt-4 text-[14px] text-blue-600 hover:text-blue-700 font-medium disabled:text-stone-400 disabled:cursor-not-allowed"
    >
      {cooldown > 0
        ? `Resend available in ${cooldown}s`
        : sending
          ? 'Sending…'
          : "Didn't get it? Resend the email"}
    </button>
  );
};

export default ResendConfirmationButton;
