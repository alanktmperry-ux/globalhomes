import { useState, useEffect, useRef } from 'react';
import { motion } from 'framer-motion';
import { Lock, AlertTriangle, Eye, EyeOff } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/shared/hooks/use-toast';
import { getErrorMessage } from '@/shared/lib/errorUtils';

const AGENT_PILLS = ['Pocket listings', 'Pre-market period', 'AI buyer matching', 'Pipeline kanban', 'Rent roll', 'Trust accounting', '24 languages'];

const BrandPanel = () => (
  <div className="hidden lg:flex lg:w-[48%] shrink-0 flex-col justify-between p-11 relative overflow-hidden">
    <div className="absolute -top-28 -right-16 w-[380px] h-[380px] rounded-full pointer-events-none" style={{ background: 'radial-gradient(circle, rgba(37,99,235,0.18) 0%, transparent 70%)' }} />
    <div className="absolute -bottom-16 -left-12 w-[280px] h-[280px] rounded-full pointer-events-none" style={{ background: 'radial-gradient(circle, rgba(37,99,235,0.10) 0%, transparent 70%)' }} />
    <div className="absolute top-0 left-0 right-0 h-px" style={{ background: 'linear-gradient(90deg, transparent, rgba(37,99,235,0.6), rgba(99,179,237,0.4), transparent)' }} />

    <div className="relative z-10 flex items-center gap-2.5">
      <div className="w-7 h-7 rounded-lg bg-blue-600 flex items-center justify-center text-[11px] font-bold text-white">L</div>
      <span className="text-[15px] font-semibold text-white tracking-tight">ListHQ</span>
    </div>

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
);

const getStrength = (pw: string): { score: 0 | 1 | 2 | 3; label: string } => {
  if (pw.length < 8) return { score: 1, label: 'Weak' };
  const hasLetters = /[a-zA-Z]/.test(pw);
  const hasNumbers = /\d/.test(pw);
  if (hasLetters && hasNumbers) return { score: 3, label: 'Strong' };
  return { score: 2, label: 'Fair' };
};

const inputClass = "w-full pl-10 pr-11 py-3.5 rounded-[14px] border border-stone-200 bg-stone-50 text-stone-900 text-sm placeholder:text-stone-300 focus:outline-none focus:border-blue-400 focus:ring-2 focus:ring-blue-100 focus:bg-white transition-all";

const ResetPasswordPage = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [loading, setLoading] = useState(false);
  const [ready, setReady] = useState(false);
  const [expired, setExpired] = useState(false);
  const readyRef = useRef(false);

  const markReady = () => {
    readyRef.current = true;
    setReady(true);
  };

  useEffect(() => {
    let mounted = true;

    const hash = window.location.hash;

    if (hash.includes('error=') || hash.includes('error_code=')) {
      setExpired(true);
      return;
    }

    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (!mounted) return;
      if (event === 'PASSWORD_RECOVERY') {
        markReady();
      }
      if ((event === 'INITIAL_SESSION' || event === 'SIGNED_IN') && session) {
        markReady();
      }
    });

    if (hash.includes('type=recovery')) {
      markReady();
    }

    supabase.auth.getSession().then(({ data: { session } }) => {
      if (mounted && session) markReady();
    });

    const timeout = setTimeout(() => {
      if (mounted && !readyRef.current) setExpired(true);
    }, 8000);

    return () => {
      mounted = false;
      subscription.unsubscribe();
      clearTimeout(timeout);
    };
  }, []);

  const passwordsMatch = password === confirmPassword;
  const showMismatch = confirmPassword.length > 0 && !passwordsMatch;
  const strength = getStrength(password);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!passwordsMatch) {
      toast({ title: 'Passwords do not match', description: 'Please make sure both passwords are identical.', variant: 'destructive' });
      return;
    }
    setLoading(true);
    try {
      const { error } = await supabase.auth.updateUser({ password });
      if (error) throw error;
      toast({ title: 'Password updated', description: 'Please sign in with your new password.' });
      navigate('/agents/login');
    } catch (err: unknown) {
      toast({ title: 'Error', description: getErrorMessage(err), variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  };

  if (expired) {
    return (
      <div className="min-h-screen flex" style={{ background: '#020817' }}>
        <BrandPanel />
        <div className="flex-1 bg-white flex flex-col min-h-screen">
          <div className="flex-1 flex flex-col justify-center px-10 lg:px-20 py-12 overflow-y-auto max-w-lg mx-auto w-full">
            <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} className="text-center">
              <div className="inline-flex w-12 h-12 rounded-full bg-destructive/10 items-center justify-center mb-5">
                <AlertTriangle size={22} className="text-destructive" />
              </div>
              <h1 className="text-[32px] font-light text-stone-900 leading-[1.1] mb-3" style={{ letterSpacing: '-1px' }}>
                Reset link <strong className="font-semibold">expired.</strong>
              </h1>
              <p className="text-sm text-stone-500 mb-7 leading-relaxed">
                This password reset link has expired or was already used. Some email clients pre-scan links which can invalidate them.
              </p>
              <button
                onClick={() => navigate('/forgot-password')}
                className="w-full py-3.5 rounded-full bg-primary hover:opacity-90 text-primary-foreground font-semibold text-sm transition-opacity"
              >
                Request a new reset link
              </button>
            </motion.div>
          </div>
        </div>
      </div>
    );
  }

  if (!ready) {
    return (
      <div className="min-h-screen flex" style={{ background: '#020817' }}>
        <BrandPanel />
        <div className="flex-1 bg-white flex items-center justify-center min-h-screen">
          <p className="text-stone-400 text-sm">Verifying reset link…</p>
        </div>
      </div>
    );
  }

  const segColor = (idx: number) => {
    if (strength.score < idx) return 'bg-stone-200';
    if (strength.score === 1) return 'bg-red-500';
    if (strength.score === 2) return 'bg-amber-500';
    return 'bg-emerald-500';
  };

  return (
    <div className="min-h-screen flex" style={{ background: '#020817' }}>
      <BrandPanel />

      <div className="flex-1 bg-white flex flex-col min-h-screen">
        <div className="flex-1 flex flex-col justify-center px-10 lg:px-20 py-12 overflow-y-auto max-w-lg mx-auto w-full">
          <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }}>
            <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full border border-stone-200 bg-stone-50 mb-5">
              <span className="w-1.5 h-1.5 rounded-full bg-blue-600" />
              <span className="text-[10px] font-medium tracking-widest uppercase text-stone-400">Reset password</span>
            </div>

            <h1 className="text-[38px] font-light text-stone-900 leading-[1.08] mb-3" style={{ letterSpacing: '-1.5px' }}>
              Set a new<br /><strong className="font-semibold">password.</strong>
            </h1>
            <p className="text-sm text-stone-400 mb-8">Choose something strong — you'll use this to sign in next time.</p>

            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="text-sm font-medium text-foreground mb-1.5 block">New password</label>
                <div className="relative">
                  <Lock size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-stone-400 pointer-events-none" />
                  <input
                    type={showPassword ? 'text' : 'password'}
                    placeholder="Enter new password"
                    required
                    minLength={8}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className={inputClass}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(s => !s)}
                    aria-label={showPassword ? 'Hide password' : 'Show password'}
                    className="absolute right-3.5 top-1/2 -translate-y-1/2 text-stone-400 hover:text-stone-600 transition-colors"
                  >
                    {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                  </button>
                </div>

                {/* Strength indicator */}
                <div className="mt-2.5 flex items-center gap-2">
                  <div className="flex gap-1 flex-1">
                    {[1, 2, 3].map(i => (
                      <div key={i} className={`h-1 flex-1 rounded-full transition-colors ${password.length === 0 ? 'bg-stone-200' : segColor(i)}`} />
                    ))}
                  </div>
                  {password.length > 0 && (
                    <span className={`text-[11px] font-medium ${strength.score === 1 ? 'text-red-500' : strength.score === 2 ? 'text-amber-600' : 'text-emerald-600'}`}>
                      {strength.label}
                    </span>
                  )}
                </div>
                <p className="text-xs text-stone-400 mt-1.5">Minimum 8 characters</p>
              </div>

              <div>
                <label className="text-sm font-medium text-foreground mb-1.5 block">Confirm new password</label>
                <div className="relative">
                  <Lock size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-stone-400 pointer-events-none" />
                  <input
                    type={showConfirm ? 'text' : 'password'}
                    placeholder="Re-enter new password"
                    required
                    minLength={8}
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    className={inputClass}
                  />
                  <button
                    type="button"
                    onClick={() => setShowConfirm(s => !s)}
                    aria-label={showConfirm ? 'Hide password' : 'Show password'}
                    className="absolute right-3.5 top-1/2 -translate-y-1/2 text-stone-400 hover:text-stone-600 transition-colors"
                  >
                    {showConfirm ? <EyeOff size={16} /> : <Eye size={16} />}
                  </button>
                </div>
                {showMismatch && (
                  <p className="text-xs text-destructive mt-1.5">Passwords don't match</p>
                )}
              </div>

              <button
                type="submit"
                disabled={loading || !password || !confirmPassword || !passwordsMatch}
                className="w-full py-3.5 rounded-full bg-primary hover:opacity-90 text-primary-foreground font-semibold text-sm transition-opacity disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {loading ? 'Updating…' : 'Update password'}
              </button>
            </form>
          </motion.div>
        </div>
      </div>
    </div>
  );
};

export default ResetPasswordPage;
