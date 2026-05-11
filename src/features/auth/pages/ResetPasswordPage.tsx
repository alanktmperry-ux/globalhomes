import { useState, useEffect, useRef } from 'react';
import { Eye, EyeOff } from 'lucide-react';
import { useNavigate, Link } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { getErrorMessage } from '@/shared/lib/errorUtils';
import { useAuth } from '@/features/auth/AuthProvider';
import { useTranslation } from '@/shared/lib/i18n/useTranslation';
import {
  AuthShell,
  authStyles as s,
  AuthError,
  AuthSpinner,
} from '@/features/auth/components/AuthShell';

const ResetPasswordPage = () => {
  const navigate = useNavigate();
  const { refreshRoles } = useAuth();
  const { t } = useTranslation();
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [loading, setLoading] = useState(false);
  const [ready, setReady] = useState(false);
  const [expired, setExpired] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const readyRef = useRef(false);

  const getStrength = (pw: string): { score: 0 | 1 | 2 | 3; label: string } => {
    if (pw.length < 8) return { score: 1, label: t('auth.resetPassword.strength.weak') };
    const hasLetters = /[a-zA-Z]/.test(pw);
    const hasNumbers = /\d/.test(pw);
    if (hasLetters && hasNumbers) return { score: 3, label: t('auth.resetPassword.strength.strong') };
    return { score: 2, label: t('auth.resetPassword.strength.fair') };
  };

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
      if (event === 'PASSWORD_RECOVERY') markReady();
      if ((event === 'INITIAL_SESSION' || event === 'SIGNED_IN') && session) markReady();
    });

    if (hash.includes('type=recovery')) markReady();

    supabase.auth.getSession().then(({ data: { session } }) => {
      if (mounted && session) markReady();
    }).catch(() => setLoading(false));

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
    setError(null);
    if (!passwordsMatch) {
      setError(t('auth.resetPassword.toast.mismatchBody'));
      return;
    }
    setLoading(true);
    try {
      const { error: updErr } = await supabase.auth.updateUser({ password });
      if (updErr) throw updErr;

      const { data: { session } } = await supabase.auth.getSession();
      if (!session) { navigate('/login'); return; }

      await refreshRoles();

      const { data: agentRow } = await supabase
        .from('agents').select('id').eq('user_id', session.user.id).maybeSingle();

      navigate(agentRow ? '/dashboard' : '/', { replace: true });
    } catch (err: unknown) {
      setError(getErrorMessage(err));
    } finally {
      setLoading(false);
    }
  };

  if (expired) {
    return (
      <AuthShell
        heading={<>{t('auth.resetPassword.expired.heading1')} {t('auth.resetPassword.expired.heading2')}</>}
        subheading={t('auth.resetPassword.expired.body')}
      >
        <button
          onClick={() => navigate('/forgot-password')}
          className={s.primaryBtn}
        >
          {t('auth.resetPassword.expired.cta')}
        </button>
        <p className={s.footer} style={s.footerStyle}>
          <Link to="/login" className={s.link}>Back to sign in</Link>
        </p>
      </AuthShell>
    );
  }

  if (!ready) {
    return (
      <AuthShell heading="Verifying link…" subheading={t('auth.resetPassword.verifying')}>
        <div className="flex justify-center py-4 text-white"><AuthSpinner /></div>
      </AuthShell>
    );
  }

  const segColor = (idx: number) => {
    if (strength.score < idx) return 'rgba(255,255,255,0.15)';
    if (strength.score === 1) return '#F87171';
    if (strength.score === 2) return '#FBBF24';
    return '#34D399';
  };

  return (
    <AuthShell
      heading={<>{t('auth.resetPassword.heading1')} {t('auth.resetPassword.heading2')}</>}
      subheading={t('auth.resetPassword.sub')}
    >
      {error && <AuthError>{error}</AuthError>}

      <form onSubmit={handleSubmit}>
        <div className={s.field}>
          <label className={s.label} style={s.labelStyle}>{t('auth.resetPassword.newPasswordLabel')}</label>
          <div className="relative">
            <input
              type={showPassword ? 'text' : 'password'}
              placeholder={t('auth.resetPassword.newPasswordPlaceholder')}
              required
              minLength={8}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className={s.input}
              style={s.inputStyle}
            />
            <button
              type="button"
              onClick={() => setShowPassword(v => !v)}
              aria-label={showPassword ? 'Hide password' : 'Show password'}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-white/55 hover:text-white"
            >
              {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
            </button>
          </div>
          <div className="mt-2.5 flex items-center gap-2">
            <div className="flex gap-1 flex-1">
              {[1, 2, 3].map(i => (
                <div
                  key={i}
                  className="h-1 flex-1 rounded-full transition-colors"
                  style={{ background: password.length === 0 ? 'rgba(255,255,255,0.15)' : segColor(i) }}
                />
              ))}
            </div>
            {password.length > 0 && (
              <span className="text-[11px] font-medium" style={{ color: strength.score === 1 ? '#FCA5A5' : strength.score === 2 ? '#FCD34D' : '#6EE7B7' }}>
                {strength.label}
              </span>
            )}
          </div>
          <p className="text-xs mt-1.5" style={{ color: 'rgba(255,255,255,0.55)' }}>{t('auth.resetPassword.minChars')}</p>
        </div>

        <div className={s.field}>
          <label className={s.label} style={s.labelStyle}>{t('auth.resetPassword.confirmLabel')}</label>
          <div className="relative">
            <input
              type={showConfirm ? 'text' : 'password'}
              placeholder={t('auth.resetPassword.confirmPlaceholder')}
              required
              minLength={8}
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              className={s.input}
              style={s.inputStyle}
            />
            <button
              type="button"
              onClick={() => setShowConfirm(v => !v)}
              aria-label={showConfirm ? 'Hide password' : 'Show password'}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-white/55 hover:text-white"
            >
              {showConfirm ? <EyeOff size={16} /> : <Eye size={16} />}
            </button>
          </div>
          {showMismatch && (
            <p className="text-xs mt-1.5" style={{ color: '#FCA5A5' }}>{t('auth.resetPassword.mismatch')}</p>
          )}
        </div>

        <button
          type="submit"
          disabled={loading || !password || !confirmPassword || !passwordsMatch}
          className={s.primaryBtn}
        >
          {loading ? <><AuthSpinner /> {t('auth.resetPassword.updating')}</> : t('auth.resetPassword.submit')}
        </button>
      </form>
    </AuthShell>
  );
};

export default ResetPasswordPage;
