import { useState } from 'react';
import { motion } from 'framer-motion';
import { Building2, KeyRound, Plus, BarChart3, Users, Megaphone } from 'lucide-react';
import PhoneInput from '@/components/PhoneInput';
import { useNavigate, Link } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { lovable } from '@/integrations/lovable/index';
import { useToast } from '@/hooks/use-toast';
import agentHero from '@/assets/agent-auth-hero.jpg';

type Step = 'email' | 'password' | 'choose' | 'create-agency' | 'join-agency';

const AgentAuthPage = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [step, setStep] = useState<Step>('email');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [fullName, setFullName] = useState('');
  const [agencyName, setAgencyName] = useState('');
  const [phone, setPhone] = useState('');
  const [agencyEmail, setAgencyEmail] = useState('');
  const [inviteCode, setInviteCode] = useState('');
  const [loading, setLoading] = useState(false);

  const generateSlug = (name: string) =>
    name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '') + '-' + Math.random().toString(36).slice(2, 6);

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
      toast({ title: 'Welcome back, Agent!' });
      navigate('/dashboard');
    } catch (err: any) {
      toast({ title: 'Error', description: err.message, variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  };

  const handleSignup = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      const { data, error } = await supabase.auth.signUp({
        email, password,
        options: { emailRedirectTo: window.location.origin, data: { display_name: fullName || email } },
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
        navigate('/dashboard');
      } else {
        toast({
          title: 'Check your email',
          description: 'We sent you a confirmation link. Please verify your email to sign in.',
        });
        setStep('email');
      }
    } catch (err: any) {
      toast({ title: 'Error', description: err.message, variant: 'destructive' });
    } finally {
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
    else navigate('/agents');
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
                <span className="text-primary-foreground text-xs font-bold">W</span>
              </div>
              <span className="font-display text-lg font-bold text-foreground">World Property Pulse</span>
            </Link>
          </div>

          {/* Role badge */}
          <div className="flex items-center gap-2 mb-6">
            <Building2 size={14} className="text-primary" />
            <span className="text-xs font-semibold text-primary uppercase tracking-wider">Agent Portal</span>
          </div>

          <h1 className="font-display text-2xl font-bold text-foreground mb-1">
            {step === 'email' && 'Agent Sign In'}
            {step === 'password' && 'Welcome back, Agent'}
            {step === 'choose' && 'Register as Agent'}
            {step === 'create-agency' && 'Create Your Agency'}
            {step === 'join-agency' && 'Join an Agency'}
          </h1>
          <p className="text-sm text-muted-foreground mb-6">
            {step === 'email' && 'Access your dashboard, listings, and leads.'}
            {step === 'password' && email}
            {step === 'choose' && 'Choose how you want to get started.'}
            {step === 'create-agency' && 'Set up your agency and start listing.'}
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
                <button type="submit" className="w-full py-3.5 rounded-full bg-primary/80 hover:bg-primary text-primary-foreground font-semibold text-sm transition-colors">
                  Continue
                </button>
              </form>

              <p className="text-sm text-muted-foreground mt-4">
                Don't have an agent account?{' '}
                <button onClick={() => setStep('choose')} className="text-primary font-semibold underline underline-offset-2">Register</button>
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

              <p className="text-xs text-muted-foreground mt-8 text-center leading-relaxed">
                By submitting, I accept World Property Pulse's{' '}
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
                  <label className="text-sm font-medium text-foreground mb-1.5 block">Agency / Company Name<span className="text-destructive">*</span></label>
                  <input type="text" required value={agencyName} onChange={(e) => setAgencyName(e.target.value)} className={inputClass} />
                </div>
                <div>
                  <label className="text-sm font-medium text-foreground mb-1.5 block">Agency Email</label>
                  <input type="email" placeholder="info@youragency.com" value={agencyEmail} onChange={(e) => setAgencyEmail(e.target.value)} className={inputClass} />
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
                  {loading ? 'Please wait...' : 'Create Agency & Account'}
                </button>
              </form>
              <button onClick={goBack} className="text-sm text-muted-foreground mt-4 hover:text-foreground underline underline-offset-2">← Back to options</button>
              <p className="text-xs text-muted-foreground mt-6 text-center leading-relaxed">
                By submitting, I accept World Property Pulse's{' '}
                <a href="#" className="text-primary underline underline-offset-2">terms of use</a>
              </p>
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
              <p className="text-xs text-muted-foreground mt-6 text-center leading-relaxed">
                By submitting, I accept World Property Pulse's{' '}
                <a href="#" className="text-primary underline underline-offset-2">terms of use</a>
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
