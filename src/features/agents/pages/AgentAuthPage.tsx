import { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import HCaptcha from '@hcaptcha/react-hcaptcha';
import { motion } from 'framer-motion';
import { Building2, KeyRound, MapPin, CheckCircle2, Home, Zap, ChevronRight } from 'lucide-react';
import { autocomplete } from '@/shared/lib/googleMapsService';
import PhoneInput from '@/shared/components/PhoneInput';
import { useNavigate, Link } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { lovable } from '@/integrations/lovable/index';
import { toast } from 'sonner';
import { useAuth } from '@/features/auth/AuthProvider';

type Step = 'email' | 'password' | 'choose' | 'create-agency' | 'join-agency';

// Password strength helper — outside component so it never breaks hook order
function getPasswordStrength(p: string): 'weak' | 'fair' | 'strong' | null {
  if (p.length === 0) return null;
  if (p.length < 6) return 'weak';
  if (p.length < 10 || !/[A-Z]/.test(p) || !/[0-9]/.test(p)) return 'fair';
  return 'strong';
}

const AgentAuthPage = () => {
  const navigate = useNavigate();
  const { user, isAgent, isAdmin, loading: authLoading } = useAuth();

  // ── All useState hooks together, no code between them ──
  const [pendingRedirect, setPendingRedirect] = useState<'dashboard' | null>(null);
  const [step, setStep] = useState<Step>('email');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [fullName, setFullName] = useState('');
  const [agencyName, setAgencyName] = useState('');
  const [phone, setPhone] = useState('');
  const [agencyEmail, setAgencyEmail] = useState('');
  const [inviteCode, setInviteCode] = useState('');
  const [licenseNumber, setLicenseNumber] = useState('');
  const [officeAddress, setOfficeAddress] = useState('');
  const [yearsExperience, setYearsExperience] = useState('');
  const [specialization, setSpecialization] = useState('Residential');
  const [specialisations, setSpecialisations] = useState<string[]>([]);
  const [handlesTrustAccounting, setHandlesTrustAccounting] = useState(false);
  const [agreedToTerms, setAgreedToTerms] = useState(false);
  const [loading, setLoading] = useState(false);
  const [officeSuggestions, setOfficeSuggestions] = useState<{ description: string; place_id: string }[]>([]);
  const [officeConfirmed, setOfficeConfirmed] = useState(false);
  const [captchaToken, setCaptchaToken] = useState<string | null>(null);

  // ── All useRef hooks ──
  const officeDebounceRef = useRef<ReturnType<typeof setTimeout>>();
  const captchaRef = useRef<HCaptcha>(null);

  // ── Derived values (not hooks) ──
  const strength = getPasswordStrength(password);
  const passwordsMatch = password === confirmPassword;
  const canSubmit = !loading;
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

  // ── Handlers ──
  const toggleSpecialisation = (value: string) => {
    setSpecialisations(prev =>
      prev.includes(value) ? prev.filter(s => s !== value) : [...prev, value]
    );
  };

  const handleOfficeInput = (value: string) => {
    setOfficeAddress(value);
    setOfficeConfirmed(false);
    if (officeDebounceRef.current) clearTimeout(officeDebounceRef.current);
    if (value.length < 3) { setOfficeSuggestions([]); return; }
    officeDebounceRef.current = setTimeout(async () => {
      try {
        const results = await autocomplete(value, 'address');
        setOfficeSuggestions(results.slice(0, 5));
      } catch { setOfficeSuggestions([]); }
    }, 350);
  };

  const selectOfficeAddress = (suggestion: { description: string; place_id: string }) => {
    setOfficeAddress(suggestion.description);
    setOfficeSuggestions([]);
    setOfficeConfirmed(true);
  };

  const handleEmailContinue = (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim()) return;
    setStep('password');
  };

  const handleSignIn = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      const { error } = await supabase.auth.signInWithPassword({ email, password });
      if (error) {
        if (error.message.includes('Email not confirmed')) {
          throw new Error('Please check your email and click the confirmation link before signing in.');
        }
        throw error;
      }
      toast('Welcome back!');
      setPendingRedirect('dashboard');
    } catch (err: any) {
      toast.error('Sign in failed', { description: err.message });
      setLoading(false);
    }
  };

  const handleSignup = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!email.trim()) { toast.error('Email required'); return; }
    if (!fullName.trim()) { toast.error('Full name required'); return; }
    if (step === 'create-agency' && !agencyName.trim()) { toast.error('Agency name required'); return; }
    if (step === 'join-agency' && !inviteCode.trim()) { toast.error('Invite code required'); return; }
    if (password.length < 6) { toast.error('Password too short', { description: 'Minimum 6 characters.' }); return; }
    if (step === 'create-agency' && password !== confirmPassword) { toast.error('Passwords do not match', { description: 'Both password fields must be identical.' }); return; }
    if (step === 'create-agency' && !agreedToTerms) { toast.error('Please agree to the Terms of Service'); return; }

    setLoading(true);
    try {
      // Step 1 — create auth user
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          emailRedirectTo: `${window.location.origin}/auth/confirm`,
          data: { display_name: fullName || email, phone },
        },
      });

      if (error) throw new Error(`Account creation failed: ${error.message}`);
      if (!data.user) throw new Error('No user returned. Please try again.');

      const userId = data.user.id;

      // Step 2 — set up agent profile via edge function
      const { data: setupResult, error: setupError } = await supabase.functions.invoke('setup-agent', {
        body: {
          userId,
          email,
          fullName,
          phone,
          mode: step,
          agencyName,
          agencyEmail,
          inviteCode,
          licenseNumber,
          officeAddress,
          yearsExperience,
          specialization,
          investmentNiche: specialisations.length > 0 ? specialisations.join(',') : null,
          handlesTrustAccounting,
        },
      });

      if (setupError) throw new Error(`Profile setup failed: ${setupError.message}`);
      if (setupResult?.error) throw new Error(`Profile setup error: ${setupResult.error}`);

      // Store terms acceptance
      await supabase.from('profiles').update({
        terms_accepted_at: new Date().toISOString(),
        terms_version: '1.0',
      } as any).eq('user_id', userId);

      const { data: sessionData } = await supabase.auth.getSession();

      if (sessionData?.session) {
        toast.success('🎉 Account created!');
        setPendingRedirect('dashboard');
      } else {
        toast('✉️ Check your email', { description: `We sent a confirmation link to ${email}. Click it to verify your account and sign in. Check your spam folder if you don't see it.`, duration: 10000 });
        setStep('email');
        setLoading(false);
      }
    } catch (err: any) {
      console.error('[handleSignup]', err);
      toast.error('Registration failed', { duration: 8000 });
      setLoading(false);
    }
  };

  const handleOAuth = async (provider: 'google' | 'apple') => {
    const { error } = await lovable.auth.signInWithOAuth(provider, {
      redirect_uri: window.location.origin + '/auth/callback',
    });
    if (error) toast.error('Error');
  };

  const goBack = () => {
    setCaptchaToken(null);
    captchaRef.current?.resetCaptcha();
    if (step === 'password') { setStep('email'); setPassword(''); }
    else if (step === 'create-agency' || step === 'join-agency') setStep('choose');
    else if (step === 'choose') setStep('email');
    else navigate('/for-agents');
  };

  const inputClass = "w-full px-4 py-3.5 rounded-[14px] border border-stone-200 bg-stone-50 text-stone-900 text-sm placeholder:text-stone-300 focus:outline-none focus:border-blue-400 focus:ring-2 focus:ring-blue-100 focus:bg-white transition-all";

  const AGENT_PILLS = ['Pocket listings', 'Pre-market period', 'AI buyer matching', 'Pipeline kanban', 'Rent roll', 'Trust accounting', '24 languages'];

  return (
    <div className="min-h-screen flex" style={{ background: '#020817' }}>

      {/* ── LEFT: Dark premium panel ── */}
      <div className="hidden lg:flex lg:w-[48%] shrink-0 flex-col justify-between p-11 relative overflow-hidden">
        {/* Ambient glow top-right */}
        <div className="absolute -top-28 -right-16 w-[380px] h-[380px] rounded-full pointer-events-none" style={{ background: 'radial-gradient(circle, rgba(37,99,235,0.18) 0%, transparent 70%)' }} />
        {/* Ambient glow bottom-left */}
        <div className="absolute -bottom-16 -left-12 w-[280px] h-[280px] rounded-full pointer-events-none" style={{ background: 'radial-gradient(circle, rgba(37,99,235,0.10) 0%, transparent 70%)' }} />
        {/* Top accent line */}
        <div className="absolute top-0 left-0 right-0 h-px" style={{ background: 'linear-gradient(90deg, transparent, rgba(37,99,235,0.6), rgba(99,179,237,0.4), transparent)' }} />

        {/* Brand */}
        <div className="relative z-10 flex items-center gap-2.5">
          <div className="w-7 h-7 rounded-lg bg-blue-600 flex items-center justify-center text-[11px] font-bold text-white">L</div>
          <span className="text-[15px] font-semibold text-white tracking-tight">ListHQ</span>
        </div>

        {/* Hero content */}
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
            <span className="text-[10px] font-medium tracking-widest uppercase text-stone-400">Agent sign in</span>
          </div>

          <h1 className="text-[38px] font-light text-stone-900 leading-[1.08] mb-8" style={{ letterSpacing: '-1.5px' }}>
            {(step === 'email' || step === 'password') && <>Welcome<br /><strong className="font-semibold">back.</strong></>}
            {step === 'choose' && <>Join<br /><strong className="font-semibold">ListHQ.</strong></>}
            {step === 'create-agency' && <>Create your<br /><strong className="font-semibold">account.</strong></>}
            {step === 'join-agency' && <>Join your<br /><strong className="font-semibold">agency.</strong></>}
          </h1>

          <p className="text-sm text-stone-400 mb-6 -mt-4">
            {step === 'email' && 'Access your dashboard, listings, and leads.'}
            {step === 'password' && email}
            {step === 'choose' && 'Start your free 60-day trial. No credit card required.'}
            {step === 'create-agency' && 'Set up your agent profile and start listing in minutes.'}
            {step === 'join-agency' && 'Enter your invite code to join a team.'}
          </p>

          {/* ── Step: Email ── */}
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
                <button type="button" onClick={() => setStep('choose')} className="text-primary font-semibold underline underline-offset-2">
                  Start your free 60-day trial
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

              <p className="text-xs text-muted-foreground mt-3 text-center">
                Have a demo code?{' '}
                <Link to="/agents/demo" className="text-primary font-medium hover:underline">Access demo →</Link>
              </p>

              <p className="text-xs text-muted-foreground mt-3 text-center leading-relaxed">
                By continuing you agree to our{' '}
                <a href="/terms" target="_blank" rel="noopener noreferrer" className="text-primary underline underline-offset-2">Terms of Service</a>
                {' '}and{' '}
                <a href="/privacy" target="_blank" rel="noopener noreferrer" className="text-primary underline underline-offset-2">Privacy Policy</a>.
              </p>
            </>
          )}

          {/* ── Step: Password ── */}
          {step === 'password' && (
            <>
              <form onSubmit={handleSignIn} className="space-y-4">
                <div>
                  <label className="text-sm font-medium text-foreground mb-1.5 block">Password</label>
                  <input type="password" required autoFocus minLength={6} value={password} onChange={(e) => setPassword(e.target.value)} className={inputClass} />
                </div>
                <div className="text-right">
                  <Link to="/forgot-password" className="text-xs text-primary font-medium underline underline-offset-2">Forgot password?</Link>
                </div>
                <button type="submit" disabled={loading} className="w-full py-3.5 rounded-full bg-primary text-primary-foreground font-semibold text-sm transition-colors disabled:opacity-50">
                  {loading ? 'Signing in…' : 'Sign In'}
                </button>
              </form>
              <button type="button" onClick={goBack} className="text-sm text-muted-foreground mt-4 hover:text-foreground underline underline-offset-2">
                ← Use a different email
              </button>
            </>
          )}

          {/* ── Step: Choose signup path ── */}
          {step === 'choose' && (
            <div className="space-y-3">
              <div className="flex items-center gap-2 px-3 py-2 rounded-xl bg-emerald-500/10 border border-emerald-500/20">
                <Zap size={13} className="text-emerald-600 shrink-0" />
                <p className="text-xs font-medium text-emerald-700">Free for 60 days — no credit card required. Cancel anytime.</p>
              </div>

              <button
                type="button"
                onClick={() => setStep('create-agency')}
                className="w-full flex items-center gap-4 p-4 rounded-2xl border border-border text-left hover:border-primary hover:bg-primary/5 transition-colors group">
                <div className="w-11 h-11 rounded-xl bg-primary/10 flex items-center justify-center shrink-0 group-hover:bg-primary/15 transition-colors">
                  <Building2 size={20} className="text-primary" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-semibold text-foreground text-sm group-hover:text-primary transition-colors">Create a New Agency</p>
                  <p className="text-xs text-muted-foreground mt-0.5">Set up your profile and start listing immediately</p>
                </div>
                <ChevronRight size={16} className="text-muted-foreground group-hover:text-primary transition-colors shrink-0" />
              </button>

              <button
                type="button"
                onClick={() => setStep('join-agency')}
                className="w-full flex items-center gap-4 p-4 rounded-2xl border border-border text-left hover:border-primary hover:bg-primary/5 transition-colors group">
                <div className="w-11 h-11 rounded-xl bg-primary/10 flex items-center justify-center shrink-0 group-hover:bg-primary/15 transition-colors">
                  <KeyRound size={20} className="text-primary" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-semibold text-foreground text-sm group-hover:text-primary transition-colors">Join with Invite Code</p>
                  <p className="text-xs text-muted-foreground mt-0.5">Your agency admin sent you an invite code</p>
                </div>
                <ChevronRight size={16} className="text-muted-foreground group-hover:text-primary transition-colors shrink-0" />
              </button>

              <button
                type="button"
                onClick={goBack}
                className="w-full text-sm text-muted-foreground hover:text-foreground transition-colors py-2 text-center">
                ← Already have an account? Sign in
              </button>
            </div>
          )}

          {/* ── Step: Create agency ── */}
          {step === 'create-agency' && (
            <>
              <form onSubmit={handleSignup} className="space-y-4">
                <div>
                  <label className="text-sm font-medium text-foreground mb-1.5 block">Email Address<span className="text-destructive">*</span></label>
                  <input type="email" required autoFocus value={email} onChange={(e) => setEmail(e.target.value)} className={inputClass} />
                </div>
                <div>
                  <label className="text-sm font-medium text-foreground mb-1.5 block">Your Full Name<span className="text-destructive">*</span></label>
                  <input type="text" required value={fullName} onChange={(e) => setFullName(e.target.value)} className={inputClass} />
                </div>
                <div>
                  <label className="text-sm font-medium text-foreground mb-1 block">Agency or Trading Name<span className="text-destructive">*</span></label>
                  <p className="text-xs text-muted-foreground mb-1.5">Your agency name, or your own name if you are a sole trader.</p>
                  <input type="text" required value={agencyName} onChange={(e) => setAgencyName(e.target.value)} className={inputClass} />
                </div>
                <div>
                  <label className="text-sm font-medium text-foreground mb-1.5 block">Phone Number<span className="text-destructive">*</span></label>
                  <PhoneInput value={phone} onChange={setPhone} />
                </div>

                {/* Password */}
                <div className="space-y-3">
                  <div>
                    <label className="text-sm font-medium text-foreground mb-1.5 block">Password<span className="text-destructive">*</span></label>
                    <input type="password" required minLength={6} value={password} onChange={(e) => setPassword(e.target.value)} className={inputClass} />
                    {strength && (
                      <div className="mt-2 space-y-1">
                        <div className="flex gap-1">
                          {['weak', 'fair', 'strong'].map((level, i) => (
                            <div key={level} className={`h-1 flex-1 rounded-full transition-colors ${
                              strength === 'weak' && i === 0 ? 'bg-red-400'
                              : strength === 'fair' && i <= 1 ? 'bg-amber-400'
                              : strength === 'strong' && i <= 2 ? 'bg-emerald-500'
                              : 'bg-border'
                            }`} />
                          ))}
                        </div>
                        <p className={`text-[11px] font-medium ${
                          strength === 'weak' ? 'text-red-500'
                          : strength === 'fair' ? 'text-amber-500'
                          : 'text-emerald-600'
                        }`}>
                          {strength === 'weak' && 'Too short — minimum 6 characters'}
                          {strength === 'fair' && 'Fair — add uppercase and numbers for a stronger password'}
                          {strength === 'strong' && '✓ Strong password'}
                        </p>
                      </div>
                    )}
                  </div>
                  <div>
                    <label className="text-sm font-medium text-foreground mb-1.5 block">Confirm Password<span className="text-destructive">*</span></label>
                    <input type="password" required minLength={6} value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)} className={inputClass} />
                    {confirmPassword.length > 0 && !passwordsMatch && (
                      <p className="text-[11px] text-red-500 font-medium mt-1">Passwords do not match</p>
                    )}
                    {confirmPassword.length > 0 && passwordsMatch && (
                      <p className="text-[11px] text-emerald-600 font-medium mt-1">✓ Passwords match</p>
                    )}
                  </div>
                </div>

                {/* Office address */}
                <div>
                  <label className="text-sm font-medium text-foreground mb-1.5 block">
                    Office Address
                    <span className="text-xs font-normal text-muted-foreground ml-1">(optional)</span>
                  </label>
                  <div className="relative">
                    <input
                      type="text"
                      value={officeAddress}
                      onChange={(e) => handleOfficeInput(e.target.value)}
                      placeholder="e.g. 123 Main St, Sydney"
                      className={inputClass}
                      autoComplete="off"
                    />
                    {officeConfirmed && (
                      <div className="absolute right-3 top-1/2 -translate-y-1/2 text-primary">
                        <CheckCircle2 size={18} />
                      </div>
                    )}
                    {officeSuggestions.length > 0 && (
                      <div className="absolute z-50 w-full mt-1 bg-popover border border-border rounded-xl shadow-lg overflow-hidden">
                        {officeSuggestions.map((s) => (
                          <button
                            key={s.place_id}
                            type="button"
                            onMouseDown={(e) => e.preventDefault()}
                            onClick={() => selectOfficeAddress(s)}
                            className="w-full text-left px-4 py-3 text-sm hover:bg-accent transition-colors flex items-center gap-2"
                          >
                            <MapPin size={14} className="text-muted-foreground shrink-0" />
                            <span className="truncate">{s.description}</span>
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                </div>

                {/* Licence */}
                <div>
                  <label className="text-sm font-medium text-foreground mb-1.5 block">
                    Real Estate Licence Number
                    <span className="text-xs font-normal text-muted-foreground ml-1">(optional)</span>
                  </label>
                  <input type="text" value={licenseNumber} onChange={(e) => setLicenseNumber(e.target.value)} placeholder="e.g. 1234567" className={inputClass} />
                  <p className="text-[11px] text-muted-foreground mt-1.5">Required to display your Verified Agent badge on your public profile.</p>
                </div>

                {/* Years / Specialization */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="text-sm font-medium text-foreground mb-1.5 block">
                      Years of Experience
                      <span className="text-xs font-normal text-muted-foreground ml-1">(optional)</span>
                    </label>
                    <input type="number" min="0" max="60" value={yearsExperience} onChange={(e) => setYearsExperience(e.target.value)} placeholder="e.g. 5" className={inputClass} />
                  </div>
                  <div>
                    <label className="text-sm font-medium text-foreground mb-1.5 block">Primary Specialisation</label>
                    <select value={specialization} onChange={(e) => setSpecialization(e.target.value)} className={inputClass + ' appearance-none'}>
                      <option value="Residential">Residential</option>
                      <option value="Commercial">Commercial</option>
                      <option value="Rural & Lifestyle">Rural & Lifestyle</option>
                      <option value="Industrial">Industrial</option>
                      <option value="Business Broking">Business Broking</option>
                    </select>
                  </div>
                </div>

                {/* Specialisations multi-select */}
                <div>
                  <label className="text-sm font-medium text-foreground mb-1.5 block">
                    I also specialise in
                    <span className="text-xs text-muted-foreground ml-1 font-normal">(select all that apply)</span>
                  </label>
                  <div className="flex flex-wrap gap-2 mt-1">
                    {['Residential Sales', 'Residential Rentals', 'Commercial', 'Rural', 'Prestige', 'Property Management', 'Business Broking', 'Holiday Rentals'].map(s => (
                      <button
                        key={s}
                        type="button"
                        onClick={() => toggleSpecialisation(s)}
                        className={`px-3 py-1.5 rounded-full border text-xs font-medium transition-colors ${
                          specialisations.includes(s)
                            ? 'border-primary bg-primary/10 text-primary'
                            : 'border-border bg-background text-muted-foreground hover:border-primary/30 hover:text-foreground'
                        }`}
                      >
                        {s}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Trust accounting */}
                <label className="flex items-start gap-2.5 cursor-pointer p-3 rounded-xl border border-border hover:border-primary/30 transition-colors">
                  <input type="checkbox" checked={handlesTrustAccounting} onChange={(e) => setHandlesTrustAccounting(e.target.checked)} className="mt-0.5 accent-primary" />
                  <div>
                    <span className="text-sm font-medium text-foreground">Do you handle trust accounting?</span>
                    <p className="text-[11px] text-muted-foreground mt-0.5">Yes, I need compliance-ready reporting</p>
                  </div>
                </label>

                {/* Terms checkbox — direct onClick on div, no sr-only tricks */}
                <div
                  onClick={() => setAgreedToTerms(v => !v)}
                  className={`p-3 rounded-xl border cursor-pointer select-none transition-colors ${
                    agreedToTerms ? 'border-primary bg-primary/5' : 'border-border bg-background'
                  }`}
                >
                  <div className="flex items-start gap-3">
                    <div className={`w-5 h-5 mt-0.5 rounded border-2 flex items-center justify-center shrink-0 transition-colors ${
                      agreedToTerms ? 'bg-primary border-primary' : 'border-border'
                    }`}>
                      {agreedToTerms && (
                        <svg width="10" height="10" viewBox="0 0 10 10" fill="none">
                          <path d="M2 5l2.5 2.5L8 3" stroke="white" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                        </svg>
                      )}
                    </div>
                    <div className="space-y-1">
                      <p className="text-sm font-medium text-foreground">I agree to the ListHQ Terms of Service</p>
                      <p className="text-xs text-muted-foreground leading-relaxed">
                        By creating an account I confirm I hold a current real estate licence, that all information provided is accurate, and that I have read and agree to the{' '}
                        <a href="/terms" target="_blank" rel="noopener noreferrer" onClick={(e) => e.stopPropagation()} className="text-primary underline underline-offset-2">Terms of Service</a>
                        {' '}and{' '}
                        <a href="/privacy" target="_blank" rel="noopener noreferrer" onClick={(e) => e.stopPropagation()} className="text-primary underline underline-offset-2">Privacy Policy</a>.
                      </p>
                    </div>
                  </div>
                </div>

                {!agreedToTerms && (
                  <p className="text-xs text-muted-foreground text-center">You must agree to the terms before creating your account</p>
                )}

                <button
                  type="submit"
                  disabled={loading || !agreedToTerms || password !== confirmPassword || password.length < 6}
                  className="w-full py-3.5 rounded-full bg-primary text-primary-foreground font-semibold text-sm transition-colors disabled:opacity-50"
                >
                  {loading ? 'Setting up your account…' : 'Create Account'}
                </button>

                <p className="text-xs text-center text-muted-foreground">
                  You will be taken to your dashboard immediately after sign up.
                </p>
              </form>
              <button type="button" onClick={goBack} className="text-sm text-muted-foreground mt-4 hover:text-foreground underline underline-offset-2">← Back to options</button>
            </>
          )}

          {/* ── Step: Join agency ── */}
          {step === 'join-agency' && (
            <>
              <form onSubmit={handleSignup} className="space-y-4">
                <div>
                  <label className="text-sm font-medium text-foreground mb-1.5 block">Email Address<span className="text-destructive">*</span></label>
                  <input type="email" required autoFocus value={email} onChange={(e) => setEmail(e.target.value)} className={inputClass} />
                </div>
                <div>
                  <label className="text-sm font-medium text-foreground mb-1.5 block">Your Full Name<span className="text-destructive">*</span></label>
                  <input type="text" required value={fullName} onChange={(e) => setFullName(e.target.value)} className={inputClass} />
                </div>
                <div>
                  <label className="text-sm font-medium text-foreground mb-1.5 block">Invite Code<span className="text-destructive">*</span></label>
                  <input type="text" required value={inviteCode} onChange={(e) => setInviteCode(e.target.value.toUpperCase())} className={inputClass + ' uppercase tracking-widest font-mono'} />
                </div>
                <div>
                  <label className="text-sm font-medium text-foreground mb-1.5 block">Phone Number</label>
                  <PhoneInput value={phone} onChange={setPhone} />
                </div>
                <div>
                  <label className="text-sm font-medium text-foreground mb-1.5 block">Password<span className="text-destructive">*</span></label>
                  <input type="password" required minLength={6} value={password} onChange={(e) => setPassword(e.target.value)} className={inputClass} />
                </div>
                <button type="submit" disabled={loading} className="w-full py-3.5 rounded-full bg-primary text-primary-foreground font-semibold text-sm transition-colors disabled:opacity-50">
                  {loading ? 'Joining…' : 'Join Agency'}
                </button>
              </form>
              <button type="button" onClick={goBack} className="text-sm text-muted-foreground mt-4 hover:text-foreground underline underline-offset-2">← Back to options</button>
              <p className="text-xs text-muted-foreground mt-3 text-center leading-relaxed">
                By continuing you agree to our{' '}
                <a href="/terms" target="_blank" rel="noopener noreferrer" className="text-primary underline underline-offset-2">Terms of Service</a>
                {' '}and{' '}
                <a href="/privacy" target="_blank" rel="noopener noreferrer" className="text-primary underline underline-offset-2">Privacy Policy</a>.
              </p>
            </>
          )}

        </motion.div>
        </div>

        {/* Portal whisper footer */}
        <div className="px-10 lg:px-20 py-5 border-t border-stone-100 shrink-0 max-w-lg mx-auto w-full">
          <p className="text-[11px] text-stone-300">
            Looking for the buyer portal?{' '}
            <Link to="/login" className="text-stone-400 hover:text-blue-600 transition-colors">Property Seeker sign in</Link>
            <span className="mx-1.5 text-stone-200">·</span>
            <Link to="/partner/login" className="text-stone-400 hover:text-blue-600 transition-colors">Trust Accounting Partner</Link>
          </p>
        </div>
      </div>
    </div>
  );
};

export default AgentAuthPage;
