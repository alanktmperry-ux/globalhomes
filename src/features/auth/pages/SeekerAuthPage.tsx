import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Home, Search, Heart, Mic, Building2, Landmark, ArrowRight, CheckCircle2 } from 'lucide-react';
import PhoneInput from '@/shared/components/PhoneInput';
import { useNavigate, Link } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { lovable } from '@/integrations/lovable/index';
import { toast } from 'sonner';
import seekerHero from '@/assets/seeker-auth-hero.jpg';

type Step = 'email' | 'password' | 'create' | 'prefs';

const SeekerAuthPage = () => {
  const navigate = useNavigate();
  const [step, setStep] = useState<Step>('email');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [phone, setPhone] = useState('');
  const [loading, setLoading] = useState(false);
  const [budgetMax, setBudgetMax] = useState('');
  const [suburbs, setSuburbs] = useState('');
  const [propertyType, setPropertyType] = useState('');

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
      navigate('/');
    } catch (err: any) {
      toast.error('Something went wrong', { description: err?.message || 'Please try again.' });
    } finally {
      setLoading(false);
    }
  };

  const handleCreateAccount = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!phone.trim()) {
      toast.error('Phone required', { description: 'Please enter your mobile number.' });
      return;
    }
    setLoading(true);
    try {
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          emailRedirectTo: window.location.origin + '/auth/confirm',
          data: { display_name: displayName || email, phone },
        },
      });
      if (error) throw error;

      if (data.user && !data.session) {
        await supabase.from('profiles').update({
          terms_accepted_at: new Date().toISOString(),
          terms_version: '1.0',
        } as any).eq('user_id', data.user.id);

        toast('✉️ Check your email', { description: `We sent a confirmation link to ${email}. Click it to verify your account and sign in. Check your spam folder if you don't see it.`, duration: 10000 });
        setStep('email');
      } else {
        if (data.user) {
          await supabase.from('profiles').update({
            terms_accepted_at: new Date().toISOString(),
            terms_version: '1.0',
          } as any).eq('user_id', data.user.id);
        }
        toast.success('🎉 Account created!', { description: 'Setting up your preferences...' });
        setStep('prefs');
      }
    } catch (err: any) {
      toast.error('Something went wrong', { description: err?.message || 'Please try again.' });
    } finally {
      setLoading(false);
    }
  };

  const handleSavePrefs = async () => {
    try {
      const { data: { user: u } } = await supabase.auth.getUser();
      if (u && (budgetMax || suburbs)) {
        await supabase
          .from('user_preferences')
          .update({
            budget_max: budgetMax ? parseInt(budgetMax.replace(/[^0-9]/g, '')) : null,
            preferred_locations: suburbs ? suburbs.split(',').map(s => s.trim()).filter(Boolean) : [],
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

  const inputClass = "w-full px-4 py-3.5 rounded-2xl border border-stone-200 bg-white text-stone-900 text-sm placeholder:text-stone-400 focus:outline-none focus:ring-2 focus:ring-blue-500/30 focus:border-blue-400 transition-all shadow-sm";

  const features = [
    { icon: Search, text: 'Search thousands of properties Australia-wide' },
    { icon: Mic, text: 'AI voice search in 24 languages' },
    { icon: Heart, text: 'Save favourites & get instant price alerts' },
  ];

  return (
    <div className="min-h-screen flex">

      {/* ── Left: Hero panel ─────────────────────────────────── */}
      <div className="hidden lg:flex lg:w-[52%] relative overflow-hidden">
        <img
          src={seekerHero}
          alt="Find your dream home"
          className="absolute inset-0 w-full h-full object-cover"
        />
        {/* Layered gradient — warm at base, dark at top for legibility */}
        <div className="absolute inset-0 bg-gradient-to-br from-black/20 via-black/40 to-black/75" />
        <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-transparent to-transparent" />

        <div className="relative z-10 flex flex-col justify-between h-full p-12">
          {/* Top: Brand back link */}
          <Link to="/" className="inline-flex items-center gap-2 text-white/80 hover:text-white transition-colors w-fit">
            <div className="w-8 h-8 rounded-xl bg-white/15 backdrop-blur-sm flex items-center justify-center">
              <span className="text-white text-xs font-bold">L</span>
            </div>
            <span className="text-sm font-semibold tracking-wide">ListHQ</span>
          </Link>

          {/* Bottom: Headline + features */}
          <div>
            {/* Badge */}
            <div className="inline-flex items-center gap-2 mb-6 px-3 py-1.5 rounded-full bg-white/10 backdrop-blur-sm border border-white/20">
              <Home size={13} className="text-white/80" />
              <span className="text-xs font-semibold uppercase tracking-widest text-white/80">Property Seeker</span>
            </div>

            <h2 className="font-display text-5xl font-bold leading-[1.1] text-white mb-6">
              Find your<br />
              <span className="text-blue-300">next home.</span>
            </h2>

            <div className="space-y-3 mb-8">
              {features.map((f, i) => (
                <div key={i} className="flex items-center gap-3">
                  <CheckCircle2 size={16} className="text-blue-400 shrink-0" />
                  <span className="text-white/80 text-sm">{f.text}</span>
                </div>
              ))}
            </div>

            {/* Stats strip */}
            <div className="flex items-center gap-6 pt-6 border-t border-white/15">
              {[
                { value: '24', label: 'Languages' },
                { value: 'Live', label: 'Exchange rates' },
                { value: 'Free', label: 'To search' },
              ].map((s) => (
                <div key={s.label}>
                  <p className="text-white font-bold text-lg leading-none">{s.value}</p>
                  <p className="text-white/55 text-xs mt-0.5">{s.label}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* ── Right: Form panel ────────────────────────────────── */}
      <div className="flex-1 flex flex-col bg-stone-50 min-h-screen">

        {/* Form section — light */}
        <main className="flex-1 flex flex-col justify-center px-8 py-12 max-w-md mx-auto w-full">
          <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }}>

            {/* Mobile brand */}
            <div className="mb-8 lg:hidden">
              <Link to="/" className="inline-flex items-center gap-2">
                <div className="w-7 h-7 rounded-full bg-blue-600 flex items-center justify-center">
                  <span className="text-white text-xs font-bold">L</span>
                </div>
                <span className="font-display text-lg font-bold text-stone-900">ListHQ</span>
              </Link>
            </div>

            <AnimatePresence mode="wait">
              {step !== 'prefs' && (
                <motion.div
                  key="form"
                  initial={{ opacity: 0, x: 12 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -12 }}
                  transition={{ duration: 0.2 }}
                >
                  <h1 className="font-display text-2xl font-bold text-stone-900 mb-1">
                    {step === 'email' && 'Welcome to ListHQ'}
                    {step === 'password' && 'Welcome back'}
                    {step === 'create' && 'Create your account'}
                  </h1>
                  <p className="text-sm text-stone-500 mb-8">
                    {step === 'email' && 'Sign in or create a free account to save and enquire on properties.'}
                    {step === 'password' && email}
                    {step === 'create' && 'Start your property search journey.'}
                  </p>

                  {/* Step: Email */}
                  {step === 'email' && (
                    <>
                      <form onSubmit={handleEmailContinue} className="space-y-4">
                        <div>
                          <label className="text-xs font-semibold text-stone-600 uppercase tracking-wider mb-2 block">
                            Email Address
                          </label>
                          <input
                            type="email"
                            required
                            autoFocus
                            value={email}
                            onChange={(e) => setEmail(e.target.value)}
                            placeholder="you@example.com"
                            className={inputClass}
                          />
                        </div>
                        <button
                          type="submit"
                          className="w-full py-3.5 rounded-2xl bg-blue-600 hover:bg-blue-700 text-white font-semibold text-sm transition-colors shadow-md shadow-blue-600/20"
                        >
                          Continue
                        </button>
                      </form>

                      <p className="text-sm text-stone-500 mt-4">
                        New here?{' '}
                        <button
                          onClick={() => setStep('create')}
                          className="text-blue-600 font-semibold hover:underline underline-offset-2"
                        >
                          Create account
                        </button>
                      </p>

                      <div className="flex items-center gap-4 my-6">
                        <div className="flex-1 h-px bg-stone-200" />
                        <span className="text-xs font-medium text-stone-400 uppercase tracking-wider">or</span>
                        <div className="flex-1 h-px bg-stone-200" />
                      </div>

                      <div className="space-y-3">
                        <button
                          onClick={() => handleOAuth('google')}
                          className="w-full flex items-center gap-3 py-3.5 px-5 rounded-2xl border border-stone-200 bg-white text-stone-800 text-sm font-medium hover:bg-stone-50 hover:border-stone-300 transition-all shadow-sm"
                        >
                          <svg width="18" height="18" viewBox="0 0 24 24"><path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z" fill="#4285F4"/><path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/><path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/><path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/></svg>
                          Continue with Google
                        </button>
                        <button
                          onClick={() => handleOAuth('apple')}
                          className="w-full flex items-center gap-3 py-3.5 px-5 rounded-2xl border border-stone-200 bg-white text-stone-800 text-sm font-medium hover:bg-stone-50 hover:border-stone-300 transition-all shadow-sm"
                        >
                          <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor"><path d="M17.05 20.28c-.98.95-2.05.88-3.08.4-1.09-.5-2.08-.48-3.24 0-1.44.62-2.2.44-3.06-.4C2.79 15.25 3.51 7.59 9.05 7.31c1.35.07 2.29.74 3.08.8 1.18-.24 2.31-.93 3.57-.84 1.51.12 2.65.72 3.4 1.8-3.12 1.87-2.38 5.98.48 7.13-.57 1.5-1.31 2.99-2.54 4.09zM12.03 7.25c-.15-2.23 1.66-4.07 3.74-4.25.29 2.58-2.34 4.5-3.74 4.25z"/></svg>
                          Continue with Apple
                        </button>
                      </div>

                      <p className="text-xs text-stone-400 mt-6 text-center leading-relaxed">
                        By continuing you agree to our{' '}
                        <a href="/terms" target="_blank" rel="noopener noreferrer" className="text-blue-600 underline underline-offset-2">Terms of Service</a>
                        {' '}and{' '}
                        <a href="/privacy" target="_blank" rel="noopener noreferrer" className="text-blue-600 underline underline-offset-2">Privacy Policy</a>.
                      </p>
                    </>
                  )}

                  {/* Step: Password */}
                  {step === 'password' && (
                    <>
                      <form onSubmit={handleSignIn} className="space-y-4">
                        <div>
                          <div className="flex items-center justify-between mb-2">
                            <label className="text-xs font-semibold text-stone-600 uppercase tracking-wider">Password</label>
                            <Link to="/forgot-password" className="text-xs text-blue-600 font-medium hover:underline underline-offset-2">
                              Forgot password?
                            </Link>
                          </div>
                          <input
                            type="password"
                            required
                            autoFocus
                            minLength={6}
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            className={inputClass}
                          />
                        </div>
                        <button
                          type="submit"
                          disabled={loading}
                          className="w-full py-3.5 rounded-2xl bg-blue-600 hover:bg-blue-700 text-white font-semibold text-sm transition-colors shadow-md shadow-blue-600/20 disabled:opacity-50"
                        >
                          {loading ? 'Signing in...' : 'Sign In'}
                        </button>
                      </form>
                      <button
                        onClick={goBack}
                        className="text-sm text-stone-400 mt-4 hover:text-stone-700 transition-colors"
                      >
                        ← Use a different email
                      </button>
                    </>
                  )}

                  {/* Step: Create account */}
                  {step === 'create' && (
                    <>
                      <form onSubmit={handleCreateAccount} className="space-y-4">
                        <div>
                          <label className="text-xs font-semibold text-stone-600 uppercase tracking-wider mb-2 block">Email Address</label>
                          <input type="email" required value={email} onChange={(e) => setEmail(e.target.value)} className={inputClass} />
                        </div>
                        <div>
                          <label className="text-xs font-semibold text-stone-600 uppercase tracking-wider mb-2 block">Display Name</label>
                          <input type="text" autoFocus value={displayName} onChange={(e) => setDisplayName(e.target.value)} placeholder="Your name" className={inputClass} />
                        </div>
                        <div>
                          <label className="text-xs font-semibold text-stone-600 uppercase tracking-wider mb-2 block">Mobile Phone <span className="text-red-500">*</span></label>
                          <PhoneInput value={phone} onChange={setPhone} />
                        </div>
                        <div>
                          <label className="text-xs font-semibold text-stone-600 uppercase tracking-wider mb-2 block">Password <span className="text-red-500">*</span></label>
                          <input type="password" required minLength={6} value={password} onChange={(e) => setPassword(e.target.value)} className={inputClass} />
                        </div>
                        <button
                          type="submit"
                          disabled={loading}
                          className="w-full py-3.5 rounded-2xl bg-blue-600 hover:bg-blue-700 text-white font-semibold text-sm transition-colors shadow-md shadow-blue-600/20 disabled:opacity-50"
                        >
                          {loading ? 'Creating account...' : 'Create Account'}
                        </button>
                      </form>
                      <button onClick={goBack} className="text-sm text-stone-400 mt-4 hover:text-stone-700 transition-colors">
                        ← Back to sign in
                      </button>
                      <p className="text-xs text-stone-400 mt-6 text-center leading-relaxed">
                        By continuing you agree to our{' '}
                        <a href="/terms" target="_blank" rel="noopener noreferrer" className="text-blue-600 underline underline-offset-2">Terms of Service</a>
                        {' '}and{' '}
                        <a href="/privacy" target="_blank" rel="noopener noreferrer" className="text-blue-600 underline underline-offset-2">Privacy Policy</a>.
                      </p>
                    </>
                  )}
                </motion.div>
              )}

              {/* Step: Preferences */}
              {step === 'prefs' && (
                <motion.div
                  key="prefs"
                  initial={{ opacity: 0, x: 12 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -12 }}
                  transition={{ duration: 0.2 }}
                  className="space-y-5"
                >
                  <div>
                    <h2 className="text-2xl font-bold text-stone-900 mb-1">What are you looking for?</h2>
                    <p className="text-sm text-stone-500">Help us show you the right properties. You can change this anytime.</p>
                  </div>
                  <div className="space-y-3">
                    <div>
                      <label className="text-xs font-semibold text-stone-600 uppercase tracking-wider mb-2 block">Max budget (optional)</label>
                      <select value={budgetMax} onChange={e => setBudgetMax(e.target.value)} className="w-full h-12 rounded-2xl border border-stone-200 bg-white px-4 text-sm text-stone-900 focus:outline-none focus:ring-2 focus:ring-blue-500/30 shadow-sm">
                        <option value="">No preference</option>
                        <option value="500000">Up to $500k</option>
                        <option value="750000">Up to $750k</option>
                        <option value="1000000">Up to $1M</option>
                        <option value="1500000">Up to $1.5M</option>
                        <option value="2000000">Up to $2M</option>
                        <option value="3000000">Up to $3M</option>
                        <option value="5000000">Up to $5M</option>
                      </select>
                    </div>
                    <div>
                      <label className="text-xs font-semibold text-stone-600 uppercase tracking-wider mb-2 block">Preferred suburbs (optional)</label>
                      <input
                        type="text"
                        value={suburbs}
                        onChange={e => setSuburbs(e.target.value)}
                        placeholder="e.g. Richmond, Fitzroy, Collingwood"
                        className={inputClass}
                      />
                      <p className="text-[11px] text-stone-400 mt-1">Separate multiple suburbs with commas</p>
                    </div>
                    <div>
                      <label className="text-xs font-semibold text-stone-600 uppercase tracking-wider mb-2 block">Property type (optional)</label>
                      <div className="grid grid-cols-3 gap-2">
                        {['House', 'Apartment', 'Townhouse', 'Land', 'Any'].map(type => (
                          <button
                            key={type}
                            type="button"
                            onClick={() => setPropertyType(type === 'Any' ? '' : type)}
                            className={`py-2.5 rounded-xl text-xs font-semibold border transition-all ${
                              (type === 'Any' ? !propertyType : propertyType === type)
                                ? 'bg-blue-600 text-white border-blue-600 shadow-sm shadow-blue-600/20'
                                : 'bg-white text-stone-600 border-stone-200 hover:border-blue-300'
                            }`}
                          >
                            {type}
                          </button>
                        ))}
                      </div>
                    </div>
                  </div>
                  <div className="flex flex-col gap-2 pt-2">
                    <button
                      type="button"
                      onClick={handleSavePrefs}
                      className="w-full h-12 rounded-2xl bg-blue-600 hover:bg-blue-700 text-white text-sm font-semibold transition-colors shadow-md shadow-blue-600/20"
                    >
                      Start searching
                    </button>
                    <button
                      type="button"
                      onClick={() => navigate('/')}
                      className="w-full h-10 rounded-2xl text-sm text-stone-400 hover:text-stone-700 transition-colors"
                    >
                      Skip for now
                    </button>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </motion.div>
        </main>

        {/* ── Portal strip — dark slate, matches agent section in LandingHero ── */}
        <div className="bg-slate-950 px-8 py-6">
          <p className="text-xs font-semibold uppercase tracking-widest text-slate-500 mb-4">Other portals</p>
          <div className="grid grid-cols-1 gap-3 max-w-md mx-auto lg:mx-0">
            <Link
              to="/agents/login"
              className="group flex items-center gap-4 p-4 rounded-2xl bg-slate-900 border border-slate-800 hover:border-blue-500/40 hover:bg-slate-800 transition-all"
            >
              <div className="w-10 h-10 rounded-xl bg-blue-600/15 flex items-center justify-center shrink-0">
                <Building2 size={18} className="text-blue-400" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold text-white group-hover:text-blue-300 transition-colors">Agent Portal</p>
                <p className="text-xs text-slate-500">Pocket listings · Pipeline · Rent roll</p>
              </div>
              <ArrowRight size={16} className="text-slate-600 group-hover:text-blue-400 group-hover:translate-x-0.5 transition-all shrink-0" />
            </Link>

            <Link
              to="/partner/login"
              className="group flex items-center gap-4 p-4 rounded-2xl bg-slate-900 border border-slate-800 hover:border-blue-500/40 hover:bg-slate-800 transition-all"
            >
              <div className="w-10 h-10 rounded-xl bg-blue-600/15 flex items-center justify-center shrink-0">
                <Landmark size={18} className="text-blue-400" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold text-white group-hover:text-blue-300 transition-colors">Trust Accounting Partner</p>
                <p className="text-xs text-slate-500">Partner portal · Reconciliation · Reports</p>
              </div>
              <ArrowRight size={16} className="text-slate-600 group-hover:text-blue-400 group-hover:translate-x-0.5 transition-all shrink-0" />
            </Link>
          </div>
        </div>

      </div>
    </div>
  );
};

export default SeekerAuthPage;
