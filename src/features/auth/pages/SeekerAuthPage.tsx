import { useState, useEffect, useRef, lazy, Suspense } from 'react';
import type HCaptchaType from '@hcaptcha/react-hcaptcha';
const HCaptcha = lazy(() => import('@hcaptcha/react-hcaptcha'));
import { getErrorMessage } from '@/shared/lib/errorUtils';
import { motion, AnimatePresence } from 'framer-motion';
import PhoneInput from '@/shared/components/PhoneInput';
import { useNavigate, Link } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { lovable } from '@/integrations/lovable/index';
import { toast } from 'sonner';
import seekerHero from '@/assets/seeker-auth-hero.jpg';
import { useTranslation } from '@/shared/lib/i18n/useTranslation';
import OTPVerificationScreen from '@/features/auth/components/OTPVerificationScreen';

type Step = 'email' | 'password' | 'create' | 'otp' | 'prefs';

const SeekerAuthPage = () => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [step, setStep] = useState<Step>('email');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [phone, setPhone] = useState('');
  const [loading, setLoading] = useState(false);
  const [seekingType, setSeekingType] = useState<'buy' | 'rent' | ''>('');
  const [budgetMax, setBudgetMax] = useState('');
  const [weeklyBudget, setWeeklyBudget] = useState('');
  const [suburbs, setSuburbs] = useState('');
  const [propertyType, setPropertyType] = useState('');
  const [petsRequired, setPetsRequired] = useState(false);
  const [furnishedRequired, setFurnishedRequired] = useState(false);
  const [captchaToken, setCaptchaToken] = useState<string | null>(null);
  const [pendingSignIn, setPendingSignIn] = useState(false);
  const captchaRef = useRef<HCaptchaType>(null);
  const hcaptchaSiteKey = import.meta.env.VITE_HCAPTCHA_SITE_KEY || '10000000-ffff-ffff-ffff-000000000001';

  // Auto-submit sign-in after captcha verification
  useEffect(() => {
    if (pendingSignIn && captchaToken && step === 'password') {
      setPendingSignIn(false);
      handleSignIn({ preventDefault: () => {} } as React.FormEvent);
    }
  }, [pendingSignIn, captchaToken]);

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
      const ADMIN_EMAILS = ['alan@everythingco.com.au', 'alanktmperry@gmail.com', 'alan@everythingeco.com.au'];
      const isAdminEmail = ADMIN_EMAILS.includes(email.trim().toLowerCase());
      if (isAdminEmail) {
        navigate('/dashboard/rent-roll');
      } else {
        const { data: { user: signedInUser } } = await supabase.auth.getUser();
        if (signedInUser) {
          const { data: agentRow } = await supabase.from('agents').select('id').eq('user_id', signedInUser.id).maybeSingle();
          navigate(agentRow ? '/dashboard/rent-roll' : '/');
        } else {
          navigate('/');
        }
      }
    } catch (err: unknown) {
      toast.error('Something went wrong', { description: getErrorMessage(err) });
    } finally {
      setLoading(false);
    }
  };

  const handleCreateAccount = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim()) {
      toast.error('Email required');
      return;
    }
    setLoading(true);
    try {
      const { error } = await supabase.auth.signInWithOtp({
        email,
        options: {
          shouldCreateUser: true,
          data: {
            display_name: displayName || email,
            phone: phone || undefined,
          },
        },
      });
      if (error) throw error;
      toast.success('Code sent', {
        description: `Check ${email} for your 6-digit code.`,
      });
      setStep('otp');
    } catch (err: unknown) {
      toast.error('Could not send code', { description: getErrorMessage(err) });
    } finally {
      setLoading(false);
    }
  };

  const handleOtpVerified = async () => {
    // After OTP verify the user is signed in. Stamp terms acceptance and route to role selection.
    try {
      const { data: { user: u } } = await supabase.auth.getUser();
      if (u) {
        await supabase.from('profiles').upsert(
          {
            user_id: u.id,
            terms_accepted_at: new Date().toISOString(),
            terms_version: '1.0',
            display_name: displayName || undefined,
            phone: phone || undefined,
          } as any,
          { onConflict: 'user_id' },
        );
      }
    } catch {
      // non-fatal
    }
    toast.success('Email verified');
    navigate('/onboarding/role', { replace: true });
  };

  const handleSavePrefs = async () => {
    try {
      const { data: { user: u } } = await supabase.auth.getUser();
      if (u) {
        await supabase
          .from('user_preferences')
          .update({
            budget_max: seekingType === 'buy' && budgetMax ? parseInt(budgetMax.replace(/[^0-9]/g, '')) : null,
            preferred_locations: suburbs ? suburbs.split(',').map(s => s.trim()).filter(Boolean) : [],
            seeking_type: seekingType || null,
            weekly_budget: seekingType === 'rent' && weeklyBudget ? parseInt(weeklyBudget) : null,
            pets_required: seekingType === 'rent' ? petsRequired : false,
            furnished_required: seekingType === 'rent' ? furnishedRequired : false,
          } as any)
          .eq('user_id', u.id);
      }
    } catch {}
    navigate('/');
  };

  const handleOAuth = async (provider: 'google' | 'apple') => {
    const { error } = await lovable.auth.signInWithOAuth(provider, {
      redirect_uri: window.location.origin + '/auth/callback',
    });
    if (error) {
      toast.error('Something went wrong', { description: error?.message || 'Please try again.' });
    }
  };

  const goBack = () => {
    if (step === 'password' || step === 'create') {
      setStep('email');
      setPassword('');
    } else {
      navigate('/');
    }
  };

  // Shared input style — Apple-clean
  const input = "w-full h-[52px] px-4 rounded-2xl border border-stone-200 bg-stone-50 text-stone-900 text-[15px] placeholder:text-stone-300 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-400 focus:bg-white transition-all";
  const btnPrimary = "w-full h-[52px] rounded-2xl bg-blue-600 hover:bg-blue-700 text-white text-[15px] font-medium transition-colors disabled:opacity-40";
  const btnOAuth = "w-full h-[50px] flex items-center gap-3 px-5 rounded-2xl border border-stone-200 bg-white hover:bg-stone-50 hover:border-stone-300 text-[14px] text-stone-700 font-normal transition-all";
  const label = "block text-[11px] font-medium tracking-[0.07em] uppercase text-stone-400 mb-2";

  return (
    <div className="min-h-screen flex">

      {/* ── LEFT: Full-bleed image, no text ───────────────────── */}
      <div className="hidden lg:block lg:w-[52%] relative overflow-hidden flex-shrink-0">
        <img
          src={seekerHero}
          alt=""
          className="absolute inset-0 w-full h-full object-cover"
          style={{ filter: 'saturate(0.85) brightness(0.95)' }}
        />
        {/* Minimal edge vignette only */}
        <div className="absolute inset-0" style={{
          background: 'linear-gradient(135deg, rgba(0,0,0,0.07) 0%, rgba(0,0,0,0) 60%, rgba(0,0,0,0.16) 100%)'
        }} />
      </div>

      {/* ── RIGHT: Form panel ─────────────────────────────────── */}
      <div className="flex-1 flex flex-col bg-white relative">

        {/* Brand — top */}
        <div className="px-16 pt-11 pb-0 shrink-0">
          <Link to="/" className="inline-flex items-center gap-2.5 group">
            <div className="w-7 h-7 rounded-lg bg-blue-600 flex items-center justify-center">
              <span className="text-white text-[11px] font-bold">L</span>
            </div>
            <span className="text-[15px] font-semibold text-stone-900 tracking-[-0.3px]">ListHQ</span>
          </Link>
        </div>

        {/* Form — vertically centred */}
        <main className="flex-1 flex flex-col justify-center px-16 pb-20">
          <AnimatePresence mode="wait">

            {/* ── Preferences step ── */}
            {step === 'prefs' && (
              <motion.div
                key="prefs"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                transition={{ duration: 0.2 }}
                className="max-w-sm space-y-5"
              >
                <div>
                  <h1 className="text-[32px] font-light tracking-[-1px] text-stone-900 leading-tight mb-1">
                    {t('auth.lookingFor')}<br /><strong className="font-semibold">{t('auth.lookingForBold')}</strong>
                  </h1>
                  <p className="text-[14px] text-stone-400 mt-2">
                    {t('auth.prefsHelp')}
                  </p>
                </div>

                {/* Buy / Rent selector */}
                <div className="grid grid-cols-2 gap-3">
                  {([['buy', '🏡', t('auth.buyProperty')], ['rent', '🔑', t('auth.rentProperty')]] as const).map(([val, icon, lbl]) => (
                    <button key={val} type="button" onClick={() => setSeekingType(val)}
                      className={`p-5 rounded-2xl border-2 text-center transition-all ${
                        seekingType === val
                          ? 'border-blue-600 bg-blue-50 shadow-sm'
                          : 'border-stone-200 bg-white hover:border-stone-300'
                      }`}>
                      <span className="text-2xl block mb-1.5">{icon}</span>
                      <span className={`text-[14px] font-medium ${seekingType === val ? 'text-blue-700' : 'text-stone-600'}`}>{lbl}</span>
                    </button>
                  ))}
                </div>

                {/* Conditional fields after selection */}
                {seekingType && (
                  <>
                    {seekingType === 'buy' && (
                      <div>
                        <label className={label}>{t('auth.maxBudget')}</label>
                        <select value={budgetMax} onChange={e => setBudgetMax(e.target.value)}
                          className="w-full h-[52px] px-4 rounded-2xl border border-stone-200 bg-stone-50 text-[15px] text-stone-900 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-400 transition-all">
                          <option value="">{t('auth.noPreference')}</option>
                          <option value="500000">{t('auth.budgetUpTo500k')}</option>
                          <option value="750000">{t('auth.budgetUpTo750k')}</option>
                          <option value="1000000">{t('auth.budgetUpTo1m')}</option>
                          <option value="1500000">{t('auth.budgetUpTo1_5m')}</option>
                          <option value="2000000">{t('auth.budgetUpTo2m')}</option>
                          <option value="3000000">{t('auth.budgetUpTo3m')}</option>
                          <option value="5000000">{t('auth.budgetUpTo5m')}</option>
                        </select>
                      </div>
                    )}
                    {seekingType === 'rent' && (
                      <div>
                        <label className={label}>{t('auth.maxWeeklyRent')}</label>
                        <input type="number" value={weeklyBudget} onChange={e => setWeeklyBudget(e.target.value)}
                          placeholder="e.g. 650" className={input} />
                      </div>
                    )}
                    <div>
                      <label className={label}>{t('auth.preferredSuburbs')}</label>
                      <input type="text" value={suburbs} onChange={e => setSuburbs(e.target.value)}
                        placeholder={t('auth.suburbsPlaceholder')} className={input} />
                      <p className="text-[11px] text-stone-300 mt-1.5">{t('auth.separateCommas')}</p>
                    </div>
                    <div>
                      <label className={label}>{t('auth.propertyType')}</label>
                      <div className="grid grid-cols-3 gap-2">
                        {['House', 'Apartment', 'Townhouse', 'Land', 'Any'].map(type => (
                          <button key={type} type="button"
                            onClick={() => setPropertyType(type === 'Any' ? '' : type)}
                            className={`h-10 rounded-xl text-[13px] font-medium border transition-all ${
                              (type === 'Any' ? !propertyType : propertyType === type)
                                ? 'bg-blue-600 text-white border-blue-600'
                                : 'bg-white text-stone-500 border-stone-200 hover:border-stone-300'
                            }`}
                          >
                            {type === 'House' ? t('auth.house') : type === 'Apartment' ? t('auth.apartment') : type === 'Townhouse' ? t('auth.townhouse') : type === 'Land' ? t('auth.land') : t('auth.any')}
                          </button>
                        ))}
                      </div>
                    </div>
                    {seekingType === 'rent' && (
                      <div className="space-y-3">
                        <label className="flex items-center gap-3 cursor-pointer">
                          <input type="checkbox" checked={petsRequired} onChange={e => setPetsRequired(e.target.checked)}
                            className="w-4 h-4 rounded accent-blue-600" />
                          <span className="text-[14px] text-stone-700">{t('auth.petFriendly')}</span>
                        </label>
                        <label className="flex items-center gap-3 cursor-pointer">
                          <input type="checkbox" checked={furnishedRequired} onChange={e => setFurnishedRequired(e.target.checked)}
                            className="w-4 h-4 rounded accent-blue-600" />
                          <span className="text-[14px] text-stone-700">{t('auth.furnished')}</span>
                        </label>
                      </div>
                    )}
                  </>
                )}

                <div className="flex flex-col gap-2 pt-1">
                  <button type="button" onClick={handleSavePrefs} disabled={!seekingType} className={btnPrimary}>
                    {t('auth.startSearching')}
                  </button>
                  <button type="button" onClick={() => navigate('/')}
                    className="w-full h-10 text-[13px] text-stone-400 hover:text-stone-600 transition-colors">
                    {t('auth.skipForNow')}
                  </button>
                </div>
              </motion.div>
            )}

            {/* ── Email / Password / Create steps ── */}
            {step !== 'prefs' && (
              <motion.div
                key={step}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                transition={{ duration: 0.2 }}
                className="max-w-sm"
              >
                {/* Headline */}
                <h1 className="text-[38px] font-light tracking-[-1.5px] text-stone-900 leading-[1.08] mb-8">
                  {step === 'email' && <>{t('auth.welcome')}<br /><strong className="font-semibold">{t('auth.welcomeTo')}</strong></>}
                  {step === 'password' && <>{t('auth.welcome')}<br /><strong className="font-semibold">{t('auth.welcomeBack')}</strong></>}
                  {step === 'create' && <>{t('auth.createAccount')}<br /><strong className="font-semibold">{t('auth.createAccountSub')}</strong></>}
                </h1>

                {/* ── Email step ── */}
                {step === 'email' && (
                  <>
                    <form onSubmit={handleEmailContinue} className="space-y-3">
                      <div>
                        <label className={label}>{t('auth.emailLabel')}</label>
                        <input type="email" required autoFocus value={email}
                          onChange={e => setEmail(e.target.value)}
                          placeholder={t('auth.emailPlaceholder')}
                          className={input} />
                      </div>
                      <button type="submit" className={btnPrimary}>{t('auth.continue')}</button>
                    </form>

                    <p className="text-[13px] text-stone-400 mt-4">
                      {t('auth.newHere')}{' '}
                      <button onClick={() => setStep('create')}
                        className="text-blue-600 font-medium hover:underline underline-offset-2">
                        {t('auth.createFree')}
                      </button>
                    </p>

                    <div className="flex items-center gap-3 my-7">
                      <div className="flex-1 h-px bg-stone-100" />
                      <span className="text-[11px] text-stone-300 tracking-[0.08em] uppercase">or</span>
                      <div className="flex-1 h-px bg-stone-100" />
                    </div>

                    <div className="space-y-2.5">
                      <button onClick={() => handleOAuth('google')} className={btnOAuth}>
                        <svg width="18" height="18" viewBox="0 0 24 24" className="shrink-0"><path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z" fill="#4285F4"/><path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/><path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/><path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/></svg>
                        {t('auth.continueGoogle')}
                      </button>
                      <button onClick={() => handleOAuth('apple')} className={btnOAuth}>
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
                )}

                {/* ── Password step ── */}
                {step === 'password' && (
                  <>
                    <p className="text-[13px] text-stone-400 -mt-4 mb-6 truncate">{email}</p>
                    <form onSubmit={handleSignIn} className="space-y-3">
                      <div>
                        <div className="flex items-center justify-between mb-2">
                          <label className={label} style={{ marginBottom: 0 }}>{t('auth.passwordLabel')}</label>
                          <Link to="/forgot-password"
                            className="text-[11px] text-stone-400 hover:text-blue-600 transition-colors">
                            {t('auth.forgot')}
                          </Link>
                        </div>
                        <input type="password" required autoFocus minLength={8} value={password}
                          onChange={e => setPassword(e.target.value)} className={input} />
                      </div>
                      <Suspense fallback={null}>
                        <HCaptcha
                          sitekey={hcaptchaSiteKey}
                          size="invisible"
                          ref={captchaRef}
                          onVerify={setCaptchaToken}
                        />
                      </Suspense>
                      <button type="submit" disabled={loading} className={btnPrimary}>
                        {loading ? t('auth.signingIn') : t('auth.signIn')}
                      </button>
                    </form>
                    <button onClick={goBack}
                      className="text-[13px] text-stone-300 mt-5 hover:text-stone-500 transition-colors">
                      {t('auth.differentEmail')}
                    </button>
                  </>
                )}

                {/* ── Create account step ── */}
                {step === 'create' && (
                  <>
                    <form onSubmit={handleCreateAccount} className="space-y-3">
                      <div>
                        <label className={label}>{t('auth.emailLabel')}</label>
                        <input type="email" required value={email}
                          onChange={e => setEmail(e.target.value)} className={input} />
                      </div>
                      <div>
                        <label className={label}>{t('auth.displayName')}</label>
                        <input type="text" autoFocus value={displayName}
                          onChange={e => setDisplayName(e.target.value)}
                          placeholder={t('auth.displayNamePlaceholder')} className={input} />
                      </div>
                      <div>
                        <label className={label}>{t('auth.mobile')} <span className="text-red-400">*</span></label>
                        <PhoneInput value={phone} onChange={setPhone} />
                      </div>
                      <div>
                        <label className={label}>{t('auth.passwordLabel')} <span className="text-red-400">*</span></label>
                        <input type="password" required minLength={8} value={password}
                          onChange={e => setPassword(e.target.value)} className={input} />
                      </div>
                      <button type="submit" disabled={loading} className={btnPrimary}>
                        {loading ? t('auth.creatingAccount') : t('auth.createAccountBtn')}
                      </button>
                    </form>
                    <button onClick={goBack}
                      className="text-[13px] text-stone-300 mt-5 hover:text-stone-500 transition-colors">
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
            )}
          </AnimatePresence>
        </main>

        {/* ── Portal links — whisper quiet at the very bottom ── */}
        <div className="px-16 py-6 border-t border-stone-100 shrink-0">
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
