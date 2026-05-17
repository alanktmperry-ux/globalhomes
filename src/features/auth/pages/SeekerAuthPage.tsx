import { useState, useEffect, useRef } from 'react';
import HCaptcha from '@hcaptcha/react-hcaptcha';
import { getErrorMessage } from '@/shared/lib/errorUtils';
import { useNavigate, Link, useSearchParams } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { lovable } from '@/integrations/lovable/index';
import { toast } from 'sonner';
import { useTranslation } from '@/shared/lib/i18n/useTranslation';
import { Eye, EyeOff, Mail, ArrowLeft } from 'lucide-react';
import ResendConfirmationButton from '@/features/auth/components/ResendConfirmationButton';
import { isDisposableEmail } from '@/shared/lib/disposableEmails';
import {
  AuthShell,
  authStyles as s,
  AuthError,
  AuthDivider,
  AuthSpinner,
} from '@/features/auth/components/AuthShell';
import { capture } from '@/shared/lib/posthog';

type Mode = 'signin' | 'signup';

const SeekerAuthPage = () => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const initialMode: Mode = searchParams.get('mode') === 'signup' ? 'signup' : 'signin';
  const redirectTo = searchParams.get('redirect');
  const isHaloIntent = !!redirectTo?.startsWith('/halo');
  const [mode, setMode] = useState<Mode>(initialMode);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [displayName, setDisplayName] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  const [policyConsent, setPolicyConsent] = useState(false);
  const [showOAuthConsentModal, setShowOAuthConsentModal] = useState(false);
  const [pendingOAuthProvider, setPendingOAuthProvider] = useState<'google' | 'apple' | null>(null);
  const [otpStep, setOtpStep] = useState(false);
  const [pendingOtpEmail, setPendingOtpEmail] = useState('');
  const [captchaToken, setCaptchaToken] = useState<string | null>(null);
  const [pendingSignup, setPendingSignup] = useState(false);
  const captchaRef = useRef<HCaptcha>(null);
  const hcaptchaSiteKey = import.meta.env.VITE_HCAPTCHA_SITE_KEY || '10000000-ffff-ffff-ffff-000000000001';

  useEffect(() => {
    if (pendingSignup && captchaToken) {
      setPendingSignup(false);
      handleSignUp({ preventDefault: () => {} } as React.FormEvent);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pendingSignup, captchaToken]);

  useEffect(() => {
    const hash = window.location.hash;
    if (hash && (hash.includes('type=recovery') || hash.includes('PASSWORD_RECOVERY'))) {
      navigate('/reset-password' + hash, { replace: true });
    }
  }, [navigate]);

  const routeAfterSignIn = async () => {
    const { data: { user: signedInUser } } = await supabase.auth.getUser();
    if (signedInUser) {
      const { data: roles } = await supabase
        .from('user_roles')
        .select('role')
        .eq('user_id', signedInUser.id);
      const roleList = roles?.map(r => r.role) || [];
      if (roleList.includes('admin') || roleList.includes('agent')) {
        navigate('/dashboard', { replace: true });
        return;
      }
    }
    if (redirectTo && redirectTo.startsWith('/') && !redirectTo.startsWith('//')) {
      navigate(redirectTo, { replace: true });
      return;
    }
    navigate('/seeker/dashboard', { replace: true });
  };

  const handleSignIn = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    if (!email.trim() || !password) {
      setError(t('auth.error.emailPasswordRequired'));
      return;
    }
    setLoading(true);
    try {
      const { error: signErr } = await supabase.auth.signInWithPassword({
        email: email.trim().toLowerCase(),
        password,
      });
      if (signErr) {
        setError(t('auth.error.invalidCredentials'));
        return;
      }
      toast.success(t('auth.toast.welcomeBack'));
      await routeAfterSignIn();
    } catch (err) {
      setError(getErrorMessage(err) || t('auth.error.signInFailed'));
    } finally {
      setLoading(false);
    }
  };

  const handleSignUp = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    if (!email.trim()) { setError(t('auth.error.emailRequired')); return; }
    if (password.length < 10) { setError(t('auth.error.passwordTooShort')); return; }
    
    if (!policyConsent) { setError(t('auth.error.consentPolicy')); return; }
    const cleanEmail = email.trim().toLowerCase();
    if (isDisposableEmail(cleanEmail)) {
      setError(t('auth.error.disposableEmail'));
      return;
    }
    if (!captchaToken) {
      setPendingSignup(true);
      captchaRef.current?.execute();
      return;
    }
    setLoading(true);
    try {
      const { data: gate, error: gateErr } = await supabase.functions.invoke('before-signup', {
        body: { email: cleanEmail, password, role: 'seeker', hcaptchaToken: captchaToken },
      });
      if (gateErr || !gate?.ok) {
        const messages: Record<string, string> = {
          invalid_captcha: t('auth.error.invalidCaptcha'),
          disposable_email: t('auth.error.disposableEmail'),
          breached_password: t('auth.error.breachedPassword'),
        };
        setError(messages[gate?.reason] || t('auth.error.signupFailed'));
        setCaptchaToken(null);
        captchaRef.current?.resetCaptcha();
        return;
      }
      const { error: signUpErr } = await supabase.auth.signUp({
        email: cleanEmail,
        password,
        options: {
          emailRedirectTo: window.location.origin + '/auth/confirm',
          captchaToken,
          data: {
            registered_as: 'seeker',
            display_name: displayName || undefined,
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
      capture('seeker_signed_up', { source: 'email' });
      setPendingOtpEmail(cleanEmail);
      setOtpStep(true);
    } catch (err) {
      setError(getErrorMessage(err) || t('auth.error.confirmEmailFailed'));
    } finally {
      setLoading(false);
      setCaptchaToken(null);
      captchaRef.current?.resetCaptcha();
    }
  };

  const handleOAuth = async (provider: 'google' | 'apple') => {
    if (mode === 'signup' && !policyConsent) {
      setPendingOAuthProvider(provider);
      setShowOAuthConsentModal(true);
      return;
    }
    const { error: oErr } = await lovable.auth.signInWithOAuth(provider, {
      redirect_uri: window.location.origin + '/auth/callback',
    });
    if (oErr) toast.error(t('auth.error.oauthGeneric'));
  };

  const confirmOAuthConsent = async () => {
    setShowOAuthConsentModal(false);
    if (!pendingOAuthProvider) return;
    const { error: oErr } = await lovable.auth.signInWithOAuth(pendingOAuthProvider, {
      redirect_uri: window.location.origin + '/auth/callback',
    });
    if (oErr) toast.error(t('auth.error.oauthGeneric'));
    setPendingOAuthProvider(null);
  };

  /* ── OTP step ── */
  if (otpStep) {
    return (
      <AuthShell
        heading={t('auth.checkEmail.heading')}
        subheading={t('auth.checkEmail.body', { email: pendingOtpEmail })}
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
          {t('auth.checkEmail.spamHint')}
        </p>
        <ResendConfirmationButton email={pendingOtpEmail} />
        <button
          type="button"
          onClick={() => setOtpStep(false)}
          className="mt-6 w-full text-sm font-light flex items-center justify-center gap-2 hover:text-white transition-colors"
          style={{ color: 'rgba(255,255,255,0.65)' }}
        >
          <ArrowLeft size={14} /> {t('auth.back')}
        </button>
      </AuthShell>
    );
  }

  const isSignIn = mode === 'signin';

  return (
    <AuthShell
      heading={isSignIn
        ? `${t('auth.welcome')} ${t('auth.welcomeBack')}`
        : `${t('auth.createAccount')} ${t('auth.createAccountSub')}`}
      subheading=""
    >
      {error && <AuthError>{error}</AuthError>}

      {isSignIn ? (
        <form onSubmit={handleSignIn} noValidate>
          <div className={s.field}>
            <label className={s.label} style={s.labelStyle}>{t('auth.emailLabel')}</label>
            <input
              type="email"
              required
              autoFocus
              value={email}
              onChange={(e) => { setEmail(e.target.value); setError(null); }}
              placeholder={t('auth.emailPlaceholder')}
              className={s.input}
              style={s.inputStyle}
              autoComplete="email"
            />
          </div>

          <div className={s.field}>
            <div className="flex items-center justify-between mb-2">
              <label className={s.label} style={{ ...s.labelStyle, marginBottom: 0 }}>{t('auth.passwordLabel')}</label>
              <Link to="/forgot-password" className="text-sm font-medium hover:text-white transition-colors" style={s.mutedLinkStyle}>
                {t('auth.forgot')}
              </Link>
            </div>
            <div className="relative">
              <input
                type={showPassword ? 'text' : 'password'}
                required
                minLength={8}
                value={password}
                onChange={(e) => { setPassword(e.target.value); setError(null); }}
                className={s.input}
                style={s.inputStyle}
                autoComplete="current-password"
              />
              <button
                type="button"
                onClick={() => setShowPassword(v => !v)}
                aria-label={showPassword ? 'Hide password' : 'Show password'}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-white/55 hover:text-white transition-colors"
              >
                {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
              </button>
            </div>
          </div>

          <button type="submit" disabled={loading} className={s.primaryBtn}>
            {loading ? <><AuthSpinner /> {t('auth.signingIn')}</> : t('auth.signIn')}
          </button>
        </form>
      ) : (
        <form onSubmit={handleSignUp} noValidate>
          {mode === 'signup' && isHaloIntent && (
            <div
              className="mb-5 p-3 rounded-[10px] flex items-start gap-2"
              style={{ background: 'rgba(52,211,153,0.15)', border: '1px solid rgba(52,211,153,0.30)' }}
            >
              <span className="text-sm" style={{ color: '#A7F3D0' }}>
                Create a free account to post your Halo property brief. Matched agents will reach out to you directly.
              </span>
            </div>
          )}
          <div className={s.field}>
            <label className={s.label} style={s.labelStyle}>{t('auth.emailLabel')}</label>
            <input
              type="email"
              required
              autoFocus
              value={email}
              onChange={(e) => { setEmail(e.target.value); setError(null); }}
              className={s.input}
              style={s.inputStyle}
              autoComplete="email"
            />
          </div>
          <div className={s.field}>
            <label className={s.label} style={s.labelStyle}>{t('auth.displayName')}</label>
            <input
              type="text"
              value={displayName}
              onChange={(e) => setDisplayName(e.target.value)}
              placeholder={t('auth.displayNamePlaceholder')}
              className={s.input}
              style={s.inputStyle}
              autoComplete="name"
            />
          </div>
          <div className={s.field}>
            <label className={s.label} style={s.labelStyle}>{t('auth.passwordLabel')}</label>
            <div className="relative">
              <input
                type={showPassword ? 'text' : 'password'}
                required
                minLength={10}
                value={password}
                onChange={(e) => { setPassword(e.target.value); setError(null); }}
                placeholder={t('auth.passwordMinPlaceholder')}
                className={s.input}
                style={s.inputStyle}
                autoComplete="new-password"
              />
              <button
                type="button"
                onClick={() => setShowPassword(v => !v)}
                aria-label={showPassword ? 'Hide password' : 'Show password'}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-white/55 hover:text-white transition-colors"
              >
                {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
              </button>
            </div>
          </div>

          <label className="flex items-start gap-2.5 mb-5 cursor-pointer select-none">
            <input
              type="checkbox"
              checked={policyConsent}
              onChange={(e) => setPolicyConsent(e.target.checked)}
              className="mt-0.5 h-4 w-4 rounded shrink-0 cursor-pointer"
            />
            <span className="text-xs leading-relaxed">
              I agree to the <Link to="/privacy" className="underline hover:opacity-80">Privacy Policy</Link> and <Link to="/terms" className="underline hover:opacity-80">Terms of Service</Link>. My data is stored securely in Australia under the Privacy Act 1988.
            </span>
          </label>

          <HCaptcha
            sitekey={hcaptchaSiteKey}
            size="invisible"
            ref={captchaRef}
            onVerify={setCaptchaToken}
            onError={() => { setPendingSignup(false); setError('Verification failed — please try again.'); }}
            onExpire={() => { setCaptchaToken(null); setPendingSignup(false); captchaRef.current?.resetCaptcha(); }}
          />

          <button
            type="submit"
            disabled={loading || !email.trim() || !password || !policyConsent}
            className={s.primaryBtn}
          >
            {loading
              ? <><AuthSpinner /> {t('auth.createAccountBtnLoading')}</>
              : t('auth.createAccountBtn2')}
          </button>
        </form>
      )}

      <AuthDivider label={t('auth.or')} />

      <div className="space-y-2.5">
        <button type="button" onClick={() => handleOAuth('google')} className={s.oauthBtn} style={s.oauthStyle}>
          <svg width="18" height="18" viewBox="0 0 24 24" className="shrink-0"><path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z" fill="#4285F4"/><path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/><path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/><path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/></svg>
          {t('auth.continueGoogle')}
        </button>
        <button type="button" onClick={() => handleOAuth('apple')} className={s.oauthBtn} style={s.oauthStyle}>
          <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor" className="shrink-0"><path d="M17.05 20.28c-.98.95-2.05.88-3.08.4-1.09-.5-2.08-.48-3.24 0-1.44.62-2.2.44-3.06-.4C2.79 15.25 3.51 7.59 9.05 7.31c1.35.07 2.29.74 3.08.8 1.18-.24 2.31-.93 3.57-.84 1.51.12 2.65.72 3.4 1.8-3.12 1.87-2.38 5.98.48 7.13-.57 1.5-1.31 2.99-2.54 4.09zM12.03 7.25c-.15-2.23 1.66-4.07 3.74-4.25.29 2.58-2.34 4.5-3.74 4.25z"/></svg>
          {t('auth.continueApple')}
        </button>
      </div>

      <p className={s.footer} style={s.footerStyle}>
        {isSignIn ? t('auth.newHere') : t('auth.backToSignIn')}
        <button
          type="button"
          onClick={() => { setMode(isSignIn ? 'signup' : 'signin'); setError(null); }}
          className={`${s.link} ml-1`}
        >
          {isSignIn ? t('auth.createFree') : t('auth.signIn')}
        </button>
      </p>

      <p className="text-center text-sm font-light mt-4 text-muted-foreground">
        Are you a real estate agent?{' '}
        <Link to="/agents/login" className="text-primary underline font-medium">
          Sign in to your agent account →
        </Link>
      </p>

      {showOAuthConsentModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 px-4">
          <div className="bg-white rounded-2xl shadow-xl max-w-sm w-full p-6">
            <h3 className="text-base font-semibold text-stone-900 mb-2">{t('auth.oauthModal.title')}</h3>
            <p className="text-sm text-stone-600 mb-4 leading-relaxed">
              {t('auth.oauthModal.body')}{' '}
              <a href="/privacy" className="text-blue-600 underline">{t('auth.privacyLink')}</a> {t('auth.and')}{' '}
              <a href="/terms" className="text-blue-600 underline">{t('auth.termsLink')}</a>.
              {' '}{t('auth.oauthModal.bodyStorage')}
            </p>
            <div className="flex gap-3">
              <button
                onClick={() => { setShowOAuthConsentModal(false); setPendingOAuthProvider(null); }}
                className="flex-1 h-11 rounded-xl border border-stone-200 text-stone-600 text-sm font-medium hover:bg-stone-50"
              >
                {t('auth.oauthModal.cancel')}
              </button>
              <button
                onClick={confirmOAuthConsent}
                className="flex-1 h-11 rounded-xl bg-blue-600 text-white text-sm font-medium hover:bg-blue-700"
              >
                {t('auth.oauthModal.confirm')}
              </button>
            </div>
          </div>
        </div>
      )}
    </AuthShell>
  );
};

export default SeekerAuthPage;
