import { useState } from 'react';
import { getErrorMessage } from '@/shared/lib/errorUtils';
import { motion, AnimatePresence } from 'framer-motion';
import { useNavigate, Link } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { lovable } from '@/integrations/lovable/index';
import { toast } from 'sonner';
import seekerHero from '@/assets/seeker-auth-hero.jpg';
import { useTranslation } from '@/shared/lib/i18n/useTranslation';

type Mode = 'signin' | 'signup';

const SeekerAuthPage = () => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [mode, setMode] = useState<Mode>('signin');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [dataLocationConsent, setDataLocationConsent] = useState(false);

  const routeAfterSignIn = async () => {
    const { data: { user: signedInUser } } = await supabase.auth.getUser();
    if (signedInUser) {
      const { data: roles } = await supabase
        .from('user_roles')
        .select('role')
        .eq('user_id', signedInUser.id);
      const roleList = roles?.map(r => r.role) || [];
      if (roleList.includes('admin') || roleList.includes('agent')) {
        navigate('/dashboard/overview', { replace: true });
        return;
      }
    }
    navigate('/', { replace: true });
  };

  const handleSignIn = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    if (!email.trim() || !password) {
      setError('Please enter your email and password.');
      return;
    }
    setLoading(true);
    try {
      const { error: signErr } = await supabase.auth.signInWithPassword({
        email: email.trim().toLowerCase(),
        password,
      });
      if (signErr) {
        const msg = signErr.message || '';
        if (/invalid/i.test(msg) && /credential|password|login/i.test(msg)) {
          setError('Incorrect email or password.');
        } else if (/email not confirmed/i.test(msg)) {
          setError('Please verify your email before signing in.');
        } else {
          setError(msg || 'Could not sign in. Please try again.');
        }
        return;
      }
      toast.success('Welcome back!');
      await routeAfterSignIn();
    } catch (err) {
      setError(getErrorMessage(err) || 'Could not sign in. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleSignUp = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    if (!email.trim()) {
      setError('Email is required.');
      return;
    }
    if (password.length < 8) {
      setError('Password must be at least 8 characters.');
      return;
    }
    if (!dataLocationConsent) {
      setError('Please acknowledge where your data is stored to continue.');
      return;
    }
    setLoading(true);
    try {
      const { error: upErr } = await supabase.auth.signUp({
        email: email.trim().toLowerCase(),
        password,
        options: {
          data: {
            display_name: displayName || email,
          },
        },
      });
      if (upErr) {
        const msg = upErr.message || '';
        if (/registered|exists/i.test(msg)) {
          setError('An account with this email already exists. Try signing in.');
        } else {
          setError(msg || 'Could not create account. Please try again.');
        }
        return;
      }

      // With email confirmations disabled, signUp returns a session immediately.
      const { data: { user: u } } = await supabase.auth.getUser();
      if (u) {
        try {
          await supabase.from('profiles').upsert(
            {
              user_id: u.id,
              terms_accepted_at: new Date().toISOString(),
              terms_version: '1.0',
              display_name: displayName || undefined,
            } as any,
            { onConflict: 'user_id' },
          );
        } catch {
          // non-fatal
        }
        toast.success('Account created');
        navigate('/onboarding/role', { replace: true });
        return;
      }

      // Fallback: confirmations may still be enabled on the project.
      toast.success('Check your email to confirm your account.');
      setMode('signin');
    } catch (err) {
      setError(getErrorMessage(err) || 'Could not create account. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleOAuth = async (provider: 'google' | 'apple') => {
    const { error: oErr } = await lovable.auth.signInWithOAuth(provider, {
      redirect_uri: window.location.origin + '/auth/callback',
    });
    if (oErr) {
      toast.error('Something went wrong. Please try again.');
    }
  };

  // Shared input style — Apple-clean
  const input = "w-full h-[52px] px-4 rounded-2xl border border-stone-200 bg-stone-50 text-stone-900 text-[15px] placeholder:text-stone-300 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-400 focus:bg-white transition-all";
  const btnPrimary = "w-full h-[52px] rounded-2xl bg-blue-600 hover:bg-blue-700 text-white text-[15px] font-medium transition-colors disabled:opacity-40";
  const btnOAuth = "w-full h-[50px] flex items-center gap-3 px-5 rounded-2xl border border-stone-200 bg-white hover:bg-stone-50 hover:border-stone-300 text-[14px] text-stone-700 font-normal transition-all";
  const label = "block text-[11px] font-medium tracking-[0.07em] uppercase text-stone-400 mb-2";

  return (
    <div className="min-h-screen flex">
      {/* ── LEFT: Full-bleed image ───────────────────── */}
      <div className="hidden lg:block lg:w-[52%] relative overflow-hidden flex-shrink-0">
        <img
          src={seekerHero}
          alt=""
          className="absolute inset-0 w-full h-full object-cover"
          style={{ filter: 'saturate(0.85) brightness(0.95)' }}
        />
        <div className="absolute inset-0" style={{
          background: 'linear-gradient(135deg, rgba(0,0,0,0.07) 0%, rgba(0,0,0,0) 60%, rgba(0,0,0,0.16) 100%)'
        }} />
      </div>

      {/* ── RIGHT: Form panel ─────────────────────────────────── */}
      <div className="flex-1 flex flex-col bg-white relative">
        <div className="px-6 sm:px-16 pt-11 pb-0 shrink-0">
          <Link to="/" className="inline-flex items-center gap-2.5 group">
            <div className="w-7 h-7 rounded-lg bg-blue-600 flex items-center justify-center">
              <span className="text-white text-[11px] font-bold">L</span>
            </div>
            <span className="text-[15px] font-semibold text-stone-900 tracking-[-0.3px]">ListHQ</span>
          </Link>
        </div>

        <main className="flex-1 flex flex-col justify-center px-6 sm:px-16 pb-20">
          <AnimatePresence mode="wait">
            <motion.div
              key={mode}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={{ duration: 0.2 }}
              className="max-w-sm w-full"
            >
              <h1 className="text-[38px] font-light tracking-[-1.5px] text-stone-900 leading-[1.08] mb-8">
                {mode === 'signin' ? (
                  <>{t('auth.welcome')}<br /><strong className="font-semibold">{t('auth.welcomeBack')}</strong></>
                ) : (
                  <>{t('auth.createAccount')}<br /><strong className="font-semibold">{t('auth.createAccountSub')}</strong></>
                )}
              </h1>

              {mode === 'signin' ? (
                <>
                  <form onSubmit={handleSignIn} className="space-y-3" noValidate>
                    <div>
                      <label className={label}>{t('auth.emailLabel')}</label>
                      <input
                        type="email"
                        required
                        autoFocus
                        value={email}
                        onChange={(e) => { setEmail(e.target.value); setError(null); }}
                        placeholder={t('auth.emailPlaceholder')}
                        className={input}
                        autoComplete="email"
                      />
                    </div>
                    <div>
                      <div className="flex items-center justify-between mb-2">
                        <label className={label} style={{ marginBottom: 0 }}>{t('auth.passwordLabel')}</label>
                        <Link to="/forgot-password"
                          className="text-[11px] text-stone-400 hover:text-blue-600 transition-colors">
                          {t('auth.forgot')}
                        </Link>
                      </div>
                      <input
                        type="password"
                        required
                        minLength={8}
                        value={password}
                        onChange={(e) => { setPassword(e.target.value); setError(null); }}
                        className={input}
                        autoComplete="current-password"
                      />
                    </div>

                    {error && (
                      <p role="alert" className="text-[13px] text-red-600 bg-red-50 border border-red-100 rounded-xl px-3 py-2">
                        {error}
                      </p>
                    )}

                    <button type="submit" disabled={loading} className={btnPrimary}>
                      {loading ? t('auth.signingIn') : t('auth.signIn')}
                    </button>
                  </form>

                  <p className="text-[13px] text-stone-400 mt-4">
                    {t('auth.newHere')}{' '}
                    <button
                      type="button"
                      onClick={() => { setMode('signup'); setError(null); }}
                      className="text-blue-600 font-medium hover:underline underline-offset-2"
                    >
                      {t('auth.createFree')}
                    </button>
                  </p>

                  <div className="flex items-center gap-3 my-7">
                    <div className="flex-1 h-px bg-stone-100" />
                    <span className="text-[11px] text-stone-300 tracking-[0.08em] uppercase">or</span>
                    <div className="flex-1 h-px bg-stone-100" />
                  </div>

                  <div className="space-y-2.5">
                    <button type="button" onClick={() => handleOAuth('google')} className={btnOAuth}>
                      <svg width="18" height="18" viewBox="0 0 24 24" className="shrink-0"><path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z" fill="#4285F4"/><path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/><path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/><path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/></svg>
                      {t('auth.continueGoogle')}
                    </button>
                    <button type="button" onClick={() => handleOAuth('apple')} className={btnOAuth}>
                      <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor" className="shrink-0"><path d="M17.05 20.28c-.98.95-2.05.88-3.08.4-1.09-.5-2.08-.48-3.24 0-1.44.62-2.2.44-3.06-.4C2.79 15.25 3.51 7.59 9.05 7.31c1.35.07 2.29.74 3.08.8 1.18-.24 2.31-.93 3.57-.84 1.51.12 2.65.72 3.4 1.8-3.12 1.87-2.38 5.98.48 7.13-.57 1.5-1.31 2.99-2.54 4.09zM12.03 7.25c-.15-2.23 1.66-4.07 3.74-4.25.29 2.58-2.34 4.5-3.74 4.25z"/></svg>
                      {t('auth.continueApple')}
                    </button>
                  </div>

                  <p className="text-[11px] text-stone-300 mt-7 leading-relaxed">
                    {t('auth.terms')}{' '}
                    <a href="/terms" target="_blank" rel="noopener noreferrer"
                      className="text-stone-400 underline underline-offset-2">{t('auth.termsLink')}</a>
                    {' '}{t('auth.and')}{' '}
                    <a href="/privacy" target="_blank" rel="noopener noreferrer"
                      className="text-stone-400 underline underline-offset-2">{t('auth.privacyLink')}</a>.
                  </p>
                </>
              ) : (
                <>
                  <form onSubmit={handleSignUp} className="space-y-3" noValidate>
                    <div>
                      <label className={label}>{t('auth.emailLabel')}</label>
                      <input
                        type="email"
                        required
                        autoFocus
                        value={email}
                        onChange={(e) => { setEmail(e.target.value); setError(null); }}
                        className={input}
                        autoComplete="email"
                      />
                    </div>
                    <div>
                      <label className={label}>{t('auth.displayName')}</label>
                      <input
                        type="text"
                        value={displayName}
                        onChange={(e) => setDisplayName(e.target.value)}
                        placeholder={t('auth.displayNamePlaceholder')}
                        className={input}
                        autoComplete="name"
                      />
                    </div>
                    <div>
                      <label className={label}>{t('auth.passwordLabel')}</label>
                      <input
                        type="password"
                        required
                        minLength={8}
                        value={password}
                        onChange={(e) => { setPassword(e.target.value); setError(null); }}
                        placeholder="At least 8 characters"
                        className={input}
                        autoComplete="new-password"
                      />
                    </div>

                    <label className="flex items-start gap-2.5 pt-1 cursor-pointer select-none">
                      <input
                        type="checkbox"
                        checked={dataLocationConsent}
                        onChange={(e) => setDataLocationConsent(e.target.checked)}
                        className="mt-0.5 h-4 w-4 rounded border-stone-300 text-primary focus:ring-primary cursor-pointer shrink-0"
                      />
                      <span className="text-[12px] text-stone-500 leading-relaxed">
                        I understand my data is stored on secure servers in Singapore. ListHQ complies with the Australian Privacy Act 1988.
                      </span>
                    </label>

                    {error && (
                      <p role="alert" className="text-[13px] text-red-600 bg-red-50 border border-red-100 rounded-xl px-3 py-2">
                        {error}
                      </p>
                    )}

                    <button
                      type="submit"
                      disabled={loading || !email.trim() || !password || !dataLocationConsent}
                      className={btnPrimary}
                    >
                      {loading ? 'Creating account…' : 'Create account'}
                    </button>
                  </form>
                  <button
                    type="button"
                    onClick={() => { setMode('signin'); setError(null); }}
                    className="text-[13px] text-stone-300 mt-5 hover:text-stone-500 transition-colors"
                  >
                    {t('auth.backToSignIn')}
                  </button>
                  <p className="text-[11px] text-stone-300 mt-6 leading-relaxed">
                    {t('auth.terms')}{' '}
                    <a href="/terms" target="_blank" rel="noopener noreferrer"
                      className="text-stone-400 underline underline-offset-2">{t('auth.termsLink')}</a>
                    {' '}{t('auth.and')}{' '}
                    <a href="/privacy" target="_blank" rel="noopener noreferrer"
                      className="text-stone-400 underline underline-offset-2">{t('auth.privacyLink')}</a>.
                  </p>
                </>
              )}
            </motion.div>
          </AnimatePresence>
        </main>

        <div className="px-6 sm:px-16 py-6 border-t border-stone-100 shrink-0">
          <p className="text-[11px] text-stone-300">
            {t('auth.otherPortals')}{' '}
            <Link to="/agents/login"
              className="text-stone-400 hover:text-blue-600 transition-colors">
              {t('auth.agentPortal')}
            </Link>
            <span className="mx-1.5 text-stone-200">·</span>
            <Link to="/partner/login"
              className="text-stone-400 hover:text-blue-600 transition-colors">
              {t('auth.trustPartner')}
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
};

export default SeekerAuthPage;
