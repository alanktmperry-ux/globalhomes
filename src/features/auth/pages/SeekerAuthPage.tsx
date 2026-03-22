import { useState } from 'react';
import { motion } from 'framer-motion';
import { Home, Search, Heart, Mic, Building2, Landmark } from 'lucide-react';
import PhoneInput from '@/shared/components/PhoneInput';
import { useNavigate, Link } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { lovable } from '@/integrations/lovable/index';
import { useToast } from '@/shared/hooks/use-toast';
import seekerHero from '@/assets/seeker-auth-hero.jpg';

type Step = 'email' | 'password' | 'create' | 'prefs';

const SeekerAuthPage = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
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
      toast({ title: 'Welcome back!' });
      navigate('/');
    } catch (err: any) {
      toast({ title: 'Error', description: err.message, variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  };

  const handleCreateAccount = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!phone.trim()) {
      toast({ title: 'Phone required', description: 'Please enter your mobile number.', variant: 'destructive' });
      return;
    }
    setLoading(true);
    try {
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          emailRedirectTo: window.location.origin,
          data: { display_name: displayName || email, phone },
        },
      });
      if (error) throw error;

      if (data.user && !data.session) {
        toast({ title: 'Check your email', description: 'We sent you a confirmation link. Please verify your email before signing in.' });
        setStep('email');
      } else {
        toast({ title: 'Account created!' });
        setStep('prefs');
      }
    } catch (err: any) {
      toast({ title: 'Error', description: err.message, variant: 'destructive' });
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
      redirect_uri: window.location.origin,
    });
    if (error) {
      toast({ title: 'Error', description: String(error), variant: 'destructive' });
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

  const inputClass = "w-full px-4 py-3.5 rounded-full border border-border bg-background text-foreground text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/40";

  const features = [
    { icon: Search, text: 'Search thousands of properties worldwide' },
    { icon: Mic, text: 'AI-powered voice search in any language' },
    { icon: Heart, text: 'Save favourites & get price alerts' },
  ];

  return (
    <div className="min-h-screen bg-background flex">
      {/* Left hero panel — hidden on mobile */}
      <div className="hidden lg:flex lg:w-1/2 relative overflow-hidden">
        <img src={seekerHero} alt="Find your dream home" className="absolute inset-0 w-full h-full object-cover" />
        <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/40 to-transparent" />
        <div className="relative z-10 flex flex-col justify-end p-12 text-white">
          <div className="flex items-center gap-2.5 mb-5">
            <div className="w-10 h-10 rounded-xl bg-white/20 backdrop-blur-sm flex items-center justify-center">
              <Home size={20} />
            </div>
            <span className="text-sm font-semibold uppercase tracking-wider text-white/90">Property Seeker</span>
          </div>
          <h2 className="font-display text-4xl font-bold leading-tight mb-4">Find your<br />dream home</h2>
          <div className="space-y-3 mt-2">
            {features.map((f, i) => (
              <div key={i} className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-lg bg-white/15 flex items-center justify-center shrink-0">
                  <f.icon size={15} />
                </div>
                <span className="text-white/85 text-sm">{f.text}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Right form panel */}
      <main className="flex-1 flex flex-col justify-center max-w-sm mx-auto w-full px-6 py-12 lg:max-w-md lg:px-12">
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
            {step === 'email' && 'Welcome to ListHQ'}
            {step === 'password' && 'Welcome back'}
            {step === 'create' && 'Create your account'}
            {step === 'prefs' && ''}
          </h1>
          <p className="text-sm text-muted-foreground mb-6">
            {step === 'email' && 'Sign in or create a free account to save and enquire on properties.'}
            {step === 'password' && email}
            {step === 'create' && 'Start your property search journey.'}
            {step === 'prefs' && ''}
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
                New here?{' '}
                <button onClick={() => setStep('create')} className="text-primary font-semibold underline underline-offset-2">Create account</button>
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
                <button onClick={() => handleOAuth('apple')} className="w-full flex items-center gap-3 py-3.5 px-5 rounded-full border border-border bg-background text-foreground text-sm font-medium hover:bg-accent transition-colors">
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor"><path d="M17.05 20.28c-.98.95-2.05.88-3.08.4-1.09-.5-2.08-.48-3.24 0-1.44.62-2.2.44-3.06-.4C2.79 15.25 3.51 7.59 9.05 7.31c1.35.07 2.29.74 3.08.8 1.18-.24 2.31-.93 3.57-.84 1.51.12 2.65.72 3.4 1.8-3.12 1.87-2.38 5.98.48 7.13-.57 1.5-1.31 2.99-2.54 4.09zM12.03 7.25c-.15-2.23 1.66-4.07 3.74-4.25.29 2.58-2.34 4.5-3.74 4.25z"/></svg>
                  Continue with Apple
                </button>
              </div>

              <p className="text-xs text-muted-foreground mt-8 text-center leading-relaxed">
                By submitting, I accept ListHQ'{' '}
                <a href="#" className="text-primary underline underline-offset-2">terms of use</a>
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

          {/* Step: Create account */}
          {step === 'create' && (
            <>
              <form onSubmit={handleCreateAccount} className="space-y-4">
                <div>
                  <label className="text-sm font-medium text-foreground mb-1.5 block">Email Address<span className="text-destructive">*</span></label>
                  <input type="email" required value={email} onChange={(e) => setEmail(e.target.value)} className={inputClass} />
                </div>
                <div>
                  <label className="text-sm font-medium text-foreground mb-1.5 block">Display name</label>
                  <input type="text" autoFocus value={displayName} onChange={(e) => setDisplayName(e.target.value)} className={inputClass} />
                </div>
                <div>
                  <label className="text-sm font-medium text-foreground mb-1.5 block">Mobile Phone<span className="text-destructive">*</span></label>
                  <PhoneInput value={phone} onChange={setPhone} />
                </div>
                <div>
                  <label className="text-sm font-medium text-foreground mb-1.5 block">Password<span className="text-destructive">*</span></label>
                  <input type="password" required minLength={6} value={password} onChange={(e) => setPassword(e.target.value)} className={inputClass} />
                </div>
                <button type="submit" disabled={loading} className="w-full py-3.5 rounded-full bg-primary text-primary-foreground font-semibold text-sm transition-colors disabled:opacity-50">
                  {loading ? 'Please wait...' : 'Create Account'}
                </button>
              </form>
              <button onClick={goBack} className="text-sm text-muted-foreground mt-4 hover:text-foreground underline underline-offset-2">← Back to sign in</button>
              <p className="text-xs text-muted-foreground mt-6 text-center leading-relaxed">
                By submitting, I accept ListHQ'{' '}
                <a href="#" className="text-primary underline underline-offset-2">terms of use</a>
              </p>
            </>
          )}

          {/* Step: Preferences onboarding */}
          {step === 'prefs' && (
            <motion.div
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              className="space-y-5">
              <div>
                <h2 className="text-xl font-bold text-foreground mb-1">
                  What are you looking for?
                </h2>
                <p className="text-sm text-muted-foreground">
                  Help us show you the right properties. You can change this anytime in settings.
                </p>
              </div>
              <div className="space-y-3">
                <div>
                  <label className="text-xs font-medium text-foreground mb-1.5 block">
                    Max budget (optional)
                  </label>
                  <select
                    value={budgetMax}
                    onChange={e => setBudgetMax(e.target.value)}
                    className="w-full h-11 rounded-xl border border-border bg-background px-3 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-ring"
                  >
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
                  <label className="text-xs font-medium text-foreground mb-1.5 block">
                    Preferred suburbs (optional)
                  </label>
                  <input
                    type="text"
                    value={suburbs}
                    onChange={e => setSuburbs(e.target.value)}
                    placeholder="e.g. Richmond, Fitzroy, Collingwood"
                    className="w-full h-11 rounded-xl border border-border bg-background px-3 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring"
                  />
                  <p className="text-[11px] text-muted-foreground mt-1">
                    Separate multiple suburbs with commas
                  </p>
                </div>
                <div>
                  <label className="text-xs font-medium text-foreground mb-1.5 block">
                    Property type (optional)
                  </label>
                  <div className="grid grid-cols-3 gap-2">
                    {['House', 'Apartment', 'Townhouse', 'Land', 'Any'].map(type => (
                      <button
                        key={type}
                        type="button"
                        onClick={() => setPropertyType(type === 'Any' ? '' : type)}
                        className={`py-2 rounded-xl text-xs font-medium border transition-colors ${
                          (type === 'Any' ? !propertyType : propertyType === type)
                            ? 'bg-primary text-primary-foreground border-primary'
                            : 'bg-background text-muted-foreground border-border hover:border-primary/50'
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
                  className="w-full h-12 rounded-xl bg-primary text-primary-foreground text-sm font-semibold hover:opacity-90 transition-opacity"
                >
                  Start searching
                </button>
                <button
                  type="button"
                  onClick={() => navigate('/')}
                  className="w-full h-10 rounded-xl text-sm text-muted-foreground hover:text-foreground transition-colors"
                >
                  Skip for now
                </button>
              </div>
            </motion.div>
          )}

          {/* Agent link — visually distinct */}
          <div className="mt-8 pt-6 border-t border-border">
            <Link to="/agents/login" className="flex items-center gap-3 p-4 rounded-2xl border border-border hover:border-primary/50 transition-colors group">
              <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center shrink-0">
                <Building2 size={18} className="text-primary" />
              </div>
              <div className="flex-1">
                <p className="text-sm font-semibold text-foreground group-hover:text-primary transition-colors">Are you a real estate agent?</p>
                <p className="text-xs text-muted-foreground">Sign in to your Agent Portal →</p>
              </div>
            </Link>
            <Link to="/partner/login" className="flex items-center gap-3 p-4 rounded-2xl border border-border hover:border-primary/50 transition-colors group">
              <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center shrink-0">
                <Landmark size={18} className="text-primary" />
              </div>
              <div className="flex-1">
                <p className="text-sm font-semibold text-foreground group-hover:text-primary transition-colors">Are you a trust accounting partner?</p>
                <p className="text-xs text-muted-foreground">Sign in to your Partner Portal →</p>
              </div>
            </Link>
          </div>
        </motion.div>
      </main>
    </div>
  );
};

export default SeekerAuthPage;
