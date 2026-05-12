import { useState, useEffect, useRef } from 'react';
import HCaptcha from '@hcaptcha/react-hcaptcha';
import { useNavigate, Link, useSearchParams } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { useAuth } from '@/features/auth/AuthProvider';
import { getErrorMessage } from '@/shared/lib/errorUtils';
import { Mail, ArrowLeft, Eye, EyeOff } from 'lucide-react';
import ResendConfirmationButton from '@/features/auth/components/ResendConfirmationButton';
import { usePageTitle } from '@/lib/usePageTitle';
import { isDisposableEmail } from '@/shared/lib/disposableEmails';
import {
  AuthShell,
  authStyles as s,
  AuthError,
  AuthDivider,
  AuthSpinner,
} from '@/features/auth/components/AuthShell';

type Step = 'email' | 'password' | 'register' | 'otp';

const AgentAuthPage = () => {
  usePageTitle('Log In');
  const navigate = useNavigate();
  const { user, isAgent, isAdmin, loading: authLoading } = useAuth();
  const [searchParams] = useSearchParams();
  const mode = searchParams.get('mode') ?? 'login';

  const [pendingRedirect, setPendingRedirect] = useState<'dashboard' | null>(null);
  const [step, setStep] = useState<Step>(mode === 'signup' ? 'register' : 'email');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [regEmail, setRegEmail] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [emailSubmitting, setEmailSubmitting] = useState(false);
  const [loading, setLoading] = useState(false);
  const [captchaToken, setCaptchaToken] = useState<string | null>(null);
  const [pendingSignIn, setPendingSignIn] = useState(false);
  const [pendingSignup, setPendingSignup] = useState(false);
  const [dataLocationConsent, setDataLocationConsent] = useState(false);
  const [policyConsent, setPolicyConsent] = useState(false);
  const [emailError, setEmailError] = useState<string | null>(null);
  const [formError, setFormError] = useState<string | null>(null);
  const [showOAuthConsentModal, setShowOAuthConsentModal] = useState(false);
  const [pendingOAuthProvider, setPendingOAuthProvider] = useState<'google' | 'apple' | null>(null);

  const captchaRef = useRef<HCaptcha>(null);
  const hcaptchaSiteKey = import.meta.env.VITE_HCAPTCHA_SITE_KEY || '10000000-ffff-ffff-ffff-000000000001';

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
  }, [pendingRedirect, user, authLoading, isAgent, isAdmin]);

  useEffect(() => {
    if (pendingSignIn && captchaToken && step === 'password') {
      setPendingSignIn(false);
      handleSignIn({ preventDefault: () => {} } as React.FormEvent);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pendingSignIn, captchaToken]);

  useEffect(() => {
    if (pendingSignup && captchaToken && step === 'register') {
      setPendingSignup(false);
      handleEmailSubmit();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pendingSignup, captchaToken]);

  useEffect(() => {
    if (!authLoading && user && (isAgent || isAdmin) && !pendingRedirect) {
      navigate('/dashboard', { replace: true });
    }
  }, [authLoading, user, isAgent, isAdmin, navigate, pendingRedirect]);

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
        setFormError("If an account exists with this email, you'll receive a login link.");
        setLoading(false);
        return;
      }
      toast('Welcome back!');
      setPendingRedirect('dashboard');
    } catch {
      setFormError("If an account exists with this email, you'll receive a login link.");
      setLoading(false);
    }
  };

  const handleEmailSubmit = async () => {
    const emailRe = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    const trimmed = regEmail.trim();
    if (!trimmed) { setEmailError('Email address is required'); return; }
    if (!emailRe.test(trimmed)) { setEmailError('Enter a valid email (e.g. name@agency.com.au)'); return; }
    if (password.length < 10) { setFormError('Password must be at least 10 characters.'); return; }
    if (!dataLocationConsent) { setFormError('Please acknowledge where your data is stored to continue.'); return; }
    if (!policyConsent) { setFormError('Please agree to the Privacy Policy and Terms of Service to continue.'); return; }
    const cleaned = trimmed.toLowerCase();
    if (isDisposableEmail(cleaned)) {
      setFormError('Disposable or temporary email addresses are not accepted. Please use a real email.');
      return;
    }
    if (!captchaToken) {
      setPendingSignup(true);
      captchaRef.current?.execute();
      return;
    }
    setEmailSubmitting(true);
    setFormError(null);
    try {
      const { data: gate, error: gateErr } = await supabase.functions.invoke('before-signup', {
        body: { email: cleaned, password, role: 'agent', hcaptchaToken: captchaToken },
      });
      if (gateErr || !gate?.ok) {
        const messages: Record<string, string> = {
          invalid_captcha: 'Captcha verification failed. Please refresh and try again.',
          disposable_email: 'Disposable or temporary email addresses are not accepted. Please use a real email.',
          breached_password: 'This password appears in known data breaches. For security, please choose a different one.',
        };
        setFormError(messages[gate?.reason] || 'Signup failed. Please try again or contact support.');
        setCaptchaToken(null);
        captchaRef.current?.resetCaptcha();
        setEmailSubmitting(false);
        return;
      }
      const { error: signUpErr } = await supabase.auth.signUp({
        email: cleaned,
        password,
        options: {
          emailRedirectTo: window.location.origin + '/auth/confirm',
          captchaToken,
          data: {
            registered_as: 'agent',
            registration_started: true,
            locale: (() => {
              try {
                const stored = localStorage.getItem('listhq.locale');
                if (stored) return stored;
              } catch { /* */ }
              return (navigator.language || 'en').split('-')[0].toLowerCase();
            })(),
          },
        },
      });
      if (signUpErr) throw signUpErr;
      sessionStorage.setItem('listhq_pending_email', cleaned);
      setRegEmail(cleaned);
      toast.success("We've sent a confirmation link to your email.");
      setStep('otp');
    } catch (err) {
      setFormError(getErrorMessage(err) || 'Failed to send confirmation email. Please try again.');
    } finally {
      setEmailSubmitting(false);
      setCaptchaToken(null);
      captchaRef.current?.resetCaptcha();
    }
  };

  const handleOAuth = async (provider: 'google' | 'apple') => {
    if (step === 'register' && !(dataLocationConsent && policyConsent)) {
      setPendingOAuthProvider(provider);
      setShowOAuthConsentModal(true);
      return;
    }
    const { lovable } = await import('@/integrations/lovable/index');
    const { error } = await lovable.auth.signInWithOAuth(provider, {
      redirect_uri: window.location.origin + '/auth/callback',
    });
    if (error) toast.error('Error');
  };

  const confirmOAuthConsent = async () => {
    setShowOAuthConsentModal(false);
    if (!pendingOAuthProvider) return;
    const { lovable } = await import('@/integrations/lovable/index');
    const { error } = await lovable.auth.signInWithOAuth(pendingOAuthProvider, {
      redirect_uri: window.location.origin + '/auth/callback',
    });
    if (error) toast.error('Error');
    setPendingOAuthProvider(null);
  };

  /* ── OTP step ── */
  if (step === 'otp') {
    return (
      <AuthShell
        heading="Check your email"
        subheading={<>We sent a confirmation link to <span className="text-white font-medium">{regEmail}</span>. Click the link to activate your account.</>}
      >
        <div className="flex justify-center mb-4">
          <div
            className="w-14 h-14 rounded-full flex items-center justify-center"
            style={{ background: 'rgba(255,255,255,0.12)', border: '1px solid rgba(255,255,255,0.20)' }}
          >
            <Mail size={24} className="text-white" />
          </div>
        </div>
        <p className="text-sm text-center mb-5" style={{ color: 'rgba(255,255,255,0.65)' }}>
          Can't find it? Check your spam folder.
        </p>
        <ResendConfirmationButton email={regEmail} />
        <button
          type="button"
          onClick={() => setStep('register')}
          className="mt-6 w-full text-sm font-light flex items-center justify-center gap-2 hover:text-white transition-colors"
          style={{ color: 'rgba(255,255,255,0.65)' }}
        >
          <ArrowLeft size={14} /> Back
        </button>
      </AuthShell>
    );
  }

  const heading =
    step === 'register' ? 'Start your 60-day free trial'
      : step === 'password' ? 'Welcome back'
        : 'Welcome back';

  const sub =
    step === 'register' ? "Join Australia's multilingual property platform. No credit card required."
      : step === 'password' ? email
        : 'Sign in to manage your portfolio';

  return (
    <AuthShell heading={heading} subheading={sub}>
      {formError && <AuthError>{formError}</AuthError>}

      {/* ── Step: Email ── */}
      {step === 'email' && (
        <>
          <form onSubmit={handleEmailContinue}>
            <div className={s.field}>
              <label className={s.label} style={s.labelStyle}>Email Address</label>
              <input
                type="email"
                required
                autoFocus
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className={s.input}
                style={s.inputStyle}
                autoComplete="email"
              />
            </div>
            <button type="submit" className={s.primaryBtn}>Continue</button>
          </form>

          <AuthDivider />

          <button type="button" onClick={() => handleOAuth('google')} className={s.oauthBtn} style={s.oauthStyle}>
            <svg width="18" height="18" viewBox="0 0 24 24" className="shrink-0"><path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z" fill="#4285F4"/><path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/><path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/><path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/></svg>
            Continue with Google
          </button>

          <p className={s.footer} style={s.footerStyle}>
            New to ListHQ?
            <button type="button" onClick={() => setStep('register')} className={`${s.link} ml-1`}>
              Start your free 60-day trial
            </button>
          </p>
        </>
      )}

      {/* ── Step: Password ── */}
      {step === 'password' && (
        <>
          <form onSubmit={handleSignIn}>
            <div className={s.field}>
              <div className="flex items-center justify-between mb-2">
                <label className={s.label} style={{ ...s.labelStyle, marginBottom: 0 }}>Password</label>
                <Link to="/forgot-password" className="text-sm font-medium hover:text-white" style={s.mutedLinkStyle}>
                  Forgot password?
                </Link>
              </div>
              <div className="relative">
                <input
                  type={showPassword ? 'text' : 'password'}
                  required
                  autoFocus
                  minLength={8}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className={s.input}
                  style={s.inputStyle}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(v => !v)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-white/55 hover:text-white"
                  aria-label={showPassword ? 'Hide password' : 'Show password'}
                >
                  {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
            </div>
            <HCaptcha sitekey={hcaptchaSiteKey} size="invisible" ref={captchaRef} onVerify={setCaptchaToken} />
            <button type="submit" disabled={loading} className={s.primaryBtn}>
              {loading ? <><AuthSpinner /> Signing in…</> : 'Sign in'}
            </button>
          </form>
          <button
            type="button"
            onClick={() => { setStep('email'); setPassword(''); setFormError(null); }}
            className="mt-4 w-full text-sm font-light flex items-center justify-center gap-2 hover:text-white"
            style={{ color: 'rgba(255,255,255,0.65)' }}
          >
            <ArrowLeft size={14} /> Use a different email
          </button>
        </>
      )}

      {/* ── Step: Register ── */}
      {step === 'register' && (
        <>
          <div
            className="mb-5 p-3 rounded-[10px] flex items-start gap-2"
            style={{ background: 'rgba(52,211,153,0.15)', border: '1px solid rgba(52,211,153,0.30)' }}
          >
            <span className="text-sm" style={{ color: '#A7F3D0' }}>
              Free for 60 days — no credit card required. Cancel anytime.
            </span>
          </div>
          <form onSubmit={(e) => { e.preventDefault(); handleEmailSubmit(); }}>
            <div className={s.field}>
              <label className={s.label} style={s.labelStyle}>Your email address</label>
              <input
                type="email"
                autoFocus
                value={regEmail}
                onChange={(e) => { setRegEmail(e.target.value); if (emailError) setEmailError(null); }}
                placeholder="jane@agency.com.au"
                className={s.input}
                style={s.inputStyle}
                aria-invalid={!!emailError}
              />
              {emailError && (
                <p className="text-xs mt-1.5" style={{ color: '#FCA5A5' }}>{emailError}</p>
              )}
            </div>
            <div className={s.field}>
              <label className={s.label} style={s.labelStyle}>Password</label>
              <div className="relative">
                <input
                  type={showPassword ? 'text' : 'password'}
                  required
                  minLength={10}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="At least 10 characters"
                  className={s.input}
                  style={s.inputStyle}
                  autoComplete="new-password"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(v => !v)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-white/55 hover:text-white"
                  aria-label={showPassword ? 'Hide password' : 'Show password'}
                >
                  {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
            </div>

            <label className="flex items-start gap-2.5 mb-3 cursor-pointer select-none">
              <input
                type="checkbox"
                checked={dataLocationConsent}
                onChange={(e) => setDataLocationConsent(e.target.checked)}
                className="mt-0.5 h-4 w-4 rounded shrink-0 cursor-pointer accent-white"
              />
              <span className="text-xs leading-relaxed" style={{ color: 'rgba(255,255,255,0.70)' }}>
                I understand that my data is stored on secure servers compliant with the Australian Privacy Act 1988.
              </span>
            </label>
            <label className="flex items-start gap-2.5 mb-5 cursor-pointer select-none">
              <input
                type="checkbox"
                checked={policyConsent}
                onChange={(e) => setPolicyConsent(e.target.checked)}
                className="mt-0.5 h-4 w-4 rounded shrink-0 cursor-pointer accent-white"
              />
              <span className="text-xs leading-relaxed" style={{ color: 'rgba(255,255,255,0.70)' }}>
                I agree to the{' '}
                <Link to="/privacy" target="_blank" rel="noopener noreferrer" className="text-white underline underline-offset-2">Privacy Policy</Link>
                {' '}and{' '}
                <Link to="/terms" target="_blank" rel="noopener noreferrer" className="text-white underline underline-offset-2">Terms of Service</Link>.
              </span>
            </label>

            <HCaptcha sitekey={hcaptchaSiteKey} size="invisible" ref={captchaRef} onVerify={setCaptchaToken} />

            <button
              type="submit"
              disabled={emailSubmitting || !(dataLocationConsent && policyConsent)}
              className={s.primaryBtn}
            >
              {emailSubmitting
                ? <><AuthSpinner /> Sending confirmation…</>
                : 'Continue — confirm my email'}
            </button>
          </form>

          <p className={s.footer} style={s.footerStyle}>
            Already have an account?
            <button
              type="button"
              onClick={() => { setStep('email'); setRegEmail(''); setFormError(null); }}
              className={`${s.link} ml-1`}
            >
              Sign in
            </button>
          </p>
        </>
      )}

      {showOAuthConsentModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 px-4">
          <div className="bg-white rounded-2xl shadow-xl max-w-sm w-full p-6">
            <h3 className="text-base font-semibold text-stone-900 mb-2">Before you continue</h3>
            <p className="text-sm text-stone-600 mb-4 leading-relaxed">
              By signing up with Google or Apple you agree to our{' '}
              <a href="/privacy" className="text-blue-600 underline">Privacy Policy</a> and{' '}
              <a href="/terms" className="text-blue-600 underline">Terms of Service</a>.
              Your agent account data is stored securely in Australia (AWS Sydney region).
            </p>
            <div className="flex gap-3">
              <button
                onClick={() => { setShowOAuthConsentModal(false); setPendingOAuthProvider(null); }}
                className="flex-1 h-11 rounded-xl border border-stone-200 text-stone-600 text-sm font-medium hover:bg-stone-50"
              >
                Discard
              </button>
              <button
                onClick={confirmOAuthConsent}
                className="flex-1 h-11 rounded-xl bg-blue-600 text-white text-sm font-medium hover:bg-blue-700"
              >
                I agree — Continue as Agent
              </button>
            </div>
          </div>
        </div>
      )}
    </AuthShell>
  );
};

export default AgentAuthPage;
