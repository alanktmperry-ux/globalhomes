import { useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Mail, ArrowLeft } from 'lucide-react';
import { Link } from 'react-router-dom';

export default function CheckEmailPage() {
  const [resending, setResending] = useState(false);

  const handleResend = async () => {
    const email = sessionStorage.getItem('listhq_pending_email');
    if (!email) {
      toast.error('Email address not found — please go back and try again');
      return;
    }
    setResending(true);
    try {
      await supabase.auth.resend({ type: 'signup', email });
      toast.success('Confirmation email resent — check your inbox');
    } catch {
      toast.error('Could not resend — please try again');
    } finally {
      setResending(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-background px-4">
      <div className="max-w-md w-full text-center space-y-6">
        <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center mx-auto">
          <Mail size={32} className="text-primary" />
        </div>

        <div className="space-y-2">
          <h1 className="text-2xl font-extrabold text-foreground">Check your inbox</h1>
          <p className="text-sm text-muted-foreground">
            We've sent a confirmation link to your email address. Click it to verify your email and continue setting up your ListHQ agency account.
          </p>
        </div>

        <div className="bg-secondary/50 rounded-xl p-4 text-left space-y-2 text-sm text-muted-foreground">
          <p>✓ Check your spam or junk folder if you don't see it</p>
          <p>✓ The link expires after 24 hours</p>
          <p>✓ Your Agent Quick-Start Guide is also attached — download it while you wait</p>
        </div>

        <div className="space-y-3">
          <Button variant="outline" className="w-full" onClick={handleResend} disabled={resending}>
            {resending ? 'Sending...' : 'Resend confirmation email'}
          </Button>
          <Link to="/" className="flex items-center justify-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors">
            <ArrowLeft size={14} /> Back to homepage
          </Link>
        </div>
      </div>
    </div>
  );
}