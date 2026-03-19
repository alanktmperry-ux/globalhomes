import { useState } from 'react';
import { motion } from 'framer-motion';
import { Mail, ArrowLeft } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/shared/hooks/use-toast';

const ForgotPasswordPage = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      // Always use the published URL so the reset link doesn't hit the preview auth gate
      const publishedOrigin = 'https://globalhomes.lovable.app';
      const isPreview = window.location.hostname.includes('lovableproject.com') ||
        (window.location.hostname.includes('lovable.app') && window.location.hostname.includes('preview'));
      const origin = isPreview ? publishedOrigin : window.location.origin;
      // Ensure demo request emails are provisioned as auth users so reset emails can be delivered
      await supabase.functions.invoke('handle-demo-request', {
        body: { action: 'ensure_auth_user', email: email.trim() },
      });

      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: `${origin}/reset-password`,
      });
      if (error) throw error;
      setSent(true);
      toast({ title: 'Check your email', description: 'We sent a password reset link.' });
    } catch (err: any) {
      toast({ title: 'Error', description: err.message, variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <header className="px-4 pt-4">
        <button onClick={() => navigate('/auth')} className="w-9 h-9 rounded-xl bg-secondary flex items-center justify-center">
          <ArrowLeft size={18} />
        </button>
      </header>
      <main className="flex-1 flex flex-col justify-center max-w-sm mx-auto w-full px-6 py-8">
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
          <h1 className="font-display text-2xl font-bold text-foreground mb-1">Reset password</h1>
          <p className="text-sm text-muted-foreground mb-6">
            {sent ? 'Check your inbox for a reset link.' : "Enter your email and we'll send a reset link."}
          </p>
          {!sent && (
            <form onSubmit={handleSubmit} className="space-y-3">
              <div className="relative">
                <Mail size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-muted-foreground" />
                <input
                  type="email" placeholder="Email address" required value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full pl-10 pr-4 py-3 rounded-xl bg-secondary text-foreground text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/30"
                />
              </div>
              <button type="submit" disabled={loading}
                className="w-full py-3 rounded-xl bg-primary text-primary-foreground font-semibold text-sm disabled:opacity-50">
                {loading ? 'Sending...' : 'Send Reset Link'}
              </button>
            </form>
          )}
        </motion.div>
      </main>
    </div>
  );
};

export default ForgotPasswordPage;
