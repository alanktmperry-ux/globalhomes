import { useState } from 'react';
import { motion } from 'framer-motion';
import { Mail, Lock, User, Building2, Phone, KeyRound, Plus } from 'lucide-react';
import { useNavigate, Link } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { lovable } from '@/integrations/lovable/index';
import { useToast } from '@/hooks/use-toast';

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
        email,
        password,
        options: {
          emailRedirectTo: window.location.origin,
          data: { display_name: fullName || email },
        },
      });
      if (error) throw error;
      if (!data.user) throw new Error('Signup failed');

      const userId = data.user.id;

      // Add agent role
      await supabase.from('user_roles').insert({ user_id: userId, role: 'agent' as any });

      if (step === 'create-agency') {
        if (!agencyName.trim()) throw new Error('Agency name is required');
        const { data: agency, error: agencyError } = await supabase
          .from('agencies')
          .insert({ name: agencyName, slug: generateSlug(agencyName), owner_user_id: userId })
          .select()
          .single();
        if (agencyError) throw agencyError;

        await supabase.from('agency_members').insert({ agency_id: agency.id, user_id: userId, role: 'owner' as any });
        await supabase.from('agents').insert({
          user_id: userId, name: fullName || email, agency: agencyName,
          email, phone: phone || null, agency_id: agency.id,
        });
        toast({ title: 'Agency created!', description: `"${agencyName}" is ready. You can now invite staff from your dashboard.` });
      } else {
        // Join via invite code
        if (!inviteCode.trim()) throw new Error('Invite code is required');
        const { data: invite, error: inviteError } = await supabase
          .from('agency_invite_codes')
          .select('*, agencies(name)')
          .eq('code', inviteCode.trim().toUpperCase())
          .eq('is_active', true)
          .single();
        if (inviteError || !invite) throw new Error('Invalid or expired invite code');
        if (invite.max_uses && invite.uses >= invite.max_uses) throw new Error('This invite code has reached its usage limit');
        if (invite.expires_at && new Date(invite.expires_at) < new Date()) throw new Error('This invite code has expired');

        await supabase.from('agency_members').insert({ agency_id: invite.agency_id, user_id: userId, role: invite.role as any });
        await supabase.from('agency_invite_codes').update({ uses: invite.uses + 1 }).eq('id', invite.id);

        const agencyData = invite.agencies as any;
        await supabase.from('agents').insert({
          user_id: userId, name: fullName || email, agency: agencyData?.name || null,
          email, phone: phone || null, agency_id: invite.agency_id,
        });
        toast({ title: 'Welcome to the team!', description: `You've joined ${agencyData?.name || 'the agency'}.` });
      }
      navigate('/dashboard');
    } catch (err: any) {
      toast({ title: 'Error', description: err.message, variant: 'destructive' });
    } finally {
      setLoading(false);
    }
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
    if (step === 'password') { setStep('email'); setPassword(''); }
    else if (step === 'create-agency' || step === 'join-agency') { setStep('choose'); }
    else if (step === 'choose') { setStep('email'); }
    else { navigate('/agents'); }
  };

  const inputClass = "w-full pl-12 pr-4 py-3.5 rounded-xl border border-border bg-background text-foreground text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/40";

  return (
    <div className="min-h-screen bg-muted/40 flex flex-col items-center justify-center px-4">
      <div className="w-full max-w-md">
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-card rounded-2xl shadow-lg border border-border p-8"
        >
          {/* Agent badge */}
          <div className="flex items-center justify-center gap-2 mb-4">
            <div className="w-8 h-8 rounded-lg bg-primary/20 flex items-center justify-center">
              <Building2 size={16} className="text-primary" />
            </div>
            <span className="text-xs font-semibold text-primary uppercase tracking-wider">Agent Portal</span>
          </div>

          <div className="text-center mb-6">
            <h1 className="font-display text-xl font-bold text-foreground">
              {step === 'email' && 'Agent Sign In'}
              {step === 'password' && 'Welcome back'}
              {step === 'choose' && 'Get Started'}
              {step === 'create-agency' && 'Create Your Agency'}
              {step === 'join-agency' && 'Join an Agency'}
            </h1>
            {(step === 'password' || step === 'create-agency' || step === 'join-agency') && (
              <p className="text-sm text-muted-foreground mt-1">{email}</p>
            )}
            {step === 'email' && (
              <p className="text-sm text-muted-foreground mt-1">Access your dashboard and manage listings</p>
            )}
            {step === 'choose' && (
              <p className="text-sm text-muted-foreground mt-1">Create a new agency or join an existing one</p>
            )}
          </div>

          {/* Step: Email */}
          {step === 'email' && (
            <>
              <form onSubmit={handleEmailContinue} className="space-y-4">
                <div className="relative">
                  <Mail size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-muted-foreground" />
                  <input type="email" placeholder="Email address*" required autoFocus value={email} onChange={(e) => setEmail(e.target.value)} className={inputClass} />
                </div>
                <button type="submit" className="w-full py-3.5 rounded-xl bg-primary text-primary-foreground font-semibold text-sm transition-transform active:scale-[0.98]">
                  Continue
                </button>
              </form>

              <p className="text-center text-sm text-muted-foreground mt-4">
                Don't have an agent account?{' '}
                <button onClick={() => setStep('choose')} className="text-primary font-semibold">Register</button>
              </p>

              <div className="flex items-center gap-3 my-6">
                <div className="flex-1 h-px bg-border" />
                <span className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Or</span>
                <div className="flex-1 h-px bg-border" />
              </div>

              <div className="space-y-3">
                <button onClick={() => handleOAuth('google')} className="w-full flex items-center gap-4 py-3.5 px-5 rounded-xl border border-border bg-background text-foreground text-sm font-medium hover:bg-accent transition-colors">
                  <svg width="20" height="20" viewBox="0 0 24 24"><path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z" fill="#4285F4"/><path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/><path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/><path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/></svg>
                  Continue with Google
                </button>
              </div>
            </>
          )}

          {/* Step: Password (sign in) */}
          {step === 'password' && (
            <>
              <form onSubmit={handleSignIn} className="space-y-4">
                <div className="relative">
                  <Lock size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-muted-foreground" />
                  <input type="password" placeholder="Password" required autoFocus minLength={6} value={password} onChange={(e) => setPassword(e.target.value)} className={inputClass} />
                </div>
                <div className="text-right">
                  <Link to="/forgot-password" className="text-xs text-primary font-medium">Forgot password?</Link>
                </div>
                <button type="submit" disabled={loading} className="w-full py-3.5 rounded-xl bg-primary text-primary-foreground font-semibold text-sm transition-transform active:scale-[0.98] disabled:opacity-50">
                  {loading ? 'Please wait...' : 'Sign In'}
                </button>
              </form>
              <button onClick={goBack} className="w-full text-center text-sm text-muted-foreground mt-4 hover:text-foreground">
                ← Use a different email
              </button>
            </>
          )}

          {/* Step: Choose signup path */}
          {step === 'choose' && (
            <div className="space-y-3">
              <button
                onClick={() => setStep('create-agency')}
                className="w-full flex items-center gap-4 p-4 rounded-2xl border border-border text-left hover:border-primary/50 transition-colors"
              >
                <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center shrink-0">
                  <Plus size={22} className="text-primary" />
                </div>
                <div>
                  <p className="font-semibold text-foreground text-sm">Create a New Agency</p>
                  <p className="text-xs text-muted-foreground mt-0.5">Set up your company, add staff later</p>
                </div>
              </button>
              <button
                onClick={() => setStep('join-agency')}
                className="w-full flex items-center gap-4 p-4 rounded-2xl border border-border text-left hover:border-primary/50 transition-colors"
              >
                <div className="w-12 h-12 rounded-xl bg-accent flex items-center justify-center shrink-0">
                  <KeyRound size={22} className="text-foreground" />
                </div>
                <div>
                  <p className="font-semibold text-foreground text-sm">Join with Invite Code</p>
                  <p className="text-xs text-muted-foreground mt-0.5">Your agency admin gave you a code</p>
                </div>
              </button>
              <button onClick={goBack} className="w-full text-center text-sm text-muted-foreground mt-4 hover:text-foreground">
                ← Back to sign in
              </button>
            </div>
          )}

          {/* Step: Create agency form */}
          {step === 'create-agency' && (
            <>
              <form onSubmit={handleSignup} className="space-y-3">
                <div className="relative">
                  <User size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-muted-foreground" />
                  <input type="text" placeholder="Your full name*" required autoFocus value={fullName} onChange={(e) => setFullName(e.target.value)} className={inputClass} />
                </div>
                <div className="relative">
                  <Building2 size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-muted-foreground" />
                  <input type="text" placeholder="Agency / Company name*" required value={agencyName} onChange={(e) => setAgencyName(e.target.value)} className={inputClass} />
                </div>
                <div className="relative">
                  <Phone size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-muted-foreground" />
                  <input type="tel" placeholder="Phone number" value={phone} onChange={(e) => setPhone(e.target.value)} className={inputClass} />
                </div>
                <div className="relative">
                  <Lock size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-muted-foreground" />
                  <input type="password" placeholder="Password*" required minLength={6} value={password} onChange={(e) => setPassword(e.target.value)} className={inputClass} />
                </div>
                <button type="submit" disabled={loading} className="w-full py-3.5 rounded-xl bg-primary text-primary-foreground font-semibold text-sm transition-transform active:scale-[0.98] disabled:opacity-50">
                  {loading ? 'Please wait...' : 'Create Agency & Account'}
                </button>
              </form>
              <button onClick={goBack} className="w-full text-center text-sm text-muted-foreground mt-4 hover:text-foreground">
                ← Back to options
              </button>
            </>
          )}

          {/* Step: Join agency form */}
          {step === 'join-agency' && (
            <>
              <form onSubmit={handleSignup} className="space-y-3">
                <div className="relative">
                  <User size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-muted-foreground" />
                  <input type="text" placeholder="Your full name*" required autoFocus value={fullName} onChange={(e) => setFullName(e.target.value)} className={inputClass} />
                </div>
                <div className="relative">
                  <KeyRound size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-muted-foreground" />
                  <input
                    type="text"
                    placeholder="Invite code*"
                    required
                    value={inviteCode}
                    onChange={(e) => setInviteCode(e.target.value.toUpperCase())}
                    className={inputClass + ' uppercase tracking-widest font-mono'}
                  />
                </div>
                <div className="relative">
                  <Phone size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-muted-foreground" />
                  <input type="tel" placeholder="Phone number" value={phone} onChange={(e) => setPhone(e.target.value)} className={inputClass} />
                </div>
                <div className="relative">
                  <Lock size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-muted-foreground" />
                  <input type="password" placeholder="Password*" required minLength={6} value={password} onChange={(e) => setPassword(e.target.value)} className={inputClass} />
                </div>
                <button type="submit" disabled={loading} className="w-full py-3.5 rounded-xl bg-primary text-primary-foreground font-semibold text-sm transition-transform active:scale-[0.98] disabled:opacity-50">
                  {loading ? 'Please wait...' : 'Join Agency'}
                </button>
              </form>
              <button onClick={goBack} className="w-full text-center text-sm text-muted-foreground mt-4 hover:text-foreground">
                ← Back to options
              </button>
            </>
          )}
        </motion.div>

        {/* Footer link outside card */}
        <div className="text-center mt-5">
          <p className="text-xs text-muted-foreground">
            Looking for a property? <Link to="/login" className="text-primary font-semibold">Sign in as buyer</Link>
          </p>
        </div>
      </div>
    </div>
  );
};

export default AgentAuthPage;
