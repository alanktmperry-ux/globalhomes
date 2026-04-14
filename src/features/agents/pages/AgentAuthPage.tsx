import { useState, useEffect, useRef } from 'react';
import HCaptcha from '@hcaptcha/react-hcaptcha';
import { motion } from 'framer-motion';
import { Building2, Zap, Mail, ListChecks, FileText, ShieldCheck, Landmark } from 'lucide-react';
import { useNavigate, Link } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { useAuth } from '@/features/auth/AuthProvider';
import { getErrorMessage } from '@/shared/lib/errorUtils';

type Step = 'email' | 'password' | 'register' | 'check-email';

const AgentAuthPage = () => {
  const navigate = useNavigate();
  const { user, isAgent, isAdmin, loading: authLoading } = useAuth();

  // ── All useState hooks together ──
  const [pendingRedirect, setPendingRedirect] = useState<'dashboard' | null>(null);
  const [step, setStep] = useState<Step>('email');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [regEmail, setRegEmail] = useState('');
  const [emailSubmitting, setEmailSubmitting] = useState(false);
  const [loading, setLoading] = useState(false);
  const [captchaToken, setCaptchaToken] = useState<string | null>(null);
  const [pendingSignIn, setPendingSignIn] = useState(false);

  // ── All useRef hooks ──
  const captchaRef = useRef<HCaptcha>(null);

  const hcaptchaSiteKey = import.meta.env.VITE_HCAPTCHA_SITE_KEY || '10000000-ffff-ffff-ffff-000000000001';

  // ── useEffect hooks ──
  useEffect(() => {
    if (pendingRedirect === 'dashboard' && user && (isAgent || isAdmin) && !authLoading) {
      setPendingRedirect(null);
      setLoading(false);
      navigate('/dashboard');
    }
  }, [pendingRedirect, user, isAgent, isAdmin, authLoading, navigate]);

  useEffect(() => {
    if (pendingRedirect === 'dashboard' && user && !authLoading && !isAgent && !isAdmin) {
      const timeout = setTimeout(() => {
        setPendingRedirect(null);
        setLoading(false);
        toast.error('Error', { description: 'This account does not have agent access. Please contact support if you believe this is an error.' });
      }, 8000);
      return () => clearTimeout(timeout);
    }
  }, [pendingRedirect, user, authLoading, isAgent, isAdmin, toast]);

  // Auto-submit sign-in after captcha verification
  useEffect(() => {
    if (pendingSignIn && captchaToken && step === 'password') {
      setPendingSignIn(false);
      handleSignIn({ preventDefault: () => {} } as React.FormEvent);
    }
  }, [pendingSignIn, captchaToken]);

  // ── Handlers ──
  const handleEmailContinue = (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim()) return;
    setStep('password');
  };

  const handleSignIn = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!captchaToken) {
      setPendingSignIn(true);
      captchaRef.current?.execute();
      return;
    }
    setLoading(true);
    try {
      const { error } = await supabase.auth.signInWithPassword({ email, password, options: { captchaToken } });
      setCaptchaToken(null);
      captchaRef.current?.resetCaptcha();
      if (error) {
        if (error.message.includes('Email not confirmed')) {
          throw new Error('Please check your email and click the confirmation link before signing in.');
        }
        throw error;
      }
      toast('Welcome back!');
      setPendingRedirect('dashboard');
    } catch (err: unknown) {
      toast.error('Sign in failed', { description: getErrorMessage(err) });
      setLoading(false);
    }
  };

  const handleEmailSubmit = async () => {
    if (!regEmail.trim()) return;
    setEmailSubmitting(true);
    try {
      const email = regEmail.trim().toLowerCase();
      // Try to sign up first
      const { data, error } = await supabase.auth.signUp({
        email,
        password: crypto.randomUUID(),
        options: {
          emailRedirectTo: `${window.location.origin}/dashboard/onboarding`,
          data: { registration_started: true },
        },
      });
      // If user already exists (signUp returns user with identities=[]), send magic link instead
      if (!error && data.user && data.user.identities?.length === 0) {
        await supabase.auth.signInWithOtp({
          email,
          options: { emailRedirectTo: `${window.location.origin}/dashboard/onboarding` },
        });
        sessionStorage.setItem('listhq_pending_email', email);
        setStep('check-email');
        toast.info('An account with this email already exists — we sent you a sign-in link');
        return;
      }
      if (error && !error.message.toLowerCase().includes('already registered')) throw error;
      sessionStorage.setItem('listhq_pending_email', email);
      setStep('check-email');
    } catch (err: unknown) {
      toast.error(`Could not send confirmation — ${getErrorMessage(err)}`);
    } finally {
      setEmailSubmitting(false);
    }
  };

  const handleResendEmail = async () => {
    setEmailSubmitting(true);
    try {
      await supabase.auth.resend({ type: 'signup', email: regEmail.trim().toLowerCase() });
      toast.success('Confirmation email resent — check your inbox');
    } catch {
      toast.error('Could not resend — please try again');
    } finally {
      setEmailSubmitting(false);
    }
  };

  const handleOAuth = async (provider: 'google' | 'apple') => {
    const { lovable } = await import('@/integrations/lovable/index');
    const { error } = await lovable.auth.signInWithOAuth(provider, {
      redirect_uri: window.location.origin + '/auth/callback',
    });
    if (error) toast.error('Error');
  };

  const goBack = () => {
    setCaptchaToken(null);
    captchaRef.current?.resetCaptcha();
    if (step === 'password') { setStep('email'); setPassword(''); }
    else if (step === 'check-email') { setStep('register'); }
    else if (step === 'register') { setStep('email'); setRegEmail(''); }
    else navigate('/for-agents');
  };

  const inputClass = "w-full px-4 py-3.5 rounded-[14px] border border-stone-200 bg-stone-50 text-stone-900 text-sm placeholder:text-stone-300 focus:outline-none focus:border-blue-400 focus:ring-2 focus:ring-blue-100 focus:bg-white transition-all";

  const AGENT_PILLS = ['Pocket listings', 'Pre-market period', 'AI buyer matching', 'Pipeline kanban', 'Rent roll', 'Trust accounting', '24 languages'];

  return (
    <div className="min-h-screen flex" style={{ background: '#020817' }}>

      {/* ── LEFT: Dark premium panel ── */}
      <div className="hidden lg:flex lg:w-[48%] shrink-0 flex-col justify-between p-11 relative overflow-hidden">
        <div className="absolute -top-28 -right-16 w-[380px] h-[380px] rounded-full pointer-events-none" style={{ background: 'radial-gradient(circle, rgba(37,99,235,0.18) 0%, transparent 70%)' }} />
        <div className="absolute -bottom-16 -left-12 w-[280px] h-[280px] rounded-full pointer-events-none" style={{ background: 'radial-gradient(circle, rgba(37,99,235,0.10) 0%, transparent 70%)' }} />
        <div className="absolute top-0 left-0 right-0 h-px" style={{ background: 'linear-gradient(90deg, transparent, rgba(37,99,235,0.6), rgba(99,179,237,0.4), transparent)' }} />

        <div className="relative z-10 flex items-center gap-2.5">
          <div className="w-7 h-7 rounded-lg bg-blue-600 flex items-center justify-center text-[11px] font-bold text-white">L</div>
          <span className="text-[15px] font-semibold text-white tracking-tight">ListHQ</span>
        </div>

        <div className="relative z-10">
          <div className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full border mb-7" style={{ borderColor: 'rgba(37,99,235,0.3)', background: 'rgba(37,99,235,0.08)' }}>
            <span className="w-1.5 h-1.5 rounded-full bg-blue-400" />
            <span className="text-[11px] font-medium tracking-widest uppercase text-blue-400">Agent Portal</span>
          </div>

          <h2 className="text-[42px] font-light text-white leading-[1.05] tracking-tight mb-9" style={{ letterSpacing: '-1.5px' }}>
            Built for agents<br />who move <span className="font-semibold text-blue-400">fast.</span>
          </h2>

          <div className="flex flex-wrap gap-2 mb-10">
            {AGENT_PILLS.map(p => (
              <span key={p} className="px-3.5 py-1.5 rounded-full text-xs text-white/60" style={{ border: '1px solid rgba(255,255,255,0.1)', background: 'rgba(255,255,255,0.04)' }}>
                {p}
              </span>
            ))}
          </div>

          <div className="flex gap-8 pt-7" style={{ borderTop: '1px solid rgba(255,255,255,0.06)' }}>
            {[{ val: 'Free', lbl: 'First listing' }, { val: 'Live', lbl: 'Lead alerts' }, { val: 'AI', lbl: 'Buyer matching' }].map(s => (
              <div key={s.lbl}>
                <div className="text-xl font-semibold text-white tracking-tight leading-none">{s.val}</div>
                <div className="text-[11px] mt-1" style={{ color: 'rgba(255,255,255,0.35)' }}>{s.lbl}</div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* ── RIGHT: White form panel ── */}
      <div className="flex-1 bg-white flex flex-col min-h-screen">
        <div className="flex-1 flex flex-col justify-center px-10 lg:px-20 py-12 overflow-y-auto max-w-lg mx-auto w-full">
        <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }}>

          {/* Form badge */}
          <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full border border-stone-200 bg-stone-50 mb-5">
            <span className="w-1.5 h-1.5 rounded-full bg-blue-600" />
            <span className="text-[10px] font-medium tracking-widest uppercase text-stone-400">
              {(step === 'register' || step === 'check-email') ? 'Agent registration' : 'Agent sign in'}
            </span>
          </div>

          <h1 className="text-[38px] font-light text-stone-900 leading-[1.08] mb-8" style={{ letterSpacing: '-1.5px' }}>
            {(step === 'email' || step === 'password') && <>Welcome<br /><strong className="font-semibold">back.</strong></>}
            {step === 'register' && <>Join<br /><strong className="font-semibold">ListHQ.</strong></>}
            {step === 'check-email' && <>Check your<br /><strong className="font-semibold">inbox.</strong></>}
          </h1>

          <p className="text-sm text-stone-400 mb-6 -mt-4">
            {step === 'email' && 'Access your dashboard, listings, and leads.'}
            {step === 'password' && email}
            {step === 'register' && 'Start your free 3-month trial. No credit card required.'}
            {step === 'check-email' && `We've sent a confirmation link to ${regEmail}`}
          </p>

          {/* ── Step: Email (sign in) ── */}
          {step === 'email' && (
            <>
              <form onSubmit={handleEmailContinue} className="space-y-4">
                <div>
                  <label className="text-sm font-medium text-foreground mb-1.5 block">
                    Email Address<span className="text-destructive">*</span>
                  </label>
                  <input type="email" required autoFocus value={email} onChange={(e) => setEmail(e.target.value)} className={inputClass} />
                </div>
                <button type="submit" className="w-full py-3.5 rounded-full bg-primary hover:opacity-90 text-primary-foreground font-semibold text-sm transition-opacity">
                  Continue
                </button>
              </form>

              <p className="text-sm text-muted-foreground mt-4">
                New to ListHQ?{' '}
                <button type="button" onClick={() => setStep('register')} className="text-primary font-semibold underline underline-offset-2">
                  Start your free 3-month trial
                </button>
              </p>

              <div className="flex items-center gap-4 my-6">
                <div className="flex-1 h-px bg-border" />
                <span className="text-xs font-medium text-muted-foreground uppercase">Or</span>
                <div className="flex-1 h-px bg-border" />
              </div>

              <button type="button" onClick={() => handleOAuth('google')} className="w-full flex items-center gap-3 py-3.5 px-5 rounded-full border border-border bg-background text-foreground text-sm font-medium hover:bg-accent transition-colors">
                <svg width="18" height="18" viewBox="0 0 24 24"><path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z" fill="#4285F4"/><path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/><path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/><path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/></svg>
                Continue with Google
              </button>

              <p className="text-xs text-muted-foreground mt-3 text-center leading-relaxed">
                By continuing you agree to our{' '}
                <a href="/terms" target="_blank" rel="noopener noreferrer" className="text-primary underline underline-offset-2">Terms of Service</a>
                {' '}and{' '}
                <a href="/privacy" target="_blank" rel="noopener noreferrer" className="text-primary underline underline-offset-2">Privacy Policy</a>.
              </p>
            </>
          )}

          {/* ── Step: Password (sign in) ── */}
          {step === 'password' && (
            <>
              <form onSubmit={handleSignIn} className="space-y-4">
                <div>
                  <label className="text-sm font-medium text-foreground mb-1.5 block">Password</label>
                  <input type="password" required autoFocus minLength={8} value={password} onChange={(e) => setPassword(e.target.value)} className={inputClass} />
                </div>
                <div className="text-right">
                  <Link to="/forgot-password" className="text-xs text-primary font-medium underline underline-offset-2">Forgot password?</Link>
                </div>
                <HCaptcha
                  sitekey={hcaptchaSiteKey}
                  size="invisible"
                  ref={captchaRef}
                  onVerify={setCaptchaToken}
                />
                <button type="submit" disabled={loading} className="w-full py-3.5 rounded-full bg-primary text-primary-foreground font-semibold text-sm transition-colors disabled:opacity-50">
                  {loading ? 'Signing in…' : 'Sign In'}
                </button>
              </form>
              <button type="button" onClick={goBack} className="text-sm text-muted-foreground mt-4 hover:text-foreground underline underline-offset-2">
                ← Use a different email
              </button>
            </>
          )}

          {/* ── Step: Register (email-first verification) ── */}
          {step === 'register' && (
            <>
              <div className="flex items-center gap-2 px-3 py-2 rounded-xl bg-emerald-500/10 border border-emerald-500/20 mb-5">
                <Zap size={13} className="text-emerald-600 shrink-0" />
                <p className="text-xs font-medium text-emerald-700">Free for 60 days — no credit card required. Cancel anytime.</p>
              </div>

              {/* Have these ready checklist */}
              <div className="bg-stone-50 border border-stone-200 rounded-xl p-4 mb-5">
                <div className="flex items-center gap-2 text-sm font-semibold text-stone-900 mb-3">
                  <ListChecks size={16} className="text-primary" />
                  Have these ready before you begin
                </div>
                <div className="space-y-2">
                  {[
                    { icon: <FileText size={14} />, text: 'ABN — 11-digit Australian Business Number' },
                    { icon: <ShieldCheck size={14} />, text: 'Real estate licence number — from your state regulator, not your CPD number' },
                    { icon: <Building2 size={14} />, text: 'Agency name — your trading name as registered' },
                    { icon: <Landmark size={14} />, text: 'Trust account BSB & account number — only needed if migrating from another system' },
                  ].map((item) => (
                    <div key={item.text} className="flex items-start gap-2 text-xs text-stone-500">
                      <span className="text-primary mt-0.5 shrink-0">{item.icon}</span>
                      {item.text}
                    </div>
                  ))}
                </div>
              </div>

              <form onSubmit={(e) => { e.preventDefault(); handleEmailSubmit(); }} className="space-y-4">
                <div>
                  <label className="text-sm font-medium text-foreground mb-1.5 block">
                    Your email address<span className="text-destructive">*</span>
                  </label>
                  <input
                    type="email"
                    required
                    autoFocus
                    value={regEmail}
                    onChange={(e) => setRegEmail(e.target.value)}
                    placeholder="jane@agency.com.au"
                    className={inputClass}
                  />
                  <p className="text-xs text-muted-foreground mt-1.5">
                    We'll send a confirmation link to this address before you continue.
                  </p>
                </div>
                <button type="submit" disabled={emailSubmitting} className="w-full py-3.5 rounded-full bg-primary text-primary-foreground font-semibold text-sm transition-colors disabled:opacity-50">
                  {emailSubmitting ? 'Sending confirmation...' : 'Continue — confirm my email'}
                </button>
              </form>

              <p className="text-sm text-muted-foreground mt-4">
                Already have an account?{' '}
                <button type="button" onClick={() => { setStep('email'); setRegEmail(''); }} className="text-primary font-semibold underline underline-offset-2">
                  Sign in here
                </button>
              </p>
            </>
          )}

          {/* ── Step: Check email ── */}
          {step === 'check-email' && (
            <div className="text-center space-y-5">
              <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center mx-auto">
                <Mail size={32} className="text-primary" />
              </div>
              <div>
                <h2 className="text-xl font-bold text-foreground">Check your inbox</h2>
                <p className="text-sm text-muted-foreground mt-1">We've sent a confirmation link to:</p>
                <p className="font-semibold text-foreground text-sm mt-1">{regEmail}</p>
              </div>
              <div className="bg-stone-50 border border-stone-200 rounded-xl p-4 text-xs text-stone-500 text-left space-y-1.5">
                <p>· Click the link in the email to verify your address and continue setup</p>
                <p>· Check your spam folder if it doesn't arrive within 2 minutes</p>
                <p>· Your Agent Quick-Start Guide is included in the email — download it while you wait</p>
                <p>· The confirmation link expires after 24 hours</p>
              </div>
              <button
                type="button"
                onClick={handleResendEmail}
                disabled={emailSubmitting}
                className="w-full py-3.5 rounded-full border border-border text-foreground font-semibold text-sm transition-colors hover:bg-accent disabled:opacity-50"
              >
                {emailSubmitting ? 'Sending...' : 'Resend confirmation email'}
              </button>
              <button onClick={() => { setStep('register'); setRegEmail(''); }} className="text-xs text-muted-foreground hover:text-foreground">
                Wrong email? Go back and change it
              </button>
            </div>
          )}

        </motion.div>
        </div>

        {/* Portal whisper footer */}
        <div className="px-10 lg:px-20 py-5 border-t border-stone-100 shrink-0 max-w-lg mx-auto w-full">
          <p className="text-[11px] text-stone-300">
            Looking to search properties?{' '}
            <Link to="/login" className="text-stone-400 hover:text-blue-600 transition-colors">Buyer sign in</Link>
            <span className="mx-1.5 text-stone-200">·</span>
            <Link to="/partner/login" className="text-stone-400 hover:text-blue-600 transition-colors">Trust Accounting Partner</Link>
          </p>
        </div>
      </div>
    </div>
  );
};

export default AgentAuthPage;
