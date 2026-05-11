import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { getErrorMessage } from '@/shared/lib/errorUtils';
import { useTranslation } from '@/shared/lib/i18n/useTranslation';
import {
  AuthShell,
  authStyles as s,
  AuthError,
  AuthSuccess,
  AuthSpinner,
} from '@/features/auth/components/AuthShell';

const ForgotPasswordPage = () => {
  const navigate = useNavigate();
  const { t } = useTranslation();
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    try {
      const { error: err } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: `${window.location.origin}/login`,
      });
      if (err) throw err;
      setSent(true);
    } catch (err: unknown) {
      setError(getErrorMessage(err));
    } finally {
      setLoading(false);
    }
  };

  return (
    <AuthShell
      heading={t('auth.forgotPassword.heading')}
      subheading={sent ? t('auth.forgotPassword.subSent') : t('auth.forgotPassword.subInitial')}
    >
      {error && <AuthError>{error}</AuthError>}
      {sent && <AuthSuccess>{t('auth.forgotPassword.toast.sentBody')}</AuthSuccess>}

      {!sent && (
        <form onSubmit={handleSubmit}>
          <div className={s.field}>
            <label className={s.label} style={s.labelStyle}>Email</label>
            <input
              type="email"
              required
              autoFocus
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder={t('auth.forgotPassword.placeholder')}
              className={s.input}
              style={s.inputStyle}
              autoComplete="email"
            />
          </div>
          <button type="submit" disabled={loading} className={s.primaryBtn}>
            {loading
              ? <><AuthSpinner /> {t('auth.forgotPassword.submitting')}</>
              : t('auth.forgotPassword.submit')}
          </button>
        </form>
      )}

      <p className={s.footer} style={s.footerStyle}>
        Remember it?
        <Link to="/login" className={`${s.link} ml-1`}>Sign in</Link>
      </p>
    </AuthShell>
  );
};

export default ForgotPasswordPage;
