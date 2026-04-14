import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Building2, Landmark, Users, FileText, CheckCircle } from 'lucide-react';
import { useNavigate, Link } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { getErrorMessage } from '@/shared/lib/errorUtils';
const partnerHero = 'https://images.unsplash.com/photo-1556761175-4b46a572b786?w=800&q=80';

type Step = 'email' | 'password' | 'register';

const PartnerAuthPage = () => {
  const navigate = useNavigate();
  const [step, setStep] = useState<Step>('email');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [companyName, setCompanyName] = useState('');
  const [contactName, setContactName] = useState('');
  const [phone, setPhone] = useState('');
  const [abn, setAbn] = useState('');
  const [website, setWebsite] = useState('');
  const [loading, setLoading] = useState(false);
  const [registered, setRegistered] = useState(false);


  const inputClass = "w-full px-4 py-3.5 rounded-full border border-border bg-background text-foreground text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/40";

  const features = [
    { icon: Landmark, text: 'Manage trust accounting for multiple agencies' },
    { icon: Users, text: 'Single login across all your client accounts' },
    { icon: FileText, text: 'Full audit trail for every transaction' },
  ];

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

      // Verify partner role exists
      const { data: { user: signedInUser } } = await supabase.auth.getUser();
      const { data: roleCheck } = await supabase
        .from('user_roles')
        .select('role')
        .eq('user_id', signedInUser?.id || '')
        .eq('role', 'partner')
        .maybeSingle();

      if (!roleCheck) {
        await supabase.auth.signOut();
        throw new Error('No partner account found for this email. Please register below.');
      }

      navigate('/partner/dashboard');
    } catch (err: unknown) {
      toast.error(getErrorMessage(err));
    }
    setLoading(false);
  };

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!companyName || !contactName || !email || !password) {
      toast.error('Please fill in all required fields');
      return;
    }
    setLoading(true);
    try {
      const { data, error: signUpError } = await supabase.auth.signUp({
        email,
        password,
        options: {
          emailRedirectTo: window.location.origin,
          data: { display_name: contactName },
        },
      });
      if (signUpError) throw signUpError;
      if (!data.user) throw new Error('Signup failed');

      const { error: setupError } = await supabase.functions.invoke('setup-partner', {
        body: {
          companyName,
          contactName,
          contactEmail: email,
          contactPhone: phone || null,
          abn: abn || null,
          website: website || null,
        },
      });
      if (setupError) throw setupError;

      setRegistered(true);
    } catch (err: unknown) {
      toast.error(getErrorMessage(err));
    }
    setLoading(false);
  };

  if (registered) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center px-6">
        <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} className="max-w-md text-center space-y-6">
          <div className="w-16 h-16 rounded-full bg-emerald-500/10 flex items-center justify-center mx-auto">
            <CheckCircle className="text-emerald-500" size={32} />
          </div>
          <h1 className="font-display text-2xl font-bold text-foreground">Registration submitted</h1>
          <p className="text-muted-foreground text-sm leading-relaxed">
            Our team will verify your account within 24 hours. You will receive an email at <strong className="text-foreground">{email}</strong> when your account is approved.
          </p>
          <Link to="/" className="inline-block py-3 px-6 rounded-full bg-primary text-primary-foreground font-semibold text-sm">
            Return to ListHQ
          </Link>
        </motion.div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex">
      {/* Left hero */}
      <div className="hidden lg:flex lg:w-1/2 relative overflow-hidden">
        <img src={partnerHero} alt="Trust accounting partner portal" className="absolute inset-0 w-full h-full object-cover" />
        <div className="absolute inset-0 bg-gradient-to-t from-[hsl(222,47%,8%)]/95 via-[hsl(222,47%,11%)]/70 to-[hsl(222,47%,11%)]/30" />
        <div className="relative z-10 flex flex-col justify-between p-12 text-white h-full">
          <div className="flex items-center gap-2.5">
            <div className="w-10 h-10 rounded-xl bg-white/15 backdrop-blur-sm flex items-center justify-center">
              <Landmark size={20} />
            </div>
            <div>
              <span className="text-sm font-bold uppercase tracking-wider">Partner Portal</span>
              <p className="text-white/50 text-[10px] uppercase tracking-widest">Trust Accounting Access</p>
            </div>
          </div>

          <div>
            <h2 className="font-display text-4xl font-bold leading-tight mb-4">One login.<br />Every client.</h2>
            <p className="text-white/70 text-base mb-6 max-w-sm">
              Manage trust accounting across all your client agencies from a single secure portal.
            </p>
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

      {/* Right form */}
      <main className="flex-1 bg-background flex flex-col justify-center max-w-sm mx-auto w-full px-6 py-12 lg:max-w-md lg:px-12">
        <div style={{ opacity: 1 }}>
          <div className="mb-2">
            <Link to="/" className="inline-flex items-center gap-2">
              <div className="w-7 h-7 rounded-full bg-primary flex items-center justify-center">
                <span className="text-primary-foreground text-xs font-bold">LHQ</span>
              </div>
              <span className="font-display text-lg font-bold text-foreground">ListHQ</span>
            </Link>
          </div>

          <div className="flex items-center gap-2 mb-6">
            <Landmark size={14} className="text-primary" />
            <span className="text-xs font-semibold text-primary uppercase tracking-wider">Partner Portal</span>
          </div>

          <h1 className="font-display text-2xl font-bold text-foreground mb-1">
            {step === 'register' ? 'Register your company' : step === 'password' ? 'Welcome back' : 'Partner sign in'}
          </h1>
          <p className="text-sm text-muted-foreground mb-6">
            {step === 'register' ? 'Set up your partner account.' : step === 'password' ? email : 'Access your client trust accounts.'}
          </p>

          {/* Email step */}
          {step === 'email' && (
            <>
              <form onSubmit={handleEmailContinue} className="space-y-4">
                <div>
                  <label className="text-sm font-medium text-foreground mb-1.5 block">
                    Email address<span className="text-destructive">*</span>
                  </label>
                  <input type="email" required autoFocus value={email} onChange={(e) => setEmail(e.target.value)} className={inputClass} />
                </div>
                <button type="submit" className="w-full py-3.5 rounded-full bg-primary/80 hover:bg-primary text-primary-foreground font-semibold text-sm transition-colors">
                  Continue
                </button>
              </form>
              <p className="text-sm text-muted-foreground mt-4">
                Not a partner yet?{' '}
                <button onClick={() => setStep('register')} className="text-primary font-semibold underline underline-offset-2">
                  Register your company →
                </button>
              </p>
            </>
          )}

          {/* Password step */}
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
                  {loading ? 'Signing in…' : 'Sign in'}
                </button>
              </form>
              <button onClick={() => { setStep('email'); setPassword(''); }} className="text-sm text-muted-foreground mt-4 hover:text-foreground underline underline-offset-2">
                ← Use a different email
              </button>
            </>
          )}

          {/* Register step */}
          {step === 'register' && (
            <>
              <form onSubmit={handleRegister} className="space-y-4">
                <div>
                  <label className="text-sm font-medium text-foreground mb-1.5 block">
                    Company name<span className="text-destructive">*</span>
                  </label>
                  <input type="text" required value={companyName} onChange={(e) => setCompanyName(e.target.value)} placeholder="e.g. Balance Rec n Roll" className={inputClass} />
                </div>
                <div>
                  <label className="text-sm font-medium text-foreground mb-1.5 block">
                    Your full name<span className="text-destructive">*</span>
                  </label>
                  <input type="text" required value={contactName} onChange={(e) => setContactName(e.target.value)} className={inputClass} />
                </div>
                <div>
                  <label className="text-sm font-medium text-foreground mb-1.5 block">
                    Email address<span className="text-destructive">*</span>
                  </label>
                  <input type="email" required value={email} onChange={(e) => setEmail(e.target.value)} className={inputClass} />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-sm font-medium text-foreground mb-1.5 block">Phone</label>
                    <input type="tel" value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="04xx xxx xxx" className={inputClass} />
                  </div>
                  <div>
                    <label className="text-sm font-medium text-foreground mb-1.5 block">ABN</label>
                    <input type="text" value={abn} onChange={(e) => setAbn(e.target.value)} placeholder="xx xxx xxx xxx" className={inputClass} />
                  </div>
                </div>
                <div>
                  <label className="text-sm font-medium text-foreground mb-1.5 block">Website</label>
                  <input type="url" value={website} onChange={(e) => setWebsite(e.target.value)} placeholder="https://..." className={inputClass} />
                </div>
                <div>
                  <label className="text-sm font-medium text-foreground mb-1.5 block">
                    Password<span className="text-destructive">*</span>
                  </label>
                  <input type="password" required minLength={8} value={password} onChange={(e) => setPassword(e.target.value)} className={inputClass} />
                </div>
                <p className="text-xs text-muted-foreground leading-relaxed">
                  By registering you agree to the{' '}
                  <a href="/terms" target="_blank" rel="noopener noreferrer" className="text-primary underline underline-offset-2">Terms of Service</a>
                  {' '}and{' '}
                  <a href="/privacy" target="_blank" rel="noopener noreferrer" className="text-primary underline underline-offset-2">Privacy Policy</a>.
                </p>
                <button type="submit" disabled={loading} className="w-full py-3.5 rounded-full bg-primary text-primary-foreground font-semibold text-sm transition-colors disabled:opacity-50">
                  {loading ? 'Registering…' : 'Register company'}
                </button>
              </form>
              <button onClick={() => setStep('email')} className="text-sm text-muted-foreground mt-4 hover:text-foreground underline underline-offset-2">
                ← Back to sign in
              </button>
            </>
          )}

        </div>
      </main>
    </div>
  );
};

export default PartnerAuthPage;
