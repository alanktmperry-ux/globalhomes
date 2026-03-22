import { useState, useEffect, useRef } from 'react';
import { motion } from 'framer-motion';
import { Building2, KeyRound, Plus, BarChart3, Users, Megaphone, MapPin, CheckCircle2, Home } from 'lucide-react';
import { autocomplete } from '@/shared/lib/googleMapsService';
import PhoneInput from '@/shared/components/PhoneInput';
import { useNavigate, Link } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { lovable } from '@/integrations/lovable/index';
import { useToast } from '@/shared/hooks/use-toast';
import { useAuth } from '@/features/auth/AuthProvider';
import agentHero from '@/assets/agent-auth-hero.jpg';

type Step = 'email' | 'password' | 'choose' | 'create-agency' | 'join-agency';

const AgentAuthPage = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const { user, isAgent, isAdmin, loading: authLoading } = useAuth();
  
  const [pendingRedirect, setPendingRedirect] = useState<'dashboard' | null>(null);
  const [step, setStep] = useState<Step>('email');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const passwordStrength = (p: string) => {
    if (p.length === 0) return null;
    if (p.length < 6) return 'weak';
    if (p.length < 10 || !/[A-Z]/.test(p) || !/[0-9]/.test(p)) return 'fair';
    return 'strong';
  };
  const strength = passwordStrength(password);
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
  const toggleSpecialisation = (value: string) => {
    setSpecialisations(prev =>
      prev.includes(value)
        ? prev.filter(s => s !== value)
        : [...prev, value]
    );
  };
  const [handlesTrustAccounting, setHandlesTrustAccounting] = useState(false);
  const [agreedToTerms, setAgreedToTerms] = useState(false);
  const [loading, setLoading] = useState(false);
  const [officeSuggestions, setOfficeSuggestions] = useState<{ description: string; place_id: string }[]>([]);
  const [officeConfirmed, setOfficeConfirmed] = useState(false);
  const officeDebounceRef = useRef<ReturnType<typeof setTimeout>>();

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

  const generateSlug = (name: string) =>
    name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '') + '-' + Math.random().toString(36).slice(2, 6);

  const handleEmailContinue = (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim()) return;
    setStep('password');
  };

  // Navigate once AuthProvider confirms the user is an agent or admin
  useEffect(() => {
    if (pendingRedirect === 'dashboard' && user && (isAgent || isAdmin) && !authLoading) {
      setPendingRedirect(null);
      setLoading(false);
      navigate('/dashboard');
    }
  }, [pendingRedirect, user, isAgent, isAdmin, authLoading, navigate]);

  // Safety: if pending redirect but auth settles without agent/admin role, reset
  // Wait up to 8 seconds for roles to load before showing error
  useEffect(() => {
    if (pendingRedirect === 'dashboard' && user && !authLoading && !isAgent && !isAdmin) {
      const timeout = setTimeout(() => {
        setPendingRedirect(null);
        setLoading(false);
        toast({ title: 'Error', description: 'This account does not have agent access. Please contact support if you believe this is an error.', variant: 'destructive' });
      }, 8000);
      return () => clearTimeout(timeout);
    }
  }, [pendingRedirect, user, authLoading, isAgent, isAdmin, toast]);

  const handleSignIn = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      console.log('[AgentAuth] Attempting sign in for:', email);
      const { data, error } = await supabase.auth.signInWithPassword({ email, password });
      console.log('[AgentAuth] Sign in result:', { user: data?.user?.id, error: error?.message });
      if (error) {
        if (error.message.includes('Email not confirmed')) {
          throw new Error('Please check your email and click the confirmation link before signing in.');
        }
        throw error;
      }
      toast({ title: 'Welcome back, Agent!' });
      setPendingRedirect('dashboard');
    } catch (err: any) {
      toast({ title: 'Error', description: err.message, variant: 'destructive' });
      setLoading(false);
    }
  };

  const handleSignup = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      const { data, error } = await supabase.auth.signUp({
        email, password,
        options: { emailRedirectTo: window.location.origin, data: { display_name: fullName || email, phone } },
      });
      if (error) throw error;
      if (!data.user) throw new Error('Signup failed');
      const userId = data.user.id;

      // Use edge function with service role to set up agent data (bypasses RLS when no active session)
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

      if (setupError) throw new Error(setupError.message || 'Setup failed');
      if (setupResult?.error) throw new Error(setupResult.error);

      // Check if session is active (auto-confirm) or needs email verification
      const { data: sessionData } = await supabase.auth.getSession();
      if (sessionData?.session) {
        if (step === 'create-agency') {
          toast({ title: 'Agency created!', description: `"${agencyName}" is ready.` });
        } else {
          toast({ title: 'Welcome to the team!', description: `You've joined ${setupResult?.agencyName || 'the agency'}.` });
        }
        setPendingRedirect('dashboard');
      } else {
        toast({
          title: 'Check your email',
          description: 'We sent you a confirmation link. Please verify your email to sign in.',
        });
        setStep('email');
        setLoading(false);
      }
    } catch (err: any) {
      toast({ title: 'Error', description: err.message, variant: 'destructive' });
      setLoading(false);
    }
  };

  const handleOAuth = async (provider: 'google' | 'apple') => {
    const { error } = await lovable.auth.signInWithOAuth(provider, { redirect_uri: window.location.origin });
    if (error) toast({ title: 'Error', description: String(error), variant: 'destructive' });
  };

  const goBack = () => {
    if (step === 'password') { setStep('email'); setPassword(''); }
    else if (step === 'create-agency' || step === 'join-agency') setStep('choose');
    else if (step === 'choose') setStep('email');
    else navigate('/for-agents');
  };

  const inputClass = "w-full px-4 py-3.5 rounded-full border border-border bg-background text-foreground text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/40";

  const features = [
    { icon: Building2, text: 'Manage all your property listings' },
    { icon: BarChart3, text: 'Track views, leads & analytics' },
    { icon: Users, text: 'Build your team & grow your network' },
    { icon: Megaphone, text: 'Capture voice-search leads automatically' },
  ];

  return (
    <div className="min-h-screen flex">
      {/* Left hero panel — dark professional theme, hidden on mobile */}
      <div className="hidden lg:flex lg:w-1/2 relative overflow-hidden">
        <img src={agentHero} alt="Real estate professional" className="absolute inset-0 w-full h-full object-cover" />
        <div className="absolute inset-0 bg-gradient-to-t from-[hsl(222,47%,8%)]/95 via-[hsl(222,47%,11%)]/70 to-[hsl(222,47%,11%)]/30" />
        <div className="relative z-10 flex flex-col justify-between p-12 text-white h-full">
          {/* Top badge */}
          <div className="flex items-center gap-2.5">
            <div className="w-10 h-10 rounded-xl bg-white/15 backdrop-blur-sm flex items-center justify-center">
              <Building2 size={20} />
            </div>
            <div>
              <span className="text-sm font-bold uppercase tracking-wider">Agent Portal</span>
              <p className="text-white/50 text-[10px] uppercase tracking-widest">For Real Estate Professionals</p>
            </div>
          </div>

          {/* Bottom content */}
          <div>
            <h2 className="font-display text-4xl font-bold leading-tight mb-4">Grow your<br />business</h2>
            <p className="text-white/70 text-base mb-6 max-w-sm">The complete platform for real estate agents and agencies.</p>
            <div className="space-y-3">
              {features.map((f, i) => (
                <div key={i} className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-lg bg-white/10 flex items-center justify-center shrink-0">
                    <f.icon size={15} />
                  </div>
                  <span className="text-white/80 text-sm">{f.text}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Right form panel */}
      <main className="flex-1 bg-background flex flex-col justify-center max-w-sm mx-auto w-full px-6 py-12 lg:max-w-md lg:px-12">
        <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }}>
          {/* Brand */}
          <div className="mb-2">
            <Link to="/" className="inline-flex items-center gap-2">
              <div className="w-7 h-7 rounded-full bg-primary flex items-center justify-center">
                <span className="text-primary-foreground text-xs font-bold">L</span>
              </div>
              <span className="font-display text-lg font-bold text-foreground">ListHQ</span>
            </Link>
          </div>




          <h1 className="font-display text-2xl font-bold text-foreground mb-1">
            {step === 'email' && 'Agent Sign In'}
            {step === 'password' && 'Welcome back, Agent'}
            {step === 'choose' && 'Register as Agent'}
            {step === 'create-agency' && 'Create your account'}
            {step === 'join-agency' && 'Join an Agency'}
          </h1>
          <p className="text-sm text-muted-foreground mb-6">
            {step === 'email' && 'Access your dashboard, listings, and leads.'}
            {step === 'password' && email}
            {step === 'choose' && 'Choose how you want to get started.'}
            {step === 'create-agency' && 'Set up your agent profile and start listing in minutes.'}
            {step === 'join-agency' && 'Enter your invite code to join a team.'}
          </p>

          {/* Step: Email */}
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
                <button onClick={() => setStep('choose')} className="text-primary font-semibold underline underline-offset-2">Start your free 60-day trial</button>
              </p>

              <div className="flex items-center gap-4 my-6">
                <div className="flex-1 h-px bg-border" />
                <span className="text-xs font-medium text-muted-foreground uppercase">Or</span>
                <div className="flex-1 h-px bg-border" />
              </div>

              <div className="space-y-3">
                <button onClick={() => handleOAuth('google')} className="w-full flex items-center gap-3 py-3.5 px-5 rounded-full border border-border bg-background text-foreground text-sm font-medium hover:bg-accent transition-colors">
                  <svg width="18" height="18" viewBox="0 0 24 24"><path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z" fill="#4285F4"/><path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/><path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/><path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/></svg>
                  Continue with Google
                </button>
              </div>




              <p className="text-xs text-muted-foreground mt-3 text-center">
                Have a demo code?{' '}
                <Link to="/agents/demo" className="text-primary font-medium hover:underline">
                  Access demo →
                </Link>
              </p>

              <p className="text-xs text-muted-foreground mt-3 text-center leading-relaxed">
                By continuing you agree to our{' '}
                <a href="/terms" target="_blank" rel="noopener noreferrer" className="text-primary underline underline-offset-2">Terms of Service</a>
                {' '}and{' '}
                <a href="/privacy" target="_blank" rel="noopener noreferrer" className="text-primary underline underline-offset-2">Privacy Policy</a>.
              </p>
            </>
          )}

          {/* Step: Password */}
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
                  {loading ? 'Please wait...' : 'Sign In'}
                </button>
              </form>
              <button onClick={goBack} className="text-sm text-muted-foreground mt-4 hover:text-foreground underline underline-offset-2">
                ← Use a different email
              </button>
            </>
          )}

          {/* Step: Choose signup path */}
          {step === 'choose' && (
            <div className="space-y-3">
              <button onClick={() => setStep('create-agency')} className="w-full flex items-center gap-4 p-4 rounded-2xl border border-border text-left hover:border-primary/50 transition-colors">
                <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center shrink-0">
                  <Plus size={22} className="text-primary" />
                </div>
                <div>
                  <p className="font-semibold text-foreground text-sm">Create a New Agency</p>
                  <p className="text-xs text-muted-foreground mt-0.5">Set up your company, add staff later</p>
                </div>
              </button>
              <button onClick={() => setStep('join-agency')} className="w-full flex items-center gap-4 p-4 rounded-2xl border border-border text-left hover:border-primary/50 transition-colors">
                <div className="w-12 h-12 rounded-xl bg-accent flex items-center justify-center shrink-0">
                  <KeyRound size={22} className="text-foreground" />
                </div>
                <div>
                  <p className="font-semibold text-foreground text-sm">Join with Invite Code</p>
                  <p className="text-xs text-muted-foreground mt-0.5">Your agency admin gave you a code</p>
                </div>
              </button>
              <button onClick={goBack} className="text-sm text-muted-foreground mt-4 hover:text-foreground underline underline-offset-2">
                ← Back to sign in
              </button>
            </div>
          )}

          {/* Step: Create agency */}
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
                <div className="space-y-3">
                  <div>
                    <label className="text-sm font-medium text-foreground mb-1.5 block">Password<span className="text-destructive">*</span></label>
                    <input type="password" required minLength={6} value={password} onChange={(e) => setPassword(e.target.value)} className={inputClass} />
                    {strength && (
                      <div className="mt-2 space-y-1">
                        <div className="flex gap-1">
                          {['weak', 'fair', 'strong'].map((level, i) => (
                            <div
                              key={level}
                              className={`h-1 flex-1 rounded-full transition-colors ${
                                strength === 'weak' && i === 0 ? 'bg-red-400'
                                : strength === 'fair' && i <= 1 ? 'bg-amber-400'
                                : strength === 'strong' && i <= 2 ? 'bg-emerald-500'
                                : 'bg-border'
                              }`}
                            />
                          ))}
                        </div>
                        <p className={`text-[11px] font-medium ${
                          strength === 'weak' ? 'text-red-500'
                          : strength === 'fair' ? 'text-amber-500'
                          : 'text-emerald-600'
                        }`}>
                          {strength === 'weak' && 'Too short — minimum 6 characters'}
                          {strength === 'fair' && 'Fair — add uppercase and numbers for a stronger password'}
                          {strength === 'strong' && 'Strong password'}
                        </p>
                      </div>
                    )}
                  </div>
                  <div>
                    <label className="text-sm font-medium text-foreground mb-1.5 block">Confirm Password<span className="text-destructive">*</span></label>
                    <input type="password" required minLength={6} value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)} className={inputClass} />
                    {confirmPassword.length > 0 && confirmPassword !== password && (
                      <p className="text-[11px] text-red-500 font-medium mt-1">Passwords do not match</p>
                    )}
                  </div>
                </div>
                <div>
                  <label className="text-sm font-medium text-foreground mb-1.5 block">Office Address</label>
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
                      <div className="absolute z-50 w-full mt-1 bg-popover border border-border rounded-xl shadow-elevated overflow-hidden">
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
                <div>
                  <label className="text-sm font-medium text-foreground mb-1.5 block">Real Estate Licence Number</label>
                  <input type="text" value={licenseNumber} onChange={(e) => setLicenseNumber(e.target.value)} placeholder="Optional but encouraged" className={inputClass} />
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="text-sm font-medium text-foreground mb-1.5 block">Years of Experience</label>
                    <input type="number" min="0" max="60" value={yearsExperience} onChange={(e) => setYearsExperience(e.target.value)} placeholder="e.g. 5" className={inputClass} />
                  </div>
                  <div>
                    <label className="text-sm font-medium text-foreground mb-1.5 block">Specialization</label>
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
                    {[
                      'Residential Sales',
                      'Residential Rentals',
                      'Commercial',
                      'Rural',
                      'Prestige',
                      'Property Management',
                      'Business Broking',
                      'Holiday Rentals',
                    ].map(s => (
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

                {/* Trust Accounting */}
                <label className="flex items-start gap-2.5 cursor-pointer p-3 rounded-xl border border-border hover:border-primary/30 transition-colors">
                  <input type="checkbox" checked={handlesTrustAccounting} onChange={(e) => setHandlesTrustAccounting(e.target.checked)} className="mt-0.5 accent-primary" />
                  <div>
                    <span className="text-sm font-medium text-foreground">Do you handle trust accounting?</span>
                    <p className="text-[11px] text-muted-foreground mt-0.5">Yes, I need compliance-ready reporting</p>
                  </div>
                </label>
                <div className={`p-3 rounded-xl border transition-colors ${agreedToTerms ? 'border-primary bg-primary/5' : 'border-border bg-background'}`}>
                  <label className="flex items-start gap-3 cursor-pointer">
                    <div className={`w-5 h-5 mt-0.5 rounded border-2 flex items-center justify-center shrink-0 transition-colors ${agreedToTerms ? 'bg-primary border-primary' : 'border-border'}`}>
                      {agreedToTerms && (
                        <svg width="10" height="10" viewBox="0 0 10 10" fill="none">
                          <path d="M2 5l2.5 2.5L8 3" stroke="white" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                        </svg>
                      )}
                    </div>
                    <input type="checkbox" checked={agreedToTerms} onChange={(e) => setAgreedToTerms(e.target.checked)} className="sr-only" />
                    <div className="space-y-1">
                      <p className="text-sm font-medium text-foreground">I agree to the ListHQ Terms of Service</p>
                      <p className="text-xs text-muted-foreground leading-relaxed">
                        By creating an account I confirm I hold a current real estate licence, that all information provided is accurate, and that I have read and agree to the{' '}
                        <a href="/terms" target="_blank" rel="noopener noreferrer" onClick={(e) => e.stopPropagation()} className="text-primary underline underline-offset-2 hover:opacity-80">Terms of Service</a>
                        {' '}and{' '}
                        <a href="/privacy" target="_blank" rel="noopener noreferrer" onClick={(e) => e.stopPropagation()} className="text-primary underline underline-offset-2 hover:opacity-80">Privacy Policy</a>.
                      </p>
                    </div>
                  </label>
                </div>
                {!agreedToTerms && (
                  <p className="text-xs text-muted-foreground text-center">You must agree to the terms before creating your account</p>
                )}
                <button type="submit" disabled={loading || !agreedToTerms} className="w-full py-3.5 rounded-full bg-primary text-primary-foreground font-semibold text-sm transition-colors disabled:opacity-50">
                  {loading ? 'Please wait...' : 'Create Agency & Account'}
                </button>
              </form>
              <button onClick={goBack} className="text-sm text-muted-foreground mt-4 hover:text-foreground underline underline-offset-2">← Back to options</button>
            </>
          )}

          {/* Step: Join agency */}
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
                  {loading ? 'Please wait...' : 'Join Agency'}
                </button>
              </form>
              <button onClick={goBack} className="text-sm text-muted-foreground mt-4 hover:text-foreground underline underline-offset-2">← Back to options</button>
              <p className="text-xs text-muted-foreground mt-3 text-center leading-relaxed">
                By continuing you agree to our{' '}
                <a href="/terms" target="_blank" rel="noopener noreferrer" className="text-primary underline underline-offset-2">Terms of Service</a>
                {' '}and{' '}
                <a href="/privacy" target="_blank" rel="noopener noreferrer" className="text-primary underline underline-offset-2">Privacy Policy</a>.
              </p>
            </>
          )}

          {/* Buyer link — visually distinct */}
          <div className="mt-8 pt-6 border-t border-border text-center">
            <p className="text-xs text-muted-foreground">
              Looking to buy a property?{' '}
              <Link to="/login" className="text-primary font-semibold underline underline-offset-2">Buyer sign in →</Link>
            </p>
          </div>
        </motion.div>
      </main>
    </div>
  );
};

export default AgentAuthPage;
